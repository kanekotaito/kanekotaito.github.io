/* v9 - photoreal miniature-set stop-motion. Uses image-generated fictional character frames. */
(function(){
"use strict";
if(!window.Muscle||!window.MUSCLE_SPRITE_IMAGE)return;
var M=window.Muscle,originalHome=M.home,originalCompact=M.compact,originalCelebrate=M.celebrate,sequenceTimers=[];
function stripOldSvg(html,doll){
 var a=html.indexOf("<svg "),b=html.indexOf("</svg>",a);
 if(a<0||b<0)return html;
 return html.slice(0,a)+doll+html.slice(b+6);
}
function frameForStage(s){return s>=12?3:s>=8?2:s>=4?1:0;}
function pos(n){return (n*100/7).toFixed(5)+"% center";}
function safeWord(s){return String(s||"").replace(/[^a-z0-9_-]/gi,"");}
function figure(stage,pose,mode){
 var frame=frameForStage(stage);
 return '<div class="doll-photo doll-'+safeWord(pose||"stand")+' '+safeWord(mode||"")+'" data-stage="'+stage+'" data-frame="'+frame+'" role="img" aria-label="筋肉キャラクターの実写風コマ撮りフィギュア">'+
 '<div class="doll-set-light"></div>'+
 '<div class="doll-photo-image" style="background-position:'+pos(frame)+'" data-photo-frame="'+frame+'"></div>'+
 '<div class="doll-joint doll-shoulder-left"></div><div class="doll-joint doll-shoulder-right"></div>'+
 '<div class="doll-camera-grain"></div><div class="doll-photo-vignette"></div>'+
 '<div class="doll-film-counter">● REC 4 fps</div>'+
 '<div class="doll-stage-floor"></div></div>';
}
function mountSprite(){
 if(document.getElementById("doll-photo-sprite-style"))return;
 var style=document.createElement("style");style.id="doll-photo-sprite-style";
 style.textContent='.doll-photo-image{background-image:url("'+window.MUSCLE_SPRITE_IMAGE+'");}';
 document.head.appendChild(style);
}
try{mountSprite();}catch(e){return;}
M.avatarSvg=figure;
M.home=function(db){return stripOldSvg(originalHome(db),figure(M.stats(db).stage,"stand","doll-idle"));};
M.compact=function(db){return stripOldSvg(originalCompact(db),figure(M.stats(db).stage,"stand","doll-idle"));};
function clearFrames(){
 for(var i=0;i<sequenceTimers.length;i++)clearTimeout(sequenceTimers[i]);sequenceTimers=[];
}
function actions(stage,theme){
 var base=frameForStage(stage),t=theme||"pulse",seq;
 if(stage<4){
  seq=[base,base,base,1,base,base,1,base];
 }else if(stage<8){
  seq=[base,base,2,base,2,base,base];
 }else if(stage<12){
  seq=t==="comet"||t==="ocean"?[base,4,5,6,5,base]:[base,4,5,base,6,base];
 }else{
  var samples={
   thunder:[base,5,6,5,7,base],
   festival:[base,4,6,7,5,base],
   comet:[base,6,5,7,6,base],
   volcano:[base,5,5,6,7,base],
   gold:[base,7,5,7,base],
   galaxy:[base,6,7,5,6,base]
  };
  seq=samples[t]||[base,4,5,6,7,base];
 }
 return seq;
}
function moveStopMotion(frameEl,container,stage,theme){
 clearFrames();
 var frames=actions(stage,theme),count=frames.length;
 var poses=[
 {turn:-5,x:-8,y:6,s:0.96},{turn:3,x:6,y:-9,s:1.06},
 {turn:-9,x:-7,y:-2,s:1.12},{turn:8,x:9,y:5,s:1.01},
 {turn:-4,x:-3,y:-12,s:1.09},{turn:2,x:3,y:0,s:1},
 {turn:7,x:5,y:-7,s:1.07},{turn:0,x:0,y:0,s:1}
 ];
 var counter=container.querySelector(".doll-film-counter");
 var shutter=container.querySelector(".doll-shutter");
 if(!shutter){shutter=document.createElement("div");shutter.className="doll-shutter";container.appendChild(shutter);}
 frames.forEach(function(f,i){
  var timer=setTimeout(function(){
   if(!frameEl.isConnected)return;
   var p=poses[i%poses.length];
   frameEl.style.backgroundPosition=pos(f);
   frameEl.setAttribute("data-photo-frame",String(f));
   frameEl.style.transform="translate3d("+p.x+"px,"+p.y+"px,0) rotate("+p.turn+"deg) scale("+p.s+")";
   if(counter)counter.textContent="● REC 4 fps · "+String(i+1).padStart(2,"0")+" / "+String(count).padStart(2,"0");
   if(i===1||i===Math.floor(count*.62)){shutter.classList.remove("snap");void shutter.offsetWidth;shutter.classList.add("snap");}
   if(i===count-1)frameEl.style.transform="translate3d(0,0,0) rotate(0deg) scale(1)";
  },i*245);
  sequenceTimers.push(timer);
 });
}
M.celebrate=function(db,opt){
 opt=opt||{};
 clearFrames();
 originalCelebrate(db,opt);
 var overlay=document.getElementById("muscle-stage");if(!overlay)return;
 var doll=overlay.querySelector(".mqv-hero .doll-photo");
 if(!doll)return;
 var body=doll.querySelector(".doll-photo-image");
 if(!body)return;
 var scene=overlay.querySelector(".mqv-splash"),theme="";
 if(scene){var match=scene.className.match(/mqv-theme-([a-z]+)/);theme=match?match[1]:"";}
 moveStopMotion(body,doll,M.stats(db).stage,theme);
};
M.stopMotion={getFrame:frameForStage,sequence:actions,photoReady:!!window.MUSCLE_SPRITE_IMAGE,frameCount:8};
})();
