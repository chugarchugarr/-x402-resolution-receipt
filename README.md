# x402 Resolution Lineage

Standalone reference proof for the narrow resolution-layer delta that remains after subtracting current x402 payment, receipt, delivery, verifier, and dispute work.

The proof does not define another receipt or verifier format. It consumes existing evidence and demonstrates only:

1. **Individually attributable multi-verifier disagreement** on the same subject.
2. **Resolution-state transitions** above native verifier verdicts.
3. **Append-only correction/supersession lineage** that never erases the earlier signed resolution.

## Explicitly upstream

This repository does not claim novelty for x402 settlement, signed offers/receipts, historical signer authorization, operation binding, request/response hashing, delivery proof/status, generic verifier verdicts, generic dispute/re-checking, hash chaining, countersignatures, canonical envelope digests, Merkle/EAS anchoring, or reputation scoring.

The reference fixture consumes:

```text
#1921-style operationDigest
+ approved offer/receipt evidence
+ #2833-compatible delivery evidence
+ verified native SAR receipt_ids[]
-> resolution lineage
```

SAR already covers generic `PASS / FAIL / INDETERMINATE` verifier receipts. #2887 already covers signed hash-chained claims, counter-evidence, and independent re-checking. This proof stays above those layers.

## Native verifier proof

`x402/fixtures/sar-conflict.json` contains three cryptographically real Ed25519 SAR v0.1 conformance receipts using three independent public keys.

Two bind to the exact same subject and disagree natively (`PASS` vs `FAIL`). The proof recomputes their SAR `receipt_id` values, verifies their Ed25519 signatures, rejects a tampered receipt, and only then feeds their native receipt IDs into the lineage layer. A third signed SAR receipt supports the narrower successor subject.

## Reference implementation

See [`/x402`](./x402).

Run:

```bash
cd x402
npm test
```

The fixture demonstrates `SURVIVED -> UNRESOLVED -> NARROWED`. The conflicting native verifier artifacts remain separately addressable; the later narrowed resolution explicitly supersedes the prior resolution without deleting or mutating it. Mutating historical state invalidates the resolution signature.

## Provenance

Earlier implementation history remains preserved at:

https://github.com/chugarchugarr/resolution-receipt-technocore

This subtraction changes the contribution claim, not the provenance of the work.

## Status

Reference proof / architecture proposal. Not an adopted x402 Foundation specification.
