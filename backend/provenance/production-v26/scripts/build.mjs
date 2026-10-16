import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
fs.rmSync('dist', {recursive:true,force:true});
fs.mkdirSync('dist/server',{recursive:true});
fs.mkdirSync('dist/client',{recursive:true});
fs.mkdirSync('dist/.openai',{recursive:true});
fs.cpSync('web/assets','dist/client/assets',{recursive:true});
fs.copyFileSync('web/consulta.html','dist/client/consulta.html');
fs.copyFileSync('.openai/hosting.json','dist/.openai/hosting.json');
const worker=fs.readFileSync('server/worker.mjs','utf8');
const html=fs.readFileSync('web/index.html','utf8');
const context={console,Date,Math,Number,Array,Object,JSON,String,setTimeout:()=>0,clearTimeout(){},localStorage:{getItem:()=>null,setItem(){}},document:{documentElement:{setAttribute(){}},getElementById:()=>({innerHTML:'',style:{}}),body:{appendChild(){}},createElement:()=>({style:{}})},window:{scrollTo(){}}};
vm.createContext(context);
for(const match of html.matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)){
  if(['assets/accounts.js','assets/music.js'].includes(match[1]))continue;
  vm.runInContext(match[1]?fs.readFileSync('web/'+match[1],'utf8'):match[2],context);
}
const subjects=context.window.NEXT_ENGINE.subjects.map(s=>({...s,topics:s.topics.map(t=>({...t,pool:t.pool.map(q=>({...q,key:'study:'+s.id+':'+createHash('sha256').update(JSON.stringify([q.prompt,q.options])).digest('hex')}))}))}));
const boss=context.window.NEXT_BOSS.map(q=>({...q,key:'boss:'+q.id,bossId:q.id}));
fs.writeFileSync('dist/server/index.js','const GAME_HTML='+JSON.stringify(html)+';\nconst STUDY_DATA='+JSON.stringify(subjects)+';\nconst BOSS_DATA='+JSON.stringify(boss)+';\n'+fs.readFileSync('server/accounts.mjs','utf8')+'\n'+worker);
console.log('Built Worker and preserved study assets.');
