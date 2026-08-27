# x402 resolution-lineage reference proof

Minimal zero-dependency proof of the surviving resolution-layer delta after subtracting current x402 payment, receipt, delivery, verifier, and dispute work.

## What this consumes

This proof treats the following as upstream inputs rather than contributions:

- #1921-style operation binding through `operationDigest`;
- the approved Offer/Receipt extension;
- #2833-compatible delivery evidence;
- native verifier artifacts such as SAR receipts;
- generic correctness/dispute re-checking represented by #2887.

It does not reimplement settlement, delivery proofs, historical signer authority, generic verifier verdicts, request/response hashing, anchoring, or reputation.

## What remains

Only three behaviors remain in the proof:

1. **Multi-verifier disagreement preservation** — independently attributable verifier artifacts can address the same subject and disagree without being flattened into one synthetic verdict.
2. **Resolution-state transition** — accumulated evidence changes the higher-level resolution state. The fixture demonstrates `SURVIVED -> UNRESOLVED -> NARROWED`.
3. **Immutable correction/supersession lineage** — successor resolutions explicitly link to what they supersede while the earlier signed resolution remains valid and addressable.

The four state labels are resolution semantics, not a proposed replacement for SAR's verifier verdict vocabulary.

## Boundary

The proof consumes evidence references in this shape:

```text
operationDigest
+ offerReceiptDigest
+ deliveryReceiptDigest
+ verifierArtifactDigests[]
-> signed resolution lineage
```

A historical resolution cannot be edited in place: mutation breaks its signature. A correction is represented by a new signed successor carrying `previousResolutionId` and `supersedesResolutionId`; a narrowed claim additionally carries `supersedesSubjectDigest`.

## Run

```bash
npm test
```

Expected output confirms:

- two independent verifier artifacts materially disagree on one subject;
- the resolution transitions `SURVIVED -> UNRESOLVED -> NARROWED`;
- the original signed resolution still verifies;
- mutating the original resolution fails verification;
- the narrowed successor preserves the original subject digest in lineage.

## Provenance

This repository remains a standalone reference proof. Earlier implementation history is preserved in `chugarchugarr/resolution-receipt-technocore`; this branch intentionally narrows the contribution surface rather than rewriting that history.
