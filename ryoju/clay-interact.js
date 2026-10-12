/* Clay Muscle Quest v10
 * 3D-rendered soft vinyl/clay figure. Swipe rotates through 12 true camera angles.
 * Vertical strokes pet the character; stop-motion poses are stepped, not interpolated.
 * No earned coins or XP from petting. Existing quiz progression remains unchanged.
 */
(function(){
"use strict";
if(!window.Muscle||!window.CLAY_TURNTABLE||!window.CLAY_ACTIONS)return;
var M=window.Muscle;
var oldHome=M.home,oldCompact=M.compact,oldCelebrate=M.celebrate;
var FACE_COUNT=12,PHYSIQUE_COUNT=6,POSE_COUNT=8;
(function installTextureStyles(){
 if(document.getElementById("clay-textures"))return;
 var style=document.createElement("style");
 style.id="clay-textures";
 style.textContent='.clay-puppet-image{background-image:url("'+window.CLAY_TURNTABLE+'");background-size:1200% 600%}.clay-puppet-image.clay-action{background-image:url("'+window.CLAY_ACTIONS+'");background-size:800% 600%}';
 document.head.appendChild(style);
})();
var posTurn=function(i,row){return (100*i/(FACE_COUNT-1)).toFixed(4)+"% "+(100*row/(PHYSIQUE_COUNT-1)).toFixed(4)+"%";};
var posAction=function(i,row){return (100*i/(POSE_COUNT-1)).toFixed(4)+"% "+(100*row/(PHYSIQUE_COUNT-1)).toFixed(4)+"%";};
function rowFor(stage){return Math.max(0,Math.min(5,Math.floor((Math.max(0,Math.min(14,stage))*5+1)/14)));}
// The photographic turntable contains 6 physical bodies. Blend adjacent bodies continuously
// so every NEW mastered question leaves a visible, persistent trace of muscle growth.
var GROWTH_MARKS=[0,15,50,110,230,450];
function growthFor(power){
 var p=Math.max(0,Math.min(800,Number(power)||0)),low=0;
 for(var j=1;j<GROWTH_MARKS.length;j++){if(p>=GROWTH_MARKS[j])low=j;else break;}
 var high=Math.min(5,low+1),span=GROWTH_MARKS[high]-GROWTH_MARKS[low];
 var mix=low===5?0:Math.min(1,Math.max(0,(p-GROWTH_MARKS[low])/(span||1)));
 return {power:p,lower:low,upper:high,mix:mix,
   sizeX:1+Math.min(.064,p*.000105),
   sizeY:1+Math.min(.075,p*.00012),
   next:low<5?Math.max(0,GROWTH_MARKS[high]-p):0,
   threshold:low<5?GROWTH_MARKS[high]:GROWTH_MARKS[5]};
}
var activeCelebrationPower=null;
function escapeHtml(str){return String(str).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch];});}
function puppet(stage,variant,interactive,power){
 var fallback=(Math.max(0,Math.min(14,Number(stage)||0))/14)*450;
 var grow=growthFor(power===undefined?(activeCelebrationPower===null?fallback:activeCelebrationPower):power);
 var row=grow.lower,other=grow.upper;
 var it=interactive?' tabindex="0" data-interactive="1" role="group" aria-label="筋肉人形。左右スワイプで回転、なでると反応。新しい問題を習得するたびに少しずつ成長する。"':' role="img" aria-label="習得した問題数に応じて体が大きくなる粘土のマッチョ人形"';
 return '<div class="clay-puppet clay-'+escapeHtml(variant||"main")+'" data-clay-row="'+row+'" data-clay-next-row="'+other+'" data-clay-power="'+grow.power+'" data-clay-angle="0" style="--clay-grow-x:'+grow.sizeX.toFixed(5)+';--clay-grow-y:'+grow.sizeY.toFixed(5)+'"'+it+'>'+
 '<div class="clay-stage-shadow"></div>'+
 '<div class="clay-puppet-image clay-growth-base" style="background-position:'+posTurn(0,row)+'"></div>'+
 '<div class="clay-puppet-image clay-growth-next" style="background-position:'+posTurn(0,other)+';opacity:'+grow.mix.toFixed(4)+'"></div>'+
 '<div class="clay-softlight"></div><div class="clay-stage-caption">'+(variant==="hero"?"● STOP MOTION":"● CLAY TOY")+'</div>'+
 '<div class="clay-love" aria-hidden="true">♥</div></div>';
}
function substitute(html,figure){
 var begin=html.indexOf("<svg"),end=html.indexOf("</svg>",begin);
 if(begin<0||end<0)return html;
 return html.slice(0,begin)+figure+html.slice(end+6);
}
M.avatarSvg=function(stage,pose,mode){return puppet(stage,mode==="mqv-avatar"?"hero":"stage",false);};
M.home=function(db){
 var s=M.stats(db),html=substitute(oldHome(db),puppet(s.stage,"main",true,s.power));
 html=html.replace('<div class="muscle-home-footer">','<div class="clay-instructions"><b>👆 左右にスワイプで360°回転</b><span>なでる・タップで人形がリアクション！</span><small>正解して筋肉を育てよう。なでる操作ではコインは増えません。</small></div><div class="clay-controls"><button type="button" data-clay-btn="left" aria-label="人形を左へ回す">↶ 左に回す</button><button type="button" data-clay-btn="pet" aria-label="人形をなでる">🫳 なでなで</button><button type="button" data-clay-btn="right" aria-label="人形を右へ回す">右に回す ↷</button></div><div class="muscle-home-footer">');
 return html;
};
M.compact=function(db){var a=M.stats(db);return substitute(oldCompact(db),puppet(a.stage,"mini",false,a.power));};
function setTurn(figure,angle){
 var layers=figure.querySelectorAll(".clay-puppet-image");if(!layers.length)return;
 var row=Number(figure.getAttribute("data-clay-row"))||0,other=Number(figure.getAttribute("data-clay-next-row"));
 if(!Number.isFinite(other))other=row;
 angle=(angle+FACE_COUNT*999)%FACE_COUNT;
 figure.setAttribute("data-clay-angle",String(angle));
 for(var i=0;i<layers.length;i++){
  var layer=layers[i];layer.classList.remove("clay-action");
  layer.style.backgroundPosition=posTurn(angle,i===0?row:other);
 }
}
function setAction(figure,frame){
 var layers=figure.querySelectorAll(".clay-puppet-image");if(!layers.length)return;
 var row=Number(figure.getAttribute("data-clay-row"))||0,other=Number(figure.getAttribute("data-clay-next-row"));
 if(!Number.isFinite(other))other=row;
 for(var i=0;i<layers.length;i++){
  var layer=layers[i];layer.classList.add("clay-action");
  layer.style.backgroundPosition=posAction(frame,i===0?row:other);
 }
}
var sequenceByPose={
 flex:[0,1,2,5,5,2,1,0],
 victory:[0,1,3,6,3,3,1,0],
 double:[0,1,2,5,5,5,2,0],
 power:[0,4,4,5,7,5,4,0],
 side:[0,4,7,7,5,4,0],
 crab:[0,4,7,5,7,5,0],
 disco:[0,6,3,6,3,7,0],
 salute:[0,6,6,3,2,0],
 crown:[0,3,5,3,7,3,0],
 pet:[0,1,6,3,6,1,0]
};
function animate(figure,pose,speed){
 if(!figure)return;
 if(figure._clayTimer)clearTimeout(figure._clayTimer);
 var frames=sequenceByPose[pose]||sequenceByPose.flex,i=0,returnAngle=Number(figure.getAttribute("data-clay-angle"))||0;
 figure.classList.add("clay-posing");
 function step(){
  if(!figure.isConnected){figure._clayTimer=null;return;}
  if(i>=frames.length){
   figure.classList.remove("clay-posing");
   setTurn(figure,returnAngle);
   figure._clayTimer=null;
   return;
  }
  setAction(figure,frames[i++]);
  figure._clayTimer=setTimeout(step,speed||142);
 }
 step();
}
function hearts(el){
 el.classList.remove("clay-petted");
 // restarting CSS animation on repeated strokes
 void el.offsetWidth;
 el.classList.add("clay-petted");
 var badge=el.querySelector(".clay-love");if(badge)badge.textContent=["♥","💗","✨","💪"][Math.floor(Math.random()*4)];
}
function pet(el){
 if(!el||!el.isConnected)return;
 hearts(el);
 animate(el,"pet",170);
}
var drag=null,interactionBound=false;
function findPuppet(target){return target&&typeof target.closest==="function"?target.closest('.clay-puppet[data-interactive="1"]'):null;}
function begin(e){
 var el=findPuppet(e.target);if(!el)return;
 if(e.pointerType==="mouse"&&e.button!==0)return;
 drag={el:el,id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,angle:Number(el.getAttribute("data-clay-angle"))||0,rotated:false,petted:false,started:Date.now()};
 if(typeof el.setPointerCapture==="function")try{el.setPointerCapture(e.pointerId);}catch(err){}
}
function move(e){
 if(!drag||e.pointerId!==drag.id||!drag.el.isConnected)return;
 var dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(Math.abs(dx)>Math.abs(dy)*.85&&Math.abs(dx)>=7){
  var steps=Math.trunc(dx/13);
  if(steps!==0){
   drag.rotated=true;
   setTurn(drag.el,drag.angle+steps);
  }
 }else if(dy>25&&Math.abs(dy)>Math.abs(dx)*1.15){
  if(!drag.petted){
   drag.petted=true;
   pet(drag.el);
  }
 }
 if(drag.rotated||drag.petted)e.preventDefault();
}
function finish(e){
 if(!drag||e.pointerId!==drag.id)return;
 var d=drag;drag=null;
 if(!d.rotated&&!d.petted&&Math.abs(e.clientX-d.x)<14&&Math.abs(e.clientY-d.y)<14)pet(d.el);
}
function keys(e){
 var el=findPuppet(e.target);if(!el)return;
 if(e.key==="ArrowRight"){e.preventDefault();setTurn(el,(Number(el.getAttribute("data-clay-angle"))||0)+1);}
 if(e.key==="ArrowLeft"){e.preventDefault();setTurn(el,(Number(el.getAttribute("data-clay-angle"))||0)-1);}
 if(e.key==="Enter"||e.key===" "){e.preventDefault();pet(el);}
}
function bind(){
 if(interactionBound)return;
 interactionBound=true;
 document.addEventListener("pointerdown",begin);
 document.addEventListener("pointermove",move,{passive:false});
 document.addEventListener("pointerup",finish);
 document.addEventListener("pointercancel",function(){drag=null;});
 document.addEventListener("keydown",keys);
 document.addEventListener("click",function(e){
  var button=e.target&&typeof e.target.closest==="function"?e.target.closest("[data-clay-btn]"):null;
  if(!button)return;
  var container=button.closest(".muscle-home"),figure=container&&container.querySelector('.clay-puppet[data-interactive="1"]');
  if(!figure)return;
  var action=button.getAttribute("data-clay-btn"),angle=Number(figure.getAttribute("data-clay-angle"))||0;
  if(action==="left")setTurn(figure,angle-1);
  else if(action==="right")setTurn(figure,angle+1);
  else if(action==="pet")pet(figure);
 });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind);else bind();
M.celebrate=function(db,opt){
 opt=opt||{};
 activeCelebrationPower=M.stats(db).power;
 try{oldCelebrate(db,opt);}finally{activeCelebrationPower=null;}
 var stage=document.getElementById("muscle-stage");
 if(!stage||db&&db.muscleFx===false)return;
 var figure=stage.querySelector(".mqv-hero .clay-puppet");
 if(!figure)return;
 var pose="flex";
 if(opt.pack)pose="victory";
 else if(opt.exam)pose="crown";
 else if(opt.plan&&opt.plan.theme)pose=opt.plan.theme.pose||"flex";
 else{var splash=stage.querySelector(".mqv-splash");if(splash&&splash.className.indexOf("thunder")>=0)pose="double";}
 var seqSpeed=(opt.streak||0)>=10?112:142;
 animate(figure,pose,seqSpeed);
};
M.clay={rowFor:rowFor,growthFor:growthFor,growthMarks:GROWTH_MARKS.slice(),posTurn:posTurn,posAction:posAction,puppet:puppet,setTurn:setTurn,setAction:setAction,animate:animate,pet:pet,poses:Object.keys(sequenceByPose),faceCount:FACE_COUNT,physiqueCount:PHYSIQUE_COUNT};
})();