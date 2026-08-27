import assert from "node:assert/strict";
import { createHash, createPublicKey, generateKeyPairSync, sign, verify } from "node:crypto";
import { readFileSync } from "node:fs";

const STATES = ["SURVIVED", "UNRESOLVED", "NARROWED", "FAILED"];
const T0 = 1787868000;

function canon(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`;
}
function digestBytes(v) { return createHash("sha256").update(canon(v)).digest(); }
function digest(v) { return `sha256:${digestBytes(v).toString("hex")}`; }
function keypair() { return generateKeyPairSync("ed25519"); }
function pub(k) { return k.export({format:"der",type:"spki"}).toString("base64url"); }
function sig(k,v) { return sign(null, Buffer.from(canon(v)), k).toString("base64url"); }
function check(k,v,s) { return verify(null, Buffer.from(canon(v)), k, Buffer.from(s,"base64url")); }

// Upstream primitives are consumed, not reimplemented.
const operation = {
  operationId: "premiumData.get",
  method: "GET",
  pathTemplate: "/premium-data",
  pathParams: {},
  query: { symbol: "ETH" },
  body: null,
  policyVersion: "1"
};
const operationDigest = digest(operation); // #1921-style operation binding
const upstreamEvidence = {
  operationDigest,
  offerReceiptDigest: digest({ scheme: "offer-receipt", artifact: "signed-receipt-fixture" }),
  deliveryReceiptDigest: digest({ scheme: "delivery-receipt", artifact: "signed-delivery-fixture" })
};

const originalSubject = {
  operationDigest,
  claimDigest: digest({ claim: "The paid operation returned a complete ETH price observation." })
};
const originalSubjectDigest = digest(originalSubject);

const narrowedSubject = {
  parentSubjectDigest: originalSubjectDigest,
  operationDigest,
  claimDigest: digest({ claim: "The paid operation returned an ETH price value; completeness is not asserted." })
};
const narrowedSubjectDigest = digest(narrowedSubject);

// Frozen SAR v0.1 integration contract:
// signed core = task_id_hash + verdict + confidence + reason_code + ts + verifier_kid
// receipt_id = sha256(JCS(core)); signature = Ed25519(sha256(JCS(core))).
const sarFixtures = JSON.parse(readFileSync(new URL("./fixtures/sar-conflict.json", import.meta.url), "utf8"));
function sarCore(r) {
  return {
    task_id_hash: r.task_id_hash,
    verdict: r.verdict,
    confidence: r.confidence,
    reason_code: r.reason_code,
    ts: r.ts,
    verifier_kid: r.verifier_kid
  };
}
function resolveSarKey(kid) {
  const entry = sarFixtures.keys.find(k => k.kid === kid && k.alg === "Ed25519");
  assert.ok(entry, `unknown SAR verifier_kid: ${kid}`);
  return createPublicKey({
    key: Buffer.from(entry.public_key_spki_base64url, "base64url"),
    format: "der",
    type: "spki"
  });
}
function verifySar(r) {
  assert.equal(r.sig_alg, "Ed25519");
  assert.ok(["PASS", "FAIL", "INDETERMINATE"].includes(r.verdict));
  const core = sarCore(r);
  const coreDigest = digestBytes(core);
  assert.equal(r.receipt_id, `sha256:${coreDigest.toString("hex")}`);
  const signature = Buffer.from(r.sig.replace(/^base64url:/, ""), "base64url");
  assert.equal(verify(null, coreDigest, resolveSarKey(r.verifier_kid), signature), true);
  return {
    verifierId: r.verifier_kid,
    subjectDigest: r.task_id_hash,
    artifactDigest: r.receipt_id,
    nativeVerdict: r.verdict,
    nativeReasonCode: r.reason_code,
    observedAt: r.ts
  };
}

const sarA = verifySar(sarFixtures.receipts.original_support);
const sarB = verifySar(sarFixtures.receipts.original_challenge);
const sarC = verifySar(sarFixtures.receipts.narrowed_support);
assert.equal(sarA.subjectDigest, originalSubjectDigest);
assert.equal(sarB.subjectDigest, originalSubjectDigest);
assert.equal(sarC.subjectDigest, narrowedSubjectDigest);

function materialDisagreement(a, b) {
  return a.verifierId !== b.verifierId &&
    a.subjectDigest === b.subjectDigest &&
    a.nativeVerdict !== b.nativeVerdict;
}
assert.equal(materialDisagreement(sarA, sarB), true);

// Negative control: changing the native verdict invalidates receipt_id/signature verification.
const tamperedSar = { ...sarFixtures.receipts.original_support, verdict: "FAIL" };
assert.throws(() => verifySar(tamperedSar));

const resolver = keypair();
function resolution({ sequence, subjectDigest, evidence, verifierArtifacts, state, previousResolutionId = null, supersedesResolutionId = null, supersedesSubjectDigest = null, correctionReason = null, issuedAt }) {
  assert.ok(STATES.includes(state));
  const payload = {
    type: "x402-resolution-lineage/v1",
    sequence,
    subjectDigest,
    evidenceRoot: digest(evidence),
    verifierArtifactDigests: verifierArtifacts.map(v => v.artifactDigest),
    state,
    previousResolutionId,
    supersedesResolutionId,
    supersedesSubjectDigest,
    correctionReason,
    issuedAt,
    resolverPublicKey: pub(resolver.publicKey)
  };
  const resolutionId = digest(payload);
  return { ...payload, resolutionId, signature: sig(resolver.privateKey, { ...payload, resolutionId }) };
}
function validResolution(r) {
  const { signature, resolutionId, ...payload } = r;
  return resolutionId === digest(payload) &&
    check(resolver.publicKey, { ...payload, resolutionId }, signature);
}

const r0 = resolution({
  sequence: 0,
  subjectDigest: originalSubjectDigest,
  evidence: { ...upstreamEvidence, nativeVerifierReceipt: sarA.artifactDigest },
  verifierArtifacts: [sarA],
  state: "SURVIVED",
  issuedAt: T0 + 11
});

const r1 = resolution({
  sequence: 1,
  subjectDigest: originalSubjectDigest,
  evidence: { ...upstreamEvidence, nativeVerifierReceipts: [sarA.artifactDigest, sarB.artifactDigest] },
  verifierArtifacts: [sarA, sarB],
  state: "UNRESOLVED",
  previousResolutionId: r0.resolutionId,
  supersedesResolutionId: r0.resolutionId,
  correctionReason: "Two independently signed SAR receipts disagree on the same task_id_hash.",
  issuedAt: T0 + 21
});

const r2 = resolution({
  sequence: 2,
  subjectDigest: narrowedSubjectDigest,
  evidence: { ...upstreamEvidence, priorDisagreementResolutionId: r1.resolutionId, nativeVerifierReceipt: sarC.artifactDigest },
  verifierArtifacts: [sarC],
  state: "NARROWED",
  previousResolutionId: r1.resolutionId,
  supersedesResolutionId: r1.resolutionId,
  supersedesSubjectDigest: originalSubjectDigest,
  correctionReason: "A later independently signed SAR supports only the narrower successor subject.",
  issuedAt: T0 + 3601
});

for (const r of [r0, r1, r2]) assert.equal(validResolution(r), true);
assert.deepEqual([r0.state, r1.state, r2.state], ["SURVIVED", "UNRESOLVED", "NARROWED"]);
assert.equal(r1.previousResolutionId, r0.resolutionId);
assert.equal(r1.supersedesResolutionId, r0.resolutionId);
assert.equal(r2.previousResolutionId, r1.resolutionId);
assert.equal(r2.supersedesResolutionId, r1.resolutionId);
assert.equal(r2.supersedesSubjectDigest, originalSubjectDigest);

const mutatedR0 = { ...r0, state: "FAILED" };
assert.equal(validResolution(mutatedR0), false);
assert.equal(validResolution(r0), true);

console.log(JSON.stringify({
  consumedUpstream: {
    operationBinding: "#1921 operationDigest",
    offerReceipt: true,
    deliveryReceipt: "#2833-compatible evidence reference",
    verifierFormat: "SAR v0.1 native signed receipts"
  },
  nativeVerifierReceiptsVerified: [sarA.artifactDigest, sarB.artifactDigest, sarC.artifactDigest],
  independentVerifierKeys: sarA.verifierId !== sarB.verifierId,
  sameOriginalSubject: sarA.subjectDigest === sarB.subjectDigest,
  conflictingNativeVerdicts: [sarA.nativeVerdict, sarB.nativeVerdict],
  tamperedNativeReceiptRejected: true,
  multiVerifierDisagreement: materialDisagreement(sarA, sarB),
  transition: [r0.state, r1.state, r2.state],
  lineage: [r0.resolutionId, r1.resolutionId, r2.resolutionId],
  originalResolutionStillValid: validResolution(r0),
  historicalMutationRejected: !validResolution(mutatedR0),
  narrowedSubjectPreservesParent: r2.supersedesSubjectDigest === originalSubjectDigest
}, null, 2));
