/* Infinite Muscle v19: limitless training with 3D bodybuilder visuals.
 * Extends existing characters and player records. No save migration/deletion.
 */
(function () {
 "use strict";
 var M=window.Muscle,P=window.PlayerProfiles;
 if(!M||!M.clay||!P)return;
 var baseStats=M.stats,homeBefore=M.home,compactBefore=M.compact;
 var puppetBefore=M.clay.puppet,celebrateBefore=M.celebrate;
 var battleBefore=P.battle,profileStatsBefore=P.stats;
 var drawingPower=null;
 var oldThresholds=[0,8,20,40,65,95,130,170,215,265,320,380,445,515,590];
 var names=["超大型ビルダー","怪物級フィジーク","超重量級の巨人","究極バルク体","金剛の肉体","筋肉の覇王","超越ビルダー","原初の筋肉王","限界外の肉体","星級ボディビルダー","究極筋塊","筋肉特異点"];
 function num(value){var v=Number(value);return isFinite(v)&&v>0?Math.floor(v):0;}
 function fmt(n){return Number(n).toLocaleString("ja-JP",{maximumFractionDigits:1});}
 function evolve(db){
  var b=baseStats(db),correct=num(db&&db.fxTotalCorrect);
  var power=b.power+correct*.5,level=b.stage,from=0,next=8;
  if(power<590){from=oldThresholds[level];next=oldThresholds[level+1];}
  else{
   // After Lv.15, geometric thresholds continue without a fixed top level.
   var rate=1.17,steps=Math.floor(Math.log1p((power-590)*(rate-1)/120)/Math.log(rate));
   level=14+steps;
   from=590+120*(Math.pow(rate,steps)-1)/(rate-1);
   next=590+120*(Math.pow(rate,steps+1)-1)/(rate-1);
  }
  var progress=Math.max(0,Math.min(100,Math.floor((power-from)*100/(next-from))));
  var phase=level<=14?0:level<17?1:level<19?2:level<21?3:4;
  var era=level<=14?0:Math.floor((level-15)/12)+1;
  return {stage:level,name:level<=14?b.name:(era>1?"第"+era+"超越形態・":"")+names[(level-15)%names.length],
   mastered:b.mastered,cleared:b.cleared,power:power,progress:progress,next:next,left:Math.max(0,next-power),
   totalCorrect:correct,phase:phase,era:era};
 }
 M.stats=evolve;M.stage=function(db){return evolve(db).stage;};
 function decorate(el,s){
  if(!el||s.stage<15)return;
  // Keep the original photographic 360-degree clay bodybuilder. No flat appendages.
  el.classList.remove("infinite-mutation","mutation-1","mutation-2","mutation-3","mutation-4");
  el.classList.add("bodybuilder-evo","mass-phase-"+s.phase);
  el.setAttribute("data-evolution-level",String(s.stage+1));
  el.setAttribute("data-evolution-era",String(s.era||0));
  el.setAttribute("aria-label","筋肉Lv."+fmt(s.stage+1)+"、"+s.name+"。3Dフィギュア風の筋肉キャラクター");
  var beyond=Math.max(0,s.stage-14);
  var widthBoost=Math.min(1.29,1+0.012*beyond+0.025*Math.log1p(beyond));
  var heightBoost=Math.min(1.105,1+0.0038*beyond);
  var sheen=Math.min(.85,.37+beyond*.022);
  var physique=1+Math.log1p(Math.max(0,s.power))*.014+Math.max(0,s.power)*.000025;
  var height=1+Math.log1p(Math.max(0,s.power))*.012+Math.max(0,s.power)*.000016;
  // Keep the full character visible. Levels and muscle power themselves are uncapped.
  var totalX=Math.min(1.42,Math.min(1.16,physique)*widthBoost);
  var totalY=Math.min(1.24,Math.min(1.13,height)*heightBoost);
  el.style.setProperty("--bb-scale-x",widthBoost.toFixed(4));
  el.style.setProperty("--bb-scale-y",heightBoost.toFixed(4));
  el.style.setProperty("--bb-sheen",sheen.toFixed(3));
  el.style.setProperty("--growth-x",totalX.toFixed(5));
  el.style.setProperty("--growth-y",totalY.toFixed(5));
  el.style.setProperty("--growth-pop-x",(totalX*1.04).toFixed(5));
  el.style.setProperty("--growth-pop-y",(totalY*1.025).toFixed(5));
  if(!el.querySelector(".bb-stage-light")){
   var light=document.createElement("div");
   light.className="bb-stage-light";
   light.setAttribute("aria-hidden","true");
   light.innerHTML='<span class="bb-key"></span><span class="bb-rim"></span><span class="bb-floor"></span>';
   var soft=el.querySelector(".clay-softlight");
   if(soft)el.insertBefore(light,soft);else el.appendChild(light);
  }
 }
 M.clay.puppet=function(stage,variant,interactive,power){
  var html=puppetBefore(stage,variant,interactive,power);
  if(stage<15)return html;
  var holder=document.createElement("div");holder.innerHTML=html;
  var p=power===undefined?(drawingPower===null?Math.max(590,stage*45):drawingPower):power;
  decorate(holder.querySelector(".clay-puppet"),{
   stage:stage,phase:stage<17?1:stage<19?2:stage<21?3:4,
   name:"超越ボディビルダー",era:Math.floor((stage-15)/12)+1,power:p
  });
  return holder.innerHTML;
 };
 M.avatarSvg=function(stage,pose,mode){return M.clay.puppet(stage,mode==="mqv-avatar"?"hero":"stage",false,drawingPower===null?undefined:drawingPower);};
 function replaceText(root,selector,value){
  var item=root.querySelector(selector);if(item)item.textContent=value;
 }
 function display(html,db,kind){
  var s=evolve(db),tmp=document.createElement("template");tmp.innerHTML=html;
  tmp.content.querySelectorAll(".clay-puppet").forEach(function(el){
   if(el.closest(".growth-figure.before"))return;
   decorate(el,s);
  });
  if(kind==="compact"){
    replaceText(tmp.content,".muscle-mini-text b","💪 筋肉Lv."+fmt(s.stage+1)+" · "+s.name);
    replaceText(tmp.content,".muscle-mini-text small","習得 "+fmt(s.mastered)+"問 ／ 累計正解 "+fmt(s.totalCorrect)+"回");
    replaceText(tmp.content,".clay-mini-growth","🧬 筋肉パワー "+fmt(s.power));
  }else {
    replaceText(tmp.content,".muscle-home-badge","筋肉Lv."+fmt(s.stage+1)+" / ∞");
    replaceText(tmp.content,".muscle-home-info h2","🧬 "+s.name);
    replaceText(tmp.content,".muscle-home-info p","正解するほど進化する筋肉。問題が増えても、復習を重ねても、成長に終わりなし。進化後もリアルな3Dフィギュアの質感で、さらに分厚い筋肉へ！");
    var counts=tmp.content.querySelectorAll(".muscle-stats span b");
    if(counts.length>=3){counts[0].textContent=fmt(s.mastered);counts[1].textContent=fmt(s.cleared);counts[2].textContent=fmt(s.power);}
    replaceText(tmp.content,".muscle-progress-caption b","次の進化まであと "+fmt(Math.ceil(s.left))+" パワー");
    replaceText(tmp.content,".muscle-progress-caption span",s.progress+"%");
    var bar=tmp.content.querySelector(".muscle-progress>span");if(bar)bar.style.width=s.progress+"%";
    replaceText(tmp.content,".clay-growth-chip","🧬 筋肉パワー "+fmt(s.power)+" ｜ 累計正解 "+fmt(s.totalCorrect)+"回");
    replaceText(tmp.content,".clay-growth-hint","新規習得・完全クリアに加え、正解2回で筋肉パワー＋1。正解を積み重ねれば無限に進化！");
    replaceText(tmp.content,".growth-progress>small","筋肉進化は問題追加後も継続。習得問題・完全クリア・累計正解数を反映。");
    var oldCompare=tmp.content.querySelector(".growth-progress-track>span");if(oldCompare)oldCompare.style.width=s.progress+"%";
    var area=tmp.content.querySelector(".muscle-home-info");
    if(area){
     var badge=document.createElement("p");badge.className="infinite-progress-line";
     badge.textContent="🌌 "+(s.phase===0?"人間型":s.phase===1?"超大型":s.phase===2?"怪物級":s.phase===3?"超重量級":"限界突破")+" ／ 進化Lv."+fmt(s.stage+1)+" ／ 最高Lv.制限なし";
     area.appendChild(badge);
    }
  }
  return tmp.innerHTML;
 }
 M.home=function(db){return display(homeBefore(db),db,"home");};
 M.compact=function(db){return display(compactBefore(db),db,"compact");};
 M.celebrate=function(db,options){
  drawingPower=evolve(db).power;
  try{celebrateBefore(db,options);}finally{drawingPower=null;}
  var scene=document.getElementById("muscle-stage"),figure=scene&&scene.querySelector(".mqv-hero .clay-puppet");
  if(figure)decorate(figure,evolve(db));
  var note=scene&&scene.querySelector(".clay-growth-result");
  if(note&&evolve(db).stage>=15)note.textContent="💪 筋肉がさらに巨大化！ 正解するたびに強くなる！";
 };
 var originStats=P.stats;
 P.stats=function(db){
  var result=originStats(db);
  result.practiceCorrect=num(db&&db.fxTotalCorrect);
  result.studyPower+=Math.floor(Math.sqrt(result.practiceCorrect)*20);
  return result;
 };
 function normalize(v){v=v||{};return {mastered:num(v.mastered),packs:num(v.packs),best:Math.min(50,num(v.best)),recovered:num(v.recovered),practiceCorrect:num(v.practiceCorrect===undefined?v.practice_correct:v.practiceCorrect)};}
 function matchup(a,b){
  a=normalize(a);b=normalize(b);
  function score(v,i){
   var training=Math.floor(Math.sqrt(v.practiceCorrect)*(i===2?11:6));
   return i===0?v.mastered*10+v.packs*60+training:
          i===1?v.mastered*5+Math.max(0,v.best-30)*35+training:
          v.mastered*7+v.packs*100+v.recovered*5+training;
  }
  var rounds=["第1戦・知識の筋力","第2戦・模試の技","第3戦・復習の粘り"].map(function(name,i){
   var sa=score(a,i),sb=score(b,i);return {name:name,scoreA:sa,scoreB:sb,winner:sa===sb?"draw":sa>sb?"left":"right"};
  });
  var winsA=0,winsB=0,pointsA=0,pointsB=0;rounds.forEach(function(r){
   if(r.winner==="left")winsA++;if(r.winner==="right")winsB++;pointsA+=r.scoreA;pointsB+=r.scoreB;
  });
  return {left:a,right:b,rounds:rounds,scoreA:winsA,scoreB:winsB,pointA:pointsA,pointB:pointsB,
   winner:winsA===winsB?(pointsA===pointsB?"draw":pointsA>pointsB?"left":"right"):winsA>winsB?"left":"right"};
 }
 P.roundupPublic=matchup;
 P.roundup=function(dbA,dbB){return matchup(P.stats(dbA),P.stats(dbB));};
 P.battle=function(store,pick,phase,result){
  var html=battleBefore(store,pick,phase,result);
  if(!pick||!pick.left||!pick.right||pick.left===pick.right)return html;
  var dom=document.createElement("template");dom.innerHTML=html;
  ["left","right"].forEach(function(side){
   var panel=dom.content.querySelector(".wrestler-"+side);
   if(!panel)return;
   var player=P.read(store,pick[side]),s=P.stats(player);
   replaceText(panel,".wrestler-strength strong",fmt(s.studyPower));
   var facts=panel.querySelector(".wrestler-facts");if(facts){
    var span=document.createElement("span");span.textContent="累計正解 "+fmt(s.practiceCorrect)+"回";facts.appendChild(span);
   }
  });
  return dom.innerHTML;
 };
 M.infiniteEvolution={version:17,stats:evolve,matchup:matchup};
})();