# Shared bills: choose items and pay your share

## Try it

1. Sign in as Alex. In Business, issue a new itemized bill and note its bill code.
2. Open Bills & splits, review that bill, and choose **Choose what I ordered · Item split**.
3. Confirm. Lamma creates one temporary wallet tied to the bill and makes the initiator its owner.
4. Check the items you ordered and enter quantities. A shared dish can be split with a fractional quantity, such as 0.5.
5. Save your items. Review the exact saved share, then select **Pay my share** and confirm.
6. Share the bill code with Maya. In a separate browser profile/private window, sign in as Maya, find that bill and choose **Join shared bill**. She selects and pays her own items.
7. Contributions accumulate in the temporary wallet. Once the full bill is funded, one transaction pays the business and the empty temporary wallet is archived.

Invitations remain available through the table’s Invite action. Existing custom-contribution bill wallets retain their workflow; create a new bill to try the item-based workflow. Full-bill payment still bypasses temporary wallets.

## Allocation and payment rules

- Each participant changes only their own unpaid selections. Selecting an item reserves that quantity until the participant edits or releases it by saving a new selection. Claims currently have no automatic timeout.
- Selections cannot exceed remaining quantities or use an item from a different bill. An item may be shared by entering fractional quantities, with up to four decimal places.
- Each item’s payable amount uses cents. The final portion receives the remaining cents, so odd-cent shared dishes reconcile exactly. Portions too small to support a positive remaining-cent allocation are rejected.
- Changing any claims increments the bill’s revision. A stale save returns a conflict instead of overwriting another participant’s selection. Refresh to review current availability; unsaved edits are preserved until you explicitly refresh or leave the screen.
- Saving does not move money. Checkout requires the server’s quote for those exact saved selections; the client cannot choose the payment amount or source wallet.
- The participant’s personal wallet pays their full saved share. One checkout per participant per bill is supported; paid selections cannot be edited or expanded. Select everything you intend to pay before checkout.
- Duplicate retries reuse the stored idempotent response. A second distinct checkout is rejected. Generic contributions and payment requests cannot bypass item checkout for item-based bill wallets.
- Item claims, checkout and membership joining lock the bill row. All payment, ledger, contribution and settlement changes occur inside the action transaction. If final business settlement fails, the final participant’s new contribution is rolled back; earlier contributions remain in the pool and the bill stays unpaid. The last payer can retry after the destination is available.
- Participants can see table membership, selected totals, payment status and authorized wallet history. Authenticated holders of a bill code can see bill items and explicitly join; share codes only with intended payers.
- The screen refreshes every 10 seconds while visible if there are no unsaved selections or active dialogs. A manual refresh is always available. This is polling, not a push notification service.

## Data model and compatibility

Migration 004 adds bill split mode/revision, selection quantities, and `bill_share_payment` linking the participant and bill to the contribution transaction. It preserves the original item-selection junction and all prior account/bill data. `bill-splitting.js` contains backend rules; `public/bill-ui.js` renders the shared-bill screen.

The application remains a USD test-funds prototype. Refunds, cancellation with collected funds, claim expiration/reassignment, and multiple checkouts per participant remain future work. Existing tax/discount import functionality is unchanged; bill issuance currently totals explicitly supplied items.
