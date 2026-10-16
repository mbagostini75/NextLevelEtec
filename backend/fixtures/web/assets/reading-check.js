(function(){
'use strict';
var BONUS=20;
function E(){return window.NEXT_ENGINE;}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),v=a[i];a[i]=a[j];a[j]=v;}return a;}
function key(s,t){return s+'-'+t;}
function init(){var state=E().state();if(!state.readingChecks)state.readingChecks={};return state.readingChecks;}
function topic(s,t){var subject=E().subjects.find(function(x){return x.id===s;});return subject&&subject.topics.find(function(x){return x.id===t;});}
function current(){var v=E().view();if(v.name!=='readingCheck')return null;return init()[key(v.subjectId,v.topicId)];}
function start(s,t,retry){var lesson=topic(s,t);if(!lesson)return;var checks=init(),k=key(s,t),old=checks[k];
 if(!old||retry&&old.submitted){
  var previous=old?old.questions.map(function(q){return q.sourceKey;}):[];
  var pool=lesson.pool.filter(function(q){return previous.indexOf(q.sourceKey||JSON.stringify([q.prompt,q.options]))<0;});
  if(pool.length<4)return;
  var questions=shuffle(pool).slice(0,4).map(function(q){var order=shuffle(q.options.map(function(_,i){return i;}));return {sourceKey:q.sourceKey||JSON.stringify([q.prompt,q.options]),prompt:q.prompt,options:order.map(function(i){return q.options[i];}),answer:order.indexOf(q.answer),solution:q.solution||[]};});
  checks[k]={questions:questions,answers:[null,null,null,null],index:0,submitted:false,earned:!!(old&&old.earned),attempt:old?old.attempt+1:1};E().save();
 }
 E().go({name:'readingCheck',subjectId:s,topicId:t});
}
function mark(a){var d=current();if(!d||d.submitted||!Number.isInteger(a)||a<0||a>=d.questions[d.index].options.length)return;d.answers[d.index]=a;E().save();E().render();}
function select(i){var d=current();if(!d||!Number.isInteger(i)||i<0||i>=4)return;d.index=i;E().save();E().render();}
function submit(){var d=current();if(!d||d.submitted||d.answers.some(function(a){return a===null;}))return;
 var score=d.questions.reduce(function(n,q,i){return n+(q.answer===d.answers[i]?1:0);},0);
 d.submitted=true;d.score=score;d.passed=score>=3;d.reward=0;
 if(d.passed&&!d.earned){d.earned=true;d.reward=BONUS;E().state().xp+=BONUS;}
 E().save();E().render();
}
function button(s,t){var d=init()[key(s,t)];return '<div class="card"><h3>Mostre que entendeu</h3><p>4 perguntas · acerte 3 para ganhar '+BONUS+' XP uma única vez neste tópico. Abrir os links não dá pontos.</p><button class="primary-btn" onclick="ReadingCheck.start(\''+s+'\',\''+t+'\',false)">'+(d?(d.submitted?'Ver minha checagem':'Continuar checagem'):'Checar o que aprendi')+'</button>'+(d&&d.earned?'<p>✓ Bônus deste tópico já conquistado.</p>':'')+'</div>';}
function render(){var v=E().view(),d=current(),lesson=topic(v.subjectId,v.topicId);if(!d||!lesson)return '';var q=d.questions[d.index];
 var h='<div class="screen-header"><button class="back-btn" aria-label="Voltar ao tópico" onclick="RotaGame.go({name:\'topic\',subjectId:\''+v.subjectId+'\',topicId:\''+v.topicId+'\'})">‹</button><div><h2>Mostre que entendeu</h2><small>'+esc(lesson.title)+'</small></div></div>';
 if(d.submitted)h+='<div class="result-banner '+(d.passed?'win':'')+'"><h3>'+d.score+' de 4 acertos</h3><p>'+(d.passed?(d.reward?'Você farmou +'+BONUS+' XP!':'Você acertou! O bônus já foi concedido anteriormente.'):'Volte ao material e tente novamente com outras perguntas.')+'</p></div>';
 h+='<div class="question-card"><div class="qcount">'+(d.index+1)+' / 4</div><p class="prompt">'+esc(q.prompt)+'</p><div class="options">';
 q.options.forEach(function(o,i){var chosen=d.answers[d.index]===i;h+='<button class="option-btn '+(d.submitted?(q.answer===i?'correct':chosen?'wrong':''):chosen?'selected':'')+'" aria-pressed="'+chosen+'" '+(d.submitted?'disabled':'onclick="ReadingCheck.mark('+i+')"')+'><span class="letter">'+String.fromCharCode(65+i)+'</span>'+esc(o)+'</button>';});h+='</div></div>';
 if(d.submitted)h+='<div class="solution-box ok"><strong>Entenda a resposta</strong><p>'+q.solution.map(esc).join(' ')+'</p></div>';
 h+='<div class="module-nav"><button '+(d.index===0?'disabled':'')+' onclick="ReadingCheck.select('+(d.index-1)+')">Anterior</button><button '+(d.index===3?'disabled':'')+' onclick="ReadingCheck.select('+(d.index+1)+')">Próxima</button></div>';
 if(!d.submitted){var missing=d.answers.filter(function(a){return a===null;}).length;h+='<button class="primary-btn" '+(missing?'disabled':'')+' onclick="ReadingCheck.submit()">'+(missing?'Responda às '+missing+' restantes':'Conferir minha compreensão')+'</button>';}
 else h+='<button class="ghost-btn" onclick="ReadingCheck.start(\''+v.subjectId+'\',\''+v.topicId+'\',true)">Tentar com outras perguntas</button>';
 return h;
}
window.ReadingCheck={start:start,mark:mark,select:select,submit:submit,render:render,button:button};
})();
