# x402 reference implementation

Minimal zero-dependency proof of the surviving resolution-layer delta after comparing x402 v2, the approved Offer/Receipt extension, #1921, and active delivery-receipt work.

## What remains

Existing x402 work already covers or is actively covering signed offers/receipts, operation/request binding, response fingerprints, settlement verification, countersignatures, canonical envelope digests, Merkle inclusion, anchoring, delivery status, and verifier metadata.

This proof therefore adds only:

1. **Issuance-time authority evidence** — carry/reference durable evidence that the receipt signing key was authorized when issued, so later DID/DNS key rotation does not make historical verification depend on current mutable state.
2. **Signed independent verifier findings** — bind `verifierId + rulesetDigest + evidenceRoot + result + reason + observedAt` in a verifier signature. The demo uses `SURVIVED / NARROWED / FAILED / UNRESOLVED` as reference semantics; x402 need not standardize those policy labels.
3. **Append-only corrections** — a later resolution links `previousResolutionId` instead of overwriting the earlier signed conclusion.

## Boundary

The proof consumes an x402 v2 `exact` `PaymentRequired -> PaymentPayload -> SettlementResponse` path. It does **not** reimplement EIP-3009 signature validation, balance checking, simulation, or blockchain settlement.

It does **not** claim novelty for delivery receipts themselves. The contribution surface is the durable resolution layer above already-verifiable payment/delivery evidence.

## Run

```bash
npm test
```

Expected: all assertions pass and the program prints a `SURVIVED -> FAILED` correction chain whose second resolution points to the first, while issuance-time authority still verifies after simulated key rotation.

## Provenance

This implementation was first developed in the `x402-resolution-receipt` branch of `chugarchugarr/resolution-receipt-technocore`. That history remains intact. This repository is the standalone canonical presentation of the x402 reference proof.
