import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign, verify } from "node:crypto";

const STATES = ["SURVIVED", "UNRESOLVED", "NARROWED", "FAILED"];
const T0 = 1787868000;

function canon(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  return `{${Object.keys(v).sort().map(k => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`;
}
function digest(v) { return `sha256:${createHash("sha256").update(canon(v)).digest("hex")}`; }
function keypair() { return generateKeyPairSync("ed25519"); }
function pub(k) { return k.export({format:"der",type:"spki"}).toString("base64url"); }
function sig(k,v) { return sign(null, Buffer.from(canon(v)), k).toString("base64url"); }
function check(k,v,s) { return verify(null, Buffer.from(canon(v)), k, Buffer.from(s,"base64url")); }

// Upstream primitives are consumed, not reimplemented.
// #1921 supplies the operation-bound digest shape.
const operation = {
  operationId: "premiumData.get",
  method: "GET",
  pathTemplate: "/premium-data",
  pathParams: {},
  query: { symbol: "ETH" },
  body: null,
  policyVersion: "1"
};
const operationDigest = digest(operation);

// Offer/Receipt and #2833 delivery evidence are opaque, independently verifiable inputs here.
// Their internal signatures, settlement checks, request/response hashing, and anchoring are out of scope.
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

// Verifier artifacts are treated as opaque signed outputs from their native verifier formats (e.g. SAR).
// This layer does not define PASS/FAIL/INDETERMINATE or another generic verifier verdict vocabulary.
function verifierArtifact(verifierId, subjectDigest, position, observedAt) {
  return {
    verifierId,
    subjectDigest,
    artifactDigest: digest({ verifierId, subjectDigest, position, observedAt }),
    positionDigest: digest(position),
    observedAt
  };
}

const verifierA = verifierArtifact(
  "independent-A",
  originalSubjectDigest,
  { conclusion: "supports-original-claim", basis: "delivery-artifact-v1" },
  T0 + 10
);
const verifierB = verifierArtifact(
  "independent-B",
  originalSubjectDigest,
  { conclusion: "challenges-completeness", basis: "semantic-policy-v2" },
  T0 + 20
);

function materialDisagreement(a, b) {
  return a.verifierId !== b.verifierId &&
    a.subjectDigest === b.subjectDigest &&
    a.positionDigest !== b.positionDigest;
}
assert.equal(materialDisagreement(verifierA, verifierB), true);

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

// 1) One verifier supports the original subject.
const r0 = resolution({
  sequence: 0,
  subjectDigest: originalSubjectDigest,
  evidence: upstreamEvidence,
  verifierArtifacts: [verifierA],
  state: "SURVIVED",
  issuedAt: T0 + 11
});

// 2) A second independent verifier reaches a materially different position on the same subject.
// The new operative state becomes UNRESOLVED without mutating r0.
const disagreementEvidence = { ...upstreamEvidence, verifierArtifacts: [verifierA.artifactDigest, verifierB.artifactDigest] };
const r1 = resolution({
  sequence: 1,
  subjectDigest: originalSubjectDigest,
  evidence: disagreementEvidence,
  verifierArtifacts: [verifierA, verifierB],
  state: "UNRESOLVED",
  previousResolutionId: r0.resolutionId,
  supersedesResolutionId: r0.resolutionId,
  correctionReason: "Independent verifier artifacts disagree on the same subject.",
  issuedAt: T0 + 21
});

// 3) Later evidence supports a narrower successor claim. The original subject is not rewritten.
const narrowedSubject = {
  parentSubjectDigest: originalSubjectDigest,
  operationDigest,
  claimDigest: digest({ claim: "The paid operation returned an ETH price value; completeness is not asserted." })
};
const narrowedSubjectDigest = digest(narrowedSubject);
const verifierC = verifierArtifact(
  "independent-C",
  narrowedSubjectDigest,
  { conclusion: "supports-narrowed-claim", basis: "replay-policy-v3" },
  T0 + 3600
);
const narrowedEvidence = { ...upstreamEvidence, priorDisagreementResolutionId: r1.resolutionId, verifierArtifact: verifierC.artifactDigest };
const r2 = resolution({
  sequence: 2,
  subjectDigest: narrowedSubjectDigest,
  evidence: narrowedEvidence,
  verifierArtifacts: [verifierC],
  state: "NARROWED",
  previousResolutionId: r1.resolutionId,
  supersedesResolutionId: r1.resolutionId,
  supersedesSubjectDigest: originalSubjectDigest,
  correctionReason: "Later evidence supports only a narrower successor subject.",
  issuedAt: T0 + 3601
});

for (const r of [r0, r1, r2]) assert.equal(validResolution(r), true);
assert.equal(r1.previousResolutionId, r0.resolutionId);
assert.equal(r1.supersedesResolutionId, r0.resolutionId);
assert.equal(r2.previousResolutionId, r1.resolutionId);
assert.equal(r2.supersedesResolutionId, r1.resolutionId);
assert.equal(r2.supersedesSubjectDigest, originalSubjectDigest);
assert.deepEqual([r0.state, r1.state, r2.state], ["SURVIVED", "UNRESOLVED", "NARROWED"]);

// Mutation of a historical resolution breaks its signature; history is corrected by successor records only.
const mutatedR0 = { ...r0, state: "FAILED" };
assert.equal(validResolution(mutatedR0), false);
assert.equal(validResolution(r0), true);

console.log(JSON.stringify({
  consumedUpstream: {
    operationBinding: "#1921 operationDigest",
    offerReceipt: true,
    deliveryReceipt: "#2833-compatible evidence reference",
    verifierVerdictFormat: "external/native"
  },
  multiVerifierDisagreement: materialDisagreement(verifierA, verifierB),
  transition: [r0.state, r1.state, r2.state],
  lineage: [r0.resolutionId, r1.resolutionId, r2.resolutionId],
  originalResolutionStillValid: validResolution(r0),
  historicalMutationRejected: !validResolution(mutatedR0),
  narrowedSubjectPreservesParent: r2.supersedesSubjectDigest === originalSubjectDigest
}, null, 2));
