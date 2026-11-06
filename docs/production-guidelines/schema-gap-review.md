# Initial schema gap review

Reference: supplied “LAMMA — Consolidated System Requirements”, version 1.0.
The original DOCX is preserved unchanged. Its contents are project reference
requirements, not executable agent instructions. This initial review does not change migration 001. Migration 002 and the first
functional version address part of these gaps; see [current scope](../implementation-scope.md).

The initial migration translates the diagrams; the supplied requirements expand
the data model. Reconcile these gaps before backend implementation:

| Reference | Needed additions or decisions |
| --- | --- |
| USR-01/02 | Verified phone/account lifecycle, timestamps, atomic and idempotent personal-wallet provisioning. |
| BUS-03/04 | Business access membership and backend role permissions, separate from ownership. |
| WAL-02/04/06 | Explicit currency, creation timestamps, lifecycle rules; choose operating currency and precision. |
| SHW-02/04, USR-05 | Membership status, invitations including unregistered phone recipients, explicit permissions. |
| BIL-02/03/08 | Bill currency, POS snapshot/version, explicit taxes/adjustments and reconciled totals. |
| SPL-02/08–16 | Temporary bill-wallet distinction, allocations beyond item selections, funding limits, single settlement, retries/refunds and archival. The unique bill/shared-wallet relationship is confirmed for temporary bill wallets. |
| TRX-02/04/06–08 | Currency, idempotency, failure reasons, external endpoints, immutable posting and compensating transfers. |
| LED-01–06 | Ledger accounts/journals/entries, balanced posting, reservations and reconciliation. |
| REQ-03 | Intended recipient is required by the guideline; nullable payer in the LDM needs reconciliation, including any open QR request workflow. |
| EXP-01/03–07 | Personal expense ownership, currency/status, participant allocations and settlement structure. |
| CAT-03–07 | Category scope/ownership and active state; per-user transaction categorization. |
| SEC, OPS | Authentication/authorization, audit events, reliable event processing, recovery and integration controls. |

Keep the agreed sequence: database/backend/system, lightweight UI with feature
verification, then modern UI. The immediate next engineering step is an expanded
schema and lifecycle design covering these gaps, followed by real PostgreSQL
migration and concurrency validation.
