/* MULTI-PLAYER PROFILES & MUSCLE ARM WRESTLING v15.
 * Local-player profiles are strictly separated in Safari localStorage.
 * Migration COPIES the original single-user data to "タイト"; never deletes legacy.
 * Battles are friendly, based on actual learning stats; zero-cost and no rewards to farm.
 */
(function(){
"use strict";
var INDEX_KEY="ryoju-players-v1", DATA_PREFIX="ryoju-player-data-v1:", OLD_KEY="ryoju200-hard-v4", DEFAULT_ID="taito";
function blank(){return {version:4,seen:{},miss:{},session:null,history:[],fxXp:0,fxTotalCorrect:0,fxSound:true,muscleFx:true};}
function isDB(d){return !!(d&&d.version===4&&d.seen&&typeof d.seen==="object"&&d.miss&&typeof d.miss==="object");}
function parse(s){try{return JSON.parse(s);}catch(err){return null;}}
function escapeHtml(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function safeName(name){
 var s=String(name||"").replace(/[\u0000-\u001f\u007f]/g,"").trim().replace(/\s+/g," ");
 if(!s||Array.from(s).length>16)throw new Error("名前を1〜16文字で入力してください。");
 return s;
}
function validateIndex(idx){
 if(!idx||idx.version!==1||!Array.isArray(idx.players)||!idx.players.length||idx.players.length>30||!idx.players.some(function(p){return p.id===idx.active;}))throw new Error("プレイヤー一覧が読み取れません。先にバックアップを確認してください。");
 return idx;
}
function key(id){return DATA_PREFIX+id;}
function setup(store){
 var current=parse(store.getItem(INDEX_KEY));
 if(current)return validateIndex(current);
 var legacy=parse(store.getItem(OLD_KEY)),first=isDB(legacy)?legacy:blank();
 // Copy before committing the new registry to avoid accidental data loss.
 var preexisting=parse(store.getItem(key(DEFAULT_ID)));
 if(preexisting&&isDB(preexisting))first=preexisting;
 else store.setItem(key(DEFAULT_ID),JSON.stringify(first));
 var idx={version:1,active:DEFAULT_ID,players:[{id:DEFAULT_ID,name:"タイト",createdAt:Date.now()}]};
 store.setItem(INDEX_KEY,JSON.stringify(idx));
 return idx;
}
function getIndex(store){return setup(store);}
function read(store,id){
 var idx=getIndex(store),name=idx.players.find(function(p){return p.id===id;});
 if(!name)throw new Error("プレイヤーが見つかりません。");
 var d=parse(store.getItem(key(id)));
 if(!isDB(d))throw new Error("「"+name.name+"」の記録を読み込めません。データ消去を行わずバックアップをご確認ください。");
 return d;
}
function save(store,data){var idx=getIndex(store);if(!isDB(data))throw new Error("学習記録の形式が正しくありません。");store.setItem(key(idx.active),JSON.stringify(data));}
function users(store){return getIndex(store).players.map(function(p){return {id:p.id,name:p.name,createdAt:p.createdAt};});}
function active(store){var idx=getIndex(store);return idx.players.find(function(p){return p.id===idx.active;});}
function rename(store,name){
 var idx=getIndex(store),val=safeName(name),current=idx.players.find(function(p){return p.id===idx.active;});
 if(idx.players.some(function(p){return p.id!==current.id&&p.name===val;}))throw new Error("同じ名前のプレイヤーがいます。");
 current.name=val;store.setItem(INDEX_KEY,JSON.stringify(idx));return current;
}
function create(store,name){
 var idx=getIndex(store),val=safeName(name);
 if(idx.players.length>=16)throw new Error("このiPhoneでは最大16人まで登録できます。");
 if(idx.players.some(function(p){return p.name===val;}))throw new Error("同じ名前のプレイヤーがいます。");
 var id="p"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
 // Do not change active player. Persist new, blank game state first.
 store.setItem(key(id),JSON.stringify(blank()));
 idx.players.push({id:id,name:val,createdAt:Date.now()});
 store.setItem(INDEX_KEY,JSON.stringify(idx));
 return {id:id,name:val};
}
function remove(store,id){
 var idx=getIndex(store),found=idx.players.find(function(p){return p.id===id;});
 if(!found)throw new Error("プレイヤーが見つかりません。");
 read(store,id);
 var remain=idx.players.filter(function(p){return p.id!==id;});
 if(!remain.length){
  var guest="guest-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,8);
  store.setItem(key(guest),JSON.stringify(blank()));
  remain=[{id:guest,name:"ゲスト",createdAt:Date.now()}];
 }
 var next={version:1,active:idx.active===id?remain[0].id:idx.active,players:remain};
 store.setItem(INDEX_KEY,JSON.stringify(next));
 store.removeItem(key(id));
 if(id===DEFAULT_ID)store.removeItem(OLD_KEY);
 return {name:found.name,active:next.active};
}
function switchTo(store,id){
 var idx=getIndex(store);
 if(!idx.players.some(function(p){return p.id===id;}))throw new Error("プレイヤーが見つかりません。");
 var data=read(store,id);
 idx.active=id;store.setItem(INDEX_KEY,JSON.stringify(idx));
 return data;
}
function stats(db){
 db=db||blank();var e=db.economy||{},completed=e.mastered||{},cleared=e.cleared||{};
 var mastered=Object.keys(completed).filter(function(id){return !!completed[id];}).length;
 var packs=Object.keys(cleared).filter(function(id){return !!cleared[id];}).length;
 var sessions=db.studyRecords&&db.studyRecords.sessions||[],history=db.history||[];
 var exams=sessions.filter(function(s){return s.mode==="exam"&&s.status==="finished"&&s.total===50;}).map(function(s){return Number(s.correct)||0;});
 // Earlier builds saved only aggregate results. Avoid counting same exam twice.
 if(!exams.length)exams=history.filter(function(s){return s.mode==="exam"&&s.total===50;}).map(function(s){return Number(s.correct)||0;});
 var best=exams.length?Math.max.apply(null,exams):0;
 var review=new Set(),priorErrors={};
 // A wrong question followed by a later correct answer counts as recovered knowledge.
 sessions.slice().reverse().forEach(function(s){(s.answers||[]).forEach(function(a){
  if(a.given!==a.correct)priorErrors[a.id]=true;
  else if(priorErrors[a.id])review.add(a.id);
 });});
 var recovered=review.size;
 var k1=mastered*10,k2=packs*160,k3=Math.max(0,best-30)*18,k4=Math.min(200,recovered*5);
 var power=k1+k2+k3+k4;
 return {mastered:mastered,packs:packs,best:best,recovered:recovered,studyPower:power,breakdown:[k1,k2,k3,k4]};
}
function roundupPublic(a,b){
 function norm(x){return {mastered:Math.min(600,Math.max(0,Number(x.mastered)||0)),packs:Math.min(8,Math.max(0,Number(x.packs)||0)),best:Math.min(50,Math.max(0,Number(x.best)||0)),recovered:Math.min(600,Math.max(0,Number(x.recovered)||0))};}
 var left=norm(a),right=norm(b);
 var rr=[
  {name:"第1戦・知識の筋力",scoreA:left.mastered*10+left.packs*60,scoreB:right.mastered*10+right.packs*60},
  {name:"第2戦・模試の技",scoreA:left.mastered*5+Math.max(0,left.best-30)*35,scoreB:right.mastered*5+Math.max(0,right.best-30)*35},
  {name:"第3戦・復習の粘り",scoreA:left.mastered*7+left.packs*100+Math.min(200,left.recovered*5),scoreB:right.mastered*7+right.packs*100+Math.min(200,right.recovered*5)}
 ];
 var winsA=0,winsB=0;rr.forEach(function(r){r.winner=r.scoreA===r.scoreB?"draw":r.scoreA>r.scoreB?"left":"right";if(r.winner==="left")winsA++;if(r.winner==="right")winsB++;});
 var scoreA=rr.reduce(function(n,r){return n+r.scoreA;},0),scoreB=rr.reduce(function(n,r){return n+r.scoreB;},0);
 return {left:left,right:right,rounds:rr,scoreA:winsA,scoreB:winsB,pointA:scoreA,pointB:scoreB,winner:winsA!==winsB?(winsA>winsB?"left":"right"):(scoreA===scoreB?"draw":scoreA>scoreB?"left":"right")};
}
function roundup(a,b){
 var strengthA=stats(a),strengthB=stats(b);
 var rounds=[
  {name:"第1戦・知識の筋力",scoreA:strengthA.mastered*10+strengthA.packs*60,scoreB:strengthB.mastered*10+strengthB.packs*60},
  {name:"第2戦・模試の技",scoreA:strengthA.mastered*5+Math.max(0,strengthA.best-30)*35,scoreB:strengthB.mastered*5+Math.max(0,strengthB.best-30)*35},
  {name:"第3戦・復習の粘り",scoreA:strengthA.mastered*7+strengthA.packs*100+Math.min(200,strengthA.recovered*5),scoreB:strengthB.mastered*7+strengthB.packs*100+Math.min(200,strengthB.recovered*5)}
 ];
 var victoriesA=0,victoriesB=0;
 rounds.forEach(function(r){r.winner=r.scoreA===r.scoreB?"draw":r.scoreA>r.scoreB?"left":"right";if(r.winner==="left")victoriesA++;if(r.winner==="right")victoriesB++;});
 var totalA=rounds.reduce(function(n,r){return n+r.scoreA;},0),totalB=rounds.reduce(function(n,r){return n+r.scoreB;},0);
 var winner=victoriesA!==victoriesB?(victoriesA>victoriesB?"left":"right"):(totalA===totalB?"draw":totalA>totalB?"left":"right");
 return {left:strengthA,right:strengthB,rounds:rounds,winner:winner,scoreA:victoriesA,scoreB:victoriesB,pointA:totalA,pointB:totalB};
}
function profileBar(store){
 var idx=getIndex(store),options=idx.players.map(function(p){return '<div class="player-chip-group"><button type="button" class="player-chip '+(p.id===idx.active?"current":"")+'" data-profile-action="switch" data-profile-id="'+escapeHtml(p.id)+'" aria-pressed="'+(p.id===idx.active)+'">'+(p.id===idx.active?"👑 ":"💪 ")+escapeHtml(p.name)+'</button><button type="button" class="player-delete" data-profile-action="delete" data-profile-id="'+escapeHtml(p.id)+'" aria-label="'+escapeHtml(p.name)+' を削除する" title="プレイヤー削除" >✕</button></div>';}).join("");
 return '<section class="player-hud" aria-label="プレイヤー切り替え"><div class="player-hud-title"><span>YOUR MUSCLE TEAM</span><strong>👤 現在のプレイヤー：'+escapeHtml(active(store).name)+'</strong></div>'+
 '<div class="player-chips">'+options+'</div>'+
 '<div class="player-hud-actions"><button type="button" data-profile-action="create">＋ 新しいプレイヤー</button><button type="button" data-profile-action="rename">✏️ 名前変更</button><button type="button" class="battle-shortcut" data-profile-action="battle">🏆 この端末で腕相撲</button><button type="button" class="battle-shortcut online-shortcut" data-profile-action="online">🌐 みんなとオンライン腕相撲</button></div>'+
 '<p class="player-hud-note">同じiPhoneのこのブラウザー内で、それぞれの記録を別々に保存します。別のスマホとは自動同期されません。</p></section>';
}
function wrestler(name,db,side){
 var stat=stats(db),stage=window.Muscle&&window.Muscle.stats?window.Muscle.stats(db):{stage:0};
 var pic=window.Muscle&&window.Muscle.clay?window.Muscle.clay.puppet(stage.stage,"battle-"+side,false,window.Muscle.stats(db).power):'<div class="battle-fallback">💪</div>';
 return '<article class="wrestler wrestler-'+side+'"><h3>'+escapeHtml(name)+'</h3><div class="wrestler-avatar">'+pic+'</div>'+
 '<div class="wrestler-strength"><small>知識マッスルパワー</small><strong>'+stat.studyPower.toLocaleString("ja-JP")+'</strong></div>'+
 '<div class="wrestler-facts"><span>習得 '+stat.mastered+'問</span><span>クリア '+stat.packs+'パック</span><span>模試最高 '+(stat.best||"―")+'/50</span><span>復習克服 '+stat.recovered+'問</span></div></article>';
}
function battle(store,pick,phase,result){
 var idx=getIndex(store);
 if(!pick.left||!idx.players.some(function(p){return p.id===pick.left;}))pick.left=idx.active;
 if(!pick.right||!idx.players.some(function(p){return p.id===pick.right;}))pick.right=idx.players.find(function(p){return p.id!==pick.left;})?.id||null;
 var players=idx.players;
 var markup='<div class="battle-page"><div class="battle-toolbar"><button type="button" data-act="battle-close">← トップに戻る</button><span>MUSCLE ARM WRESTLING</span></div>'+
 '<div class="battle-heading"><h2>🏆 マッチョ腕相撲大会</h2><p>ただの連打では勝てない！ 習得問題・完全クリア・模試成績・復習克服が腕の力になります。</p></div>';
 if(players.length<2)markup+='<div class="battle-empty"><strong>まずは2人目のマッチョを登録！</strong><p>友達や家族の名前を追加すると腕相撲できます。</p><button type="button" data-profile-action="create">＋ プレイヤーを追加</button></div>';
 else{
 markup+='<div class="battle-choosers"><div><label for="battle-left">左の選手</label><select id="battle-left" data-battle-select="left">'+players.map(function(p){return '<option value="'+escapeHtml(p.id)+'" '+(pick.left===p.id?"selected":"")+'>'+escapeHtml(p.name)+'</option>';}).join("")+'</select></div>'+
 '<div><label for="battle-right">右の選手</label><select id="battle-right" data-battle-select="right">'+players.map(function(p){return '<option value="'+escapeHtml(p.id)+'" '+(pick.right===p.id?"selected":"")+'>'+escapeHtml(p.name)+'</option>';}).join("")+'</select></div></div>';
 var l=players.find(function(p){return p.id===pick.left;}),r=players.find(function(p){return p.id===pick.right;});
 if(!l||!r||l.id===r.id)markup+='<div class="battle-empty">対戦する2人のプレイヤーを別々に選んでください。</div>';
 else{
 var dl=read(store,l.id),dr=read(store,r.id);
 markup+='<div class="battle-ring '+(phase==="playing"?"is-fighting":"")+(phase==="result"?" is-finished":"")+'">'+wrestler(l.name,dl,"left")+'<div class="battle-center"><div class="battle-radiance">⚡</div><span class="battle-vs">VS</span><div class="battle-arms"><div class="battle-arm left-arm"></div><div class="battle-handshake">✊</div><div class="battle-arm right-arm"></div></div><div class="battle-table"></div></div>'+wrestler(r.name,dr,"right")+'</div>';
 if(phase==="playing")markup+='<div class="battle-fight-live" aria-live="polite"><strong>🔥 ファイト！</strong><span>筋肉をぶつけ合っている！</span></div>';
 if(phase==="result"&&result){
  var winner=result.winner==="left"?l.name:result.winner==="right"?r.name:null;
  markup+='<div class="battle-outcome"><div class="battle-crown">🏆</div><strong>'+(winner?escapeHtml(winner)+" の勝利！":"引き分け！")+'</strong><span>獲得ラウンド '+result.scoreA+' 対 '+result.scoreB+'</span></div>'+
  '<div class="battle-rounds">'+result.rounds.map(function(x){return '<div class="battle-round"><span>'+escapeHtml(x.name)+'</span><div><b>'+x.scoreA+'</b><strong>'+(x.winner==="left"?"← 勝利":x.winner==="right"?"勝利 →":"引き分け")+'</strong><b>'+x.scoreB+'</b></div></div>';}).join("")+'</div>';
 }
 markup+='<button type="button" class="battle-fight-btn" data-act="battle-play" '+(phase==="playing"?"disabled":"")+'>'+(phase==="playing"?"💥 試合中！":phase==="result"?"🔄 もう一度対戦":"🔥 腕相撲スタート！")+'</button>';
 }
 }
 markup+='<p class="battle-note">この腕相撲は学習成果を比べるローカル対戦です。勝敗に偶然の課金要素や連打ボーナスはありません。腕相撲でコインや筋肉パワーは増減しません。</p></div>';
 return markup;
}
window.PlayerProfiles={setup:setup,getIndex:getIndex,read:read,save:save,users:users,active:active,rename:rename,create:create,switchTo:switchTo,remove:remove,safeName:safeName,stats:stats,roundup:roundup,roundupPublic:roundupPublic,profileBar:profileBar,battle:battle,keys:{index:INDEX_KEY,dataPrefix:DATA_PREFIX,legacy:OLD_KEY}};
})();