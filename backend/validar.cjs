'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.join(__dirname,"fixtures/web"),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
let elements={app:{innerHTML:''},toast:{style:{}},'storage-warning':{hidden:true}},storage={};
function context(){let c={console,Date,Math,Number,Array,Object,JSON,String,setTimeout:()=>0,clearTimeout(){},localStorage:{getItem:k=>storage[k]||null,setItem:(k,v)=>storage[k]=v},document:{documentElement:{setAttribute(){}},getElementById:id=>elements[id],body:{appendChild(){}},createElement:()=>({style:{}})},window:{scrollTo(){}}};vm.createContext(c);for(const match of html.matchAll(/<script(?: src="([^"]+)")?>([\s\S]*?)<\/script>/g)){let code=match[1]?fs.readFileSync(path.join(root,match[1]),'utf8'):match[2];new vm.Script(code);vm.runInContext(code,c);}return c;}
const c=context(),g=c.window.RotaGame,E=c.window.NEXT_ENGINE,M=c.window.NextModules;
// Conteúdo de estudo acessível antes de liberar os duelos, em todas as matérias.
for(const subject of E.subjects){g.go({name:'subject',subjectId:subject.id});assert(!/disabled/.test(elements.app.innerHTML.replace(/<button id="music-toggle"[^>]*>[\s\S]*?<\/button>/g,'')),'Lista de estudo deve permitir todos os tópicos');for(const topic of subject.topics){g.go({name:'topic',subjectId:subject.id,topicId:topic.id});const rendered=elements.app.innerHTML;assert(rendered.includes('Resumo do tópico'));assert(rendered.includes('Assistir à videoaula'));assert(rendered.includes('Ler e entender'));assert(rendered.includes('Praticar com exercícios'));}}
let total=0,topics=0;assert.equal(E.subjects.length,7);
for(const s of E.subjects){assert(s.topics.length);for(const t of s.topics){topics++;total+=t.pool.length;assert(t.pool.length>=24);for(const q of t.pool){assert(Number.isInteger(q.answer));assert(q.answer>=0&&q.answer<q.options.length);assert.equal(new Set(q.options).size,q.options.length,q.prompt);assert(q.solution.length);}}}
assert.equal(total,891);assert.equal(topics,34);
function runRound(correct){let d=E.duel();for(let i=0;i<12;i++){d=E.duel();let q=d.questions[d.index];g.answer(i<correct?q.answer:(q.answer+1)%q.options.length);g.nextQuestion();}}
for(const s of E.subjects){if(s.topics.length>1){g.go({name:'home'});g.startTopic(s.id,s.topics[1].id);assert(!E.duel(),'Tópico deve estar bloqueado');}for(const t of s.topics){g.startTopic(s.id,t.id);assert.equal(E.duel().questions.length,12);let prev=E.duel().questions.map(q=>q.sourceKey);runRound(9);assert.equal(E.duel().phase,'roundResult');assert(!E.state().completed[s.id+'-'+t.id]);g.nextRound();assert.equal(E.duel().correctCount,0);assert.equal(E.duel().questions.length,12);assert(E.duel().questions.every(q=>!prev.includes(q.sourceKey)));runRound(10);assert.equal(E.duel().phase,'victory');assert(E.state().completed[s.id+'-'+t.id]);let coins=E.state().coins;g.nextQuestion();assert.equal(E.state().coins,coins);}}
// A mesma questão não ganha XP outra vez. Forçar respostas repetidas cobre a deduplicação.
let s=E.subjects[0],t=s.topics[0];g.startTopic(s.id,t.id);let d=E.duel(),q=d.questions[0];let key=s.id+'|'+q.sourceKey;E.state().solvedKeys[key]=true;let xp=E.state().xp;g.answer(q.answer);assert.equal(E.state().xp,xp);
for(const theme of ['base']){g.go({name:'home'});g.setTheme(theme);assert.equal(E.state().theme,theme);}
// Gabaritos completos; testar todas as 540 alternativas e a anulação.
assert.equal(c.window.NEXT_EXAMS.length,11);assert.equal(c.window.NEXT_EXAMS.reduce((n,e)=>n+e.count,0),540);
for(const e of c.window.NEXT_EXAMS){assert.equal(e.key.length,e.count);assert(e.pdf===e.source && /^https:\/\/drive.google.com\//.test(e.source));assert(/^https:\/\/drive.google.com\//.test(e.keySource));assert(e.questions.length===e.count);for(const q of e.questions)for(const img of q.images)assert(fs.existsSync(path.join(root,img)));assert(e.pages.every(n=>Number.isInteger(n)&&n>0));M.goExam(e.id);e.key.forEach((a,i)=>{if(a)M.markExam(i,a);});M.submitExam();let result=E.state().examDrafts[e.id].result;assert.equal(result.correct,e.count);assert.equal(result.blank,0);M.markExam(0,'A');assert(E.state().examDrafts[e.id].submitted);}
assert.equal(c.window.NEXT_EXAMS.find(e=>e.id==='2023-1').count,40);
assert.equal(c.window.NEXT_EXAMS.find(e=>e.id==='2020-1').key[22],null);
assert.equal(c.window.NEXT_EXAMS.find(e=>e.id==='2024-2').key[24],'B');
assert.equal(M.grade(['A',null,'C'],[null,null,'B']).correct,1);
assert.equal(M.grade(['A',null,'C'],[null,null,'B']).blank,1);
// Chefe: 180 questões; acertar todas e confirmar recompensa única.
assert.equal(c.window.NEXT_BOSS.length,180);assert.equal(new Set(c.window.NEXT_BOSS.map(q=>q.id)).size,180);assert.equal(new Set(c.window.NEXT_BOSS.map(q=>q.prompt)).size,180);
for(const q of c.window.NEXT_BOSS){assert(q.options.length===4);assert.equal(new Set(q.options).size,4);assert(q.solution.length);}
M.startBoss(true);let bd=E.state().bossDraft;let by=Object.fromEntries(c.window.NEXT_BOSS.map(q=>[q.id,q]));for(let i=0;i<180;i++){M.selectBoss(i);M.markBoss(String.fromCharCode(65+by[bd.order[i]].answer));}let coins=E.state().coins;xp=E.state().xp;M.submitBoss();assert.equal(bd.result.correct,180);assert.equal(E.state().coins,coins+100);assert.equal(E.state().xp,xp+1800);M.submitBoss();assert.equal(E.state().coins,coins+100);M.startBoss(true);M.submitBoss();assert.equal(E.state().coins,coins+100);
// Recarregar preserva progresso, provas corrigidas e tentativas do chefe.
E.save();const reloaded=context().window.NEXT_ENGINE;assert.equal(reloaded.state().xp,E.state().xp);assert.equal(Object.keys(reloaded.state().completed).length,34);assert.equal(Object.keys(reloaded.state().examResults).length,11);assert.equal(reloaded.state().bossResults.length,2);
console.log('APROVADO: 7 matérias, 34 tópicos, 891 questões de treino, 180 no Chefe e 540 oficiais.');
console.log('APROVADO: aprovação 10/12, reprovação 9/12, rodada sem repetição imediata, fases, progresso, XP e recompensas sem duplicação, gabarito retificado e anulação.');
// Cálculos do banco novo: refazer as fórmulas a partir dos números dos enunciados.
const fis=E.subjects.find(s=>s.id==='fis');for(const t of fis.topics.slice(0,3)){t.pool.slice(0,24).forEach((q,i)=>{const n=q.prompt.match(/\d+/g).map(Number);let expected,j=i%4;if(t.id==='movimento')expected=j===0?n[0]/n[1]:j===1?n[0]*n[1]:j===2?n[0]*n[1]:n[1]*n[0];if(t.id==='energia')expected=j===0?n[0]*n[1]:j===1?n[0]/n[1]:j===2?n[0]*n[1]*n[1]/2:n[0]*n[1]*n[2];if(t.id==='eletricidade')expected=j===3?n[0]+n[1]:n[0]*n[1];assert.equal(Number(q.options[q.answer]),expected,q.prompt);});}
console.log('APROVADO: 72 problemas numéricos novos de Física recalculados.');
let numericBoss=0;for(const q of c.window.NEXT_BOSS){const n=(q.prompt.match(/\d+/g)||[]).map(Number);let expected;if(q.subject==='Matemática'){if(q.topic==='Porcentagem')expected=n[0]*0.85;if(q.topic==='Equações')expected=(n[2]+n[1])/n[0];if(q.topic==='Geometria')expected=n[0]*n[1];if(q.topic==='Estatística')expected=n.reduce((a,b)=>a+b,0)/n.length;if(q.topic==='Razão')expected=n[0]*n[1]/(n[1]+n[2]);if(q.topic==='Probabilidade')expected='5/12';}if(q.subject==='Química'){if(q.topic==='Densidade'||q.topic==='Concentração')expected=n[0]/n[1];if(q.topic==='Reações')expected=n[0]+n[1];if(q.topic==='Fórmulas')expected=n[0]*2;}if(q.subject==='Física'&&q.topic!=='Calor')expected=n[0]*n[1];if(q.subject==='Geografia'){if(q.topic==='Escala')expected=Number(q.prompt.match(/por (\d+) cm/)[1])*2;if(q.topic==='População')expected=n[0]/n[1];if(q.topic==='Demografia')expected=n[0]-n[1];}if(expected!==undefined){assert.equal(String(q.options[q.answer]),String(expected),q.prompt);numericBoss++;}}
assert.equal(numericBoss,86);console.log('APROVADO: 86 problemas quantitativos do Chefe recalculados.');
function checkEvents(){for(const m of elements.app.innerHTML.matchAll(/onclick="([^"]*)"/g)){let event=m[1].replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');new vm.Script('(function(){'+event+'})');}}
for(const theme of ['base']){g.go({name:'home'});g.setTheme(theme);checkEvents();assert(elements.app.innerHTML.includes('Next Level'));}
for(const s of E.subjects){g.go({name:'subject',subjectId:s.id});checkEvents();g.go({name:'topic',subjectId:s.id,topicId:s.topics[0].id});checkEvents();g.startTopic(s.id,s.topics[0].id);checkEvents();}
for(const e of c.window.NEXT_EXAMS){M.goExam(e.id);checkEvents();}
M.startBoss(true);checkEvents();M.submitBoss();checkEvents();
console.log('APROVADO: eventos gerados nas telas de temas, matérias, tópicos, duelos, provas e Chefe.');
const RC=c.window.ReadingCheck;
for(const subject of E.subjects)for(const t of subject.topics){
 const startXP=E.state().xp,k=subject.id+'-'+t.id;
 RC.start(subject.id,t.id,false);let d=E.state().readingChecks[k];
 assert.equal(d.questions.length,4);assert.equal(new Set(d.questions.map(q=>q.sourceKey)).size,4);
 RC.submit();assert(!d.submitted);assert.equal(E.state().xp,startXP);
 for(let i=0;i<4;i++){RC.select(i);const q=d.questions[i];RC.mark(i<2?q.answer:(q.answer+1)%q.options.length);}
 RC.submit();assert.equal(d.score,2);assert(!d.passed);assert.equal(E.state().xp,startXP);
 let old=d.questions.map(q=>q.sourceKey);RC.start(subject.id,t.id,true);d=E.state().readingChecks[k];
 assert(d.questions.every(q=>!old.includes(q.sourceKey)));
 for(let i=0;i<4;i++){RC.select(i);const q=d.questions[i];RC.mark(i<3?q.answer:(q.answer+1)%q.options.length);}
 RC.submit();assert.equal(d.score,3);assert(d.passed&&d.earned);assert.equal(E.state().xp,startXP+20);
 RC.submit();RC.mark(0);assert.equal(E.state().xp,startXP+20);
 old=d.questions.map(q=>q.sourceKey);RC.start(subject.id,t.id,true);d=E.state().readingChecks[k];
 assert(d.questions.every(q=>!old.includes(q.sourceKey)));
 for(let i=0;i<4;i++){RC.select(i);RC.mark(d.questions[i].answer);}
 RC.submit();assert.equal(d.score,4);assert.equal(d.reward,0);assert.equal(E.state().xp,startXP+20);
 checkEvents();
}
const checkReloaded=context();assert.equal(Object.values(checkReloaded.window.NEXT_ENGINE.state().readingChecks).filter(d=>d.earned).length,34);
console.log('APROVADO: 34 checagens, 2/4 reprova, 3/4 aprova, +20 XP uma vez, repetição e recarga sem bônus duplicado, novas perguntas e alternativas preservadas.');

const curriculum=c.window.NEXT_CURRICULUM;assert.equal(curriculum.length,8);assert.equal(curriculum.reduce((n,s)=>n+s.topics.length,0),84);assert.equal(curriculum.reduce((n,s)=>n+s.topics.reduce((v,t)=>v+t.frequency,0),0),540);
for(const subject of curriculum){g.go({name:'subject',subjectId:subject.id});assert(elements.app.innerHTML.includes(subject.name));checkEvents();for(const t of subject.topics){assert(elements.app.innerHTML.includes(t.title));g.go({name:'curriculumTopic',subjectId:subject.id,topicId:t.id});assert(elements.app.innerHTML.includes(t.title));assert(elements.app.innerHTML.includes('em preparação'));checkEvents();g.go({name:'subject',subjectId:subject.id});}}
g.go({name:'home'});assert.equal((elements.app.innerHTML.match(/class="subject-card"/g)||[]).length,8);assert(!elements.app.innerHTML.includes('undefined'));console.log('APROVADO: currículo com 8 matérias, 84 tópicos, 540 ocorrências; navegação de todos os tópicos e conteúdo pendente identificado.');
