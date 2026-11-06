# UI and workflow review

## Page responsibilities

| Area | Primary job | Removed duplication |
| --- | --- | --- |
| Home | Personal balance, shortcuts, attention counts and compact previews | Full request controls and full wallet management cards |
| Shared wallets | General and gift group funds | Temporary restaurant collections; repeated card title/open/invite controls |
| Wallet detail | Contributions, people, payouts and archival | Cards now have one Open wallet action; management lives here |
| Bills & splits | Bills the user has joined or personally paid | Merchant-issued invoices that the user is not paying |
| Business | Business balances, team access, issuance and invoice previews | Merchant previews no longer invite accidental customer payment |
| Payment requests | To pay, Sent, Invitations and History | Completed requests leave the actionable inbox |
| Expenses | Recorded obligations and reimbursements | Unsettled, settled and all views; no duplicate restaurant splitting flow |
| Transactions | Posted movements, searchable by text and wallet | Scope is explicit; personal activity is the default |

Home counters describe pending actions, not a misleading lifetime spending total
calculated from a limited activity list. Temporary bill wallets remain accessible
through Bills even though they are excluded from general-wallet lists.

## Shared bill states

- Not joined: bill preview with one Join action.
- Choosing: item selection with one checkout control. It changes from Save my items
  to Pay my share only after the server saves the exact quote. Unchanged or empty
  selections do not offer a payable action.
- Already paid: personal receipt, table progress and a collapsed full-bill view;
  no disabled item-editing form and no second payment control.
- Fully settled: completed receipt; no stale join, refresh or invitation actions.

The mobile checkout control is fixed above bottom navigation. The saved item
breakdown is a disclosure rather than another oversized amount/payment panel.

## Reliability and navigation

- Current pages and bill/wallet details have hash routes. Refresh and browser Back
  restore the corresponding view; shared bill links survive sign-in.
- Unsaved item edits prompt before leaving, browser reload, Back or explicit refresh.
- Stale read responses cannot override a newer navigation event.
- Pending actions show a working label and spinner. Form controls are locked during
  submission and restored on failure. The existing idempotency key survives retries.
- Initial connection failures offer Retry. Invalid detail routes return to the
  appropriate list instead of leaving a blank or permanently loading page.
- Inline errors scroll into view. A committed write followed by a failed refresh
  is reported as saved with a refresh problem, rather than a failed payment.
- New wallets/expenses/requests choose the appropriate active/open/sent view so a
  previously selected filter cannot hide the new record.
- Accepting an invitation opens the joined wallet or shared bill. Issuing a bill
  opens its merchant preview and shareable code.
- Share bill uses native sharing where supported, otherwise copies a link; a manual
  copy dialog remains available when clipboard permissions are unavailable.
- Full bill payments now appear in the payer's bill history independently of the
  limited transaction-history window.

## Verification

27 API/database tests pass, including customer payment-history coverage. Five
browser tests cover desktop/mobile flows, distinct merchant/customer pages,
invitation acceptance, bill checkout, unsaved edits, reload/Back/deep links,
initial connection recovery and a lost write response with a duplicate-free retry.
Screenshots are reviewed at desktop and mobile sizes; overflow is checked at
390px and 320px. These checks use Chromium, not physical-device Safari.

## New visual identity sweep

The cobalt/ink/citrus redesign covers authentication, overview, wallets and wallet
details, requests, bills and receipts, expenses, transactions, business, account
tools and dialogs. An isolated demo database was used for 44 route renders across
1440px desktop, 834px tablet, 390px mobile and 320px small mobile widths, plus
authentication and incoming-request captures. The sweep reported no horizontal
overflow or page errors; the locally hosted Manrope font loaded successfully.
All five existing browser interaction tests passed after the final style adjustments.
These checks use Chromium, not physical-device Safari.
