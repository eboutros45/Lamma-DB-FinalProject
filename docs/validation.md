# Validation

## Current functional version

The original migration and migrations 002–004 execute against the embedded PostgreSQL
engine in PGlite. The application seeds and persists a local demo database.

`npm test` verifies 27 scenarios against an isolated PostgreSQL database:

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

Additional API tests verify consent-based and post-registration invitations,
recipient-only responses, equal/custom/percentage split integrity and rounding,
expense status updates, cancellation rules, owner-only payouts, archival blockers,
category isolation, business role enforcement/revocation and final ledger reconciliation.
The fresh-install test verifies creation of missing parent directories and data
persistence across restart.

`npx playwright test` exercises demo sign-in, insufficient-funds feedback, wallet
creation, invitation acceptance in a separate browser session, member visibility,
contribution, wallet details, categorized expense recording, split request creation,
bill review/split initiation, mobile request payment and sign-out. It checks mobile
navigation and absence of horizontal overflow at 390px and 320px. Screenshots of
desktop/mobile dashboards, wallet details and mobile forms go to ignored
`test-results/`. This is Chromium validation; physical-device Safari testing remains
recommended before distribution to iOS users.

## Limits

PGlite is PostgreSQL running in-process through WebAssembly. These checks do not
validate a remote PostgreSQL server, multiple application workers, external payment
providers, or all requirements in the production guideline set. Multi-user requests
in this local application are serialized before domain transactions execute.

## Historical initial validation

Before PostgreSQL dependencies were installed, migration 001 was checked in an
in-memory SQLite compatibility run with identity declarations adapted. That check
has now been superseded by execution and integration tests against PGlite.

## Item-based bill validation

Seven additional API tests cover automatic wallet creation, explicit joining,
blocking untracked funding, each participant’s own items, one contribution per
person, cent-exact shared portions, stale saves and payment quotes, cross-bill IDs,
releasing unpaid claims, insufficient funds, malformed quantities, competing
last-item claims, duplicate checkout, and rollback/retry when final settlement fails.
Wallet/ledger reconciliation is checked after the financial operations.

A third browser test uses separate mobile sessions for Alex and Maya. They split
three items, including a $5.01 dessert into halves ($2.51 and $2.50), and pay $19.51
and $7.50. It verifies that the business receives nothing after the first payment,
then receives exactly $27.01 after the second; the bill becomes paid and the pool
is archived at zero. The new screen is checked at 390px and 320px widths.
