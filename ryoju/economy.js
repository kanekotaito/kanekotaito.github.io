/* QuizStore v6: progression and coin economy. Scores and purchases stay on this device. */
(function(){
"use strict";
var PRICES=[550,650,750,850,950,1050,1150,1250];
var TITLES=["第一の扉","数字の罠","例外の迷宮","法令と安全の交差点","技能の試練","取扱いの核心","深読みの関門","最終マスター試練"];
function own(e,n){return !!(e&&e.owned&&e.owned[n]);}
function packIds(questions){var found={};(questions||[]).forEach(function(q){if(Number.isSafeInteger(q.pack)&&q.pack>0)found[q.pack]=true;});return Object.keys(found).map(Number).sort(function(a,b){return a-b;});}
function packPrice(p){return PRICES[p-1]||1250+100*(p-8);}
function packTitle(p){return TITLES[p-1]||"超越の筋肉試練 第"+p+"章";}
function asNumber(n){return Number.isFinite(Number(n))?Number(n):0;}
function ensure(db,questions){
 if(!db.economy||db.economy.version!==6){
  var e={version:6,coins:0,lifetimeEarned:0,spent:0,earned:{},mastered:{},tried:{},owned:{},cleared:{},legacyMigrated:false};
  if(db.economy){for(var k of ["coins","lifetimeEarned","spent","earned","mastered","tried","owned","cleared","legacyMigrated"])if(db.economy[k]!==undefined)e[k]=db.economy[k];}
  db.economy=e;
 }
 var e=db.economy;
 if(!e.legacyMigrated){
  var currentExam=db.session&&db.session.mode==="exam"&&!db.session.finished?db.session:null;
  for(var i=1;i<=200;i++){
   if(db.seen&&db.seen[i]>0){
    e.tried[i]=true;
    var wrong=!!(db.miss&&db.miss[i]);
    if(currentExam&&currentExam.answers[i]&&currentExam.answers[i]!==questions[i-1].a)wrong=true;
    if(!wrong&&!e.mastered[i]&&!e.earned[i]){
     e.mastered[i]=true;e.earned[i]=10;e.coins+=10;e.lifetimeEarned+=10;
    }
   }
  }
  e.legacyMigrated=true;
 }
 // Reject negative/corrupted balances from a previously broken local version.
 e.coins=Math.max(0,Math.floor(asNumber(e.coins)));
 e.lifetimeEarned=Math.max(0,Math.floor(asNumber(e.lifetimeEarned)));
 return e;
}
function onAttempt(db,q,isCorrect){
 var e=ensure(db,[]),id=q.id,prior=!!e.tried[id],reward=0;
 e.tried[id]=true;
 if(isCorrect){
  if(!e.mastered[id]&&!e.earned[id]){reward=prior?10:14;e.mastered[id]=true;e.earned[id]=reward;e.coins+=reward;e.lifetimeEarned+=reward;}
  if(db.miss)delete db.miss[id];
 }else if(db.miss){db.miss[id]=true;}
 return reward;
}
function progress(db,questions,pack){
 var e=ensure(db,questions),list=pack===0?questions.filter(q=>!q.pack):questions.filter(q=>q.pack===pack);
 var tried=0,mastered=0,pending=0;
 for(var i=0;i<list.length;i++){var id=list[i].id;if(e.tried[id])tried++;if(e.mastered[id])mastered++;if(db.miss&&db.miss[id])pending++;}
 return {total:list.length,tried:tried,mastered:mastered,pending:pending};
}
function settle(db,questions){
 var e=ensure(db,questions),reward=0;
 for(var ids=packIds(questions),j=0;j<ids.length;j++){var p=ids[j];if(!own(e,p)||e.cleared[p])continue;
  var a=progress(db,questions,p);
  if(a.total>0&&a.tried===a.total&&a.mastered===a.total&&a.pending===0){
   e.cleared[p]=true;reward+=375;
  }
 }
 if(reward){e.coins+=reward;e.lifetimeEarned+=reward;}
 return reward;
}
function examResult(db,s,questions){
 var earned=0;
 for(var i=0;i<s.order.length;i++){
  var id=s.order[i],answer=s.answers[id],q=questions.find(function(item){return item.id===Number(id);});
  if(!answer||!q)continue;
  earned+=onAttempt(db,q,answer===q.a);
 }
 earned+=settle(db,questions);
 return earned;
}
function gate(db,questions,p){
 var e=ensure(db,questions),price=packPrice(p);
 if(packIds(questions).indexOf(p)===-1)return {ok:false,text:"パックが見つかりません",price:0,prereq:false};
 if(own(e,p))return {ok:true,owned:true,text:"交換済み",price:price};
 var previous=p===1?progress(db,questions,0):progress(db,questions,p-1);
 var prereq=p===1?(previous.mastered>=45&&previous.pending<=5):(own(e,p-1)&&previous.total>0&&previous.tried===previous.total&&previous.mastered===previous.total&&previous.pending===0);
 var text=p===1?("基礎200問から45問を習得、未復習を5問以内にする（現在"+previous.mastered+"問習得・未復習"+previous.pending+"問）"):("第"+(p-1)+"パックをすべて解き、間違いを解き直す（現在"+previous.mastered+"/"+previous.total+"問習得・未復習"+previous.pending+"問）");
 return {ok:prereq&&e.coins>=price,owned:false,prereq:prereq,coinsEnough:e.coins>=price,price:price,text:text};
}
function buy(db,questions,p){
 var e=ensure(db,questions),g=gate(db,questions,p);
 if(g.owned)return {ok:true,already:true};
 if(!g.ok)return {ok:false,message:!g.prereq?"学習・復習の条件を達成してください。":"コインが足りません。"};
 e.coins-=g.price;e.spent+=g.price;e.owned[p]=true;
 return {ok:true,pack:p,remaining:e.coins};
}
function available(db,q){return !q.pack||own(ensure(db,[]),q.pack);}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}
function shop(db,questions){
 var e=ensure(db,questions),bas=progress(db,questions,0),ids=packIds(questions),ownedCount=Object.keys(e.owned).filter(n=>e.owned[n]).length;
 var html='<section class="coin-shop" id="coin-shop"><div class="shop-heading"><div><span class="shop-kicker">THE QUIZ VAULT</span><h2>🔐 知識の宝物庫</h2><p>正解と復習でコインを貯め、50問ずつ新しい試練を解放。</p></div><div class="coin-wallet"><small>現在の所持コイン</small><strong>🪙 '+e.coins+'</strong><span>累計獲得 '+e.lifetimeEarned+' C</span></div></div>';
 html+='<div class="shop-guide"><div><b>① 初回正解：+14 C</b><small>間違いを克服：+10 C</small></div><div><b>② パック完全習得：+375 C</b><small>50問すべて解いて間違いを復習</small></div><div><b>③ 新パックを購入</b><small>同じ問題の周回ではコインは増えません</small></div></div>';
 html+='<div class="base-progress"><b>📘 基礎200問</b><span>習得 '+bas.mastered+'/200　｜　未復習 '+bas.pending+'問</span></div>';
 html+='<div class="pack-grid">';
 for(var k=0;k<ids.length;k++){var p=ids[k];
  var g=gate(db,questions,p),pstat=progress(db,questions,p),owned=g.owned||false;
  html+='<article class="pack-card '+(owned?'pack-owned':g.ok?'pack-ready':'pack-locked')+'"><div class="pack-top"><span class="pack-num">'+(owned?'🔓':g.ok?'✨':'🔒')+' PACK '+String(p).padStart(2,'0')+'</span><span class="pack-price">'+(owned?'購入済み':'🪙 '+g.price+' C')+'</span></div><h3>'+packTitle(p)+'</h3><p class="pack-desc">法令・安全取扱いの応用問題</p>';
  if(owned){
   html+='<div class="pack-progress">習得 '+pstat.mastered+'/'+pstat.total+'　・　未復習 '+pstat.pending+'問<div class="pack-meter"><span style="width:'+((pstat.total?Math.round(pstat.mastered*100/pstat.total):0))+'%"></span></div></div>';
   if(e.cleared[p])html+='<div class="pack-clear">🏅 完全クリア ＋375 C獲得済み</div>';
   html+='<button type="button" data-act="pack-start" data-pack="'+p+'" class="pack-action">このパックに挑戦 →</button>';
  }else{
   html+='<p class="pack-condition">'+esc(g.text)+'</p>';
   if(g.ok)html+='<button type="button" data-act="pack-buy" data-pack="'+p+'" class="pack-action ready">🗝️ '+g.price+' Cで新問題を解放！</button>';
   else html+='<button type="button" class="pack-action muted" disabled>'+(g.prereq?'🪙 あと '+Math.max(0,g.price-e.coins)+' C':'🔒 前の試練・復習が必要')+'</button>';
  }
  html+='</article>';
 }
 html+='</div><p class="shop-footnote">追加問題や新パックにも順次対応。コインや購入記録はこのiPhoneのブラウザー内に保存されます。データ消去や別端末への移動では引き継げない場合があります。追加問題は警察庁の例題を組み合わせた独自応用問題です。</p></section>';
 return html;
}
window.QuizStore={PRICES:PRICES,packIds:packIds,packPrice:packPrice,ensure:ensure,available:available,onAttempt:onAttempt,examResult:examResult,progress:progress,gate:gate,buy:buy,settle:settle,shop:shop};
})();
