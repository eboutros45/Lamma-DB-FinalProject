# Schema decisions and open domain rules

## Translation

All 12 LDM entities are represented. `USER` becomes `users` and `TRANSACTION`
becomes `wallet_transaction` to avoid keyword conflicts. Keys use generated bigint
identities; subtype and junction keys retain their original structure.
Foreign keys use restrictive deletion by default to preserve financial history.
Unique constraints preserve the LDM one-to-one relationships, including optional
bill/shared-wallet, bill/transaction, expense/transaction, and request/transaction.
Nullable unique values allow multiple unsettled rows in PostgreSQL.

## Assumptions requiring domain confirmation

- PostgreSQL 16+ is an initial choice, not specified by the diagrams.
- Money uses exact numeric(19,4); one currency is assumed because no currency
  field was supplied. Currency and rounding rules must be settled before payments.
- Balances cannot be negative; monetary movements and allocations must be positive.
  Bill totals and item prices may be zero.
- Optional CDM relationships map to nullable foreign keys. Other nullability is
  inferred: descriptions and presentation metadata may be omitted; core names,
  amounts, statuses, and types are required. Industry and billing period are optional.
- Statuses, roles, wallet types, split methods, QR types, and category kinds remain
  text until their valid values and transitions are confirmed.
- A transaction must have at least one endpoint and cannot transfer to itself.
  This permits external deposits/withdrawals with one endpoint.
- Phone values must be normalized by the backend before storage.
- Timestamp values use timestamptz; billing period stays text until recurrence
  requirements are known.

## Rules still requiring backend logic or further database design

The schema does not enforce shared-wallet subtype/type consistency, exclusive
personal/business/shared ownership, at least one member per shared wallet, at
least one item per bill, item allocation totals, split totals, bill total equality,
settlement amount/endpoint consistency, or cross-entity access rights.
These involve multiple rows and must be designed explicitly, with transactional
checks or appropriate deferred triggers where needed.

Balances are modeled as supplied; a production ledger and atomic payment workflow
are still needed. A unique transaction link in each table does not prevent a
transaction from being linked across different tables; intended settlement sharing
must be clarified. The LDM's unique bill/shared-wallet link permits a shared wallet
to collect at most one bill; confirm this restriction before API implementation.
