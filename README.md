# Lamma

A working backend-first prototype for personal wallets, shared finances, and bills.
The lightweight responsive UI calls the API; data persists in embedded PostgreSQL
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
- Shared wallets, registered member addition, contributions, and gift delivery.
- Send, pay, or decline payment requests; seven-day expiry.
- Record personal/shared expenses independently from money movement.
- Create businesses with distinct wallets and issue itemized bills.
- Review bills by code; pay in full or start a temporary split wallet.
- Collect contributions without overfunding; settle once to the business and archive.
- Balanced, immutable ledger entries, persistent idempotency, and action audit records.

## Validate

```sh
npm test
npx playwright test
```

The browser test uses `/usr/bin/chromium`; adjust `playwright.config.js` for your
machine. Tests use isolated in-memory PostgreSQL databases, not the running demo.
See [validation](docs/validation.md) and [implementation scope](docs/implementation-scope.md).

## Design and requirements

The initial migration preserves the supplied CDM/LDM translation. Migration 002
adds the functional foundation. PGlite runs a PostgreSQL engine locally; moving
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
