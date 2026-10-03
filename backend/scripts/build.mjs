import fs from 'node:fs';
fs.rmSync('dist',{recursive:true,force:true});fs.mkdirSync('dist/server',{recursive:true});
const study=JSON.parse(fs.readFileSync('data/study.json','utf8')),boss=JSON.parse(fs.readFileSync('data/boss.json','utf8'));
const accounts=fs.readFileSync('server/accounts.mjs','utf8');
const worker=fs.readFileSync('server/worker.mjs','utf8').replace('export default {','return {');
fs.writeFileSync('dist/server/index.js','const STUDY_DATA='+JSON.stringify(study)+';\nconst BOSS_DATA='+JSON.stringify(boss)+';\nfunction runtime(env){\n'+accounts+'\n'+worker+'\n}\nexport default {fetch(request,env){return runtime(env).fetch(request,env);}};\n');
console.log('Backend independente compilado; dados de questões preservados.');
