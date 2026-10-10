/* MUSCLE GROWTH COMPARISON v11
 * Before: actual stage-zero clay model. After: the saved unique-masteries physique.
 * Both clay models rotate in sync. Does not alter earned coins or study records.
 */
(function(){
"use strict";
if(!window.Muscle||!window.Muscle.clay)return;
var M=window.Muscle, previousHome=M.home, expanded=false,turn=0,gesture=null;
function safe(t){return String(t).replace(/[&<>"]/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[ch];});}
function compare(stats){
 var level=stats.stage+1, gained=level-1, settled=stats.cleared||0, mastered=stats.mastered||0;
 return '<section class="growth-compare" id="growth-compare" aria-label="筋肉の成長比較">'+
 '<button type="button" data-growth="toggle" class="growth-compare-toggle" aria-expanded="'+expanded+'" aria-controls="growth-compare-detail">'+
 '<span><span class="growth-kicker">BEFORE / AFTER</span><strong>💪 最初と今のマッチョを比較</strong><small>最初の姿と現在の姿を並べて見る</small></span>'+
 '<span class="growth-toggle-icon">'+(expanded?'−':'＋')+'</span></button>'+
 '<div class="growth-compare-detail" id="growth-compare-detail" '+(expanded?'':'hidden')+'>'+
 '<div class="growth-pair" data-growth-swipe="1" aria-label="左右にスワイプすると両方の人形が回転します">'+
 '<div class="growth-figure before"><div class="growth-figure-header"><span class="growth-chip">START</span><b>最初</b><small>筋肉 Lv.1</small></div>'+
 '<div class="growth-figure-model">'+M.clay.puppet(0,"before",false)+'</div><div class="growth-figure-caption">🌱 ひよっこトレーニー</div></div>'+
 '<div class="growth-figure after"><div class="growth-figure-header"><span class="growth-chip">NOW</span><b>現在</b><small>筋肉 Lv.'+level+'</small></div>'+
 '<div class="growth-figure-model">'+M.clay.puppet(stats.stage,"after",false)+'</div><div class="growth-figure-caption">🔥 '+safe(stats.name)+'</div></div>'+
 '</div>'+
 '<div class="growth-rotate-controls"><button type="button" data-growth="left" aria-label="両方左に回す">↶ 左に回す</button><span>👆 二人を同時に360°回転</span><button type="button" data-growth="right" aria-label="両方右に回す">右に回す ↷</button></div>'+
 '<div class="growth-results" aria-label="最初と現在の成長記録">'+
 '<div><span>筋肉レベル</span><b>Lv.1 <em>→</em> Lv.'+level+'</b></div>'+
 '<div><span>習得した問題</span><b>0問 <em>→</em> '+mastered+'問</b></div>'+
 '<div><span>完全クリアパック</span><b>0 <em>→</em> '+settled+'</b></div>'+
 '<div><span>筋肉パワー <small>（ゲーム内の育成値）</small></span><b>0 <em>→</em> '+stats.power+'</b></div>'+
 '</div>'+
 '<div class="growth-progress"><span>筋肉進化　'+(gained?gained+'段階アップ！':'ここから成長スタート！')+'</span><div class="growth-progress-track"><span style="width:'+Math.round(100*stats.stage/14)+'%"></span></div><small>見た目は習得問題数とパックの完全クリア数で変化します。何度も同じ問題を正解しただけでは増えません。</small></div>'+
 '</div></section>';
}
M.home=function(db){return previousHome(db)+compare(M.stats(db));};
function syncRotate(root,delta,absolute){
 var detail=root.querySelector(".growth-compare-detail");
 if(!detail||detail.hidden)return;
 if(absolute){turn=((delta%12)+12)%12;}else{turn=((turn+delta)%12+12)%12;}
 var figures=detail.querySelectorAll(".clay-puppet");
 for(var i=0;i<figures.length;i++)M.clay.setTurn(figures[i],turn);
}
function findRoot(target){return target&&target.closest?target.closest("#growth-compare"):null;}
document.addEventListener("click",function(e){
 var btn=e.target&&e.target.closest?e.target.closest("[data-growth]"):null;
 if(!btn)return;
 var root=findRoot(btn);if(!root)return;
 var action=btn.getAttribute("data-growth");
 if(action==="toggle"){
  expanded=!expanded;btn.setAttribute("aria-expanded",String(expanded));
  var panel=root.querySelector(".growth-compare-detail"),icon=btn.querySelector(".growth-toggle-icon");
  if(panel)panel.hidden=!expanded;if(icon)icon.textContent=expanded?"−":"＋";
  if(expanded)syncRotate(root,turn,true);
 }else if(action==="left"||action==="right"){syncRotate(root,action==="left"?-1:1,false);}
});
document.addEventListener("pointerdown",function(e){
 var area=e.target&&e.target.closest?e.target.closest("[data-growth-swipe]"):null;if(!area)return;
 gesture={root:findRoot(area),id:e.pointerId,startX:e.clientX,lastTurn:turn,moved:false};
 if(area.setPointerCapture)try{area.setPointerCapture(e.pointerId);}catch(err){}
});
document.addEventListener("pointermove",function(e){
 if(!gesture||e.pointerId!==gesture.id||!gesture.root)return;
 var delta=Math.trunc((e.clientX-gesture.startX)/15);
 if(delta!==0){gesture.moved=true;syncRotate(gesture.root,gesture.lastTurn+delta,true);e.preventDefault();}
},{passive:false});
document.addEventListener("pointerup",function(e){if(gesture&&e.pointerId===gesture.id)gesture=null;});
document.addEventListener("pointercancel",function(){gesture=null;});
document.addEventListener("keydown",function(e){
 var root=findRoot(e.target);if(!root)return;
 if(e.target.closest&&e.target.closest("[data-growth-swipe]")){
  if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();syncRotate(root,e.key==="ArrowLeft"?-1:1,false);}
 }
});
M.growthCompare={render:compare,getAngle:function(){return turn;},stageZero:0};
})();