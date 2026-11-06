# Development plan

User-requested sequence:

1. Translate the supplied CDM/LDM into SQL and confirm domain rules.
2. Build the database, backend APIs, authentication/authorization, and system behavior.
3. Add a lightweight functional UI and validate all features end to end.
4. After feature confirmation, build a clean, modern UI.

## Feature validation scope

- Users and personal wallets.
- Shared wallets, membership roles, gifts, and targets.
- Businesses, bills, bill items, and item allocations.
- Transfers, transaction history, categories, and balances.
- Shared expenses and splitting.
- Payment requests, payer assignment, QR flows, expiry, and settlement.

Before handling real funds, design atomic settlement, idempotency, balance locking,
an immutable ledger/reconciliation, authorization, audit history, and concurrency tests.
The initial schema alone does not implement these behaviors.

Production guidelines are preserved in [original and extracted form](production-guidelines/).
Reconcile the initial diagram translation against these requirements before implementing
the backend; see [initial gap review](production-guidelines/schema-gap-review.md).

## Current progress

The first functional version now implements connected API/database/UI workflows.
See [implementation scope](implementation-scope.md) for completed flows and gaps.
Confirm and extend features through this lightweight UI before the final visual redesign.

## Design and collaboration pass

The interface now includes mobile bottom navigation, adaptive form sheets, wallet
details and member activity. Invitations, expense splitting/reimbursement, shared
owner payouts/archival, categories and business team access are available.
Continue verifying these flows with test accounts before real provider integrations.
