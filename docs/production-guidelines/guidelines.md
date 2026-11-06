# LAMMA — Production Guideline Set

Extracted reference text from the supplied DOCX; consult the original for layout and formatting.

LAMMA — Consolidated System Requirements

Version 1.0 | Functional, Financial, and Data Architecture Baseline

Objective: Establish a complete set of requirements for Lamma, incorporating everything we've discussed about users, businesses, wallets, shared finances, bills, transactions, and payments.

This document is intended to serve as the foundation for the final Conceptual Data Model (CDM), Logical Data Model (LDM), backend architecture, and application workflows.

One important distinction: a complete requirements specification is a prerequisite for production readiness, not proof of it. A financial platform also requires secure implementation, regulatory approval where applicable, testing, and operational safeguards.

1. Users and personal accounts

Every individual using Lamma must have a registered personal account.

Requirements

USR-01 — Account creation

A user registers using a unique, verified phone number.

The system maintains:

User ID

Phone number

First name

Last name

Account status

Creation and modification timestamps

USR-02 — Automatic wallet creation

Upon successful account creation, Lamma automatically provisions one personal wallet for the user.

Every active user must have exactly one personal wallet.

A personal wallet belongs to exactly one user.

Personal wallets cannot be transferred to another user.

Wallet provisioning must be idempotent: repeating the registration operation must not create duplicate wallets.

Account creation and wallet provisioning must have a consistent recovery mechanism if either operation fails.

USR-03 — Multiple roles

A single user can simultaneously be:

The owner of one or more businesses.

An authorized employee or manager of businesses.

The owner of multiple shared wallets.

An administrator or participant in multiple shared wallets.

The sender or recipient of payment requests.

These are roles and relationships, not separate user accounts.

USR-04 — User privacy

A user's phone number, name, and financial information must not be publicly accessible.

For transfers and invitations:

Users can identify people through their saved contacts.

A person outside the user's contacts can be invited or addressed through a phone number.

An unregistered number must not expose a person's identity.

Being able to look up a phone number must not grant access to the associated account's financial information.

Users must authenticate before accessing protected functionality.

USR-05 — Unregistered recipients

An unregistered person may receive a pending invitation to join a shared wallet or register for Lamma.

However:

They cannot hold or transfer funds through a personal Lamma wallet until registration and activation are complete.

A pending invitation must not count as an activated wallet member.

Money must not be sent to a nonexistent internal wallet.

Confirmed design decision: Lamma accounts are fundamental to the financial experience. Anonymous individuals should not be able to create fully operational shared wallets independently of registered accounts.

2. Businesses and business wallets

Businesses are registered commercial entities capable of receiving payments.

Requirements

BUS-01 — Business ownership

A user may own zero or multiple businesses.

Each business must have one designated primary owner.

A business must have its own business wallet.

The business wallet must remain separate from the owner's personal wallet.

BUS-02 — Business wallet provisioning

When a business is approved and activated, the system provisions a dedicated business wallet.

The business wallet is associated with the business, not personally owned by its manager or employees.

BUS-03 — Employee access

Businesses must support multiple authorized users with different permission levels.

The owner can assign access to employees and managers.

Proposed roles:

Role

Permissions

Owner

Full business administration, access management, and financial oversight

Manager

Business operations and selected administrative permissions

Cashier/Employee

View or issue bills and perform explicitly authorized operations

Viewer

Read-only access to permitted business information

BUS-04 — Role-based access control

A user may work for multiple businesses and have a different role in each.

Permissions must be enforced by the backend, not only hidden through the application interface.

Business owners should be able to revoke access immediately.

Sensitive actions, such as changing payout destinations or granting financial permissions, require additional security controls.

BUS-05 — Business payment acceptance

A business can:

Issue bills.

Receive full-bill payments.

Receive consolidated split-bill payments.

Review its transaction and settlement history.

Identify whether a bill is unpaid, partially funded, paid, cancelled, or refunded, as applicable.

Important CDM addition: A relationship between USER and BUSINESS representing authorized employment or access.

For example:

USER — HAS_BUSINESS_ACCESS — BUSINESS

This is separate from business ownership.

3. Wallet architecture

The WALLET entity is the central representation of a financial account.

Requirements

WAL-01 — Wallet types

Lamma supports three primary wallet types:

Type

Purpose

Personal wallet

Individual user funds

Business wallet

Business funds and payment collection

Shared wallet

Group finances and collective payments

WAL-02 — Common wallet attributes

Every wallet requires:

Unique wallet ID

Wallet type

Wallet status

Currency

Creation timestamp

Available balance information

Additional attributes depend on its wallet type.

WAL-03 — Wallet ownership

Personal wallets are associated with users.

Business wallets are associated with businesses.

Shared wallets are associated with their members and governed by designated owners and administrators.

WAL-04 — Wallet lifecycle

Wallets must support explicit lifecycle states.

For example:

PENDING → ACTIVE → RESTRICTED → CLOSED

Shared wallets may additionally be archived.

An archived wallet:

Is no longer available for ordinary payments or contributions.

Retains historical transaction records.

Remains available for authorized historical review.

Cannot be silently deleted if financial records must be retained.

WAL-05 — Balances

Wallet balances must be derived from, or reliably reconciled against, recorded financial movements.

The wallet balance must never be treated as an independently editable number.

All transfers must pass through controlled financial transaction processing.

WAL-06 — Currency

Every wallet must have an explicitly defined currency.

For the initial release, Lamma may support a single operating currency or multiple currencies, but the decision must be made explicitly.

A multi-currency system requires additional foreign-exchange and settlement functionality.

4. Shared wallets

Shared wallets allow multiple registered users to manage money collectively.

Requirements

SHW-01 — Shared wallet creation

A registered user can create a shared wallet and becomes its initial owner.

A shared wallet includes:

Purpose

Description

Target amount, when applicable

Currency

Status

Creation timestamp

Optional expiration date

SHW-02 — Membership

A user may belong to multiple shared wallets.

A shared wallet can have multiple registered members.

Membership must track:

Member

Shared wallet

Role

Membership status

Joining date

Invitation information, where applicable

SHW-03 — Roles

Each shared wallet supports the following roles:

Role

Responsibilities

Owner

Controls the shared wallet, membership permissions, and closure, subject to financial restrictions

Administrator

Manages permitted activities and members

Participant

Contributes money and participates in authorized expenses

The owner is a member with additional permissions.

SHW-04 — Membership permissions

Permissions must be explicit.

Examples include:

Invite members.

Remove members.

View shared expenses.

Create expenses.

Initiate payment requests.

Approve permitted transfers.

Close or archive the wallet.

A participant must not automatically receive administrative permissions.

SHW-05 — Funding

Members can transfer money from their personal wallets to a shared wallet.

Each contribution creates a financial transaction.

SHW-06 — Outgoing payments

Funds can leave the shared wallet only through an authorized transaction.

Ordinary shared wallets may support different payment authorization rules from temporary bill wallets.

For example, a general shared wallet may require owner approval, while a temporary restaurant wallet automatically releases funds when its funding conditions are satisfied.

SHW-07 — Archiving

Archiving prevents further ordinary activity while retaining the wallet's historical records.

Before archiving, the system must determine:

Whether there are pending transactions.

Whether any money remains.

Whether refunds or reversals are pending.

Whether the wallet has unsettled obligations.

A wallet must not simply disappear when its purpose is fulfilled.

5. Gift shared wallets

A shared wallet can be created to collect money for one intended recipient.

Requirements

GFT-01 — Gift creation

A user creates a shared wallet with the purpose GIFT.

The creator becomes its owner.

GFT-02 — Intended recipient

A gift wallet may identify one intended beneficiary.

The beneficiary may or may not be a member of the shared wallet.

This distinction matters because contributors may wish to keep a gift secret.

GFT-03 — Contributors

Multiple users may join the gift wallet and contribute funds.

GFT-04 — Gift delivery

When the gift is ready:

The wallet owner initiates gift delivery.

Lamma validates the intended beneficiary.

The gift wallet transfers the collected balance to the beneficiary's personal wallet.

A transaction records the transfer.

After successful settlement and resolution of any remaining obligations, the gift wallet is archived.

GFT-05 — Recipient not registered

If the intended beneficiary is not registered, the system must not perform a transfer to a nonexistent wallet.

The gift may remain pending until registration, subject to expiration and refund rules.

GFT-06 — Failed gift delivery

If the final gift transfer fails, the shared wallet must not be marked as successfully delivered.

Its funds remain accounted for until the transfer is retried, cancelled, or refunded.

Confirmed design decision: Gift delivery results in the shared wallet being archived, but only after the financial transfer succeeds.

6. Bills and bill items

Bills originate from businesses and represent amounts owed for goods or services.

Requirements

BIL-01 — Bill issuance

Every bill must be issued by exactly one business.

A business may issue multiple bills.

BIL-02 — Bill information

A bill contains:

Internal bill ID

External POS bill ID, when applicable

Issuing business

Total amount

Currency

Status

Creation timestamp

Payment timestamp

Original bill reference or version information

BIL-03 — Bill items

A bill contains one or more bill items.

Each bill item belongs to exactly one bill.

Items include:

Item ID

Name

Quantity

Unit price

Item total

Tax or adjustment information, if applicable

BIL-04 — External POS integration

The restaurant's POS system remains the source of the original bill.

Lamma imports or retrieves bill details for payment processing.

Lamma does not need to maintain the restaurant's product catalog.

BIL-05 — Bill-specific item snapshots

Each bill has its own item records.

Identical products appearing on different bills are separate bill items.

For example, a burger on Bill #101 and a burger on Bill #102 are separate records.

The imported bill snapshot must preserve the financial terms used during payment.

BIL-06 — Payment options

Users can choose between:

Paying the entire bill.

Splitting the bill between multiple participants.

BIL-07 — Bill presentation

Before confirming payment, users must be able to review:

Business name

Bill items

Quantities

Prices

Taxes and service charges

Total amount

Their selected or allocated share

This is an application requirement rather than an additional CDM relationship.

BIL-08 — Bill amount integrity

The bill's financial breakdown must reconcile with its total.

Any adjustments must be represented explicitly.

Amounts must use exact monetary representations, not floating-point approximations.

BIL-09 — Bill status

A bill should support states such as:

OPEN → PAYMENT_PENDING → PAID

With additional paths for cancellation, expiration, and refunds.

A bill is only considered paid after its settlement transaction succeeds.

7. Full-bill payments

This is the simpler of the two restaurant payment workflows.

Requirements

PAY-01 — Full payment selection

A user can select PAY_FULL_BILL.

PAY-02 — Payment validation

Before proceeding, Lamma verifies:

The bill exists.

The bill is payable.

Its amount is valid.

The user is authorized to initiate payment.

The user's wallet has sufficient available funds.

The bill is not already paid.

PAY-03 — Transaction creation

The backend creates a transaction for the full outstanding amount.

The transaction identifies:

Sending wallet: user's personal wallet.

Receiving wallet: business wallet.

Amount and currency.

Related bill.

PAY-04 — Settlement

Once the payment succeeds:

The business receives the payment.

The transaction is marked as completed.

The bill is marked as paid.

PAY-05 — Duplicate prevention

Two concurrent payment attempts must not result in the same bill being paid twice.

Payment operations require idempotency and transactional consistency.

Confirmed design decision: Full-bill payment does not require creating a temporary shared wallet.

8. Split-bill payments through temporary shared wallets

This is one of Lamma's defining features.

Requirements

SPL-01 — Split-bill initiation

When a user chooses to split a bill, Lamma creates a temporary shared wallet associated with that specific bill.

SPL-02 — Bill association

A bill may use zero or one temporary shared wallet.

Each temporary bill wallet must be associated with exactly one bill.

General-purpose and gift shared wallets do not require a bill association.

SPL-03 — Target amount

The temporary shared wallet's target equals the amount required to settle the bill.

For a $100 bill:

target_amount = $100

SPL-04 — Participant invitations

The person initiating the split may invite participants.

Invitations may use phone numbers or existing contacts.

Participants must register and activate the necessary wallet functionality before contributing.

SPL-05 — Bill item visibility

Every participant can view the bill's imported items.

Items remain associated with the original bill, not duplicated into an independent product catalog or owned by the temporary shared wallet.

SPL-06 — Item-based allocation

Participants can select items or portions of items.

The system tracks each participant's allocation.

For example:

User

Selected items

Allocated amount

John

Burger + drink

$25

Sarah

Pizza

$30

Anthony

Pasta

$25

Kevin

Dessert + drink

$20

Total allocation: $100.

SPL-07 — Other split methods

The intended split-bill workflow should also support, if enabled:

Equal splitting.

Custom amounts.

Item-based splitting.

These methods share the same payment and settlement infrastructure.

SPL-08 — Allocation integrity

Before collecting payment, Lamma must prevent:

Duplicate allocation of the same payable amount.

Unallocated charges being overlooked.

Contributions exceeding the permitted outstanding amount.

Inconsistent rounding.

Allocation changes that conflict with completed payments.

Where tax, tips, discounts, or service charges are involved, the system must define how they are distributed.

SPL-09 — Individual contributions

Each participant pays their allocated share from their personal wallet.

Every contribution creates a separate transaction:

PERSONAL_WALLET → TEMPORARY_SHARED_WALLET

SPL-10 — Pooling funds

The shared wallet accumulates successful contributions until the required amount is reached.

Example:

User

Contribution

Collected

John

$30

$30

Sarah

$25

$55

Anthony

$25

$80

Kevin

$20

$100

SPL-11 — Consolidated settlement

Once the full amount is successfully collected, Lamma initiates one consolidated payment:

TEMPORARY_SHARED_WALLET → BUSINESS_WALLET

The restaurant receives a single $100 settlement transaction, rather than four separate customer transactions.

SPL-12 — Final transaction

The consolidated transaction is associated with the bill through:

BILL — PAID_THROUGH — TRANSACTION

The individual contribution transactions are associated with the temporary shared wallet.

SPL-13 — Successful completion

After the consolidated transaction succeeds:

The bill becomes PAID.

The shared wallet's balance becomes zero, assuming no adjustments or fees remain.

The shared wallet becomes inactive and is archived.

Its members can retain authorized access to their contribution records.

SPL-14 — Incomplete funding

If the required amount is not collected, the business must not receive an incorrectly marked full payment.

The system needs rules for:

Contribution deadlines.

Participant withdrawals.

Reassigning unpaid portions.

Cancellation.

Refunding contributions.

SPL-15 — Settlement failure

If the final payment to the restaurant fails:

The bill remains unpaid.

The shared wallet remains accountable for the pooled funds.

Lamma records the failed settlement attempt.

A controlled retry or cancellation process is initiated.

SPL-16 — Concurrency

The system must prevent concurrent contributions or settlement attempts from:

Overfunding the wallet.

Triggering multiple consolidated transfers.

Producing inconsistent balances.

Confirmed design decision: The business receives one consolidated payment after the total amount has been collected.

9. Transactions — The financial engine

The TRANSACTION entity is responsible for representing every movement of money within Lamma.

Transactions are not limited to user-to-user payments. They also support deposits, withdrawals, bill payments, shared-wallet contributions, gift transfers, and settlement of payment requests.

Requirements

TRX-01 — Universal financial transactions

Every movement of money must be associated with a transaction record.

Examples include:

Transaction type

Source

Destination

Personal transfer

User wallet A

User wallet B

Business payment

User wallet

Business wallet

Shared-wallet contribution

Personal wallet

Shared wallet

Shared-wallet payout

Shared wallet

Business wallet

Gift delivery

Gift shared wallet

Recipient wallet

Payment request settlement

Payer's wallet

Receiving wallet

Expense payment

Authorized wallet

Recipient wallet

Deposit

External funding source

Personal wallet

Withdrawal

Personal wallet

External payout destination

Refund

Appropriate funding source

Original payer or destination

External funding and payout methods require additional integration models.

TRX-02 — Transaction attributes

A transaction should contain:

Transaction ID

Unique reference code

Transaction type

Amount

Currency

Status

Creation timestamp

Completion timestamp

Failure reason, if applicable

Idempotency key

Relevant financial references

TRX-03 — Transaction lifecycle

Transactions must support states such as:

CREATED → PENDING → PROCESSING → COMPLETED

Alternative outcomes include:

FAILED, CANCELLED, and, where appropriate, EXPIRED.

A completed financial transfer must not be silently deleted or changed into a failed transfer after posting.

TRX-04 — Source and destination

Internal wallet transfers have:

One sending wallet.

One receiving wallet.

The sending and receiving roles are represented by the existing SENDS and RECEIVES relationships.

Transactions involving external accounts require separately modeled external endpoints.

TRX-05 — Transaction settlement

A transaction may settle an obligation, such as:

A bill.

An expense.

A payment request.

A gift transfer.

However, the transaction amount and the obligation amount are separate concepts.

An obligation represents what is owed. A completed transaction records what was actually transferred.

TRX-06 — Transaction immutability

Once posted, the financial effects of a transaction cannot be edited or deleted.

Corrections require compensating transactions or explicit reversals.

TRX-07 — Atomic execution

Internal transfers must be atomic.

For a $50 transfer:

$50 is debited from the sender.

$50 is credited to the recipient.

Either both financial postings succeed, or neither does.

There must never be a successful debit without the corresponding accounted-for credit.

TRX-08 — Idempotency

Retries caused by network errors, application crashes, or repeated button presses must not create duplicate payments.

TRX-09 — Transaction history

Users and businesses may view transaction histories according to their permissions.

A user must not automatically be able to view every transaction associated with a wallet simply because they know its identifier.

10. Financial ledger — Critical production addition

This was not explicitly represented in your original CDM, but a production financial system needs a reliable ledger beneath the transaction abstraction.

A TRANSACTION describes a financial operation.

A LEDGER_ENTRY records its accounting effect.

These are not the same thing.

Requirements

LED-01 — Double-entry accounting

Each financial movement must generate balanced ledger postings.

For an internal transfer of $50:

Account

Debit

Credit

Sender wallet liability

$50

—

Receiver wallet liability

—

$50

This assumes wallet balances represent amounts Lamma owes to wallet holders.

Every complete journal must balance.

LED-02 — Ledger records

Ledger entries should include:

Entry ID

Transaction or journal reference

Ledger account

Debit or credit amount

Currency

Posting timestamp

LED-03 — Ledger consistency

Completed transactions must reconcile with corresponding ledger entries.

LED-04 — Available versus reserved funds

Lamma must distinguish funds available for spending from funds temporarily reserved for pending operations.

For example, when a user confirms a payment, funds may need to be reserved until settlement completes.

LED-05 — Reconciliation

Lamma must periodically reconcile:

Wallet balances.

Internal ledger balances.

Payment processor balances.

Bank or custody balances, where applicable.

Discrepancies must be investigated and recorded.

LED-06 — Financial precision

Use decimal or integer minor-unit monetary values with explicit currency precision.

Do not use binary floating-point types for financial calculations.

Does this replace TRANSACTION?

No.

The structure becomes:

TRANSACTION

    │

    │ RECORDED_BY

    ▼

LEDGER_ENTRY

    │

    │ POSTED_TO

    ▼

LEDGER_ACCOUNT

A single transaction may produce multiple ledger entries.

Recommendation: Add the ledger model to the LDM and financial architecture. It may also appear in an expanded production CDM, although a simplified academic CDM can abstract these accounting details.

11. Payment requests

Users can request money from other users.

Requirements

REQ-01 — Request creation

A registered user can create a payment request specifying:

Recipient

Amount

Currency

Description

Optional due date

Destination wallet

REQ-02 — Request destination

A payment request may direct funds to:

The creator's personal wallet.

An authorized shared wallet.

For example:

John requests $20 from Sarah.

Sarah's wallet → John's wallet

Alternatively, John requests Sarah's contribution to a shared wallet.

Sarah's wallet → Shared wallet

REQ-03 — Request relationships

Every request must have:

One creator.

One intended recipient.

A request may also reference:

One expense.

One shared wallet.

One settlement transaction.

REQ-04 — Request status

Recommended lifecycle:

PENDING → ACCEPTED → PAID

Alternative outcomes:

Declined

Cancelled

Expired

Acceptance and actual financial settlement are distinct events.

REQ-05 — Settlement

When a payment request is paid, a transaction transfers money from the recipient's wallet to the designated destination.

REQ-06 — Duplicate settlement prevention

A request must not be paid twice.

REQ-07 — Expiration

Requests may expire after a predefined deadline.

REQ-08 — Partial payments

For the initial model, payment requests can be settled in full through one transaction.

Partial payments are a potential future extension requiring an additional settlement structure.

Important CDM correction: PAYMENT_REQUEST — DESTINED_FOR — SHARED_WALLET must be optional on the PAYMENT_REQUEST side if users can request money for personal wallets.

A request for a personal payment must not require a shared wallet.

12. Expenses

Expenses represent financial obligations or spending records that users may track or settle.

Requirements

EXP-01 — Expense creation

Authorized users can create expenses containing:

Expense ID

Title

Amount

Currency

Expense date

Description

Category

Split method, when applicable

Expense status

EXP-02 — Shared-wallet expenses

A shared wallet may contain multiple expenses.

Each expense may belong to one shared wallet.

EXP-03 — Personal expenses

Users should also be able to track individual expenses independently of shared wallets.

This requires either:

An explicit USER–EXPENSE relationship, or

An ownership/recording relationship through a personal wallet.

EXP-04 — Expense splitting

An expense may be divided among multiple participants.

Supported allocation methods may include:

Equal split.

Custom amounts.

Percentage-based split.

EXP-05 — Payment requests

An expense may generate multiple payment requests.

For example, a $90 expense shared by three people may generate payment requests for the participants who owe money.

EXP-06 — Expense settlement

An expense may be linked to financial transactions that settle it.

For the initial release, one full settlement transaction may be sufficient for simple expenses.

However, expenses involving multiple contributions may require a separate allocation or settlement structure.

EXP-07 — Expense status

Expenses should distinguish:

Unpaid.

Partially settled.

Paid.

Cancelled.

EXP-08 — Separation from transactions

An expense represents spending or an obligation.

A transaction represents money movement.

For example, recording a $200 rent expense does not automatically mean $200 has left a wallet.

13. Categories and personalization

Users can categorize their financial activity for budgeting and reporting.

Requirements

CAT-01 — Category types

Categories can classify:

Transactions.

Expenses.

CAT-02 — Default categories

Lamma may provide categories such as:

Food & Dining

Transportation

Shopping

Entertainment

Utilities

Healthcare

Other

CAT-03 — Custom categories

Users should be able to create personalized categories.

Examples:

University

Weekend outings

Car expenses

CAT-04 — Category ownership

Custom categories should belong to their creator or designated organizational scope.

One user's custom categories must not automatically appear in another user's account.

CAT-05 — Category attributes

Categories should contain:

Category ID

Name

Category type

Icon

Color

Ownership scope

Active status

CAT-06 — Classification

A transaction or expense may belong to zero or one category in the initial design.

A category may classify multiple records.

CAT-07 — Personal transaction classification

If users participating in the same financial transaction can assign different personal categories, Lamma must store the classification in the context of each user.

For example:

John sends Sarah $50.

John categorizes the payment as Entertainment.

Sarah categorizes the receipt as Personal.

One global TRANSACTION — CLASSIFIED_AS — CATEGORY relationship cannot represent both classifications independently.

Recommendation: Introduce user-specific financial categorization in the logical model rather than treating all transaction categories as globally shared.

14. Security, privacy, and access control

Because Lamma handles financial assets, security must be designed into the architecture rather than added after implementation.

Requirements

SEC-01 — Authentication

All users must authenticate before accessing protected account and wallet functionality.

High-risk activities may require additional verification.

SEC-02 — Authorization

Backend authorization must verify every operation against the user's actual permissions.

Knowing a wallet ID, bill ID, or business ID must not grant access.

SEC-03 — Business permissions

Business owners can delegate access to managers and employees.

A manager may delegate permissions only if explicitly authorized to do so.

SEC-04 — Shared-wallet permissions

Shared-wallet roles determine who can:

Manage members.

Create expenses.

Approve outgoing payments.

Access financial records.

Initiate closure.

SEC-05 — Privacy

Account names, phone numbers, wallet balances, and transaction histories must not be exposed through unrestricted searches.

Contact-based discovery must use privacy-preserving mechanisms.

SEC-06 — Sensitive actions

Transfers, beneficiary changes, ownership transfers, and permission changes require appropriate authentication and fraud controls.

SEC-07 — Audit logs

Lamma must record important security and administrative actions, including:

Login events.

Permission changes.

Membership changes.

Business ownership changes.

Sensitive wallet operations.

Payment failures and reversals.

SEC-08 — Data protection

Sensitive information must be encrypted in transit and protected at rest. Access to financial and personal data must follow least-privilege principles.

SEC-09 — Abuse prevention

Lamma must protect against:

Brute-force attacks.

Account enumeration.

Unauthorized transfers.

Repeated payment requests.

Fraudulent invitations.

Transaction replay.

Excessive API requests.

15. Reliability and production operations

Requirements

OPS-01 — Database integrity

Use foreign keys, uniqueness constraints, transactions, and appropriate database isolation to protect financial data.

OPS-02 — Concurrency control

Concurrent requests must not produce inconsistent balances or duplicate settlements.

This is particularly important when multiple users fund the same temporary shared wallet simultaneously.

OPS-03 — Event processing

Events such as payment completion and bill settlement should be processed reliably.

Retries must be safe and idempotent.

OPS-04 — Failure recovery

A network failure must not cause Lamma to lose track of whether money was transferred.

Operations must be recoverable using persistent transaction states and processor references.

OPS-05 — Monitoring

Production systems require monitoring for:

Failed transactions.

Delayed settlements.

Ledger discrepancies.

Unexpected wallet balances.

Unusual transaction activity.

External payment provider failures.

OPS-06 — Backups and disaster recovery

Financial records require tested backup, recovery, and retention policies.

OPS-07 — Refunds and reversals

Lamma must support controlled refunds and reversals, including cases where the original wallet has been archived.

Refunds must preserve the original financial history rather than deleting transactions.

OPS-08 — API security

External POS integrations must authenticate business systems, validate bill data, and prevent unauthorized bill modification.

OPS-09 — Regulatory requirements

Before handling real customer funds, Lamma must establish its legal and operational model.

This includes determining:

Whether Lamma is licensed to hold customer funds.

Whether it must operate through a licensed payment service provider.

Applicable KYC and AML requirements.

Safeguarding of customer funds.

Record retention requirements.

Dispute resolution and consumer protection procedures.

Given Lamma's intended operation in Lebanon, applicable Banque du Liban requirements and local financial regulations need qualified legal review.

This is a launch blocker, not simply a future enhancement.

16. Final CDM alignment

Based on your original diagram and our discussions, this is how I would align the data model with the requirements.

Existing relationships to keep

Relationship

USER / Source cardinality

Target cardinality

USER — OWNS — BUSINESS

(0,n)

(1,1)

USER — HAS_PERSONAL_WALLET — WALLET

(1,1)

(0,1)

USER — MEMBER_OF — SHARED_WALLET

(0,n)

(1,n)

BUSINESS — HAS_WALLET — WALLET

(1,1)

(0,1)

BUSINESS — ISSUES — BILL

(0,n)

(1,1)

BILL — CONTAINS — BILL_ITEM

(1,n)

(1,1)

USER — SELECTS — BILL_ITEM

(0,n)

(0,n)

WALLET — SENDS — TRANSACTION

(0,n)

(0,1)

WALLET — RECEIVES — TRANSACTION

(0,n)

(0,1)

BILL — PAID_THROUGH — TRANSACTION

(0,1)

(0,1)

SHARED_WALLET — HAS_EXPENSE — EXPENSE

(0,n)

(0,1)

EXPENSE — GENERATES — PAYMENT_REQUEST

(0,n)

(0,1)

USER — CREATES — PAYMENT_REQUEST

(0,n)

(1,1)

USER — RECEIVES — PAYMENT_REQUEST

(0,n)

(1,1)

PAYMENT_REQUEST — SETTLED_BY — TRANSACTION

(0,1)

(0,1)

Note: Cardinalities in this table describe participation of each named entity. They are not foreign-key placement instructions.

Some relationships are deliberately optional because not all transactions involve two internal wallets, and not all payment requests arise from expenses.

Relationships to add or refine

Change

Reason

Recommendation

Add USER — HAS_BUSINESS_ACCESS — BUSINESS

Support employees and managers

Many-to-many with role and permission information

Add BILL — USES — SHARED_WALLET

Identify temporary bill wallets

BILL (0,1), SHARED_WALLET (0,1), with a subtype constraint

Refine BILL — COLLECTED_THROUGH — WALLET

A business wallet collects many bills

BILL (0,1), WALLET (0,n)

Refine PAYMENT_REQUEST — DESTINED_FOR — SHARED_WALLET

Support personal requests

Shared wallet destination optional

Add USER — CREATES — SHARED_WALLET

Identify the original creator

USER (0,n), SHARED_WALLET (1,1)

Add USER — RECORDS — EXPENSE

Support personal expense records

USER (0,n), EXPENSE (0,1), if independently recorded expenses are supported

Add CATEGORY ownership

Allow personal categorization

User-owned or system-defined categories

Add financial ledger structure

Support reliable accounting

TRANSACTION, LEDGER_ENTRY, LEDGER_ACCOUNT

Refine bill allocations

Support partial quantities and fees

Dedicated allocation structure in the LDM

The existing USER — INTENDED_FOR — SHARED_WALLET relationship remains valid for gift wallets. In the logical model, its implementation should ensure that a beneficiary is not confused with an authorized member.

Important modeling clarification

The BILL–TRANSACTION relationship can remain optional one-to-one under your agreed single-settlement design.

For a split bill, the contributions flow into the temporary shared wallet. Only the final consolidated payment is directly associated with the bill through PAID_THROUGH.

That relationship should identify the successful settlement transaction. Failed attempts and payment-recovery records must still be retained elsewhere.

Likewise, the shared wallet should not duplicate bill items. It should reference the bill, while item selections and allocations refer to the bill's existing item records.

17. Final architecture — Three principal payment workflows

A. Personal or direct business payment

USER A / PERSONAL WALLET

             │

             ▼

        TRANSACTION

             │

             ▼

USER B / PERSONAL WALLET

             OR

      BUSINESS WALLET

The transaction records the direct financial movement.

B. Restaurant split-bill payment

BUSINESS

   │

   │ ISSUES

   ▼

BILL ─────────────── BILL_ITEMS

   │                       │

   │                       │ SELECTED BY

   │                       ▼

   │                     USERS

   │                       │

   │ USES                  │ CONTRIBUTIONS

   ▼                       ▼

TEMPORARY SHARED WALLET ◄──┘

   │

   │ TARGET REACHED

   ▼

FINAL CONSOLIDATED TRANSACTION

   │

   ▼

BUSINESS WALLET

   │

   ▼

BILL PAID

   │

   ▼

TEMPORARY WALLET ARCHIVED

C. Gift shared wallet

USER CREATES GIFT WALLET

            │

            ▼

     SHARED WALLET

            ▲

            │

    MEMBERS CONTRIBUTE

            │

            ▼

      GIFT DELIVERY

            │

            ▼

    RECIPIENT'S WALLET

            │

            ▼

    GIFT WALLET ARCHIVED

All three workflows use the same underlying financial transaction infrastructure.

18. Decisions that must be finalized before implementation

Most of the conceptual architecture is now established. The remaining issues concern precise business rules rather than inventing new core functionality.

Decision

Recommended initial rule

Wallet currency

Single currency for MVP; currency must still be explicitly stored

Business ownership

One primary owner, multiple authorized employees

Business role administration

Owner grants administrative authority; delegated managers operate within assigned limits

Shared-wallet ownership

One primary owner, multiple administrators and participants

Temporary bill wallet

One per bill, created only when splitting

Split-bill allocation

Item-based, equal, and custom amounts

Bill settlement

One consolidated payment to business

Temporary wallet expiration

Configurable deadline

Incomplete bill funding

Cancel and refund contributions using recorded transactions

Failed final settlement

Preserve funds and attempt controlled recovery

Gift transfer

One intended beneficiary

Gift wallet closure

Archive only after successful transfer

Payment requests

Full settlement initially; partial payments deferred

Shared-wallet outbound payments

Permission-based, except authorized automatic settlement

Categories

System defaults plus user-specific categories

Refunds

Supported without deleting original transactions

Transaction storage

Immutable financial postings with auditable reversal processes

Three additional policies need explicit product decisions before coding: whether users can change bill allocations after contributions start; who pays payment-processing fees; and what happens if a restaurant cancels or changes a bill after the temporary shared wallet has received money.

For the MVP, I recommend locking the payable bill amount once funding begins, requiring all fees to be disclosed before confirmation, and cancelling/refunding the funding session if a material bill change occurs.

Your existing requirements already account for contact-based discovery under USR-04 (User Privacy) and USR-05 (Unregistered Recipients).

However, your updated proposal introduces specific rules for contact synchronization, identity visibility, and recipient verification.

You do not need to regenerate the entire requirements document. Add the following as a new section.

19. Contact Synchronization, User Discovery & Identity Privacy

Objective: Allow Lamma users to identify and interact with people they already know while minimizing the exposure of personal information to strangers.

Lamma uses a contact-based identity disclosure model, where visibility of a registered user's name depends on whether the requesting user has that person's phone number saved in their contacts.

19.1 Contact synchronization

CON-01 — Contact permissions

During onboarding, Lamma may request permission to access the user's device contacts.

Contact access must be optional.

Users must explicitly grant permission through their device.

Refusing permission must not prevent account creation or basic wallet functionality.

Users must be able to revoke access.

CON-02 — Contact synchronization

Once permission is granted, Lamma imports the necessary phone numbers from the user's contacts.

The system uses these numbers to identify contacts who have registered Lamma accounts.

CON-03 — Phone number normalization

Phone numbers must be normalized to a consistent international format, such as E.164.

For example:

+96170123456

This prevents mismatches caused by different phone-number formats.

CON-04 — Data minimization

Lamma should not upload unnecessary contact information.

For contact discovery, phone numbers are sufficient.

The application does not need to collect:

Contact addresses.

Birthdays.

Personal notes.

Contact photographs.

Email addresses.

CON-05 — Contact data protection

Contact data must be protected during synchronization, storage, and matching.

For production, I recommend using a privacy-preserving contact discovery mechanism rather than uploading and permanently storing an entire address book in plaintext.

Simply hashing phone numbers is not sufficient to guarantee privacy because phone-number spaces can be enumerated.

19.2 User identity visibility

CON-06 — Registered contact identification

When User A attempts to interact with User B:

Lamma checks whether User B's phone number exists in User A's synchronized contacts.

Lamma checks whether User B has a registered Lamma account.

If both conditions are satisfied, Lamma may display User B's registered first and last name.

Example:

John has Sarah's phone number saved in his contacts.

Sarah has a registered Lamma account.

When John selects Sarah as a transaction recipient, Lamma displays:

Sarah Haddad

The name comes from Sarah's Lamma profile, not necessarily from the name John saved in his phone.

This helps John verify that he selected the intended account.

CON-07 — Unknown users

If a phone number is not present in the requesting user's contacts, Lamma must not automatically reveal the registered account holder's full name.

For example:

John enters a phone number that is not saved in his contacts.

Lamma does not disclose the corresponding person's first and last name simply because the number exists in its database.

Important: Hiding the name alone is not sufficient if the system still reveals whether an arbitrary phone number has a registered account.

Account-existence disclosure must also be controlled.

CON-08 — Name disclosure does not grant additional permissions

Knowing someone's phone number or having them in a contact list does not grant access to their:

Wallet balance.

Transaction history.

Shared-wallet memberships.

Business relationships.

Personal account details.

Contact-based name visibility is strictly an identity-display rule.

19.3 Contact-based functionality

CON-09 — Personal transactions

When initiating a transfer, a user can select a recipient from their contacts.

If the selected number belongs to a registered Lamma user and the applicable privacy conditions are met, Lamma displays their registered name before payment confirmation.

CON-10 — Shared-wallet invitations

When creating or managing a shared wallet, users can invite participants through their contacts.

The same identity-visibility rules apply.

CON-11 — Payment requests

Users can select recipients from their contacts when creating payment requests.

The recipient's registered name may be displayed according to the contact-based identity policy.

CON-12 — Business and group workflows

Contact-based discovery also applies when:

Assigning shared-wallet members.

Inviting gift contributors.

Adding authorized business users.

Managing group expenses.

However, adding someone to contacts must not automatically authorize financial or administrative access. Invitations and permissions remain separate operations.

19.4 Unregistered contacts

CON-13 — Contact not registered

If the selected contact does not have a Lamma account:

The user may initiate an invitation.

Lamma may create a pending invitation record.

No active personal wallet is created for the recipient.

No internal financial transfer is executed to that recipient.

CON-14 — Registration after invitation

When the invited person registers and verifies ownership of their phone number, Lamma may associate eligible pending invitations with their new account.

The recipient must still accept invitations where acceptance is required.

19.5 Privacy and security safeguards

CON-15 — Server-side enforcement

Identity visibility must be enforced by the backend.

The application must not retrieve everyone's registered names and merely hide them in the interface.

CON-16 — Protection against contact-list abuse

Lamma must prevent users from exploiting the contact-discovery mechanism to obtain the identities of arbitrary phone-number owners.

This is particularly important because a malicious user could programmatically add thousands of numbers to their contacts.

Recommended safeguards include:

Rate limits on contact matching.

Limits on bulk synchronization.

Abuse detection.

Restrictions on repeated identity lookups.

Prevention of unrestricted account enumeration.

CON-17 — Contact deletion and revocation

Users must be able to revoke contact synchronization.

Lamma must define how previously synchronized contact data is deleted or invalidated.

CON-18 — Contact ownership verification

A phone number being saved in someone's address book does not prove they personally know its owner.

Therefore, contact membership must not be treated as an authorization credential.

CON-19 — Recipient confirmation

Before executing a financial transfer, Lamma must display enough permitted information for the sender to verify the intended destination.

If a recipient's name cannot be disclosed under the privacy policy, the application should use an alternative secure confirmation method rather than relying on an unverified phone number alone.

19.6 CDM implications

Your current financial CDM does not require any modifications to support this functionality.

Contact synchronization is primarily an identity-discovery and privacy feature.

However, the production database will need supporting data structures.

Recommended additional entities

Entity

Purpose

CONTACT_SYNC

Records synchronization state, consent, and relevant metadata.

CONTACT_MATCH

Represents authorized contact-discovery matches, if persistent matching is needed.

USER_INVITATION

Tracks pending invitations to unregistered users or shared wallets.

These entities should not expose a complete address book to other users.

The actual implementation may avoid persistent CONTACT_MATCH records if a privacy-preserving discovery service can perform matching without storing those associations long-term.

Recommended relationship

If contact matches must be represented in the conceptual model:

USER — HAS_CONTACT_MATCH — USER

This is a directed relationship.

A match from John to Sarah does not imply a match from Sarah to John.

In other words:

John having Sarah's number does not mean Sarah has John's number.

This distinction is important because identity visibility is evaluated independently for each requesting user.

19.7 Important privacy limitation

Your proposal is a reasonable starting point because it avoids making every Lamma user's full name universally searchable.

However, it does not completely prevent identity harvesting.

For example, a malicious user could import a large collection of phone numbers into their contacts and attempt to discover the names associated with those numbers.

Rate limits reduce this risk but cannot eliminate it.

For stronger production-level privacy, I recommend adding two controls:

1. User-controlled discoverability

Users can decide whether their Lamma profile is discoverable through contact matching.

2. Stronger identity protection

For higher-risk interactions, consider displaying a limited identity preview until the recipient accepts an invitation or another trusted verification process succeeds.

This provides greater protection than contact membership alone.

There is also a trade-off: hiding a recipient's identity may make it harder for a sender to detect an incorrectly entered payment destination. Lamma must balance privacy against payment safety.

19.8 Final functional example

Suppose John wants to add Sarah to a shared wallet.

Scenario A — Sarah is in John's contacts

John opens the shared-wallet invitation screen.

John selects Sarah from his contacts.

Lamma securely matches Sarah's phone number.

Sarah's registered Lamma first and last name are displayed, subject to her discoverability settings.

John sends the invitation.

Sarah accepts.

Sarah becomes a member of the shared wallet.

Scenario B — Sarah is not in John's contacts

John manually enters Sarah's phone number.

Lamma does not automatically disclose her registered name.

John can initiate the permitted invitation process.

Sarah receives and accepts the invitation.

Only then does John receive the identity information necessary for their shared-wallet interaction, according to the privacy policy.

Final decision

Keep the existing CDM and add Section 19 to your requirements.

The financial model does not change. Contact synchronization determines how users discover and identify potential recipients; it does not change how wallets, transactions, bills, or payment requests operate.

For the initial implementation, I would establish this principle:

Lamma prioritizes contact-based user discovery over public identity searches. Registered names are disclosed only under defined privacy conditions, and possessing someone's phone number never provides access to their financial information.

That gives you a consistent foundation for identity discovery across transfers, shared wallets, business permissions, and payment requests.

Final assessment

Your Lamma model now has a coherent foundation built around:

USER — Identity and participation.

BUSINESS — Merchant ownership, access, and billing.

WALLET — Accounts holding financial value.

SHARED_WALLET — Collective funding, including temporary bill wallets and gifts.

BILL / BILL_ITEM — Merchant-issued payment obligations.

EXPENSE — Spending records and obligations.

PAYMENT_REQUEST — Requests for funds.

TRANSACTION — Financial operations and settlements.

CATEGORY — Personalized organization.

LEDGER — Auditable accounting of financial movements.

The important decisions we reached are preserved: personal wallets are automatically provisioned, businesses have distinct wallets with delegated access, temporary shared wallets pool split-bill contributions, restaurants receive one consolidated payment, and gift wallets transfer funds before being archived.

I would treat this as your functional architecture baseline, not yet a production-ready design. The major remaining engineering work is implementing the ledger and settlement infrastructure, enforcing authorization, finalizing failure and refund policies, and validating the regulatory model.

For your database project, you can now finalize the conceptual relationships without reopening the fundamental product workflows. For an actual financial launch, those additional safeguards are mandatory.
