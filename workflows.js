import { AppError, money, text } from './store.js';
const same=(a,b)=>String(a)===String(b);
const cents=x=>Math.round(Number(x)*100);
const decimal=x=>(x/100).toFixed(2);
function phone(x){if(typeof x!=='string'||!/^\+[1-9]\d{7,14}$/.test(x))throw new AppError('Use an international phone number, for example +96170123456.');return x;}
export function collaboration({q,one,member,personal,transfer}){
 async function activeMember(uid,wid,owner=false){const w=await member(uid,wid);if(w.wallet_type!=='shared'||w.status!=='active')throw new AppError('Choose an active shared wallet.');if(owner&&w.member_role!=='owner')throw new AppError('Only the wallet owner can do that.',403);return w;}
 async function expenseAccess(uid,eid){const e=await one('SELECT * FROM expense WHERE expense_id=$1 FOR UPDATE',[eid]);if(!e||!same(e.owner_user_id,uid))throw new AppError('Only the person who recorded this expense can manage its split.',403);return e;}
 async function categoryAccess(uid,id){if(!id)return null;const c=await one('SELECT category_id FROM category WHERE category_id=$1 AND active AND (owner_user_id IS NULL OR owner_user_id=$2)',[id,uid]);if(!c)throw new AppError('Category is unavailable.');return c.category_id;}
 async function refreshExpense(eid){
  const rows=await q(`SELECT s.*,p.status FROM expense_share s LEFT JOIN payment_request p USING(request_id) WHERE s.expense_id=$1`,[eid]);if(!rows.length)return;
  const total=rows.reduce((n,s)=>n+cents(s.amount),0), paid=rows.filter(s=>s.settled||s.status==='paid').reduce((n,s)=>n+cents(s.amount),0);
  await q('UPDATE expense SET status=$1 WHERE expense_id=$2',[paid===total?'paid':paid>0?'partially_settled':'unpaid',eid]);
 }
 async function action(uid,kind,b){
  if(kind==='member'){
   const w=await activeMember(uid,b.wallet_id);if(!['owner','administrator'].includes(w.member_role))throw new AppError('Only owners and administrators may invite members.',403);
   const number=phone(b.phone), u=await one('SELECT user_id FROM users WHERE phone=$1',[number]);
   if(u&&await one('SELECT user_id FROM shared_wallet_member WHERE user_id=$1 AND shared_wallet_id=$2',[u.user_id,w.wallet_id]))throw new AppError('This person is already a member.');
   await q("UPDATE wallet_invitation SET status='cancelled',responded_at=now() WHERE wallet_id=$1 AND phone=$2 AND status='pending' AND expires_at<=now()",[w.wallet_id,number]);
   if(await one("SELECT invitation_id FROM wallet_invitation WHERE wallet_id=$1 AND phone=$2 AND status='pending'",[w.wallet_id,number]))throw new AppError('An invitation is already pending for this number.');
   return one('INSERT INTO wallet_invitation(wallet_id,invited_by,phone) VALUES($1,$2,$3) RETURNING *',[w.wallet_id,uid,number]);
  }
  if(['invitation-accept','invitation-decline','invitation-cancel'].includes(kind)){
   const i=await one('SELECT * FROM wallet_invitation WHERE invitation_id=$1 FOR UPDATE',[b.invitation_id]);if(!i)throw new AppError('Invitation not found.',404);
   if(kind==='invitation-cancel')await activeMember(uid,i.wallet_id,true);
   else {const u=await one('SELECT phone FROM users WHERE user_id=$1',[uid]);if(i.phone!==u.phone)throw new AppError('Invitation not found.',404);}
   if(i.status!=='pending'||new Date(i.expires_at)<=new Date())throw new AppError('This invitation is no longer active.');
   if(kind==='invitation-accept'){
    const w=await one('SELECT status FROM wallet WHERE wallet_id=$1',[i.wallet_id]);if(w.status!=='active')throw new AppError('This wallet is no longer active.');
    await q("INSERT INTO shared_wallet_member(user_id,shared_wallet_id,member_role) VALUES($1,$2,'participant') ON CONFLICT DO NOTHING",[uid,i.wallet_id]);
   }
   return one('UPDATE wallet_invitation SET status=$1,responded_at=now() WHERE invitation_id=$2 RETURNING *',[kind==='invitation-accept'?'accepted':kind==='invitation-decline'?'declined':'cancelled',i.invitation_id]);
  }
  if(kind==='wallet-payout'){
   const w=await activeMember(uid,b.wallet_id,true);const sw=await one('SELECT purpose FROM shared_wallet WHERE shared_wallet_id=$1',[w.wallet_id]);if(sw.purpose!=='general')throw new AppError('Use the dedicated gift or bill settlement flow for this wallet.');
   const recipient=await one('SELECT w.wallet_id FROM users u JOIN wallet w ON w.personal_user_id=u.user_id WHERE u.phone=$1',[phone(b.phone)]);if(!recipient)throw new AppError('The recipient must have a registered personal wallet.');
   return transfer(w.wallet_id,recipient.wallet_id,money(b.amount),'shared_payout');
  }
  if(kind==='wallet-archive'){
   const w=await activeMember(uid,b.wallet_id,true);if(cents(w.balance)!==0)throw new AppError('Move the remaining balance before archiving.');
   const obligations=await one(`SELECT
    EXISTS(SELECT 1 FROM payment_request WHERE destination_wallet_id=$1 AND status='pending' AND expires_at>now()) OR
    EXISTS(SELECT 1 FROM expense WHERE shared_wallet_id=$1 AND status NOT IN ('paid','cancelled')) OR
    EXISTS(SELECT 1 FROM bill WHERE shared_wallet_id=$1 AND status NOT IN ('paid','cancelled')) AS pending`,[w.wallet_id]);
   if(obligations.pending)throw new AppError('Resolve pending requests, expenses, and bills before archiving.');
   await q("UPDATE wallet_invitation SET status='cancelled',responded_at=now() WHERE wallet_id=$1 AND status='pending'",[w.wallet_id]);
   return one("UPDATE wallet SET status='archived' WHERE wallet_id=$1 RETURNING *",[w.wallet_id]);
  }
  if(kind==='request-cancel'){
   const r=await one('SELECT * FROM payment_request WHERE request_id=$1 AND requester_id=$2 FOR UPDATE',[b.request_id,uid]);if(!r)throw new AppError('Request not found.',404);if(r.expense_id)throw new AppError('Manage this request through its expense split.');if(r.status!=='pending')throw new AppError('Only pending requests can be cancelled.');
   return one("UPDATE payment_request SET status='cancelled',responded_at=now() WHERE request_id=$1 RETURNING *",[r.request_id]);
  }
  if(kind==='expense'){
   if(b.wallet_id)await activeMember(uid,b.wallet_id);
   const day=b.expense_date||new Date().toISOString().slice(0,10);if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||Number.isNaN(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day)throw new AppError('Enter a valid expense date.');
   return one(`INSERT INTO expense(owner_user_id,shared_wallet_id,title,total_amount,split_method,expense_date,notes,category_id) VALUES($1,$2,$3,$4,'equal',$5,$6,$7) RETURNING *`,[uid,b.wallet_id||null,text(b.title,'title'),money(b.amount),day,b.notes?text(b.notes,'notes',1000):null,await categoryAccess(uid,b.category_id)]);
  }
  if(kind==='expense-split'){
   const e=await expenseAccess(uid,b.expense_id);if(e.status==='cancelled')throw new AppError('This expense is cancelled.');
   if(await one('SELECT expense_id FROM expense_share WHERE expense_id=$1 LIMIT 1',[e.expense_id]))throw new AppError('This expense already has a split.');
   if(e.shared_wallet_id)await activeMember(uid,e.shared_wallet_id);
   if(!['equal','custom','percentage'].includes(b.method))throw new AppError('Choose an equal, custom, or percentage split.');
   if(!Array.isArray(b.participants)||!b.participants.length||b.participants.length>30)throw new AppError('Choose 1–30 participants.');
   const people=[];for(const item of b.participants){const u=await one('SELECT user_id FROM users WHERE phone=$1',[phone(item.phone)]);if(!u)throw new AppError('Every participant must register before splitting.');if(people.some(p=>same(p.user_id,u.user_id)))throw new AppError('Each participant can appear only once.');if(e.shared_wallet_id)await member(u.user_id,e.shared_wallet_id);people.push({...u,value:item.value});}
   const total=cents(e.total_amount);let amounts;
   if(b.method==='equal')amounts=people.map((_,i)=>Math.floor(total/people.length)+(i<total%people.length?1:0));
   else if(b.method==='custom')amounts=people.map(p=>cents(money(p.value)));
   else {
    const weights=people.map(p=>cents(money(p.value)));if(weights.reduce((n,v)=>n+v,0)!==10000)throw new AppError('Percentages must add up to exactly 100%.');
    amounts=weights.map(w=>Math.floor(total*w/10000));const remainders=weights.map((w,i)=>({i,remainder:(total*w)%10000})).sort((a,b)=>b.remainder-a.remainder||a.i-b.i);
    for(let n=total-amounts.reduce((s,v)=>s+v,0),i=0;i<n;i++)amounts[remainders[i].i]++;
   }
   if(amounts.some(n=>n<1)||amounts.reduce((n,v)=>n+v,0)!==total)throw new AppError('Shares must be at least $0.01 and add up to the expense total.');
   const dest=await personal(uid);
   for(let i=0;i<people.length;i++){
    const own=same(people[i].user_id,uid);let request;
    if(!own)request=await one(`INSERT INTO payment_request(requester_id,payer_id,destination_wallet_id,expense_id,amount,description,status,expires_at) VALUES($1,$2,$3,$4,$5,$6,'pending',now()+interval '7 days') RETURNING request_id`,[uid,people[i].user_id,dest.wallet_id,e.expense_id,decimal(amounts[i]),e.title]);
    await q('INSERT INTO expense_share(expense_id,user_id,amount,request_id,settled) VALUES($1,$2,$3,$4,$5)',[e.expense_id,people[i].user_id,decimal(amounts[i]),request?.request_id||null,own]);
   }
   await q('UPDATE expense SET split_method=$1 WHERE expense_id=$2',[b.method,e.expense_id]);await refreshExpense(e.expense_id);
   return one('SELECT * FROM expense WHERE expense_id=$1',[e.expense_id]);
  }
  if(kind==='expense-cancel'){
   const e=await expenseAccess(uid,b.expense_id);if(e.status==='cancelled')throw new AppError('Expense is already cancelled.');
   if(await one("SELECT request_id FROM payment_request WHERE expense_id=$1 AND status='paid' LIMIT 1",[e.expense_id]))throw new AppError('An expense with paid contributions cannot be cancelled.');
   await q("UPDATE payment_request SET status='cancelled',responded_at=now() WHERE expense_id=$1 AND status='pending'",[e.expense_id]);return one("UPDATE expense SET status='cancelled' WHERE expense_id=$1 RETURNING *",[e.expense_id]);
  }
  if(kind==='category'){
   const name=text(b.name,'category name',40);if(await one('SELECT category_id FROM category WHERE lower(name)=lower($1) AND (owner_user_id=$2 OR owner_user_id IS NULL)',[name,uid]))throw new AppError('That category already exists.');
   return one("INSERT INTO category(name,kind,owner_user_id,icon,color) VALUES($1,'expense',$2,'tag','sage') RETURNING *",[name,uid]);
  }
  if(kind==='business-access'||kind==='business-revoke'){
   const biz=await one('SELECT * FROM business WHERE business_id=$1 AND owner_user_id=$2',[b.business_id,uid]);if(!biz)throw new AppError('Only the business owner may manage team access.',403);
   const u=await one('SELECT user_id FROM users WHERE phone=$1',[phone(b.phone)]);if(!u)throw new AppError('This person must register first.');if(same(u.user_id,uid))throw new AppError('The primary owner’s permissions cannot be changed.');
   if(kind==='business-revoke'){await q('DELETE FROM business_access WHERE business_id=$1 AND user_id=$2',[biz.business_id,u.user_id]);return {message:'Access revoked.'};}
   if(!['manager','cashier','viewer'].includes(b.role))throw new AppError('Choose manager, cashier, or viewer.');
   return one('INSERT INTO business_access VALUES($1,$2,$3) ON CONFLICT(business_id,user_id) DO UPDATE SET role=excluded.role RETURNING *',[biz.business_id,u.user_id,b.role]);
  }
  return undefined;
 }
 async function detail(uid,wid){
  const w=await member(uid,wid);if(w.wallet_type!=='shared')throw new AppError('Shared wallet not found.',404);
  const members=await q('SELECT m.user_id,m.member_role,m.joined_at,u.first_name,u.last_name FROM shared_wallet_member m JOIN users u USING(user_id) WHERE shared_wallet_id=$1 ORDER BY m.joined_at',[wid]);
  const invitations=['owner','administrator'].includes(w.member_role)?await q('SELECT * FROM wallet_invitation WHERE wallet_id=$1 ORDER BY created_at DESC',[wid]):[];
  return {wallet:w,members,invitations};
 }
 async function extraState(uid,ids){
  const invitations=await q(`SELECT i.invitation_id,i.wallet_id,i.status,i.created_at,i.expires_at,w.name wallet_name,u.first_name inviter_name FROM wallet_invitation i JOIN wallet w USING(wallet_id) JOIN users u ON u.user_id=i.invited_by WHERE i.phone=(SELECT phone FROM users WHERE user_id=$1) AND i.status='pending' AND i.expires_at>now() ORDER BY i.created_at DESC`,[uid]);
  const categories=await q('SELECT * FROM category WHERE active AND (owner_user_id IS NULL OR owner_user_id=$1) ORDER BY name',[uid]);
  const shares=await q(`SELECT s.*,u.first_name,u.last_name,p.status request_status FROM expense_share s JOIN expense e USING(expense_id) JOIN users u ON u.user_id=s.user_id LEFT JOIN payment_request p USING(request_id) WHERE e.owner_user_id=$1 OR e.shared_wallet_id=ANY($2::bigint[]) OR s.user_id=$1`,[uid,ids]);
  const teams=await q(`SELECT a.*,u.first_name,u.last_name,u.phone FROM business_access a JOIN users u USING(user_id) WHERE a.business_id IN (SELECT business_id FROM business WHERE owner_user_id=$1) ORDER BY a.role,u.first_name`,[uid]);
  return {invitations,categories,shares,teams};
 }
 return {action,detail,extraState,refreshExpense};
}
