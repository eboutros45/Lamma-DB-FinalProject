# Initial functional version

## Architecture

Node HTTP API + a dependency-free browser UI + persistent PGlite PostgreSQL.
`store.js` owns domain operations; `server.js` owns HTTP/session boundaries.
The original schema is extended through migration 002. Only USD with two decimal
places is enabled. Money is stored as exact PostgreSQL numeric values.

Session tokens are random, hashed in storage, HttpOnly, and SameSite=Strict.
Passwords use salted scrypt. Authentication attempts are rate limited in process.
POST requests reject cross-origin browser requests. Financial action endpoints
require an Idempotency-Key tied to actor and payload. Actions execute atomically,
including their ledger postings, response records, and audit events. A deferred
constraint verifies that journals balance; entries cannot be updated or deleted.
Incoming and outgoing postings use signed amounts: increases in the wallet
liability are positive; decreases negative. Null-wallet postings are the external
test-funding contra account. A full chart of accounts remains future work.

A process-wide request queue serializes local operations. Transfers additionally
lock endpoints and debit only when sufficient funds exist. This is a local
prototype concurrency model; use normal hosted PostgreSQL transaction/locking
semantics and validate multiple workers before scaling.

## Initial workflow boundaries

- Newly registered users start at zero; seeded accounts have clearly labeled test
  funding. There is no real deposit or withdrawal integration.
- Member addition currently adds a registered participant directly. Invitation
  acceptance, unregistered invitations, contacts and discoverability remain pending.
- Shared-wallet contributions are supported. Outgoing flows implemented now are
  gift delivery and automatic consolidated bill settlement. General shared-wallet
  payouts, explicit owner approval policies, and manual archival remain pending.
- Split bills support custom contributions capped at the remaining bill total.
  Equal/item/percentage allocation, individual share obligations, reservations,
  allocation edits, deadlines, cancellations, and refunds remain pending.
- Expenses are obligation records; they do not debit wallets or automatically
  generate requests. Expense allocations and full settlement UI remain pending.
- Businesses have owner access and a membership table. Delegated permission
  management, approval/KYB, POS imports, taxes/adjustments and refunds remain pending.
- Payment requests support one full payment or decline. There is no separate
  acceptance stage, cancellation UI, partial payments or QR workflow yet.
- Categories and item-selection entities from the original schema exist, but their
  management and categorization workflows remain pending.
- Transaction history exposes authorized wallet movements. Bill codes are
  shareable payment references and reveal bill items to authenticated holders;
  codes should only be shared with intended payers.

## Before a real-funds environment

Implement phone verification, account activation/recovery, scoped privacy and
invitation consent, stronger permissions/step-up authentication, audit coverage
(including sign-in/security events), a full ledger account model, reservations,
compensating refunds/reversals, provider reconciliation and reliable event delivery.
Finalize currency/rounding rules, lifecycle state machines and business approvals.
Add hosted PostgreSQL support and multi-worker tests, operational monitoring,
backup/restore testing, provider/POS integrations, and the applicable legal model.
Public demo credentials and seeded balances belong only in the test environment.

This first slice makes the core flows reviewable. It does not implement every
requirement in the supplied production guideline set.
