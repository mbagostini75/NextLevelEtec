let csrf='';const status=document.getElementById('status'),login=document.getElementById('login'),reset=document.getElementById('reset'),logout=document.getElementById('logout');
async function bootstrap(){const r=await fetch('/api/conta',{cache:'no-store'});const d=await r.json();if(!r.ok)throw Error(d.error);csrf=d.csrf;status.textContent=d.user?'Conectado como '+d.user.email:'';logout.hidden=!d.user;return d;}
async function post(path,data){const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json','x-nextlevel-request':'1','x-nextlevel-csrf':csrf},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw Error(d.error);return d;}
login.onsubmit=async e=>{e.preventDefault();try{await post('/api/entrar',Object.fromEntries(new FormData(login)));await bootstrap();location.assign('/admin/email');}catch(e){status.textContent=e.message;}};
document.getElementById('recover').onclick=async()=>{try{const d=await post('/api/recuperar',{email:login.elements.email.value});status.textContent=d.message;}catch(e){status.textContent=e.message;}};
const token=new URL(location.href).searchParams.get('reset');if(token){reset.hidden=false;login.hidden=true;}
reset.onsubmit=async e=>{e.preventDefault();try{await post('/api/redefinir',{token,password:reset.elements.password.value});history.replaceState({},'','/conta');reset.hidden=true;login.hidden=false;await bootstrap();status.textContent='Senha alterada. Entre novamente.';}catch(e){status.textContent=e.message;}};
logout.onclick=async()=>{try{await post('/api/sair',{});await bootstrap();}catch(e){status.textContent=e.message;}};
bootstrap().catch(e=>{status.textContent=e.message;});
