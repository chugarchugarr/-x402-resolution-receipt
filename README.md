# x402 Resolution Lineage

Standalone reference proof for the narrow resolution-layer delta that remains after subtracting current x402 payment, receipt, delivery, verifier, and dispute work.

The proof no longer presents itself as another receipt format. It consumes existing evidence primitives and demonstrates only:

1. **Individually attributable multi-verifier disagreement** on the same subject.
2. **Resolution-state transitions** above native verifier verdicts.
3. **Append-only correction/supersession lineage** that never erases the earlier signed resolution.

## Explicitly upstream

This repository does not claim novelty for x402 settlement, signed offers/receipts, historical signer authorization, operation binding, request/response hashing, delivery proof/status, generic verifier verdicts, generic dispute/re-checking, hash chaining, countersignatures, canonical envelope digests, Merkle/EAS anchoring, or reputation scoring.

The reference fixture instead consumes:

```text
#1921 operationDigest
+ approved offer/receipt evidence
+ #2833-compatible delivery evidence
+ independently verifiable native verifier artifacts
-> resolution lineage
```

SAR already covers generic `PASS / FAIL / INDETERMINATE` verifier receipts. #2887 already covers signed hash-chained claims, counter-evidence, and independent re-checking. This proof stays above those layers.

## Reference implementation

See [`/x402`](./x402).

Run:

```bash
cd x402
npm test
```

The fixture demonstrates a `SURVIVED -> UNRESOLVED -> NARROWED` lineage. Two independent verifier artifacts disagree on the same original subject; a later successor narrows the claim; every prior resolution remains signed, addressable, and independently valid. Mutating historical state invalidates the signature instead of rewriting history.

## Provenance

Earlier implementation history remains preserved at:

https://github.com/chugarchugarr/resolution-receipt-technocore

This subtraction changes the contribution claim, not the provenance of the work.

## Status

Reference proof / architecture proposal. Not an adopted x402 Foundation specification.
