/* Clay Growth v12: persistent micro-growth with every newly mastered question.
 * Reuses the existing 3D clay sprite, stop-motion poses, XP, and saved progress.
 */
(function(){
"use strict";
if(!window.Muscle || !window.Muscle.clay || !window.QuizStore)return;
var M=window.Muscle,Store=window.QuizStore;
var oldHome=M.home,oldCompact=M.compact,oldCelebrate=M.celebrate,oldAttempt=Store.onAttempt;
var recent=null;

function physique(power){
 // Moderate but permanent growth, from the very first mastered question.
 // The cross-faded clay-body images handle real muscle size changes at each step.
 // Small scale changes keep the entire figure in frame even near 600/600.
 var p=Math.max(0,Math.min(800,Number(power)||0));
 var rate=Math.log1p(p);
 return {x:1+rate*0.014+p*0.000025,y:1+rate*0.012+p*0.000016,power:p};
}
function setBody(el,power,before,animate){
 if(!el)return;
 var now=physique(power),past=physique(before==null?power:before);
 el.style.setProperty("--growth-x",now.x.toFixed(5));
 el.style.setProperty("--growth-y",now.y.toFixed(5));
 el.style.setProperty("--growth-prev-x",past.x.toFixed(5));
 el.style.setProperty("--growth-prev-y",past.y.toFixed(5));
 el.style.setProperty("--growth-pop-x",(now.x*1.07).toFixed(5));
 el.style.setProperty("--growth-pop-y",(now.y*1.035).toFixed(5));
 el.dataset.growthPower=String(power);
 if(animate)el.classList.add("clay-grown");
}
function applyHtml(html,db,kind){
 var stat=M.stats(db),t=document.createElement("template");t.innerHTML=html;
 var justGrew=recent&&recent.gained&&Date.now()-recent.when<3500;
 t.content.querySelectorAll(".clay-puppet").forEach(function(el){
  var isBefore=!!el.closest(".growth-figure.before");
  setBody(el,isBefore?0:stat.power,isBefore?0:(justGrew?recent.before:stat.power),!!justGrew&&!isBefore&&kind==="compact");
 });
 if(kind==="home"){
  var art=t.content.querySelector(".muscle-home-art");
  if(art){
   var chip=document.createElement("div");chip.className="clay-growth-chip";
   var percent=Math.round((physique(stat.power).x-1)*100);
   chip.textContent=stat.power>0?"💪 筋肉パワー "+stat.power+"　体格＋"+percent+"%":"🌱 まずは1問、筋肉を育てよう";
   art.appendChild(chip);
  }
  var info=t.content.querySelector(".muscle-home-info");
  if(info){
   var detail=document.createElement("p");detail.className="clay-growth-hint";
   var marks=M.clay.growthMarks||[0,15,50,110,230,450],next=marks.find(function(v){return v>stat.power;});
   detail.textContent=(next?"次の大きな体格変化まで、あと "+(next-stat.power)+" パワー。":"最大級の体格に到達！さらに筋肉量が少しずつ増加中。")+" 正解して新しい問題を習得するたび、現在の人形が育ちます。";
   info.appendChild(detail);
  }
 }
 if(kind==="compact"){
  var mini=t.content.querySelector(".muscle-mini-text");
  if(mini){
   var note=document.createElement("span");note.className="clay-mini-growth";
   note.textContent=justGrew?"💪 ＋"+(stat.power-recent.before)+" 筋肉パワー！":"💪 筋肉 "+stat.power+" パワー";
   mini.appendChild(note);
  }
 }
 return t.innerHTML;
}
Store.onAttempt=function(db,q,isCorrect){
 var before=M.stats(db).power;
 var wasMastered=!!(db.economy&&db.economy.mastered&&db.economy.mastered[q.id]);
 var outcome=oldAttempt.apply(this,arguments);
 if(isCorrect){
  var after=M.stats(db).power;
  recent={before:before,after:after,gained:!wasMastered&&after>before,when:Date.now()};
 }
 return outcome;
};
M.home=function(db){return applyHtml(oldHome(db),db,"home");};
M.compact=function(db){return applyHtml(oldCompact(db),db,"compact");};
M.celebrate=function(db,opt){
 oldCelebrate(db,opt);
 var scene=document.getElementById("muscle-stage");
 if(!scene)return;
 var hero=scene.querySelector(".mqv-hero"),figure=hero&&hero.querySelector(".clay-puppet");
 if(!figure)return;
 var now=M.stats(db).power,valid=recent&&Date.now()-recent.when<5000;
 var grew=valid&&recent.gained&&now>recent.before;
 setBody(figure,now,grew?recent.before:now,grew);
 if(valid){
  var label=document.createElement("div");
  label.className="clay-growth-result"+(grew?" is-growing":"");
  if(grew){
   var gain=now-recent.before;
   label.innerHTML='<strong>💪 筋肉＋'+gain+'！</strong><span>新しく習得した問題で体が大きくなった！</span>';
  }else{
   label.innerHTML='<strong>✨ 復習クリア！</strong><span>鍛えた知識を定着！</span>';
  }
  hero.appendChild(label);
 }
};
M.microGrowth={physique:physique,update:setBody};
})();