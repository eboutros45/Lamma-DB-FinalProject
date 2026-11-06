# Validation

## Current functional version

The original migration and migration 002 execute against the embedded PostgreSQL
engine in PGlite. The application seeds and persists a local demo database.

`npm test` verifies 10 scenarios against an isolated PostgreSQL database:

1. Authentication and atomic personal-wallet provisioning.
2. Balanced transfers, idempotent retries, and payload/key conflicts.
3. Insufficient funds, invalid precision and self-transfer rejection.
4. Shared-wallet membership and administrative access enforcement.
5. Payment-request authorization and duplicate settlement prevention.
6. Split-bill overfunding prevention and concurrent contributions, with exactly one
   consolidated settlement and archival at zero balance.
7. Full bill payment without a shared wallet and duplicate payment rejection.
8. Gift payout and successful archival, including an empty-wallet failure.
9. Personal expense recording without financial movement.
10. Immutable ledger entries, rejection of unbalanced journals, and reconciliation
    of all wallet balances against ledger postings.

`npx playwright test` exercises demo sign-in, insufficient-funds feedback, shared
wallet creation, member addition, contribution, personal expense recording, bill
review and split initiation. It checks the desktop and 390px mobile layout for
horizontal overflow and captures screenshots in ignored `test-results/`.

## Limits

PGlite is PostgreSQL running in-process through WebAssembly. These checks do not
validate a remote PostgreSQL server, multiple application workers, external payment
providers, or all requirements in the production guideline set. Multi-user requests
in this local application are serialized before domain transactions execute.

## Historical initial validation

Before PostgreSQL dependencies were installed, migration 001 was checked in an
in-memory SQLite compatibility run with identity declarations adapted. That check
has now been superseded by execution and integration tests against PGlite.
