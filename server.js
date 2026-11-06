import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve,extname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openStore,AppError,hash,verifyPassword } from './store.js';
export async function createApp({dataDir=process.env.DATA_DIR||'data/lamma'}={}){
 const store=await openStore(dataDir);const {db,q,one}=store;let queue=Promise.resolve();
 const limits=new Map();
 const server=http.createServer((req,res)=>{
  const job=async()=>{
   res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'");
   const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
   try{
    const url=new URL(req.url,'http://localhost');
    if(!url.pathname.startsWith('/api/')){
     const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css','/favicon.svg':'favicon.svg'};const file=files[url.pathname];if(!file){send(404,{error:'Not found.'});return;}
     const data=await readFile(new URL(`./public/${file}`,import.meta.url));res.writeHead(200,{'Content-Type':{'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'}[extname(file)]});res.end(data);return;
    }
    if(req.method==='POST'&&req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)throw new AppError('Cross-origin request rejected.',403);
    let body={};if(req.method==='POST'){let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>32768)throw new AppError('Request is too large.',413);}try{body=JSON.parse(raw||'{}');}catch{throw new AppError('Invalid JSON.');}}
    if(req.method==='GET'&&url.pathname==='/api/health'){send(200,{status:'ok',database:'PostgreSQL / PGlite',mode:'test funds'});return;}
    if(req.method==='POST'&&['/api/login','/api/register'].includes(url.pathname)){
     const ip=req.socket.remoteAddress;const now=Date.now();const rate=limits.get(ip)||{count:0,start:now};if(now-rate.start>60000){rate.count=0;rate.start=now;}rate.count++;limits.set(ip,rate);if(rate.count>25)throw new AppError('Too many attempts. Try again in a minute.',429);
     let user;
     await store.transaction(async()=>{
      if(url.pathname==='/api/register')user=await store.createUser(body.phone,body.first_name,body.last_name,body.password);
      else{user=await one('SELECT * FROM users WHERE phone=$1',[body.phone]);if(!user||typeof body.password!=='string'||body.password.length>128||!verifyPassword(body.password,user.password_hash))throw new AppError('Incorrect phone number or password.',401);}
      const token=randomBytes(32).toString('hex');await q("INSERT INTO sessions VALUES($1,$2,now()+interval '12 hours')",[hash(token),user.user_id]);res.setHeader('Set-Cookie',`lamma_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${process.env.SECURE_COOKIES==='true'?'; Secure':''}`);
     });send(200,{ok:true});return;
    }
    const token=(req.headers.cookie||'').match(/(?:^|;\s*)lamma_session=([a-f0-9]{64})(?:;|$)/)?.[1];const session=token?await one('SELECT user_id FROM sessions WHERE token_hash=$1 AND expires_at>now()',[hash(token)]):null;if(!session)throw new AppError('Please sign in.',401);
    const uid=session.user_id;
    if(req.method==='GET'&&url.pathname==='/api/state'){send(200,await store.state(uid));return;}
    if(req.method==='GET'&&url.pathname==='/api/bill'){
     const bill=await one('SELECT b.*,biz.display_name FROM bill b JOIN business biz USING(business_id) WHERE bill_code=$1',[(url.searchParams.get('code')||'').toUpperCase()]);if(!bill)throw new AppError('Bill not found.',404);bill.items=await q('SELECT * FROM bill_item WHERE bill_id=$1',[bill.bill_id]);send(200,bill);return;
    }
    if(req.method==='POST'&&url.pathname==='/api/logout'){await q('DELETE FROM sessions WHERE token_hash=$1',[hash(token)]);res.setHeader('Set-Cookie','lamma_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');send(200,{ok:true});return;}
    if(req.method==='POST'&&url.pathname.startsWith('/api/actions/')){
     const key=req.headers['idempotency-key'];if(typeof key!=='string'||key.length<8||key.length>100)throw new AppError('A valid idempotency key is required.');
     const kind=url.pathname.split('/').pop();const fingerprint=hash(JSON.stringify({kind,body}));let result;
     await store.transaction(async()=>{
      const existing=await one('SELECT * FROM operation WHERE user_id=$1 AND key=$2',[uid,key]);if(existing){if(existing.fingerprint!==fingerprint)throw new AppError('This idempotency key was used for a different operation.',409);result=existing.response;return;}
      result=await store.action(uid,kind,body);
      await q('INSERT INTO operation VALUES($1,$2,$3,$4)',[uid,key,fingerprint,JSON.stringify(result)]);
      await q('INSERT INTO audit_event(actor_id,action,details) VALUES($1,$2,$3)',[uid,kind,JSON.stringify({id:result.transaction_id||result.wallet_id||result.bill_id||result.request_id||result.expense_id||result.business_id})]);
     });send(200,result);return;
    }
    throw new AppError('Not found.',404);
   }catch(e){if(!e.status)console.error(e);send(e.status||500,{error:e.status?e.message:'Something went wrong. Your operation was not completed.'});}
  };
  queue=queue.then(job,job);
 });return {server,store};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const {server}=await createApp();server.listen(Number(process.env.PORT||3000),process.env.HOST||'0.0.0.0',()=>console.log(`Lamma ready on http://localhost:${process.env.PORT||3000}`));}
