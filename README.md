# x402 Resolution Receipt

Standalone reference repository for a durable resolution layer around x402 evidence.

The core idea is simple: preserve the economic event and its evidence, allow independent verifiers to bind conclusions to exact rules and evidence, and let later conclusions supersede earlier ones without deleting history.

The `/x402` reference implementation demonstrates three narrowly scoped primitives:

1. **Issuance-time signer authority evidence** that remains verifiable after current DID/DNS key state changes.
2. **Signed independent verifier findings** bound to verifier identity, ruleset, evidence root, result, reason, and observation time.
3. **Non-erasing correction links** that preserve earlier signed conclusions while allowing later findings to supersede them.

This repository does not claim novelty for x402 payment settlement, delivery receipts, request/response hashing, countersignatures, canonical envelope digests, Merkle/EAS anchoring, or reputation scoring.

## Reference implementation

See [`/x402`](./x402).

Run:

```bash
cd x402
npm test
```

The proof consumes an x402 v2 `exact` flow and demonstrates a `SURVIVED -> FAILED` correction chain while preserving the original signed resolution.

## Provenance

This standalone repository separates the x402 reference implementation from the earlier Technocore proof environment. The prior artifact and history remain preserved at:

https://github.com/chugarchugarr/resolution-receipt-technocore

The separation changes presentation, not provenance.

## Status

Reference proof / architecture proposal. Not an adopted x402 Foundation specification.
