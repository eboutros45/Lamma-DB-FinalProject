import { AppError, hash, text } from './store.js';
const same = (a, b) => String(a) === String(b);
const cents = value => Math.round(Number(value) * 100);
const decimal = value => (value / 100).toFixed(2);
const units = value => Math.round(Number(value) * 10000);

export function billSplitting({ q, one, member, personal, shared, transfer, settleBill }) {
  async function billByCode(code, lock = false) {
    const bill = await one(`SELECT * FROM bill WHERE bill_code=$1${lock ? ' FOR UPDATE' : ''}`, [text(code, 'bill code', 30).toUpperCase()]);
    if (!bill) throw new AppError('Bill not found.', 404);
    return bill;
  }
  async function activeBillMember(uid, bill) {
    if (!bill.shared_wallet_id || bill.split_method !== 'items') throw new AppError('This bill is not using item-based splitting.');
    if (bill.status !== 'payment_pending') throw new AppError('This bill is no longer accepting payments.');
    const wallet = await member(uid, bill.shared_wallet_id);
    if (wallet.status !== 'active') throw new AppError('This collection wallet is no longer active.');
  }
  async function ownSelections(uid, bid) {
    return q(`SELECT s.item_id,s.quantity,s.allocated_amount,i.name FROM bill_item_selection s
      JOIN bill_item i USING(item_id) WHERE i.bill_id=$1 AND s.user_id=$2 ORDER BY s.item_id`, [bid, uid]);
  }
  function quote(bid, uid, selections) {
    return hash(JSON.stringify([String(bid), String(uid), selections.map(s => [String(s.item_id), String(s.quantity), String(s.allocated_amount)])]));
  }
  async function action(uid, kind, body) {
    if (kind === 'bill-split') {
      const bill = await billByCode(body.code, true);
      if (bill.status === 'paid') throw new AppError('This bill has already been paid.');
      if (bill.shared_wallet_id) throw new AppError('A collection wallet already exists. Open the bill and join it.');
      if (bill.status !== 'open') throw new AppError('This bill is not available for splitting.');
      const method = body.method || 'items';
      if (!['items', 'custom'].includes(method)) throw new AppError('Choose item-based or custom splitting.');
      const wallet = await shared(uid, `Split · ${bill.bill_code}`, 'bill', Number(bill.total_amount).toFixed(2));
      await q("UPDATE bill SET shared_wallet_id=$1,split_method=$2,status='payment_pending' WHERE bill_id=$3", [wallet.wallet_id, method, bill.bill_id]);
      return wallet;
    }
    if (kind === 'bill-join') {
      // A bill code is an intentionally shareable reference. Joining is explicit consent.
      const bill = await billByCode(body.code, true);
      if (!bill.shared_wallet_id || bill.status !== 'payment_pending') throw new AppError('This bill is not accepting participants.');
      const wallet = await one('SELECT * FROM wallet WHERE wallet_id=$1', [bill.shared_wallet_id]);
      if (wallet.status !== 'active') throw new AppError('This wallet is no longer active.');
      await q("INSERT INTO shared_wallet_member(user_id,shared_wallet_id,member_role) VALUES($1,$2,'participant') ON CONFLICT DO NOTHING", [uid, bill.shared_wallet_id]);
      await q("UPDATE wallet_invitation SET status='accepted',responded_at=now() WHERE wallet_id=$1 AND phone=(SELECT phone FROM users WHERE user_id=$2) AND status='pending' AND expires_at>now()", [bill.shared_wallet_id, uid]);
      return wallet;
    }
    if (kind === 'bill-claim') {
      const bill = await billByCode(body.code, true);
      await activeBillMember(uid, bill);
      if (await one('SELECT user_id FROM bill_share_payment WHERE bill_id=$1 AND user_id=$2', [bill.bill_id, uid])) throw new AppError('Your paid items cannot be changed.');
      if (!Number.isInteger(body.revision) || body.revision !== bill.split_revision) throw new AppError('The bill changed. Refresh the bill and review availability before saving.', 409);
      if (!Array.isArray(body.items) || body.items.length > 50) throw new AppError('Select up to 50 items.');
      const items = await q('SELECT * FROM bill_item WHERE bill_id=$1 ORDER BY item_id FOR UPDATE', [bill.bill_id]);
      const seen = new Set();
      for (const selected of body.items) {
        if (!selected || !/^\d+$/.test(String(selected.item_id)) || seen.has(String(selected.item_id))) throw new AppError('Select each item only once.');
        seen.add(String(selected.item_id));
        if (!/^(?:0|[1-9]\d*)(?:\.\d{1,4})?$/.test(String(selected.quantity)) || !Number.isSafeInteger(units(selected.quantity)) || units(selected.quantity) <= 0) throw new AppError('Enter a positive quantity with up to four decimal places.');
        if (!items.some(i => same(i.item_id, selected.item_id))) throw new AppError('An item does not belong to this bill.');
      }
      // Replace only this participant's unpaid claims. The surrounding transaction restores
      // the previous claims if any quantity or amount validation fails.
      await q('DELETE FROM bill_item_selection WHERE user_id=$1 AND item_id IN (SELECT item_id FROM bill_item WHERE bill_id=$2)', [uid, bill.bill_id]);
      for (const selected of body.items) {
        const item = items.find(i => same(i.item_id, selected.item_id));
        const used = await one('SELECT coalesce(sum(quantity),0) quantity,coalesce(sum(allocated_amount),0) amount FROM bill_item_selection WHERE item_id=$1', [item.item_id]);
        const availableUnits = units(item.quantity) - units(used.quantity), selectedUnits = units(selected.quantity);
        if (selectedUnits > availableUnits) throw new AppError(`${item.name}: that quantity has already been selected by someone else.`, 409);
        const remainingCents = Math.round(Number(item.quantity) * cents(item.unit_price)) - cents(used.amount);
        // The final portion gets the remaining cents, so shared items reconcile exactly.
        const amount = selectedUnits === availableUnits ? remainingCents : Math.round(cents(item.unit_price) * selectedUnits / 10000);
        if (amount <= 0 || amount > remainingCents || (selectedUnits < availableUnits && amount === remainingCents)) throw new AppError(`${item.name}: this portion is too small to split in cents. Assign a larger portion or the whole item.`);
        await q('INSERT INTO bill_item_selection(user_id,item_id,allocated_amount,quantity) VALUES($1,$2,$3,$4)', [uid, item.item_id, decimal(amount), (selectedUnits / 10000).toFixed(4)]);
      }
      await q('UPDATE bill SET split_revision=split_revision+1 WHERE bill_id=$1', [bill.bill_id]);
      return { bill_id: bill.bill_id, message: body.items.length ? 'Your items are saved.' : 'Your unpaid items have been released.' };
    }
    if (kind === 'bill-pay-share') {
      const bill = await billByCode(body.code, true);
      await activeBillMember(uid, bill);
      if (await one('SELECT user_id FROM bill_share_payment WHERE bill_id=$1 AND user_id=$2', [bill.bill_id, uid])) throw new AppError('Your share has already been paid.');
      const selections = await ownSelections(uid, bill.bill_id);
      if (!selections.length) throw new AppError('Select and save your items before paying.');
      if (body.quote !== quote(bill.bill_id, uid, selections)) throw new AppError('Your saved items changed. Refresh and review your share before paying.', 409);
      const amount = selections.reduce((total, s) => total + cents(s.allocated_amount), 0);
      const wallet = await one('SELECT * FROM wallet WHERE wallet_id=$1 FOR UPDATE', [bill.shared_wallet_id]);
      if (cents(wallet.balance) + amount > cents(bill.total_amount)) throw new AppError('This payment exceeds the outstanding bill total.');
      const payer = await personal(uid);
      const movement = await transfer(payer.wallet_id, bill.shared_wallet_id, decimal(amount), 'bill_contribution');
      await q('INSERT INTO bill_share_payment(bill_id,user_id,transaction_id,amount) VALUES($1,$2,$3,$4)', [bill.bill_id, uid, movement.transaction_id, decimal(amount)]);
      await q('UPDATE bill SET split_revision=split_revision+1 WHERE bill_id=$1', [bill.bill_id]);
      await settleBill(bill);
      return movement;
    }
    return undefined;
  }
  async function view(uid, code) {
    const bill = await billByCode(code);
    const business = await one('SELECT display_name FROM business WHERE business_id=$1', [bill.business_id]);
    const wallet = bill.shared_wallet_id ? await one('SELECT * FROM wallet WHERE wallet_id=$1', [bill.shared_wallet_id]) : null;
    const membership = wallet ? await one('SELECT member_role FROM shared_wallet_member WHERE shared_wallet_id=$1 AND user_id=$2', [wallet.wallet_id, uid]) : null;
    const items = await q(`SELECT i.*,coalesce(sum(s.quantity),0) selected_quantity,coalesce(sum(s.allocated_amount),0) selected_amount
      FROM bill_item i LEFT JOIN bill_item_selection s USING(item_id) WHERE i.bill_id=$1 GROUP BY i.item_id ORDER BY i.item_id`, [bill.bill_id]);
    const selections = membership ? await ownSelections(uid, bill.bill_id) : [];
    const payments = membership ? await q(`SELECT p.*,u.first_name,u.last_name FROM bill_share_payment p JOIN users u USING(user_id) WHERE p.bill_id=$1 ORDER BY p.paid_at`, [bill.bill_id]) : [];
    const people = membership ? await q(`SELECT m.user_id,u.first_name,u.last_name,m.member_role,
      coalesce((SELECT sum(s.allocated_amount) FROM bill_item_selection s JOIN bill_item i USING(item_id) WHERE i.bill_id=$1 AND s.user_id=m.user_id),0) selected_amount,
      EXISTS(SELECT 1 FROM bill_share_payment p WHERE p.bill_id=$1 AND p.user_id=m.user_id) paid
      FROM shared_wallet_member m JOIN users u USING(user_id) WHERE m.shared_wallet_id=$2 ORDER BY m.joined_at`, [bill.bill_id, wallet.wallet_id]) : [];
    const myPayment = payments.find(p => same(p.user_id, uid));
    const paid = await one('SELECT coalesce(sum(amount),0) amount FROM bill_share_payment WHERE bill_id=$1', [bill.bill_id]);
    return { ...bill, display_name: business.display_name, items, selections, people,
      member_role: membership?.member_role || null, wallet_status: wallet?.status || null,
      my_payment: myPayment || null, collected_amount: bill.split_method === 'items' ? paid.amount : (bill.status === 'paid' ? bill.total_amount : wallet?.balance || '0'),
      my_total: decimal(selections.reduce((n, s) => n + cents(s.allocated_amount), 0)),
      quote: selections.length && !myPayment ? quote(bill.bill_id, uid, selections) : null };
  }
  return { action, view };
}
