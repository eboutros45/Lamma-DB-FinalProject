import { billSplitting } from './bill-splitting.js';
import { collaboration } from './workflows.js';
import { AsyncLocalStorage } from 'node:async_hooks';
import { PGlite } from '@electric-sql/pglite';
import { readFile, mkdir } from 'node:fs/promises';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
export const hash = x => createHash('sha256').update(x).digest('hex');
export function passwordHash(password) { const salt=randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password,salt,32).toString('hex')}`; }
export function verifyPassword(p,h) { if(!h)return false;const [s,v]=h.split(':');return timingSafeEqual(scryptSync(p,s,32),Buffer.from(v,'hex')); }
export class AppError extends Error { constructor(message,status=400){super(message);this.status=status;} }
export function money(x){if(!/^\d+(\.\d{1,2})?$/.test(String(x)))throw new AppError('Enter an amount with up to two decimal places.');const n=Math.round(Number(x)*100);if(!Number.isSafeInteger(n)||n<=0||n>100000000)throw new AppError('Amount must be between $0.01 and $1,000,000.');return (n/100).toFixed(2);}
export const text=(x,label,max=160)=>{if(typeof x!=='string'||!x.trim()||x.trim().length>max)throw new AppError(`Enter a valid ${label} (up to ${max} characters).`);return x.trim();};
export async function openStore(path){
 if(path && path !== 'memory://') await mkdir(path,{recursive:true});
 const db=new PGlite(path);await db.waitReady;
 const context=new AsyncLocalStorage();
 const q=async(sql,args=[]) => (await (context.getStore()||db).query(sql,args)).rows;
 const transaction=fn=>db.transaction(tx=>context.run(tx,fn));
 const one=async(sql,args=[]) => (await q(sql,args))[0];
 await db.exec('CREATE TABLE IF NOT EXISTS schema_migration (name text PRIMARY KEY)');
 for(const name of ['001_initial_schema.sql','002_functional_foundation.sql','003_collaboration.sql','004_bill_item_payments.sql']){
  if(!await one('SELECT name FROM schema_migration WHERE name=$1',[name])){
   await db.exec(await readFile(new URL(`./db/migrations/${name}`,import.meta.url),'utf8'));
   await q('INSERT INTO schema_migration VALUES ($1)',[name]);
  }
 }
 async function personal(uid){return one('SELECT * FROM wallet WHERE personal_user_id=$1',[uid]);}
 async function member(uid,wid,admin=false){const w=await one('SELECT w.*, m.member_role FROM wallet w LEFT JOIN shared_wallet_member m ON m.shared_wallet_id=w.wallet_id AND m.user_id=$1 WHERE w.wallet_id=$2',[uid,wid]);if(!w || (String(w.personal_user_id)!==String(uid)&&!w.member_role))throw new AppError('Wallet not found or access denied.',403);if(admin&&!['owner','administrator'].includes(w.member_role))throw new AppError('Only a wallet owner or administrator can do that.',403);return w;}
 async function transfer(sender,receiver,amount,type='transfer'){
  if(String(sender)===String(receiver))throw new AppError('Choose a different destination wallet.');
  const dest=await one('SELECT * FROM wallet WHERE wallet_id=$1 FOR UPDATE',[receiver]);if(!dest||dest.status!=='active')throw new AppError('Destination wallet is unavailable.');
  if(sender){const src=await one('SELECT * FROM wallet WHERE wallet_id=$1 FOR UPDATE',[sender]);if(!src||src.status!=='active')throw new AppError('Source wallet is unavailable.');const changed=await q('UPDATE wallet SET balance=balance-$1 WHERE wallet_id=$2 AND balance >= $1 RETURNING wallet_id',[amount,sender]);if(!changed.length)throw new AppError('Insufficient available funds.');}
  await q('UPDATE wallet SET balance=balance+$1 WHERE wallet_id=$2',[amount,receiver]);
  const t=await one("INSERT INTO wallet_transaction(sender_wallet_id,receiver_wallet_id,reference_code,amount,transaction_type,status,completed_at) VALUES($1,$2,$3,$4,$5,'completed',now()) RETURNING *",[sender,receiver,`LM-${randomBytes(6).toString('hex').toUpperCase()}`,amount,type]);
  await q('INSERT INTO ledger_entry(transaction_id,wallet_id,amount) VALUES($1,$2,-$4::numeric),($1,$3,$4::numeric)',[t.transaction_id,sender,receiver,amount]);return t;
 }
 async function createUser(phone,first,last,password){
  if(!/^\+[1-9]\d{7,14}$/.test(phone))throw new AppError('Use an international phone number, for example +96170123456.');
  if(typeof password!=='string'||password.length<8||password.length>128)throw new AppError('Use a password of 8–128 characters.');
  if(await one('SELECT user_id FROM users WHERE phone=$1',[phone]))throw new AppError('An account already exists with this phone number.');
  const u=await one('INSERT INTO users(phone,first_name,last_name,password_hash) VALUES($1,$2,$3,$4) RETURNING user_id,first_name,last_name,phone',[phone,text(first,'first name',60),text(last,'last name',60),passwordHash(password)]);
  await q("INSERT INTO wallet(personal_user_id,name,wallet_type,status) VALUES($1,$2,'personal','active')",[u.user_id,`${u.first_name}'s wallet`]);return u;
 }
 async function shared(uid,name,purpose,target,recipient){
  if(!['general','gift','bill'].includes(purpose))throw new AppError('Invalid wallet purpose.');
  if(purpose==='gift'&&!await one('SELECT user_id FROM users WHERE user_id=$1',[recipient]))throw new AppError('Select a registered gift recipient.');
  const w=await one("INSERT INTO wallet(name,wallet_type,status) VALUES($1,'shared','active') RETURNING *",[text(name,'wallet name'),]);
  await q('INSERT INTO shared_wallet(shared_wallet_id,purpose,target_amount,gift_recipient_id) VALUES($1,$2,$3,$4)',[w.wallet_id,purpose,target?money(target):null,purpose==='gift'?recipient:null]);
  await q("INSERT INTO shared_wallet_member(user_id,shared_wallet_id,member_role) VALUES($1,$2,'owner')",[uid,w.wallet_id]);return w;
 }
 async function settleBill(bill){
  const w=await one('SELECT * FROM wallet WHERE wallet_id=$1',[bill.shared_wallet_id]);if(Number(w.balance)!==Number(bill.total_amount))return;
  const business=await one('SELECT * FROM business WHERE business_id=$1',[bill.business_id]);
  const t=await transfer(w.wallet_id,business.wallet_id,bill.total_amount,'bill_settlement');
  await q("UPDATE bill SET status='paid',transaction_id=$1,paid_at=now() WHERE bill_id=$2",[t.transaction_id,bill.bill_id]);
  await q("UPDATE wallet SET status='archived' WHERE wallet_id=$1",[w.wallet_id]);
 }
 const workflows=collaboration({q,one,member,personal,transfer});
 const splitBills=billSplitting({q,one,member,personal,shared,transfer,settleBill});
 async function action(uid,kind,b){
  const splitResult=await splitBills.action(uid,kind,b);if(splitResult!==undefined)return splitResult;
  const extra=await workflows.action(uid,kind,b);if(extra!==undefined)return extra;
  const p=await personal(uid);
  if(kind==='transfer'){
   const dest=await one('SELECT w.* FROM wallet w JOIN users u ON u.user_id=w.personal_user_id WHERE u.phone=$1',[b.phone]);if(!dest)throw new AppError('No active recipient found for that number.');return transfer(p.wallet_id,dest.wallet_id,money(b.amount));
  }
  if(kind==='shared'){if(b.purpose&&!['general','gift'].includes(b.purpose))throw new AppError('Temporary bill wallets are created through a bill.');const recipient=b.purpose==='gift'?await one('SELECT user_id FROM users WHERE phone=$1',[b.gift_phone]):null;return shared(uid,b.name,b.purpose||'general',b.target_amount,recipient?.user_id);}
  if(kind==='contribute'){
   const w=await member(uid,b.wallet_id);const amount=money(b.amount);const bill=await one("SELECT * FROM bill WHERE shared_wallet_id=$1 AND status <> 'paid'",[w.wallet_id]);
   if(bill?.split_method==='items')throw new AppError('Select and pay your items from the bill instead.');
   if(bill&&Number(w.balance)+Number(amount)>Number(bill.total_amount))throw new AppError('This contribution exceeds the outstanding bill amount.');
   const t=await transfer(p.wallet_id,w.wallet_id,amount,'contribution');if(bill)await settleBill(bill);return t;
  }
  if(kind==='gift'){
   const w=await member(uid,b.wallet_id,true);const sw=await one("SELECT * FROM shared_wallet WHERE shared_wallet_id=$1 AND purpose='gift'",[w.wallet_id]);if(!sw)throw new AppError('This is not a gift wallet.');
   const dest=await personal(sw.gift_recipient_id);const t=await transfer(w.wallet_id,dest.wallet_id,money(Number(w.balance).toFixed(2)),'gift');await q("UPDATE wallet SET status='archived' WHERE wallet_id=$1",[w.wallet_id]);return t;
  }
  if(kind==='request'){
   const payer=await one('SELECT user_id FROM users WHERE phone=$1',[b.phone]);if(!payer)throw new AppError('The recipient must register first.');if(String(payer.user_id)===String(uid))throw new AppError('Choose another person.');
   const dest=b.wallet_id||p.wallet_id;const w=await member(uid,dest);if(await one("SELECT bill_id FROM bill WHERE shared_wallet_id=$1 AND split_method='items'",[dest]))throw new AppError('Use item selection to pay into this bill wallet.');if(w.status!=='active')throw new AppError('Choose an active destination wallet.');
   return one("INSERT INTO payment_request(requester_id,payer_id,destination_wallet_id,amount,description,status,expires_at) VALUES($1,$2,$3,$4,$5,'pending',now()+interval '7 days') RETURNING *",[uid,payer.user_id,dest,money(b.amount),text(b.description,'description')]);
  }
  if(kind==='request-pay'||kind==='request-decline'){
   const r=await one('SELECT * FROM payment_request WHERE request_id=$1 AND payer_id=$2 FOR UPDATE',[b.request_id,uid]);if(!r)throw new AppError('Request not found.',404);if(r.status!=='pending'||new Date(r.expires_at)<new Date())throw new AppError('This request is no longer payable.');
   if(kind==='request-decline'){await q("UPDATE payment_request SET status='declined',responded_at=now() WHERE request_id=$1",[r.request_id]);return {message:'Request declined.'};}
   // Contributions to temporary bill wallets must also obey the funding cap and settlement workflow.
   const bill=await one('SELECT * FROM bill WHERE shared_wallet_id=$1',[r.destination_wallet_id]);
   if(bill?.split_method==='items')throw new AppError('Select and pay your items from the bill instead.');
   if(bill){await member(uid,r.destination_wallet_id);const w=await one('SELECT balance FROM wallet WHERE wallet_id=$1',[r.destination_wallet_id]);if(Number(w.balance)+Number(r.amount)>Number(bill.total_amount))throw new AppError('Payment exceeds the outstanding bill amount.');}
   const t=await transfer(p.wallet_id,r.destination_wallet_id,r.amount,'request_payment');await q("UPDATE payment_request SET status='paid',responded_at=now(),transaction_id=$1 WHERE request_id=$2",[t.transaction_id,r.request_id]);if(bill)await settleBill(bill);if(r.expense_id)await workflows.refreshExpense(r.expense_id);return t;
  }
  if(kind==='business'){
   const w=await one("INSERT INTO wallet(name,wallet_type,status) VALUES($1,'business','active') RETURNING *",[text(b.name,'business name')]);
   const biz=await one("INSERT INTO business(owner_user_id,wallet_id,display_name,legal_name,status) VALUES($1,$2,$3,$3,'active') RETURNING *",[uid,w.wallet_id,b.name.trim()]);await q("INSERT INTO business_access VALUES($1,$2,'owner')",[biz.business_id,uid]);return biz;
  }
  if(kind==='bill'){
   const biz=await one("SELECT b.* FROM business b JOIN business_access a USING(business_id) WHERE b.business_id=$1 AND a.user_id=$2 AND a.role IN ('owner','manager','cashier')",[b.business_id,uid]);if(!biz)throw new AppError('Business access denied.',403);
   if(!Array.isArray(b.items)||!b.items.length||b.items.length>50)throw new AppError('Add 1–50 bill items.');
   const items=b.items.map(i=>({name:text(i.name,'item name'),price:money(i.price),quantity:Number(i.quantity)}));if(items.some(i=>!Number.isInteger(i.quantity)||i.quantity<1||i.quantity>1000))throw new AppError('Quantities must be whole numbers from 1 to 1,000.');
   const total=money((items.reduce((n,i)=>n+Math.round(Number(i.price)*100)*i.quantity,0)/100).toFixed(2));
   const bill=await one("INSERT INTO bill(business_id,bill_code,total_amount,status) VALUES($1,$2,$3,'open') RETURNING *",[biz.business_id,`B-${randomBytes(4).toString('hex').toUpperCase()}`,total]);
   for(const i of items)await q('INSERT INTO bill_item(bill_id,name,quantity,unit_price) VALUES($1,$2,$3,$4)',[bill.bill_id,i.name,i.quantity,i.price]);return bill;
  }
  if(kind==='bill-pay'){
   const bill=await one('SELECT * FROM bill WHERE bill_code=$1 FOR UPDATE',[text(b.code,'bill code').toUpperCase()]);if(!bill)throw new AppError('Bill not found.',404);if(bill.status==='paid')throw new AppError('This bill has already been paid.');
   if(bill.shared_wallet_id)throw new AppError('This bill is being collected in a shared wallet.');const biz=await one('SELECT wallet_id FROM business WHERE business_id=$1',[bill.business_id]);const t=await transfer(p.wallet_id,biz.wallet_id,bill.total_amount,'bill_payment');await q("UPDATE bill SET status='paid',paid_at=now(),transaction_id=$1 WHERE bill_id=$2",[t.transaction_id,bill.bill_id]);return t;
  }
  throw new AppError('Unknown action.',404);
 }
 async function state(uid){
  const user=await one('SELECT user_id,first_name,last_name,phone FROM users WHERE user_id=$1',[uid]);
  const wallets=await q(`SELECT w.*,s.purpose,s.target_amount,s.gift_recipient_id,m.member_role,
   (SELECT count(*)::int FROM shared_wallet_member mm WHERE mm.shared_wallet_id=w.wallet_id) AS member_count
   FROM wallet w LEFT JOIN shared_wallet s ON s.shared_wallet_id=w.wallet_id LEFT JOIN shared_wallet_member m ON m.shared_wallet_id=w.wallet_id AND m.user_id=$1
   WHERE w.personal_user_id=$1 OR m.user_id=$1 ORDER BY w.wallet_id`,[uid]);
  const ids=wallets.map(w=>w.wallet_id);
  const transactions=await q('SELECT t.*,s.name sender_name,r.name receiver_name FROM wallet_transaction t LEFT JOIN wallet s ON s.wallet_id=t.sender_wallet_id LEFT JOIN wallet r ON r.wallet_id=t.receiver_wallet_id WHERE sender_wallet_id=ANY($1::bigint[]) OR receiver_wallet_id=ANY($1::bigint[]) ORDER BY t.transaction_id DESC LIMIT 60',[ids]);
  const requests=await q(`SELECT p.*,u.first_name requester_name,v.first_name payer_name FROM payment_request p JOIN users u ON u.user_id=p.requester_id JOIN users v ON v.user_id=p.payer_id WHERE p.requester_id=$1 OR p.payer_id=$1 ORDER BY request_id DESC`,[uid]);
  const expenses=await q('SELECT e.*,w.name wallet_name, CASE WHEN c.owner_user_id IS NULL OR c.owner_user_id=$1 THEN c.name END category_name FROM expense e LEFT JOIN wallet w ON w.wallet_id=e.shared_wallet_id LEFT JOIN category c ON c.category_id=e.category_id WHERE e.owner_user_id=$1 OR e.shared_wallet_id=ANY($2::bigint[]) OR EXISTS(SELECT 1 FROM expense_share es WHERE es.expense_id=e.expense_id AND es.user_id=$1) ORDER BY expense_id DESC',[uid,ids]);
  const businesses=await q('SELECT b.*,w.balance,a.role FROM business b JOIN business_access a USING(business_id) JOIN wallet w ON w.wallet_id=b.wallet_id WHERE a.user_id=$1',[uid]);
  const bills=await q(`SELECT b.*,biz.display_name, EXISTS(SELECT 1 FROM wallet_transaction paid JOIN wallet payer ON payer.wallet_id=paid.sender_wallet_id WHERE paid.transaction_id=b.transaction_id AND payer.personal_user_id=$2) paid_by_me FROM bill b JOIN business biz USING(business_id) WHERE b.shared_wallet_id=ANY($1::bigint[]) OR b.business_id IN (SELECT business_id FROM business_access WHERE user_id=$2) OR b.transaction_id IN (SELECT t.transaction_id FROM wallet_transaction t JOIN wallet w ON w.wallet_id=t.sender_wallet_id WHERE w.personal_user_id=$2) ORDER BY bill_id DESC`,[ids,uid]);
  return {user,wallets,transactions,requests,expenses,businesses,bills,...await workflows.extraState(uid,ids)};
 }
 if(!await one('SELECT user_id FROM users LIMIT 1')){
  await transaction(async()=>{
   const a=await createUser('+96170000001','Alex','Haddad','lamma-demo');const b=await createUser('+96170000002','Maya','Khoury','lamma-demo');
   await transfer(null,(await personal(a.user_id)).wallet_id,'1250.00','demo_funding');await transfer(null,(await personal(b.user_id)).wallet_id,'850.00','demo_funding');
   const w=await shared(a.user_id,'Weekend in Batroun','general','600.00');await q("INSERT INTO shared_wallet_member VALUES($1,$2,'participant',now())",[b.user_id,w.wallet_id]);await transfer((await personal(a.user_id)).wallet_id,w.wallet_id,'120.00','contribution');
   await action(a.user_id,'request',{phone:'+96170000002',amount:'35',description:'Dinner on Friday'});
   await action(a.user_id,'expense',{wallet_id:w.wallet_id,title:'Beach house booking',amount:'180',notes:'Booking deposit to arrange'});
   const biz=await action(a.user_id,'business',{name:'Cedar & Salt'});await action(a.user_id,'bill',{business_id:biz.business_id,items:[{name:'Mezze to share',price:'24',quantity:1},{name:'Fresh lemonade',price:'6',quantity:2}]});
  });
 }
 return {db,transaction,q,one,personal,member,action,state,createUser,transfer,detail:workflows.detail,billView:splitBills.view};
}
