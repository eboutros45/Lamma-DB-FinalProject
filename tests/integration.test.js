import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createApp} from '../server.js';
import {mkdtemp,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openStore} from '../store.js';
let app,base,alex,maya;
async function request(path,{cookie,body,key}={}){const r=await fetch(base+'/api/'+path,{method:body?'POST':'GET',headers:{...(cookie?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...(key?{'Idempotency-Key':key}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
const action=(cookie,kind,body,key=randomUUID())=>request('actions/'+kind,{cookie,body,key});
before(async()=>{app=await createApp({dataDir:'memory://'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${app.server.address().port}`;alex=(await request('login',{body:{phone:'+96170000001',password:'lamma-demo'}})).cookie;maya=(await request('login',{body:{phone:'+96170000002',password:'lamma-demo'}})).cookie;});
after(async()=>{await new Promise(r=>app.server.close(r));await app.store.db.close();});
test('authentication is required and registration provisions exactly one empty wallet',async()=>{assert.equal((await request('state')).status,401);const b={phone:'+96170000003',first_name:'Sam',last_name:'Test',password:'testing-123'};const r=await request('register',{body:b});assert.equal(r.status,200);const s=(await request('state',{cookie:r.cookie})).data;assert.equal(s.wallets.length,1);assert.equal(Number(s.wallets[0].balance),0);assert.equal((await request('register',{body:b})).status,400);});
test('transfers are balanced and retries are idempotent; keys cannot change meaning',async()=>{const before=(await request('state',{cookie:alex})).data;const key=randomUUID();const payload={phone:'+96170000002',amount:'10.25'};const a=await action(alex,'transfer',payload,key),b=await action(alex,'transfer',payload,key);assert.equal(a.status,200);assert.equal(a.data.transaction_id,b.data.transaction_id);const after=(await request('state',{cookie:alex})).data;assert.equal(Number(before.wallets[0].balance)-Number(after.wallets[0].balance),10.25);assert.equal((await action(alex,'transfer',{...payload,amount:'11'},key)).status,409);const j=await app.store.one('SELECT sum(amount) AS total,count(*) AS n FROM ledger_entry WHERE transaction_id=$1',[a.data.transaction_id]);assert.equal(Number(j.total),0);assert.equal(Number(j.n),2);});
test('insufficient funds, precision, and self-transfer do not alter balances',async()=>{const before=(await request('state',{cookie:alex})).data.wallets[0].balance;for(const payload of [{phone:'+96170000002',amount:'999999'},{phone:'+96170000002',amount:'1.001'},{phone:'+96170000001',amount:'5'}])assert.equal((await action(alex,'transfer',payload)).status,400);assert.equal((await request('state',{cookie:alex})).data.wallets[0].balance,before);});
test('nonmembers cannot contribute or administer shared wallets',async()=>{assert.equal((await action(alex,'shared',{name:'Invalid standalone bill wallet',purpose:'bill'})).status,400);const w=(await action(alex,'shared',{name:'Private trip',purpose:'general'})).data;assert.equal((await action(maya,'contribute',{wallet_id:w.wallet_id,amount:'5'})).status,403);assert.equal((await action(maya,'member',{wallet_id:w.wallet_id,phone:'+96170000003'})).status,403);});
test('requests can be paid once and cannot be paid by the wrong user',async()=>{const r=(await action(alex,'request',{phone:'+96170000002',amount:'12',description:'Lunch'})).data;assert.equal((await action(alex,'request-pay',{request_id:r.request_id})).status,404);assert.equal((await action(maya,'request-pay',{request_id:r.request_id})).status,200);assert.equal((await action(maya,'request-pay',{request_id:r.request_id})).status,400);});
test('split bill prevents overfunding and settles exactly once, then archives',async()=>{const biz=(await request('state',{cookie:alex})).data.businesses[0];const bill=(await action(alex,'bill',{business_id:biz.business_id,items:[{name:'Dinner',price:'50',quantity:1}]})).data;const split=await action(alex,'bill-split',{code:bill.bill_code});assert.equal(split.status,200);const wid=split.data.wallet_id;const invitation=(await action(alex,'member',{wallet_id:wid,phone:'+96170000002'})).data;assert.equal((await action(maya,'invitation-accept',{invitation_id:invitation.invitation_id})).status,200);assert.equal((await action(alex,'contribute',{wallet_id:wid,amount:'20'})).status,200);assert.equal((await action(maya,'contribute',{wallet_id:wid,amount:'31'})).status,400);assert.equal((await app.store.one('SELECT status FROM bill WHERE bill_id=$1',[bill.bill_id])).status,'payment_pending');const payments=await Promise.all([action(maya,'contribute',{wallet_id:wid,amount:'30'}),action(maya,'contribute',{wallet_id:wid,amount:'30'})]);assert.deepEqual(payments.map(r=>r.status).sort(),[200,400]);const w=await app.store.one('SELECT * FROM wallet WHERE wallet_id=$1',[wid]);assert.equal(w.status,'archived');assert.equal(Number(w.balance),0);const done=await app.store.one('SELECT * FROM bill WHERE bill_id=$1',[bill.bill_id]);assert.equal(done.status,'paid');const tx=await app.store.one('SELECT count(*) n FROM wallet_transaction WHERE sender_wallet_id=$1',[wid]);assert.equal(Number(tx.n),1);});
test('full bill payment needs no shared wallet and rejects second settlement',async()=>{const biz=(await request('state',{cookie:alex})).data.businesses[0];const b=(await action(alex,'bill',{business_id:biz.business_id,items:[{name:'Coffee',price:'3.50',quantity:2}]})).data;assert.equal((await action(maya,'bill-pay',{code:b.bill_code})).status,200);assert.equal((await action(alex,'bill-pay',{code:b.bill_code})).status,400);const done=await app.store.one('SELECT * FROM bill WHERE bill_id=$1',[b.bill_id]);assert.equal(done.shared_wallet_id,null);assert.equal(done.status,'paid');});
test('gift delivery transfers balance and archives only on success',async()=>{const w=(await action(alex,'shared',{name:'Birthday',purpose:'gift',gift_phone:'+96170000002'})).data;assert.equal((await action(alex,'gift',{wallet_id:w.wallet_id})).status,400);await action(alex,'contribute',{wallet_id:w.wallet_id,amount:'8'});assert.equal((await action(alex,'gift',{wallet_id:w.wallet_id})).status,200);const done=await app.store.one('SELECT * FROM wallet WHERE wallet_id=$1',[w.wallet_id]);assert.equal(done.status,'archived');assert.equal(Number(done.balance),0);});
test('personal expenses record obligations without moving funds',async()=>{const before=(await request('state',{cookie:alex})).data.wallets[0].balance;const r=await action(alex,'expense',{title:'Rent',amount:'200',expense_date:'2026-11-06'});assert.equal(r.status,200);assert.equal(r.data.shared_wallet_id,null);assert.equal((await request('state',{cookie:alex})).data.wallets[0].balance,before);});
test('ledger is immutable, rejects unbalanced journals, and reconciles every wallet',async()=>{await assert.rejects(app.store.q('UPDATE ledger_entry SET amount=1'));await assert.rejects(app.store.transaction(async()=>{const t=await app.store.one("INSERT INTO wallet_transaction(receiver_wallet_id,reference_code,amount,transaction_type,status) VALUES(1,'BAD',1,'demo_funding','completed') RETURNING transaction_id");await app.store.q('INSERT INTO ledger_entry(transaction_id,wallet_id,amount) VALUES($1,1,1)',[t.transaction_id]);}));const errors=await app.store.q('SELECT w.wallet_id FROM wallet w LEFT JOIN ledger_entry l USING(wallet_id) GROUP BY w.wallet_id HAVING w.balance <> coalesce(sum(l.amount),0)');assert.deepEqual(errors,[]);});

test('fresh install creates missing database parents and preserves data on restart',async()=>{
 const root=await mkdtemp(join(tmpdir(),'lamma-startup-'));
 const path=join(root,'missing-parent','data','lamma');
 let store;
 try{
  await assert.rejects(access(path));
  store=await openStore(path);
  assert.equal(Number((await store.one('SELECT count(*) n FROM users')).n),2);
  await store.transaction(()=>store.createUser('+96170000004','Fresh','Install','testing-123'));
  await store.db.close();store=null;
  store=await openStore(path);
  assert.equal(Number((await store.one('SELECT count(*) n FROM users')).n),3);
  assert.equal(Number((await store.one('SELECT count(*) n FROM wallet WHERE personal_user_id=(SELECT user_id FROM users WHERE phone=$1)',['+96170000004'])).n),1);
 }finally{
  if(store)await store.db.close();
  await rm(root,{recursive:true,force:true});
 }
});

test('invitations require recipient consent, protect access, and support later registration',async()=>{
 const w=(await action(alex,'shared',{name:'Consent test',purpose:'general'})).data;
 const i=await action(alex,'member',{wallet_id:w.wallet_id,phone:'+96170000002'});assert.equal(i.status,200);
 assert.equal((await request('wallet?id='+w.wallet_id,{cookie:maya})).status,403);
 assert.equal((await action(alex,'invitation-accept',{invitation_id:i.data.invitation_id})).status,404);
 assert.equal((await action(maya,'contribute',{wallet_id:w.wallet_id,amount:'1'})).status,403);
 assert.equal((await action(maya,'invitation-accept',{invitation_id:i.data.invitation_id})).status,200);
 assert.equal((await request('wallet?id='+w.wallet_id,{cookie:maya})).status,200);
 assert.equal((await action(maya,'invitation-accept',{invitation_id:i.data.invitation_id})).status,400);
 const later=await action(alex,'member',{wallet_id:w.wallet_id,phone:'+96170000005'});assert.equal(later.status,200);
 const u=await request('register',{body:{phone:'+96170000005',first_name:'Later',last_name:'Joiner',password:'testing-123'}});
 const s=(await request('state',{cookie:u.cookie})).data;assert.ok(s.invitations.some(inv=>sameId(inv.invitation_id,later.data.invitation_id)));
 assert.equal((await action(u.cookie,'invitation-decline',{invitation_id:later.data.invitation_id})).status,200);
 assert.equal((await request('wallet?id='+w.wallet_id,{cookie:u.cookie})).status,403);
});
const sameId=(a,b)=>String(a)===String(b);
test('equal expense splits round cents exactly and request payments update settlement',async()=>{
 const exp=(await action(alex,'expense',{title:'Split lunch',amount:'10.01'})).data;
 const split=await action(alex,'expense-split',{expense_id:exp.expense_id,method:'equal',participants:[{phone:'+96170000001'},{phone:'+96170000002'}]});assert.equal(split.status,200);assert.equal(split.data.status,'partially_settled');
 const shares=await app.store.q('SELECT * FROM expense_share WHERE expense_id=$1 ORDER BY user_id',[exp.expense_id]);assert.deepEqual(shares.map(s=>Number(s.amount)),[5.01,5]);
 assert.equal((await action(alex,'expense-split',{expense_id:exp.expense_id,method:'equal',participants:[{phone:'+96170000001'}]})).status,400);
 assert.equal((await action(maya,'request-pay',{request_id:shares[1].request_id})).status,200);
 assert.equal((await app.store.one('SELECT status FROM expense WHERE expense_id=$1',[exp.expense_id])).status,'paid');
 assert.equal((await action(alex,'expense-cancel',{expense_id:exp.expense_id})).status,400);
});
test('custom and percentage splits validate totals atomically and restrict owner access',async()=>{
 const exp=(await action(alex,'expense',{title:'Custom split',amount:'10'})).data;
 const participants=[{phone:'+96170000001',value:'3'},{phone:'+96170000002',value:'6'}];
 assert.equal((await action(alex,'expense-split',{expense_id:exp.expense_id,method:'custom',participants})).status,400);
 assert.equal(Number((await app.store.one('SELECT count(*) n FROM expense_share WHERE expense_id=$1',[exp.expense_id])).n),0);
 assert.equal((await action(maya,'expense-split',{expense_id:exp.expense_id,method:'custom',participants})).status,403);
 participants[1].value='7';assert.equal((await action(alex,'expense-split',{expense_id:exp.expense_id,method:'custom',participants})).status,200);
 const percent=(await action(alex,'expense',{title:'Percent split',amount:'10.01'})).data;
 assert.equal((await action(alex,'expense-split',{expense_id:percent.expense_id,method:'percentage',participants:[{phone:'+96170000001',value:'33.33'},{phone:'+96170000002',value:'66.67'}]})).status,200);
 const shares=await app.store.q('SELECT * FROM expense_share WHERE expense_id=$1 ORDER BY user_id',[percent.expense_id]);assert.deepEqual(shares.map(s=>Number(s.amount)),[3.34,6.67]);
});
test('expense cancellation cancels pending requests; shared expenses require active membership',async()=>{
 const exp=(await action(alex,'expense',{title:'Cancel plan',amount:'20'})).data;
 await action(alex,'expense-split',{expense_id:exp.expense_id,method:'equal',participants:[{phone:'+96170000001'},{phone:'+96170000002'}]});
 assert.equal((await action(alex,'expense-cancel',{expense_id:exp.expense_id})).status,200);
 const r=await app.store.one('SELECT * FROM payment_request WHERE expense_id=$1',[exp.expense_id]);assert.equal(r.status,'cancelled');assert.equal((await action(maya,'request-pay',{request_id:r.request_id})).status,400);
 const w=(await action(alex,'shared',{name:'No outsiders',purpose:'general'})).data;
 assert.equal((await action(maya,'expense',{wallet_id:w.wallet_id,title:'Nope',amount:'5'})).status,403);
 const e=(await action(alex,'expense',{wallet_id:w.wallet_id,title:'Members only',amount:'10'})).data;
 assert.equal((await action(alex,'expense-split',{expense_id:e.expense_id,method:'equal',participants:[{phone:'+96170000002'}]})).status,403);
});
test('only the requester can cancel, and cancelled requests cannot be paid',async()=>{
 const r=(await action(alex,'request',{phone:'+96170000002',amount:'2',description:'Cancel me'})).data;
 assert.equal((await action(maya,'request-cancel',{request_id:r.request_id})).status,404);
 assert.equal((await action(alex,'request-cancel',{request_id:r.request_id})).status,200);
 assert.equal((await action(maya,'request-pay',{request_id:r.request_id})).status,400);
});
test('wallet payouts require ownership; archiving requires zero funds and no obligations',async()=>{
 const w=(await action(alex,'shared',{name:'Payout plan',purpose:'general'})).data;
 const i=(await action(alex,'member',{wallet_id:w.wallet_id,phone:'+96170000002'})).data;await action(maya,'invitation-accept',{invitation_id:i.invitation_id});
 await action(alex,'contribute',{wallet_id:w.wallet_id,amount:'10'});
 assert.equal((await action(maya,'wallet-payout',{wallet_id:w.wallet_id,phone:'+96170000002',amount:'10'})).status,403);
 assert.equal((await action(alex,'wallet-archive',{wallet_id:w.wallet_id})).status,400);
 assert.equal((await action(alex,'wallet-payout',{wallet_id:w.wallet_id,phone:'+96170000002',amount:'10'})).status,200);
 const r=(await action(alex,'request',{wallet_id:w.wallet_id,phone:'+96170000002',amount:'1',description:'Archive blocker'})).data;
 assert.equal((await action(alex,'wallet-archive',{wallet_id:w.wallet_id})).status,400);
 await action(alex,'request-cancel',{request_id:r.request_id});
 assert.equal((await action(alex,'wallet-archive',{wallet_id:w.wallet_id})).status,200);
 assert.equal((await action(alex,'expense',{wallet_id:w.wallet_id,title:'Too late',amount:'5'})).status,400);
 assert.equal((await action(alex,'contribute',{wallet_id:w.wallet_id,amount:'5'})).status,400);
});
test('custom categories remain private and cannot be used by other users',async()=>{
 const c=(await action(alex,'category',{name:'Private category'})).data;
 assert.equal((await action(alex,'category',{name:'private CATEGORY'})).status,400);
 assert.ok(!(await request('state',{cookie:maya})).data.categories.some(x=>sameId(x.category_id,c.category_id)));
 assert.equal((await action(maya,'expense',{title:'Wrong scope',amount:'5',category_id:c.category_id})).status,400);
 assert.equal((await action(alex,'expense',{title:'Correct scope',amount:'5',category_id:c.category_id})).status,200);
});
test('business team roles enforce issuance and revocation immediately',async()=>{
 const biz=(await action(alex,'business',{name:'Team test'})).data;
 assert.equal((await action(maya,'business-access',{business_id:biz.business_id,phone:'+96170000003',role:'cashier'})).status,403);
 assert.equal((await action(alex,'business-access',{business_id:biz.business_id,phone:'+96170000002',role:'viewer'})).status,200);
 const bill={business_id:biz.business_id,items:[{name:'Coffee',quantity:1,price:'4'}]};
 assert.equal((await action(maya,'bill',bill)).status,403);
 await action(alex,'business-access',{business_id:biz.business_id,phone:'+96170000002',role:'cashier'});
 assert.equal((await action(maya,'bill',bill)).status,200);
 assert.equal((await action(alex,'business-access',{business_id:biz.business_id,phone:'+96170000001',role:'viewer'})).status,400);
 await action(alex,'business-revoke',{business_id:biz.business_id,phone:'+96170000002'});
 assert.equal((await action(maya,'bill',bill)).status,403);
});

test('collaboration operations preserve ledger reconciliation',async()=>{
 const errors=await app.store.q('SELECT w.wallet_id FROM wallet w LEFT JOIN ledger_entry l USING(wallet_id) GROUP BY w.wallet_id HAVING w.balance <> coalesce(sum(l.amount),0)');assert.deepEqual(errors,[]);
 const unbalanced=await app.store.q('SELECT transaction_id FROM ledger_entry GROUP BY transaction_id HAVING count(*)<2 OR sum(amount)<>0');assert.deepEqual(unbalanced,[]);
});
