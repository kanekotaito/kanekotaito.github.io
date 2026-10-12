/* ONLINE MUSCLE DOJO v16
 * Public URL, opt-in shared battle summaries, owner-scoped writes/deletion.
 * Requires a Supabase project + online-schema.sql + online-config.js filled in.
 * No private answers or study history ever leave this browser.
 */
(function(){
"use strict";
var CONFIG=window.RYOJU_ONLINE_CONFIG||{},LINKS="ryoju-online-links-v1";
var client=null,promise=null,sdkPromise=null,publishTimer=null;
function safe(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function configured(){return /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(String(CONFIG.url||"").replace(/\/$/,""))&&!!String(CONFIG.publishableKey||"").trim();}
function getLinks(store){try{var x=JSON.parse(store.getItem(LINKS)||"{}");return x&&typeof x==="object"&&!Array.isArray(x)?x:{};}catch(e){return {};}}
function getLink(store,id){return getLinks(store)[id]||null;}
function setLink(store,id,remote){var links=getLinks(store);if(remote)links[id]=remote;else delete links[id];store.setItem(LINKS,JSON.stringify(links));}
function initSdk(){
 if(window.supabase&&window.supabase.createClient)return Promise.resolve(window.supabase);
 if(sdkPromise)return sdkPromise;
 sdkPromise=new Promise(function(resolve,reject){
  var tag=document.createElement("script");
  tag.src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
  tag.async=true;tag.crossOrigin="anonymous";
  var wait=setTimeout(function(){reject(new Error("オンライン接続がタイムアウトしました。通信環境を確認してください。"));},15000);
  tag.onload=function(){clearTimeout(wait);if(window.supabase&&window.supabase.createClient)resolve(window.supabase);else reject(new Error("オンライン通信ライブラリを読めませんでした。"));};
  tag.onerror=function(){clearTimeout(wait);reject(new Error("ネット接続に失敗しました。"));};
  document.head.appendChild(tag);
 }).catch(function(err){sdkPromise=null;throw err;});
 return sdkPromise;
}
function getClient(){
 if(!configured())return Promise.reject(new Error("オンライン対戦は準備中です。管理者がSupabaseの接続設定を完了すると利用できます。"));
 if(client)return Promise.resolve(client);
 if(promise)return promise;
 promise=initSdk().then(function(sdk){
  client=sdk.createClient(CONFIG.url.replace(/\/$/,""),CONFIG.publishableKey,{
   auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false},
   global:{headers:{"X-Client-Info":"ryoju-macho-16"}}
  });
  return client;
 }).catch(function(err){promise=null;throw err;});
 return promise;
}
async function user(client){
 var result=await client.auth.getUser();
 if(result.error&&result.error.message&&!result.data?.user)throw result.error;
 if(result.data&&result.data.user)return result.data.user;
 var signed=await client.auth.signInAnonymously();
 if(signed.error)throw new Error("匿名プレイヤー登録が無効です。Supabase側でAnonymous Sign-Insを有効化してください。");
 if(!signed.data||!signed.data.user)throw new Error("プレイヤー認証に失敗しました。");
 return signed.data.user;
}
function dataFor(name,db,localId,ownerId){
 var stat=window.PlayerProfiles.stats(db),muscle=window.Muscle&&window.Muscle.stats?window.Muscle.stats(db):{stage:0};
 return {owner_id:ownerId,local_player_id:String(localId),display_name:String(name).slice(0,16),
  mastered:Math.max(0,Math.min(600,stat.mastered)),packs:Math.max(0,Math.min(8,stat.packs)),
  best:Math.max(0,Math.min(50,stat.best)),recovered:Math.max(0,Math.min(600,stat.recovered)),
  muscle_stage:Math.max(0,Math.min(14,muscle.stage)),updated_at:new Date().toISOString()};
}
async function register(store,localId){
 var found=window.PlayerProfiles.users(store).find(function(x){return x.id===localId;});
 if(!found)throw new Error("プレイヤーが見つかりません。");
 var db=window.PlayerProfiles.read(store,localId),c=await getClient(),u=await user(c);
 var payload=dataFor(found.name,db,localId,u.id);
 var r=await c.from(CONFIG.table||"ryoju_public_players").upsert(payload,{onConflict:"owner_id,local_player_id"}).select("id").single();
 if(r.error)throw r.error;
 if(!r.data||!r.data.id)throw new Error("オンライン登録を確認できませんでした。");
 setLink(store,localId,r.data.id);
 return r.data.id;
}
async function publish(store,localId,db){
 var remote=getLink(store,localId);
 if(!remote)return false;
 var found=window.PlayerProfiles.users(store).find(function(p){return p.id===localId;});
 if(!found)return false;
 var c=await getClient(),u=await user(c),payload=dataFor(found.name,db||window.PlayerProfiles.read(store,localId),localId,u.id);
 // The ID is never exposed as an update value and RLS restricts the owner.
 var r=await c.from(CONFIG.table||"ryoju_public_players").update(payload).eq("id",remote).eq("owner_id",u.id).select("id");
 if(r.error)throw r.error;
 if(!r.data||r.data.length!==1)throw new Error("オンライン公開データの更新権限がありません。ブラウザーが変わった可能性があります。");
 return true;
}
function queuePublish(store,db){
 if(!configured())return;
 var player;try{player=window.PlayerProfiles.active(store);}catch(e){return;}
 if(!getLink(store,player.id))return;
 if(publishTimer)clearTimeout(publishTimer);
 var playerId=player.id;
 publishTimer=setTimeout(function(){
  publishTimer=null;
  // Read latest storage instead of closing over a mutable active game object.
  publish(store,playerId).catch(function(e){window.OnlineArena.lastError=String(e.message||e);});
 },1800);
}
async function unregister(store,localId){
 var remote=getLink(store,localId);if(!remote)return false;
 var c=await getClient(),u=await user(c);
 var result=await c.from(CONFIG.table||"ryoju_public_players").delete().eq("id",remote).eq("owner_id",u.id).select("id");
 if(result.error)throw result.error;
 if(!result.data||result.data.length!==1)throw new Error("公開プロフィールを削除できませんでした。学習記録を保護するためローカル削除も中止します。");
 setLink(store,localId,null);
 return true;
}
async function deleteProfile(store,id){
 if(getLink(store,id))await unregister(store,id);
 return window.PlayerProfiles.remove(store,id);
}
async function roster(){
 var c=await getClient();
 var result=await c.from(CONFIG.table||"ryoju_public_players")
  .select("id,display_name,mastered,packs,best,recovered,muscle_stage,updated_at")
  .order("mastered",{ascending:false}).limit(150);
 if(result.error)throw result.error;
 return Array.isArray(result.data)?result.data:[];
}
function fighter(name,stat,side){
 var stage=Math.max(0,Math.min(14,Number(stat.muscle_stage)||0));
 var puppet=window.Muscle&&window.Muscle.clay?window.Muscle.clay.puppet(stage,"online-"+side,false,Math.max(0,stat.mastered+stat.packs*25)):"💪";
 return '<div class="online-fighter"><h3>'+safe(name)+'</h3><div class="online-fighter-pic">'+puppet+'</div><div class="online-fighter-score"><strong>'+stat.mastered+'</strong><small>問習得</small></div>'+
  '<span>完全クリア '+stat.packs+'パック</span><span>模試最高 '+(stat.best||"―")+'/50</span><span>復習克服 '+stat.recovered+'問</span></div>';
}
function stats(db){
 var x=window.PlayerProfiles.stats(db),m=window.Muscle&&window.Muscle.stats?window.Muscle.stats(db):{stage:0};
 return {mastered:x.mastered,packs:x.packs,best:x.best,recovered:x.recovered,muscle_stage:m.stage};
}
function match(localDB,opponent){return window.PlayerProfiles.roundupPublic(stats(localDB),opponent);}
function render(store,db,state){
 state=state||{roster:[]};
 var person=window.PlayerProfiles.active(store),remoteId=getLink(store,person.id),mine=stats(db),others=state.roster||[];
 var out='<div class="online-page"><div class="battle-toolbar"><button data-online-action="close">← トップに戻る</button><span>PUBLIC MUSCLE ARENA</span></div>'+
 '<div class="online-banner"><span>🌐 ONLINE CHALLENGE</span><h2>世界のマッチョに挑戦！</h2><p>URLを知っている人なら誰でも参加可能。公開したマッチョは別のiPhoneからも腕相撲の相手に選べます。</p></div>';
 if(!configured()){
  out+='<section class="online-unconfigured"><h3>🔧 オンライン接続の準備中</h3><p>GitHub Pagesの公開は完了していますが、プレイヤーを共有するSupabaseデータベースはまだ接続されていません。接続が終わるまでは、これまでどおり同じ端末内で腕相撲できます。</p><p>設定が完了しても、あなたが許可するまで名前や成績は公開されません。</p></section>';
 }else {
  out+='<section class="online-self"><h3>🦍 あなたのマッチョ：'+safe(person.name)+'</h3>'+
   '<p>習得 '+mine.mastered+'問　｜　筋肉Lv.'+(mine.muscle_stage+1)+'　｜　模試最高 '+(mine.best||"―")+'/50</p>'+
   '<p class="online-privacy">公開する情報は「名前、習得問題数、完全クリア数、模試最高点、復習克服数、筋肉レベル」のみ。過去の問題や選んだ解答は公開しません。</p>'+
   (remoteId?'<div class="online-published"><span>✅ オンラインに公開中</span><button data-online-action="publish">🔄 成績を同期</button><button class="online-unpublish" data-online-action="unpublish">公開を取り消す</button></div>':
     '<button class="online-publish-btn" data-online-action="register">🌍 このマッチョを対戦名簿に公開する</button>')+
   '</section>';
  if(state.loading)out+='<div class="online-loading">⏳ 参加者を読み込み中...</div>';
  if(state.error)out+='<div class="online-error">⚠ '+safe(state.error)+'</div>';
  out+='<section class="online-roster"><div class="online-roster-title"><h3>🥊 全国の挑戦者</h3><button data-online-action="refresh">🔄 更新</button></div>'+
   '<p>参加者 '+others.length+'人（表示は最大150人）。他のスマホから登録されたマッチョもここに並びます。</p>';
  var opponents=others.filter(function(x){return x.id!==remoteId;});
  if(!opponents.length)out+='<div class="online-no-opponents">まだ挑戦者がいません。友達にURLを送って、マッチョを公開してもらいましょう。</div>';
  else {
   var selected=opponents.find(function(x){return x.id===state.opponentId;})||opponents[0];
   out+='<label for="online-opponent">対戦相手を選択</label><select id="online-opponent" data-online-select="opponent">'+opponents.map(function(x){return '<option value="'+safe(x.id)+'" '+(x.id===selected.id?"selected":"")+'>'+safe(x.display_name)+'　💪 '+x.mastered+'問</option>';}).join("")+'</select>'+
    '<div class="online-match-stage '+(state.phase==="playing"?"fighting":"")+'">'+fighter(person.name,mine,"left")+
    '<div class="online-versus"><strong>VS</strong><div class="online-arms">💪⚡💪</div></div>'+fighter(selected.display_name,selected,"right")+'</div>';
   if(state.phase==="playing")out+='<div class="online-countdown" aria-live="polite">⚡ コマ撮りマッチョ対決中！</div>';
   if(state.phase==="result"&&state.result){
    var winner=state.result.winner==="left"?person.name:state.result.winner==="right"?selected.display_name:null;
    out+='<div class="battle-outcome"><div class="battle-crown">🏆</div><strong>'+(winner?safe(winner)+"の勝利！":"引き分け！")+'</strong><span>'+state.result.scoreA+' 対 '+state.result.scoreB+' の3本勝負</span></div>'+
      '<div class="battle-rounds">'+state.result.rounds.map(function(round){return '<div class="battle-round"><span>'+safe(round.name)+'</span><div><b>'+round.scoreA+'</b><strong>'+(round.winner==="left"?"← 勝利":round.winner==="right"?"勝利 →":"引き分け")+'</strong><b>'+round.scoreB+'</b></div></div>';}).join("")+'</div>';
   }
   out+='<button class="battle-fight-btn" type="button" data-online-action="fight" '+(state.phase==="playing"?"disabled":"")+'>'+(state.phase==="result"?"🔁 もう一度対戦！":"💥 オンライン腕相撲スタート！")+'</button>';
  }
  out+='</section>';
 }
 out+='<p class="online-footnote">オンライン対戦は相手の公開済み学習成績を比較する非同期対戦です。相手も同時にアプリを開いている必要はありません。模試の公的な証明や賞金・賭け事ではありません。成績の改ざんを完全に防ぐ競技システムではありません。</p></div>';
 return out;
}
window.OnlineArena={configured:configured,getLinks:getLinks,getLink:getLink,register:register,publish:publish,queuePublish:queuePublish,unregister:unregister,deleteProfile:deleteProfile,roster:roster,render:render,stats:stats,match:match,lastError:null};
})();