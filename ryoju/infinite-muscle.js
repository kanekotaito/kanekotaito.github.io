/* Infinite Muscle v17: unbounded levels and non-human transformations.
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
 var names=["巨獣の筋鎧","鋼鉄の大怪獣","四腕の暴君","筋肉の魔獣","銀河の筋翼","八腕の覇王","獣神アトラス","星喰いの怪力","惑星級筋生命体","銀河筋核","異次元の筋生命","筋肉特異点"];
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
 function anatomicalSvg(s){
   var eyes=Math.min(16,2+Math.floor(Math.max(0,s.stage-20)/2)),spikes=Math.min(18,3+Math.floor(Math.max(0,s.stage-15)/2));
   var points="",i;
   for(i=0;i<spikes;i++){
    var theta=(i/spikes)*Math.PI*2,rad=48+(i%3)*4,cx=71+Math.cos(theta)*rad,cy=126+Math.sin(theta)*rad*1.1;
    points+='<path d="M71 126 L'+cx.toFixed(1)+' '+cy.toFixed(1)+'" stroke="#c99bff" stroke-width="'+(i%3+2)+'" opacity=".65"/>';
   }
   var eyeMarkup="";
   for(i=0;i<eyes;i++){
    var a=i/eyes*Math.PI*2;
    var x=71+Math.cos(a)*35,y=125+Math.sin(a)*55;
    eyeMarkup+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(3+i%4)+'" fill="#ffe6ff"/><circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.2" fill="#241052"/>';
   }
   return '<svg viewBox="0 0 142 234" preserveAspectRatio="none" class="evo-svg" aria-hidden="true">'+
   '<defs><linearGradient id="evoMetal" x2=".8" y2="1"><stop stop-color="#ffd8fb"/><stop offset=".47" stop-color="#9e76ff"/><stop offset="1" stop-color="#3730a8"/></linearGradient>'+
   '<radialGradient id="evoSphere"><stop stop-color="#fff"/><stop offset=".28" stop-color="#f9caef"/><stop offset=".68" stop-color="#9e62ec"/><stop offset="1" stop-color="#350c88" stop-opacity=".25"/></radialGradient></defs>'+
   '<g class="evo-horns" stroke="#ddbbff" stroke-width="2" fill="url(#evoMetal)">'+
   '<path d="M52 96 Q19 62 15 20 Q32 41 62 59Z"/><path d="M90 96 Q123 62 127 20 Q110 41 80 59Z"/>'+
   '<path d="M63 74 L71 14 79 74Z"/></g>'+
   '<g class="evo-limbs" fill="none" stroke="url(#evoMetal)" stroke-linecap="round" stroke-linejoin="round">'+
   '<path d="M50 102 Q4 72 10 128 L26 148 M92 102 Q138 72 132 128 L116 148" stroke-width="20"/>'+
   '<path d="M49 135 Q0 115 12 178 L1 202 M93 135 Q142 115 130 178 L141 202" stroke-width="15"/>'+
   '<path d="M41 163 Q14 178 26 225 M101 163 Q128 178 116 225" stroke-width="13"/>'+
   '<path d="M26 148l-15 -13m15 13 2 -18m88 18 15 -13m-15 13 -2 -18" stroke-width="5"/></g>'+
   '<g class="evo-wings" fill="url(#evoMetal)" fill-opacity=".78" stroke="#ecd8ff" stroke-width="1.8">'+
   '<path d="M61 98 Q20 66 0 22 L13 91 2 169 49 134Z"/><path d="M81 98 Q122 66 142 22 L129 91 140 169 93 134Z"/></g>'+
   '<g class="evo-core"><g>'+points+'</g>'+
   '<path d="M71 38 C116 42 137 83 128 131 C139 186 101 223 71 220 C40 223 3 185 14 132 C4 82 25 43 71 38Z" fill="url(#evoSphere)" stroke="#f6dcff" stroke-width="3"/>'+
   '<path d="M71 55 Q116 80 101 126 Q114 173 71 208 Q30 171 41 126 Q26 80 71 55Z" fill="none" stroke="#ffffff" stroke-width="3" opacity=".75"/>'+
   '<circle cx="71" cy="125" r="28" fill="url(#evoSphere)" stroke="#faf0ff" stroke-width="2"/>'+
   eyeMarkup+
   '<circle cx="71" cy="125" r="8" fill="#fff" /></g></svg>';
 }
 function decorate(el,s){
  if(!el||s.stage<15||el.classList.contains("infinite-mutation"))return;
  el.classList.add("infinite-mutation","mutation-"+s.phase);
  el.setAttribute("data-evolution-level",String(s.stage+1));
  el.setAttribute("data-evolution-era",String(s.era));
  el.setAttribute("aria-label","筋肉Lv."+fmt(s.stage+1)+"、"+s.name+"。学習で進化した異形の筋肉生命体");
  var hue=(s.stage*41)%360,amplitude=1+Math.min(.14,Math.log1p(Math.max(0,s.power-590)/750)*.04);
  el.style.setProperty("--evo-hue",hue+"deg");
  el.style.setProperty("--evo-scale",amplitude.toFixed(5));
  var shell=document.createElement("div");shell.className="evo-shell";shell.setAttribute("aria-hidden","true");
  shell.innerHTML=anatomicalSvg(s)+'<div class="evo-halo"></div><div class="evo-ring evo-ring-one"></div><div class="evo-ring evo-ring-two"></div><span class="evo-sigil">∞</span>';
  var light=el.querySelector(".clay-softlight");if(light)el.insertBefore(shell,light);else el.appendChild(shell);
  // The original sprite remains interactive, while later forms lose the human silhouette.
  el.style.setProperty("--growth-x",amplitude.toFixed(5));
  el.style.setProperty("--growth-y",(1+(amplitude-1)*.5).toFixed(5));
 }
 M.clay.puppet=function(stage,variant,interactive,power){
  var html=puppetBefore(stage,variant,interactive,power);
  if(stage<15)return html;
  var holder=document.createElement("div");holder.innerHTML=html;
  var p=power===undefined?(drawingPower===null?Math.max(590,stage*45):drawingPower):power;
  decorate(holder.querySelector(".clay-puppet"),{
   stage:stage,phase:stage<17?1:stage<19?2:stage<21?3:4,
   name:"超越筋生命体",era:Math.floor((stage-15)/12)+1,power:p
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
    replaceText(tmp.content,".muscle-home-info p","正解するほど進化する筋肉。問題が増えても、復習を重ねても、成長に終わりなし。一定段階から多腕・翼・宇宙生命体へ！");
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
     badge.textContent="🌌 "+(s.phase===0?"人間型":s.phase===1?"超大型":s.phase===2?"多腕型":s.phase===3?"翼獣型":"異次元生命体")+" ／ 進化Lv."+fmt(s.stage+1)+" ／ 最高Lv.制限なし";
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
  if(note&&evolve(db).stage>=15)note.textContent="🌌 新たな筋肉生命体へ進化中！ 正解するたびに強くなる！";
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