# x402 resolution-lineage reference proof

Minimal zero-dependency proof of the surviving resolution-layer delta after subtracting current x402 payment, receipt, delivery, verifier, and dispute work.

## What this consumes

This proof treats the following as upstream inputs rather than contributions:

- #1921-style operation binding through `operationDigest`;
- the approved Offer/Receipt extension;
- #2833-compatible delivery evidence;
- native verifier artifacts, demonstrated here with frozen SAR v0.1 receipts;
- generic correctness/dispute re-checking represented by #2887.

It does not reimplement settlement, delivery proofs, historical signer authority, generic verifier verdicts, request/response hashing, anchoring, or reputation.

## Native verifier fixture

`fixtures/sar-conflict.json` contains three cryptographically real SAR v0.1 conformance fixtures and three distinct Ed25519 public keys.

Two receipts bind to the exact same `task_id_hash` / resolution subject but disagree natively:

```text
verifier A -> PASS / SPEC_MATCH
verifier B -> FAIL / SPEC_MISMATCH
```

The proof recomputes each SAR `receipt_id` from the frozen SAR v0.1 canonical signed core and verifies each Ed25519 signature before the lineage layer consumes the artifact. A tampered native verdict is rejected before resolution logic runs.

A third independently signed SAR receipt binds to the narrowed successor subject so the complete lineage consumes native verifier artifacts end-to-end.

## What remains

Only three behaviors remain in the proof:

1. **Multi-verifier disagreement preservation** — independently attributable, independently verified native receipts can address the same subject and disagree without being flattened into one synthetic verifier verdict.
2. **Resolution-state transition** — accumulated evidence changes the higher-level resolution state. The fixture demonstrates `SURVIVED -> UNRESOLVED -> NARROWED`.
3. **Immutable correction/supersession lineage** — successor resolutions explicitly link to what they supersede while the earlier signed resolution remains valid and addressable.

The four resolution-state labels are not a replacement for SAR's `PASS / FAIL / INDETERMINATE` verifier vocabulary.

## Boundary

The proof consumes evidence references in this shape:

```text
operationDigest
+ offerReceiptDigest
+ deliveryReceiptDigest
+ verified native SAR receipt_ids[]
-> signed resolution lineage
```

A historical resolution cannot be edited in place: mutation breaks its signature. A correction is represented by a new signed successor carrying `previousResolutionId` and `supersedesResolutionId`; a narrowed claim additionally carries `supersedesSubjectDigest`.

## Run

```bash
npm test
```

Expected output confirms:

- all three native SAR signatures verify;
- the two original-subject receipts use independent verifier keys;
- both bind to the same subject;
- their native verdicts conflict (`PASS` vs `FAIL`);
- a tampered SAR receipt is rejected;
- the resolution transitions `SURVIVED -> UNRESOLVED -> NARROWED`;
- the original signed resolution still verifies;
- mutating the original resolution fails verification;
- the narrowed successor preserves the original subject digest in lineage.

## Provenance

This implementation was first developed in `chugarchugarr/resolution-receipt-technocore`. That history remains intact. This repository is the standalone canonical presentation of the reduced x402 resolution-lineage proof.
