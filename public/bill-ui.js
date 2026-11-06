export function sharedBillPage({ bill: b, uid, balance, esc, usd, icon, button, badge, heading }) {
  const same = (a, value) => String(a) === String(value);
  const mine = id => b.selections.find(s => same(s.item_id, id));
  const paid = Boolean(b.my_payment), complete = b.status === 'paid';
  const joined = Boolean(b.member_role), canChoose = joined && !paid && !complete;
  const remaining = Math.max(0, Number(b.total_amount) - Number(b.collected_amount));
  const itemRows = b.items.map(i => {
    const selected = mine(i.item_id);
    const available = Math.max(0, Number(i.quantity) - Number(i.selected_quantity) + Number(selected?.quantity || 0));
    const unavailable = !selected && available === 0;
    return `<div class="ordered-item ${selected ? 'is-selected' : ''}" data-order-item="${i.item_id}">
      <div class="ordered-item-top"><label class="ordered-check">
        <input type="checkbox" aria-label="Select ${esc(i.name)}" ${selected ? 'checked' : ''} ${!canChoose || unavailable ? 'disabled' : ''}>
        <span><strong>${esc(i.name)}</strong><small>${usd(i.unit_price)} each · ${Number(i.quantity)} on the bill</small></span>
      </label><strong class="ordered-line-total">${usd(Number(i.quantity) * Number(i.unit_price))}</strong></div>
      <div class="ordered-item-bottom"><div class="ordered-availability">${unavailable ? badge('fully selected') : `<span>${available} available to you</span>`}${selected ? `<small>Your saved share: ${usd(selected.allocated_amount)}</small>` : ''}</div>
      <label class="ordered-quantity">Your quantity<input type="number" inputmode="decimal" min="0.0001" max="${available}" step="0.0001" aria-label="Quantity for ${esc(i.name)}" value="${Number(selected?.quantity || Math.min(1, available) || 1)}" ${!canChoose || !selected ? 'disabled' : ''} required></label></div>
    </div>`;
  }).join('');
  return `<button class="text-button back-button" data-page="bills">${icon('back')} All bills</button>` +
    heading('SHARED BILL', esc(b.display_name), `${esc(b.bill_code)} · Select what you ordered. Pay your share.`,
      button(icon('activity') + 'Refresh bill', 'bill-refresh', '', 'secondary')) +
    `<div class="shared-bill-banner ${complete ? 'settled' : ''}"><span class="feature-icon">${icon(complete ? 'check' : 'users')}</span><div><h2>${complete ? 'One bill. Paid in full.' : 'Your table, one shared wallet.'}</h2><p>${complete ? 'The business received one payment. The temporary wallet is now archived.' : 'Your payments collect in an automatically created temporary wallet. Once fully funded, the business receives one payment.'}</p></div>${badge(b.status)}</div>
    <div class="bill-collection-stats"><div><small>Bill total</small><strong>${usd(b.total_amount)}</strong></div><div><small>Collected</small><strong>${usd(b.collected_amount)}</strong></div><div><small>Still to collect</small><strong>${usd(remaining)}</strong></div></div>
    <div class="shared-bill-layout"><section class="panel item-picker-panel"><div class="panel-heading"><h2>${paid ? 'Your paid items' : 'What did you order?'}</h2><span class="bill-item-count">${b.items.length} items</span></div>
    ${!joined && !complete ? `<div class="form-tip">Join the shared bill to select items and pay. Joining gives you access to this wallet’s shared activity.</div>${button(icon('users') + 'Join shared bill', 'bill-join-confirm', '', 'primary full')}` : ''}
    ${canChoose ? '<p class="item-picker-help">Check your items, then set your quantity. Sharing a dish? Enter a portion, such as 0.5. Save your selection to review the exact amount.</p>' : ''}
    <form id="bill-claim-form"><div class="ordered-items">${itemRows}</div>
      ${canChoose ? `<div class="bill-selection-footer"><p id="bill-selection-state" role="status">Saved selections reserve your portions. You can change or release them before paying.</p><p class="form-error" role="alert"></p><button type="submit" class="primary full">Save my items ${icon('check')}</button></div>` : ''}
    </form></section>
    <aside class="bill-share-aside"><section class="panel your-share-panel"><span class="eyebrow">${paid ? 'YOUR CONTRIBUTION' : 'YOUR SAVED SHARE'}</span><div class="share-amount">${usd(paid ? b.my_payment.amount : b.my_total)}</div>
      ${paid ? `${badge('paid')}<p>Your payment is in the shared bill wallet${complete ? ' and has been settled to the business' : '. Waiting for the rest of the table'}.</p>` : `<p>Review and save your items first. The total includes your selected quantities and cent rounding.</p><div class="saved-items-summary">${b.selections.map(s => `<div><span>${Number(s.quantity)} × ${esc(s.name)}</span><strong>${usd(s.allocated_amount)}</strong></div>`).join('') || '<small>No items selected yet.</small>'}</div>${joined && !complete ? `<button type="button" class="primary full pay-saved-share" data-action="bill-share-confirm" ${!b.quote ? 'disabled' : ''}>Pay my share ${icon('send')}</button><small class="personal-funds">Personal wallet: ${usd(balance)}</small>` : ''}`}
    </section>${joined ? `<section class="panel table-progress"><div class="panel-heading"><h2>The table</h2>${b.member_role === 'owner' && !complete ? button(icon('plus') + 'Invite', 'member', `data-wallet="${b.shared_wallet_id}"`, 'text-button') : ''}</div>${b.people.map(p => `<div class="member-row"><span class="avatar">${esc((p.first_name[0] || '') + (p.last_name[0] || ''))}</span><div class="row-main"><strong>${esc(p.first_name)} ${esc(p.last_name)}${same(p.user_id, uid) ? ' (you)' : ''}</strong><small>${Number(p.selected_amount) ? usd(p.selected_amount) + ' selected' : 'Choosing items'}</small></div>${badge(p.paid ? 'paid' : Number(p.selected_amount) ? 'selected' : 'not selected')}</div>`).join('')}</section>` : ''}
    <section class="panel bill-share-code"><span class="eyebrow">BRING YOUR PEOPLE IN</span><strong>${esc(b.bill_code)}</strong><p>Share this code. Others can open Bills & splits, find the bill, and choose Join shared bill.</p><small>Share only with your table. A person with this code can join and see the shared wallet activity.</small></section></aside></div>`;
}
