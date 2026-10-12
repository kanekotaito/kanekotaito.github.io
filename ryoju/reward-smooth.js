/* Smooth Reward v18: soft, satisfying correct-answer celebration.
 * Display-only enhancement; never changes player records, scoring or rewards.
 */
(function(){
"use strict";
var M=window.Muscle,Reward=window.Reward;
if(!M||!Reward)return;
var previousCelebrate=M.celebrate;
var audio=null,lastSoundTime=-1;
function reducedMotion(){
 try{return !!(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches);}
 catch(e){return false;}
}
function el(tag,cls){var n=document.createElement(tag);n.className=cls;return n;}
function celebrationTitle(opt,streak){
 if(opt.pack)return "新しい挑戦、解放！";
 if(opt.exam)return "模試クリア！";
 if(opt.evolved)return "筋肉、覚醒！";
 if(streak>=20)return "圧巻の"+streak+"連続正解！";
 if(streak>=10)return streak+"連続正解！";
 if(streak>=5)return "絶好調！ "+streak+"連続";
 if(streak>=3)return streak+"連続正解！";
 return "正解！";
}
function reworkScene(db,opt){
 var stage=document.getElementById("muscle-stage"),scene=stage&&stage.querySelector(".mqv-splash");
 if(!scene)return;
 var stat=M.stats(db),streak=Math.max(0,Number(opt.streak)||0);
 var big=!!opt.evolved||!!opt.exam||!!opt.pack||!!opt.big||streak>=5;
 var milestones=[3,5,10,15,20,30,50,75,100,150,200];
 var extended=!!opt.evolved||!!opt.exam||!!opt.pack||milestones.indexOf(streak)>=0;
 scene.classList.add("reward-smooth",big?"reward-grand":"reward-regular");
 scene.style.setProperty("--reward-runtime",(extended?3000:2250)+"ms");
 // Preserve existing unlocked themes and the clay wrestler, but replace
 // the old heavy confetti with lighter, composited light particles.
 var existing=scene.querySelectorAll(".mqv-piece");
 for(var k=0;k<existing.length;k++)existing[k].remove();
 var header=scene.querySelector(".mqv-headline");
 if(header)header.textContent=celebrationTitle(opt,streak);
 var caption=scene.querySelector(".mqv-caption");
 if(caption){
  caption.textContent=opt.pack?"次の問題パックで、さらに強く！":
   opt.exam?"積み重ねた学習が実を結んだ！":
   opt.evolved?"筋肉Lv."+(stat.stage+1)+"へレベルアップ！":
   streak>=3?"この調子で次の問題へ！":"知識も筋肉も、またひとつ成長。";
 }
 var content=scene.querySelector(".mqv-stage-content");
 if(content){
  var reward=el("div","reward-smooth-gain");
  if(opt.pack)reward.textContent="🎁 新問題への扉 OPEN";
  else if(opt.exam)reward.textContent="🏅 GREAT SCORE";
  else reward.textContent="+"+Reward.bonus(streak)+" XP  ✦  筋肉が成長！";
  reward.setAttribute("aria-hidden","true");
  var label=content.querySelector(".mqv-caption");
  if(label&&label.nextSibling)content.insertBefore(reward,label.nextSibling);
  else content.appendChild(reward);
 }
 var glow=el("div","reward-smooth-lights");glow.setAttribute("aria-hidden","true");
 var halo=el("div","reward-smooth-aura");
 var glimmer=el("div","reward-smooth-glimmer");
 glow.appendChild(halo);glow.appendChild(glimmer);
 for(var j=0;j<3;j++){
  var ring=el("div","reward-smooth-ring");
  ring.style.setProperty("--ring-delay",(j*175)+"ms");
  glow.appendChild(ring);
 }
 scene.insertBefore(glow,scene.firstChild);
 var particles=el("div","reward-smooth-particles");particles.setAttribute("aria-hidden","true");
 var count=big?38:24;
 var w=Math.max(250,Math.min(750,window.innerWidth||390));
 var h=Math.max(300,Math.min(900,window.innerHeight||740));
 var radius=Math.min(w*.45,h*.3),palette=["#ffec99","#fff","#a8fff0","#f8c2ff","#afdcff","#ffe5b6"];
 for(var i=0;i<count;i++){
  var bit=el("i","reward-smooth-spark"+(i%6===0?" reward-smooth-star":""));
  var angle=(i+.4*Math.random())/count*Math.PI*2;
  var distance=radius*(.55+Math.random()*.9);
  bit.style.setProperty("--sx",(Math.cos(angle)*distance).toFixed(1)+"px");
  bit.style.setProperty("--sy",(Math.sin(angle)*distance*.85).toFixed(1)+"px");
  bit.style.setProperty("--size",(i%6===0?8+Math.random()*6:3+Math.random()*5).toFixed(1)+"px");
  bit.style.setProperty("--spark-delay",(70+Math.random()*220).toFixed(0)+"ms");
  bit.style.setProperty("--spark-duration",(850+Math.random()*640).toFixed(0)+"ms");
  bit.style.setProperty("--spark-color",palette[i%palette.length]);
  particles.appendChild(bit);
 }
 scene.appendChild(particles);
 var figure=scene.querySelector(".mqv-hero .clay-puppet");
 if(figure)figure.classList.add("reward-smooth-body");
}
M.celebrate=function(db,opt){
 opt=opt||{};
 var result=previousCelebrate.apply(this,arguments);
 if(!db||db.muscleFx===false||reducedMotion())return result;
 try{reworkScene(db,opt);}catch(err){ /* Always leave the original celebration functional. */ }
 return result;
};
// Gentle, ascending musical confirmation. Keeps the existing independent sound toggle.
function softTone(streak,enabled){
 if(!enabled||reducedMotion())return;
 try{
  var Context=window.AudioContext||window.webkitAudioContext;
  if(!Context)return;
  if(!audio)audio=new Context();
  if(audio.state==="suspended"&&audio.resume)audio.resume().catch(function(){});
  var now=audio.currentTime;
  // Prevent accidental double triggers within one animation frame.
  if(lastSoundTime>=0&&now-lastSoundTime<.09)return;lastSoundTime=now;
  var strong=Number(streak)>=5;
  var frequencies=strong?[523.25,659.25,783.99,1046.50]:[659.25,783.99,1046.50];
  var master=audio.createGain();
  master.gain.value=0.38;master.connect(audio.destination);
  for(var i=0;i<frequencies.length;i++){
   var start=now+.012+i*(strong ? .075 : .085);
   var oscillator=audio.createOscillator();
   var envelope=audio.createGain();
   oscillator.type=i===frequencies.length-1?"sine":"triangle";
   oscillator.frequency.setValueAtTime(frequencies[i],start);
   oscillator.frequency.exponentialRampToValueAtTime(frequencies[i]*1.006,start+.20);
   envelope.gain.setValueAtTime(.0001,start);
   envelope.gain.linearRampToValueAtTime(strong ? .075 : .061,start+.033);
   envelope.gain.exponentialRampToValueAtTime(.0001,start+.35);
   oscillator.connect(envelope);envelope.connect(master);
   oscillator.start(start);oscillator.stop(start+.36);
   oscillator.onended=function(){try{this.disconnect();}catch(e){}};
  }
 }catch(err){ /* Audio is optional and should never interrupt answering. */ }
}
Reward.tone=softTone;
M.smoothReward={version:18,decorate:reworkScene};
})();