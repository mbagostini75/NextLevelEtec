import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
const worker=(await import('../dist/server/index.js')).default;
const origin='https://nextlevel.example';
const database=new DatabaseSync(':memory:');
for(const file of fs.readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())database.exec(fs.readFileSync('drizzle/'+file,'utf8'));
const env={APP_ORIGIN:origin,GOOGLE_OAUTH_CLIENT_ID:"test-client",MAIL_SENDER:"nextleveletec@gmail.com",ADMIN_EMAIL:"admin@example.com",GMAIL_STORAGE_KEY:randomBytes(32).toString('base64url'),DB:{prepare(sql){return {bind(...args){return {async first(){return database.prepare(sql).get(...args)||null;},async run(){return database.prepare(sql).run(...args);}}}}}},ASSETS:{fetch(){return new Response('asset');}}};
const raw='admin-cookie';
database.prepare('INSERT INTO users (id,email,name,birth_date,school,grade,address,password_hash,created_at) VALUES (?,?,?,?,?,?,?,?,?)').run('admin','admin@example.com','Admin','1990-01-01','Escola','9','','hash',0);
database.prepare('INSERT INTO user_public_profiles (user_id,nick) VALUES (?,?)').run('admin','Admin');
database.prepare('INSERT INTO sessions (hash,user_id,expires_at) VALUES (?,?,?)').run(Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw))).toString('base64url'),'admin',Math.floor(Date.now()/1000)+3600);
const headers={cookie:'__Host-nextlevel='+raw};
async function get(path,h=headers){return worker.fetch(new Request(origin+path,{headers:h}),env);}
async function token(){return (await (await get('/admin/email')).text()).match(/name="csrf" value="([^"]+)"/)[1];}
async function post(path,body,extra={}){return worker.fetch(new Request(origin+path,{method:'POST',headers:{...headers,origin,...extra},body:new URLSearchParams({csrf:await token(),...body})}),env);}
const anonymousAdmin=await get('/admin/email',{});assert.equal(anonymousAdmin.status,303);assert.equal(anonymousAdmin.headers.get('location'),'/conta?admin=1');
assert.equal((await get('/admin/email', {...headers,'oai-authenticated-user-email':'admin@example.com'})).status,403);
env.ADMIN_EMAIL='other@example.com';assert.equal((await get('/admin/email')).status,403);env.ADMIN_EMAIL='ADMIN@example.com,second@example.com';
assert.equal((await get('/assets/modules.js')).status,200);
assert.equal((await get('/')).status,200);
assert.equal((await post('/admin/email/credencial',{secret:'test-client-secret',csrf:'forged'},{origin:'https://evil.example'})).status,403);
assert.equal((await post('/admin/email/credencial',{secret:'test-client-secret'},{origin:''})).status,303);
assert.ok(!database.prepare('SELECT client_secret FROM mail_settings').get().client_secret.includes('test-client-secret'));
let identity='nextleveletec@gmail.com',scope='https://www.googleapis.com/auth/gmail.send',sendFails=false,sends=0;
globalThis.fetch=async (url,init)=>{
  if(url.endsWith('/token'))return Response.json({access_token:'access-test',refresh_token:'refresh-test',scope});
  if(url.endsWith('/userinfo'))return Response.json({email:identity,email_verified:true});
  if(url.endsWith('/messages/send')){
    sends++;
    assert.match(Buffer.from(JSON.parse(init.body).raw,'base64url').toString(),/To: nextleveletec@gmail.com\r\n/);
    return sendFails?Response.json({error:'failed'},{status:500}):Response.json({id:'message-test'});
  }
  throw new Error('Unexpected external request');
};
async function start(){const res=await post('/admin/email/conectar',{});assert.equal(res.status,303);const url=new URL(res.headers.get('location'));assert.equal(url.searchParams.get('code_challenge_method'),'S256');assert.equal(url.searchParams.get('redirect_uri'),origin+'/admin/email/retorno');return url.searchParams.get('state');}
async function finish(state){return get('/admin/email/retorno?state='+encodeURIComponent(state)+'&code=code-test');}
assert.equal((await finish('invalid')).status,400);
let state=await start();identity='wrong@gmail.com';assert.equal((await finish(state)).status,400);assert.equal(database.prepare('SELECT refresh_token FROM mail_settings').get().refresh_token,null);
identity='nextleveletec@gmail.com';scope='openid email';state=await start();assert.equal((await finish(state)).status,400);
scope='https://www.googleapis.com/auth/gmail.send';state=await start();assert.equal((await finish(state)).status,303);assert.equal((await finish(state)).status,400);
assert.ok(!database.prepare('SELECT refresh_token FROM mail_settings').get().refresh_token.includes('refresh-test'));
assert.equal((await post('/admin/email/testar',{})).status,200);assert.equal(sends,1);assert.equal((await post('/admin/email/testar',{})).status,429);assert.equal(sends,1);
database.exec('UPDATE mail_settings SET last_attempt_at=NULL,last_test_at=NULL,last_message_id=NULL');sendFails=true;
assert.equal((await post('/admin/email/testar',{})).status,502);assert.equal(database.prepare('SELECT last_test_at FROM mail_settings').get().last_test_at,null);
assert.doesNotMatch(await (await get('/admin/email')).text(),/Último teste aceito/);
assert.equal((await post('/admin/email/credencial',{secret:'replacement-secret'})).status,303);assert.equal(database.prepare('SELECT refresh_token FROM mail_settings').get().refresh_token,null);
assert.equal((await post('/admin/email/testar',{})).status,400);
console.log('Gmail tests passed: owner access, CSRF, encryption, account/scope validation, replay prevention, fixed-recipient send and rate limiting.');
