(function(){
'use strict';
var Context=window.AudioContext||window.webkitAudioContext,context=null,master=null,timer=null,step=0,scene='home',enabled=false;
try{enabled=localStorage.getItem('nextlevel.music')==='on';}catch(e){}
function stop(){if(timer!==null){clearInterval(timer);timer=null;}if(context)context.suspend();}
function note(hz,time,length,level,type){var o=context.createOscillator(),g=context.createGain();o.type=type;o.frequency.value=hz;g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(level,time+.025);g.gain.exponentialRampToValueAtTime(.0001,time+length);o.connect(g);g.connect(master);o.start(time);o.stop(time+length+.02);}
function tick(){if(!enabled||document.hidden)return;var suspense=scene==='boss',n=step++%16,t=context.currentTime+.04;var melody=suspense?[130.81,0,138.59,0,130.81,0,155.56,0]:[261.63,0,329.63,392,0,329.63,293.66,0];if(melody[n%8])note(melody[n%8],t,suspense?.7:.35,.07,'triangle');if(n%4===0)note(suspense?65.41:[130.81,110,87.31,98][Math.floor(n/4)],t,.8,.09,'sine');if(suspense&&n%2===0)note(49,t,.16,.045,'sine');}
async function start(){if(!enabled||!Context||document.hidden)return;try{if(!context){context=new Context();master=context.createGain();master.gain.value=.24;master.connect(context.destination);}await context.resume();if(context.state==='running'&&timer===null){tick();timer=setInterval(tick,scene==='boss'?350:420);}}catch(e){enabled=false;stop();}}
function update(){var b=document.getElementById('music-toggle');if(b){b.textContent=enabled?'🔊 Som ligado':'🔇 Ligar som';b.setAttribute('aria-pressed',String(enabled));}}
window.NextMusic={button:function(){return '<button id="music-toggle" class="sound-toggle" aria-pressed="'+enabled+'" onclick="NextMusic.toggle()" '+(!Context?'disabled':'')+'>'+(!Context?'Som indisponível':enabled?'🔊 Som ligado':'🔇 Ligar som')+'</button>';},toggle:async function(){enabled=!enabled;try{localStorage.setItem('nextlevel.music',enabled?'on':'off');}catch(e){}if(enabled)await start();else stop();update();},scene:function(name){if(scene!==name){scene=name;step=0;stop();start();}}};
if(document.addEventListener){document.addEventListener('visibilitychange',function(){if(document.hidden)stop();else start();});document.addEventListener('pointerdown',function(){if(enabled)start();});}
})();
