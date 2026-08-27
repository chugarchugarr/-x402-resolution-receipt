# Upstream delta after subtraction

Reference proof: this directory (`npm test`).

Compared against the live ecosystem as of 2026-08-27:

- x402 v2 core `exact` flow
- approved `offer-receipt` extension
- x402-foundation/x402#1921 operation-bound receipts
- x402-foundation/x402#1195 Settlement Attestation Receipt (SAR)
- x402-foundation/x402#2833 delivery-receipt work and the StelarDigital reference implementation
- x402-foundation/x402#2887 correctness/dispute work

## Removed from the contribution surface

This proof no longer claims or implements:

- x402 payment settlement or settlement verification;
- signed offer/receipt semantics;
- issuance-time signer-authority preservation;
- request/response hashing or `payment_requirements_sha256`;
- proof-of-delivery or delivery status;
- buyer countersignatures;
- generic `PASS / FAIL / INDETERMINATE` verifier verdicts or reason-code registries;
- operation binding beyond consuming #1921's `operationDigest` model;
- generic dispute opening, counter-evidence, or independent re-checking already represented by #2887;
- generic hash chaining;
- canonical envelope digests, Merkle/EAS anchoring, or reputation scoring.

The approved Offer/Receipt extension already requires signer authorization and explicitly recommends preserving temporally immutable authorization evidence when mutable DID/DNS state changes after key rotation. That removes issuance-time authority from this artifact's center.

SAR already defines signed verifier receipts with `PASS / FAIL / INDETERMINATE`, including a `CONFLICT` reason for conflicting evaluation passes. This proof therefore does not propose another generic verifier verdict format.

#2887 already demonstrates a correctness/dispute architecture with signed hash-chained claims, counter-evidence, and independent re-checks. This proof therefore does not claim generic dispute or hash-chain novelty.

## Surviving delta

### 1. Individually attributable multi-verifier disagreement

The resolution layer accepts verifier artifacts as opaque, independently verifiable inputs from their native formats. It preserves each verifier artifact by digest and does not collapse materially different positions into one synthetic verifier verdict.

The primitive is:

```text
same subject
+ verifier artifact A
+ verifier artifact B
+ distinct verifier identities
+ distinct position digests
= explicit disagreement evidence
```

This is narrower than SAR's generic `CONFLICT` outcome: the conflicting artifacts remain separately addressable and reusable.

### 2. Resolution-state transitions above verifier verdicts

Verifier outputs remain verifier outputs. A separate resolution record states what the accumulated evidence means for the subject over time.

The reference proof demonstrates:

```text
SURVIVED -> UNRESOLVED -> NARROWED
```

The state transition is not a replacement for `PASS / FAIL / INDETERMINATE`. It is a higher-level statement about how a previously recorded conclusion changes as independently attributable evidence arrives.

### 3. Immutable correction and supersession lineage

Each new resolution carries:

```text
previousResolutionId
supersedesResolutionId
supersedesSubjectDigest?  // used when the claim itself narrows
```

A successor resolution can become operative without deleting, mutating, or invalidating the earlier signed resolution. Historical mutation fails signature verification; correction occurs only by appending a successor.

## Boundary

The fixture consumes upstream evidence rather than reimplementing it:

```text
#1921 operationDigest
+ approved offer/receipt artifact digest
+ #2833-compatible delivery artifact digest
+ native verifier artifact digests
-> resolution lineage
```

The proof deliberately does not verify EIP-3009/RPC settlement, delivery signatures, SAR signatures, or anchoring. Those belong to the upstream artifacts it references.

## Proposed upstream question

Is there value in a small application-layer resolution-lineage envelope that preserves multiple independently verifiable verifier artifacts, records how their disagreement changes the operative resolution state, and makes correction/supersession append-only without defining another payment, delivery, or verifier-verdict format?
