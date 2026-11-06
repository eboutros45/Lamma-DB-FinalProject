# Lamma

A working backend-first application prototype for personal wallets, shared finances, and bills.
The mobile-optimized responsive UI calls the API; data persists in embedded PostgreSQL
using PGlite. All balances are **test funds**, denominated in USD with two decimal places.

## Run

Requires Node.js 22+ (Node 24 used for verification).

```sh
npm ci
npm start
```

Open http://localhost:3000. The first start applies migrations and creates demo data.
Use the demo sign-in buttons, or create an account (new accounts start at zero).

| Demo | Phone | Password |
| --- | --- | --- |
| Alex | +96170000001 | lamma-demo |
| Maya | +96170000002 | lamma-demo |

Switch accounts by signing out. Demo credentials are public and intended exclusively
for local feature testing. Phone ownership is not verified in this prototype.

`PORT` defaults to 3000, `HOST` to 0.0.0.0, and `DATA_DIR` to `data/lamma`.
Set `SECURE_COOKIES=true` when serving behind HTTPS. Do not run multiple application
processes against the same embedded database directory. Keep the data directory
private and out of Git. To use a fresh test database, set a new DATA_DIR.

## Implemented workflows

- Register/sign in/out; atomic personal-wallet provisioning and password hashing.
- Personal transfers, available balances, and transaction history.
- Shared wallets, consent-based invitations, contributions, gift delivery, owner payouts and archival.
- Send, pay, decline, or cancel payment requests; seven-day expiry.
- Record/categorize expenses; split equally, by custom amounts, or percentages and generate reimbursement requests.
- Create businesses with distinct wallets, manage team permissions, and issue itemized bills.
- Review bills by code; pay in full or start a temporary split wallet.
- Collect contributions without overfunding; settle once to the business and archive.
- Balanced, immutable ledger entries, persistent idempotency, and action audit records.

## Update an existing installation

Stop the server with Ctrl+C. If you cloned the repository, run `git pull`. If you
downloaded a ZIP, replace the application files with the latest ZIP contents while
preserving your existing `data` folder. Then run `npm ci` and `npm start`. Database
migrations apply automatically and preserve existing accounts and history. Keep a
backup of your stopped database directory before upgrading.

## Validate

```sh
npm test
npx playwright test
```

The browser tests use system Chromium when available. On macOS or a machine
without it, first run `npx playwright install chromium`. You can also set
`CHROMIUM_PATH` to your browser executable. Tests use isolated in-memory PostgreSQL databases, not the running demo.
See [validation](docs/validation.md) and [implementation scope](docs/implementation-scope.md).

## Design and requirements

The initial migration preserves the supplied CDM/LDM translation. Migrations 002 and 003
add the financial and collaboration foundations. PGlite runs a PostgreSQL engine locally; moving
the service to a hosted PostgreSQL server requires a database-driver adapter and
multi-process concurrency validation. API requests are serialized in this local
single-process version, with SQL transactions for atomic actions.

- [Development sequence](docs/development-plan.md)
- [Schema decisions](docs/schema-decisions.md)
- [Production guidelines](docs/production-guidelines/guidelines.md)
- [Original guidelines DOCX](docs/production-guidelines/LAMMA%20-%20Production%20Guideline%20Set.docx)
- [Initial schema gap review](docs/production-guidelines/schema-gap-review.md)

The agreed direction remains: validate the database, backend, and system through a
simple UI, then invest in the final modern UI after feature confirmation.
