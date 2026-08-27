# Upstream delta after subtraction

Reference proof: this directory (`npm test`).

Compared against the live ecosystem as of 2026-08-27:

- x402 v2 core `exact` flow
- approved `offer-receipt` extension
- x402-foundation/x402#1921 operation-bound receipts
- x402-foundation/x402#1195 Settlement Attestation Receipt (SAR)
- x402-foundation/x402#2833 delivery-receipt work and the StelarDigital reference implementation
- x402-foundation/x402#2887 correctness/dispute work

## Explicitly removed

This proof no longer claims or implements x402 settlement, signed offer/receipt semantics, issuance-time signer-authority preservation, request/response hashing, delivery proof/status, countersignatures, generic verifier verdicts, operation binding beyond consuming #1921's model, generic dispute/re-checking, generic hash chaining, anchoring, or reputation.

The approved Offer/Receipt extension already addresses signer authorization and historical authorization evidence. SAR already defines signed `PASS / FAIL / INDETERMINATE` verifier receipts, including `CONFLICT`. #2887 already demonstrates signed hash-chained claims, counter-evidence, and independent re-checks.

## Native-verifier hardening

The proof no longer treats verifier artifacts as opaque placeholder digests.

`fixtures/sar-conflict.json` contains three real Ed25519-signed SAR v0.1 conformance receipts. The proof follows the frozen SAR v0.1 integration contract:

```text
core = task_id_hash + verdict + confidence + reason_code + ts + verifier_kid
receipt_id = SHA256(JCS(core))
sig = Ed25519(SHA256(JCS(core)))
```

Two receipts come from distinct verifier keys, bind to the same `task_id_hash`, and carry conflicting native verdicts (`PASS` and `FAIL`). The proof verifies both native signatures and receipt IDs before resolution. A tampered native receipt is rejected. A third independently signed SAR receipt binds to the narrowed successor subject.

No new verifier receipt format or verdict vocabulary is introduced.

## Surviving delta

### 1. Individually attributable multi-verifier disagreement

The resolution layer consumes already-verifiable native receipts by their native `receipt_id`. When two independent native receipts bind to the same subject but disagree, both remain separately addressable in the resolution evidence rather than being flattened into one synthetic verifier artifact.

### 2. Resolution-state transitions above verifier verdicts

Native verifier outputs remain native verifier outputs. A separate resolution record states what accumulated evidence means for the subject over time.

The proof demonstrates:

```text
SAR PASS on subject A -> SURVIVED
SAR PASS + SAR FAIL on subject A -> UNRESOLVED
SAR PASS on narrower subject B -> NARROWED
```

The resolution states are not proposed as replacements for SAR verdicts.

### 3. Immutable correction and supersession lineage

Each successor resolution carries:

```text
previousResolutionId
supersedesResolutionId
supersedesSubjectDigest?  // when the claim itself narrows
```

A successor can become operative without deleting, mutating, or invalidating the earlier signed resolution. Historical mutation fails signature verification; correction occurs only by appending a successor.

## Boundary

The fixture consumes upstream evidence rather than reimplementing it:

```text
#1921-style operationDigest
+ approved offer/receipt artifact digest
+ #2833-compatible delivery artifact digest
+ verified native SAR receipt_ids[]
-> resolution lineage
```

The proof deliberately does not verify EIP-3009/RPC settlement, Offer/Receipt signatures, delivery signatures, or anchoring. Those belong to the upstream artifacts it references. It does verify the native SAR receipts because native verifier disagreement is the boundary under test.

## Proposed upstream question

Is there value in a small application-layer resolution-lineage envelope that consumes existing native verifier receipts, preserves conflicting independently signed artifacts separately, records how the conflict changes the operative resolution state, and makes correction/supersession append-only without defining another payment, delivery, dispute, or verifier-verdict format?
