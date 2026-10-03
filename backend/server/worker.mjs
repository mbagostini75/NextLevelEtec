const CLIENT_ID=env.GOOGLE_OAUTH_CLIENT_ID;
const SENDER=env.MAIL_SENDER;
const ORIGIN=env.APP_ORIGIN.replace(/\/$/,'');
const CALLBACK=ORIGIN+'/admin/email/retorno';
const SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';
const enc = new TextEncoder(), dec = new TextDecoder();
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const unb64 = s => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
const random = n => b64(crypto.getRandomValues(new Uint8Array(n)));
const now = () => Math.floor(Date.now()/1000);
const digest = async s => b64(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(s))));
class Failure extends Error { constructor(status,message) { super(message); this.status=status; } }
async function owner(request,env) {
  const user=await accountUser(request,env,false);
  if(!user)throw new Failure(401,'Entre na sua conta para acessar o administrador.');
  const allowed=String(env.ADMIN_EMAIL||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(!allowed.includes(user.email.toLowerCase()))throw new Failure(403,'Esta página é exclusiva do administrador do Next Level.');
  return user.id;
}
function db(env) { if(!env.DB || !env.GMAIL_STORAGE_KEY) throw new Failure(503,'A conexão de e-mail está indisponível. Tente novamente mais tarde.'); return env.DB; }
async function encryptionKey(env) { return crypto.subtle.importKey('raw',unb64(env.GMAIL_STORAGE_KEY),{name:'AES-GCM'},false,['encrypt','decrypt']); }
async function seal(value,env) {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:enc.encode('NextLevel:gmail:v1')},await encryptionKey(env),enc.encode(value));
  return b64(iv)+'.'+b64(new Uint8Array(ciphertext));
}
async function open(value,env) {
  const [iv,body]=value.split('.');
  return dec.decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(iv),additionalData:enc.encode('NextLevel:gmail:v1')},await encryptionKey(env),unb64(body)));
}
async function csrf(env,id,timestamp=now()) {
  const key=await crypto.subtle.importKey('raw',unb64(env.GMAIL_STORAGE_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return timestamp+'.'+b64(new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode('mail-form|'+id+'|'+timestamp))));
}
async function validateForm(request,env,id) {
  // Token HMAC vinculado ao administrador, com validade curta.
  if(Number(request.headers.get('content-length')||0)>8192) throw new Failure(413,'Formulário muito grande.');
  const body=await request.text();
  if(body.length>8192) throw new Failure(413,'Formulário muito grande.');
  const form=new URLSearchParams(body), token=form.get('csrf')||'', t=Number(token.split('.')[0]);
  if(!Number.isInteger(t) || t>now()+30 || t<now()-3600 || token!==await csrf(env,id,t)) throw new Failure(403,'A sessão do formulário expirou. Atualize a página e tente novamente.');
  return form;
}
function response(body,status=200,type='text/html; charset=utf-8',extra={}) {
  return new Response(body,{status,headers:{'content-type':type,'cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff','content-security-policy':"default-src 'self'; style-src 'unsafe-inline'; form-action 'self' https://accounts.google.com; frame-ancestors 'self'; base-uri 'none'",...extra}});
}
const redirect = path => response('',303,'text/plain; charset=utf-8',{location:path});
async function settings(env) { return db(env).prepare('SELECT * FROM mail_settings WHERE id = ?').bind('gmail').first(); }
async function adminPage(env,id,message='',status=200) {
  const cfg=await settings(env), token=await csrf(env,id);
  const field='<input type="hidden" name="csrf" value="'+esc(token)+'">';
  return response(`<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>E-mail · Next Level</title>
  <style>body{margin:0;background:#10221c;color:#eef7ef;font:17px/1.6 system-ui}main{max-width:680px;margin:auto;padding:24px}section{background:#1c382b;border:1px solid #52725a;border-radius:16px;padding:20px;margin:20px 0}h1,h2{line-height:1.3}h2{font-size:21px}a{color:#a6e6b6}input,button{box-sizing:border-box;width:100%;font:inherit;border-radius:8px;padding:12px;margin:8px 0}input{border:1px solid #779980;background:#12261b;color:white}button{border:0;background:#b9f367;color:#15250e;font-weight:700;cursor:pointer}.message{padding:16px;background:#304b25;border-radius:12px}code{overflow-wrap:anywhere;font-size:14px}.muted{color:#c3d3c6}</style>
  <main><a href="/">Voltar ao Next Level</a><h1>Conectar e-mail</h1><p>Remetente: <strong>${SENDER}</strong></p>${message?'<p class="message" role="status">'+esc(message)+'</p>':''}
  <section><h2>1. Endereço de retorno</h2><p>No Google Cloud, abra o cliente OAuth e adicione este endereço em <strong>URIs de redirecionamento autorizados</strong>:</p><code>${CALLBACK}</code><p>Salve a alteração antes de conectar.</p></section>
  <section><h2>2. Credencial do Google</h2><p>${cfg?'Uma chave secreta já foi salva. Só preencha abaixo se precisar substituí-la.':'Cole a chave secreta do cliente OAuth neste formulário privado.'}</p><form method="post" action="/admin/email/credencial">${field}<label for="secret">Chave secreta do cliente OAuth</label><input id="secret" name="secret" type="password" autocomplete="off" required maxlength="500"><button>Salvar credencial</button></form><p class="muted">Não use a senha do Gmail. A credencial é criptografada no servidor e não aparece no código do jogo.</p></section>
  <section><h2>3. Autorizar a conta</h2><p>${cfg?.refresh_token?'Conta conectada: '+esc(cfg.sender)+'.':'Envio ainda não conectado.'}</p><p>O Google solicitará permissão para enviar e-mails e confirmar o endereço da conta. Use ${SENDER}.</p><p class="muted">Enquanto o aplicativo do Google estiver em testes, a autorização poderá expirar e precisar ser renovada.</p>${cfg?'<form method="post" action="/admin/email/conectar">'+field+'<button>Autorizar no Google</button></form>':'<p>Salve a credencial acima para continuar.</p>'}</section>
  ${cfg?.refresh_token?'<section><h2>4. Testar o envio</h2><p>O teste envia uma mensagem somente para '+SENDER+'. Não envia convites a outros usuários.</p><form method="post" action="/admin/email/testar">'+field+'<button>Enviar e-mail de teste</button></form>'+(cfg.last_test_at?'<p>Último teste aceito pelo Gmail: '+esc(new Date(cfg.last_test_at*1000).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}))+'. Confira a caixa de entrada.</p>':'')+'</section>':''}
  <p class="muted">Esta página configura o remetente. Cadastro, grupos e convites ainda não estão ativados.</p></main></html>`,status);
}
async function googleJSON(url,init) {
  const result=await fetch(url,{...init,signal:AbortSignal.timeout(15000)});
  const data=await result.json();
  if(!result.ok || data.error) throw new Failure(502,'O Google não concluiu a operação. Confira a credencial e a autorização da conta.');
  return data;
}
async function tokenRequest(parameters) {
  return googleJSON('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams(parameters).toString()});
}
async function start(request,env,id) {
  await validateForm(request,env,id);
  const cfg=await settings(env);
  if(!cfg) throw new Failure(400,'Salve a credencial antes de autorizar.');
  const state=random(32), verifier=random(48);
  await db(env).prepare('DELETE FROM mail_oauth WHERE expires_at < ? OR owner = ?').bind(now(),id).run();
  await db(env).prepare('INSERT INTO mail_oauth (state_hash,owner,verifier,expires_at) VALUES (?,?,?,?)').bind(await digest(state),id,await seal(verifier,env),now()+600).run();
  const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search=new URLSearchParams({client_id:CLIENT_ID,redirect_uri:CALLBACK,response_type:'code',scope:SEND_SCOPE+' openid email',access_type:'offline',prompt:'consent',state,login_hint:SENDER,code_challenge:await digest(verifier),code_challenge_method:'S256'}).toString();
  return redirect(url.toString());
}
async function callback(request,env,id) {
  const url=new URL(request.url), state=url.searchParams.get('state');
  if(!state || state.length>200) throw new Failure(400,'Retorno de autorização inválido.');
  const attempt=await db(env).prepare('DELETE FROM mail_oauth WHERE state_hash = ? AND owner = ? RETURNING *').bind(await digest(state),id).first();
  if(!attempt || attempt.expires_at<now()) throw new Failure(400,'A autorização expirou ou já foi usada. Inicie uma nova conexão.');
  if(url.searchParams.has('error')) return adminPage(env,id,'Autorização cancelada. Nenhum envio foi realizado.');
  const code=url.searchParams.get('code');
  if(!code || code.length>4096) throw new Failure(400,'Código de autorização ausente ou inválido.');
  const cfg=await settings(env);
  const tokens=await tokenRequest({client_id:CLIENT_ID,client_secret:await open(cfg.client_secret,env),redirect_uri:CALLBACK,grant_type:'authorization_code',code,code_verifier:await open(attempt.verifier,env)});
  if(!(tokens.scope||'').split(' ').includes(SEND_SCOPE)) throw new Failure(400,'A permissão de envio não foi concedida.');
  const identity=await googleJSON('https://openidconnect.googleapis.com/v1/userinfo',{headers:{authorization:'Bearer '+tokens.access_token}});
  if(identity.email?.toLowerCase()!==SENDER || identity.email_verified!==true) throw new Failure(400,'A conta autorizada não é '+SENDER+'. Nenhuma conexão dessa conta foi salva.');
  if(!tokens.refresh_token) throw new Failure(400,'O Google não forneceu autorização para envio automático. Inicie a conexão novamente e confirme a permissão.');
  await db(env).prepare('UPDATE mail_settings SET refresh_token = ?, sender = ?, updated_at = ?, last_attempt_at = NULL, last_test_at = NULL, last_message_id = NULL WHERE id = ?').bind(await seal(tokens.refresh_token,env),SENDER,now(),'gmail').run();
  return redirect('/admin/email?conectado=1');
}
async function testEmail(request,env,id) {
  await validateForm(request,env,id);
  const cfg=await settings(env);
  if(!cfg?.refresh_token || cfg.sender!==SENDER) throw new Failure(400,'Autorize o remetente antes de testar.');
  // Limita envios repetidos pelo botão e evita duplicação simultânea.
  const reserved=await db(env).prepare('UPDATE mail_settings SET last_attempt_at = ? WHERE id = ? AND (last_attempt_at IS NULL OR last_attempt_at < ?) RETURNING id').bind(now(),'gmail',now()-60).first();
  if(!reserved) throw new Failure(429,'Aguarde um minuto antes de enviar outro teste.');
  const tokens=await tokenRequest({client_id:CLIENT_ID,client_secret:await open(cfg.client_secret,env),refresh_token:await open(cfg.refresh_token,env),grant_type:'refresh_token'});
  const mime='From: Next Level <'+SENDER+'>\r\nTo: '+SENDER+'\r\nSubject: Teste de envio - Next Level Etec\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\nEste e-mail confirma um teste da conexao do remetente do Next Level. Nenhum convite de grupo foi enviado.';
  const result=await googleJSON('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{authorization:'Bearer '+tokens.access_token,'content-type':'application/json'},body:JSON.stringify({raw:b64(enc.encode(mime))})});
  if(!result.id) throw new Failure(502,'O Gmail não confirmou o envio.');
  await db(env).prepare('UPDATE mail_settings SET last_message_id = ?, last_test_at = ? WHERE id = ?').bind(result.id,now(),'gmail').run();
  return adminPage(env,id,'Teste aceito pelo Gmail. Confira a caixa de entrada de '+SENDER+'.');
}
export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if([...request.headers.keys()].some(k=>k.toLowerCase().startsWith('oai-')))return response('Headers de autenticação externos não são permitidos.',403);
    if(url.pathname.startsWith('/api/'))return accountRoutes(request,env);
    if(!url.pathname.startsWith('/admin/email')) {
      if(request.method==='GET'&&['/','/conta','/grupos','/convite'].includes(url.pathname))return env.ASSETS.fetch(new Request(new URL('/index.html',request.url),request));
      return env.ASSETS?env.ASSETS.fetch(request):new Response('Não encontrado',{status:404});
    }
    let id;
    try {
      const user=await accountUser(request,env,false);
      if(!user&&request.method==='GET'&&url.pathname==='/admin/email')return redirect('/conta?admin=1');
      id=await owner(request,env); db(env);
      if(url.pathname==='/admin/email' && request.method==='GET') return adminPage(env,id,url.searchParams.has('conectado')?'Conta conectada. Faça o teste de envio abaixo.':'');
      if(url.pathname==='/admin/email/credencial' && request.method==='POST') {
        const form=await validateForm(request,env,id), secret=(form.get('secret')||'').trim();
        if(secret.length<10 || secret.length>500 || /[\s<>]/.test(secret)) throw new Failure(400,'Informe a chave secreta do cliente OAuth.');
        await db(env).prepare('INSERT INTO mail_settings (id,client_secret,updated_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET client_secret=excluded.client_secret,updated_at=excluded.updated_at,refresh_token=NULL,sender=NULL,last_attempt_at=NULL,last_test_at=NULL,last_message_id=NULL').bind('gmail',await seal(secret,env),now()).run();
        return redirect('/admin/email');
      }
      if(url.pathname==='/admin/email/conectar' && request.method==='POST') return await start(request,env,id);
      if(url.pathname==='/admin/email/retorno' && request.method==='GET') return await callback(request,env,id);
      if(url.pathname==='/admin/email/testar' && request.method==='POST') return await testEmail(request,env,id);
      throw new Failure(404,'Página não encontrada.');
    } catch(error) {
      const message=error instanceof Failure?error.message:'Não foi possível concluir a conexão. Atualize a página e tente novamente.';
      // Nunca registrar códigos OAuth, tokens, credenciais ou payloads do Google.
      if(!(error instanceof Failure)) console.error('mail_operation_failed',url.pathname,error.name||'Error');
      return response('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Conexão de e-mail</title><p>'+esc(message)+'</p><p><a href="/admin/email">Voltar à conexão de e-mail</a></p></html>',error.status||503);
    }
  }
};
