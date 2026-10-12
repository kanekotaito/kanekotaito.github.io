/* Study Records v14. Preserves "ryoju200-hard-v4" progress and all future answers. */
(function(){
"use strict";
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function dt(t){try{return new Date(Number(t)).toLocaleString("ja-JP",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});}catch(e){return "日時不明";}}
function label(s){var m={exam:"本番模試（50問）",sprint:"3問クエスト",focus:"5問特訓",quick:"10問練習",review:"間違い復習",full:"全問演習",pack:"購入パック",category:"分野別"};return m[s.mode]||s.kind||"学習";}
function hash(q){var z=String(q.id)+"|"+q.q+"|"+q.a+"|"+q.why+"|"+q.bookPage,h=2166136261;for(var i=0;i<z.length;i++)h=Math.imul(h^z.charCodeAt(i),16777619)>>>0;return q.id+"-"+h.toString(16);}
function snapshot(q){return {id:q.id,q:String(q.q||""),a:q.a,why:String(q.why||""),trap:String(q.trap||""),bookPage:String(q.bookPage||"ページ未確認"),topic:String(q.topic||""),kind:String(q.kind||""),source:String(q.source||"")};}
function ensure(db,questions){
 if(!db.studyRecords||db.studyRecords.version!==1)db.studyRecords={version:1,sessions:[],questions:{},migrated:false,cycle:1};
 var r=db.studyRecords;
 if(!Array.isArray(r.sessions))r.sessions=[];
 if(!r.questions||typeof r.questions!=="object")r.questions={};
 if(!r.migrated){
  (Array.isArray(db.history)?db.history:[]).forEach(function(item,i){
   var id="legacy-"+(item.date||0)+"-"+i;
   if(r.sessions.some(function(s){return s.id===id;}))return;
   r.sessions.push({id:id,started:item.date||0,ended:item.date||0,mode:item.mode||"",kind:"",status:"finished",total:item.total||0,correct:item.correct||0,legacy:true,answers:[],cycle:0});
  });
  r.migrated=true;
 }
 if(!Number.isFinite(Number(r.cycle))||r.cycle<1)r.cycle=1;
 if(db.session&&questions){attach(db,db.session,questions,true);if(db.session.finished)finish(db,db.session,questions);}
 return r;
}
function attach(db,s,qs,backfill){
 var r=db.studyRecords;if(!s||!r)return null;
 if(!s.recordId)s.recordId="s-"+(s.started||Date.now())+"-"+Math.random().toString(36).slice(2,9);
 var x=r.sessions.find(function(z){return z.id===s.recordId;});
 if(!x){
  x={id:s.recordId,started:s.started||Date.now(),ended:0,mode:s.mode||"",kind:s.kind||"",cycle:r.cycle,total:s.order?s.order.length:0,correct:0,status:"active",legacy:false,answers:[]};
  r.sessions.unshift(x);
 }
 if(backfill&&s.answers&&qs){
  Object.keys(s.answers).forEach(function(id){var q=qs[Number(id)-1],v=s.answers[id];if(q&&(v==="○"||v==="×"))onAnswer(db,s,id,v,q);});
 }
 return x;
}
function onAnswer(db,s,id,value,q){
 if(!q||(value!=="○"&&value!=="×"))return null;
 var r=db.studyRecords||ensure(db,null),x=attach(db,s,null,false);if(!x)return null;
 var key=hash(q);if(!r.questions[key])r.questions[key]=snapshot(q);
 id=Number(id);
 var a=x.answers.find(function(z){return z.id===id;});
 if(!a){a={id:id,key:key,given:value,correct:q.a,at:Date.now(),edits:0};x.answers.push(a);}
 else if(a.given!==value){a.key=key;a.given=value;a.correct=q.a;a.at=Date.now();a.edits=(a.edits||0)+1;}
 x.correct=x.answers.filter(function(z){return z.given===z.correct;}).length;
 return a;
}
function finish(db,s,qs){
 var x=attach(db,s,qs,true);if(!x)return;
 x.total=s.order?s.order.length:x.total;x.correct=x.answers.filter(function(z){return z.given===z.correct;}).length;x.ended=s.finishedAt||Date.now();x.status="finished";return x;
}
function pause(db,qs){if(!db.session)return;var x=attach(db,db.session,qs,true);if(x&&x.status==="active"){x.status="paused";x.ended=Date.now();}}
function revision(db){
 var r=db.studyRecords||{sessions:[],questions:{}},group={};
 r.sessions.forEach(function(s){if(s.legacy)return;(s.answers||[]).forEach(function(a){
  if(a.given===a.correct)return;
  var q=r.questions[a.key];if(!q)return;
  var p=q.bookPage||"ページ未確認";
  if(!group[p])group[p]={page:p,wrong:0,ids:{},topics:{},at:0};
  var z=group[p];z.wrong++;z.ids[q.id]=true;z.topics[q.topic||q.kind||"不明"]=true;z.at=Math.max(z.at,a.at||0);
 });});
 return Object.values(group).map(function(z){
  z.pending=Object.keys(z.ids).filter(function(id){return !!(db.miss&&db.miss[id]);}).length;
  z.priority=z.wrong+3*z.pending;z.topics=Object.keys(z.topics).slice(0,2);return z;
 }).sort(function(a,b){return b.priority-a.priority||b.at-a.at;});
}
function entries(db,filter,page){
 var r=db.studyRecords||{sessions:[],questions:{}},out=[];
 r.sessions.forEach(function(s){if(s.legacy)return;(s.answers||[]).forEach(function(a){
   var q=r.questions[a.key];if(!q)return;
   if(filter==="wrong"&&a.given===a.correct)return;
   if(page&&q.bookPage!==page)return;
   out.push({s:s,a:a,q:q});
 });});
 out.sort(function(a,b){return (b.a.at||0)-(a.a.at||0);});return out;
}
function questionHTML(row){
 var q=row.q,a=row.a,ok=a.given===a.correct;
 return '<article class="sr-question '+(ok?"correct":"wrong")+'"><div class="sr-question-head"><span>問題 '+q.id+'　'+esc(q.topic)+'</span><b>'+ (ok?"✓ 正解":"✕ 不正解")+'</b></div>'+
 '<p>'+esc(q.q).replace(/\n/g,"<br>")+'</p><div class="sr-answer-line">あなた <strong>'+esc(a.given)+'</strong>　正答 <strong>'+esc(a.correct)+'</strong></div>'+
 '<details><summary>解説と復習ページを見る</summary><div class="sr-explain"><b>解説</b><p>'+esc(q.why)+'</p><b>ひっかけ</b><p>'+esc(q.trap)+'</p><b>📖 読本の復習先</b><p>'+esc(q.bookPage)+'</p></div></details></article>';
}
function render(db,opts){
 opts=opts||{};ensure(db,null);
 var r=db.studyRecords,tab=opts.tab||"review",out='<div class="sr-wrap"><div class="sr-nav"><button data-act="sr-close">← 戻る</button><span>過去の記録 '+r.sessions.length+'件</span></div>'+
 '<div class="sr-banner"><span>MY STUDY ARCHIVE</span><h2>📚 学習記録室</h2><p>間違えた問題、過去の○×、模試結果と復習ページをいつでも確認。</p></div>';
 var tabs=[["review","📖 復習ページ"],["sessions","🏅 受験記録"],["answers","📝 過去の解答"]];
 out+='<div class="sr-tabs">'+tabs.map(function(t){return '<button class="'+((tab==="detail"?"sessions":tab==="page"?"review":tab)===t[0]?"active":"")+'" data-act="sr-tab" data-tab="'+t[0]+'">'+t[1]+'</button>';}).join("")+'</div>';
 if(tab==="review"||tab==="page"){
  var pgs=revision(db);
  out+='<h3>📖 復習すべきページ（優先順）</h3><p class="sr-intro">間違えた回数と、まだ復習待ちの問題数から順位付けしています。</p>';
  if(!pgs.length)out+='<div class="sr-empty">間違いが記録されると、ここに復習先が表示されます。</div>';
  pgs.forEach(function(p,i){
   out+='<button class="sr-page" data-act="sr-page" data-page="'+encodeURIComponent(p.page)+'"><b>#'+(i+1)+'</b><span><strong>'+esc(p.page)+'</strong><small>'+esc(p.topics.join(" / "))+'</small><small>過去の誤答 '+p.wrong+'件　/　復習待ち '+p.pending+'問</small></span><b>›</b></button>';
  });
  if(tab==="page"){
   out+='<h3>🔎 '+esc(opts.page||"")+' の誤答履歴</h3>';
   entries(db,"wrong",opts.page).slice(0,100).forEach(function(x){out+=questionHTML(x);});
  }
 }else if(tab==="sessions"){
  out+='<h3>🏅 過去の受験・練習履歴</h3><div class="sr-filter"><button data-act="sr-filter" data-filter="all" class="'+(opts.filter!=="exam"?"active":"")+'">すべて</button><button data-act="sr-filter" data-filter="exam" class="'+(opts.filter==="exam"?"active":"")+'">模試のみ</button></div>';
  var ss=r.sessions.filter(function(s){return opts.filter!=="exam"||s.mode==="exam";}).slice().sort(function(a,b){return b.started-a.started;});
  if(!ss.length)out+='<div class="sr-empty">まだ受験記録がありません。</div>';
  ss.forEach(function(s){
   var count=(s.answers||[]).length,score=s.status==="finished"?(s.correct+" / "+s.total+"問"):(count+"問解答済み");
   out+='<button class="sr-session" data-act="sr-detail" data-rid="'+esc(s.id)+'"><span><b>'+esc(label(s))+'</b><small>'+esc(dt(s.started))+'　'+(s.legacy?"旧記録":s.status==="finished"?"完了":"途中保存")+'</small></span><strong>'+score+' ›</strong></button>';
  });
 }else if(tab==="detail"){
  var s=r.sessions.find(function(x){return x.id===opts.rid;});
  out+='<button class="sr-back-small" data-act="sr-tab" data-tab="sessions">← 履歴一覧へ戻る</button>';
  if(!s)out+='<div class="sr-empty">記録が見つかりません。</div>';
  else{
   out+='<h3>'+esc(label(s))+'　'+esc(dt(s.started))+'</h3><div class="sr-score">結果　'+s.correct+' / '+s.total+'問　'+(s.status==="finished"?"完了":"途中")+'</div>';
   if(s.legacy)out+='<div class="sr-legacy">旧バージョンでは「日時・点数」のみ保存されており、当時の個別解答は残っていません。今回からは問題文とあなたの回答を自動保存します。</div>';
   else{
    out+='<div class="sr-filter"><button data-act="sr-detail-filter" data-filter="all" class="'+(opts.filter!=="wrong"?"active":"")+'">全解答</button><button data-act="sr-detail-filter" data-filter="wrong" class="'+(opts.filter==="wrong"?"active":"")+'">不正解だけ</button></div>';
    var rs=(s.answers||[]).filter(function(a){return opts.filter!=="wrong"||a.given!==a.correct;});
    if(!rs.length)out+='<div class="sr-empty">表示する解答はありません。</div>';
    rs.forEach(function(a){var q=r.questions[a.key];if(q)out+=questionHTML({q:q,a:a});});
   }
  }
 }else if(tab==="answers"){
  out+='<h3>📝 解答の履歴</h3><div class="sr-filter"><button data-act="sr-filter" data-filter="all" class="'+(opts.filter!=="wrong"?"active":"")+'">すべて</button><button data-act="sr-filter" data-filter="wrong" class="'+(opts.filter==="wrong"?"active":"")+'">不正解だけ</button></div>';
  var es=entries(db,opts.filter==="wrong"?"wrong":"all"),lim=Number(opts.limit)||40;
  out+='<p class="sr-intro">過去の解答 '+es.length+'件。問題文と当時の○×を保存しています。</p>';
  if(!es.length)out+='<div class="sr-empty">まだ解答がありません。</div>';
  es.slice(0,lim).forEach(function(a){out+=questionHTML(a);});
  if(es.length>lim)out+='<button class="sr-more" data-act="sr-more">さらに40件表示</button>';
 }
 out+='<p class="sr-note">⚠ 読本の復習ページは提供された目次から推定した暫定情報です。本文全ページとの照合は未実施です。</p>'+
 '<div class="sr-maintain"><h3>🗃️ 記録のバックアップとリセット</h3><p>学習データはこのiPhoneのブラウザー内に保存されます。アプリ更新では引き継ぎますが、ブラウザーのデータ消去や機種変更に備えてバックアップしてください。</p>'+
 '<div class="sr-actions"><button data-act="sr-export">⬇️ 記録を書き出す</button><button data-act="sr-import">⬆️ バックアップを復元</button></div>'+
 '<button class="sr-reset" data-act="sr-reset">↺ 最初からやり直す（記録は残す）</button>'+
 '<small>このリセットではコイン・筋肉・進捗のみ初期化し、受験履歴・問題文・回答は保持します。誤操作防止のため確認があります。</small></div></div>';
 return out;
}
function exportFile(db){
 var blob=new Blob([JSON.stringify({type:"ryoju-study-backup",formatVersion:1,exportedAt:new Date().toISOString(),data:db})],{type:"application/json;charset=utf-8"});
 var url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="猟銃考査_学習記録_"+new Date().toISOString().slice(0,10)+".json";a.style.display="none";
 document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},12000);
}
function validateRestore(raw){
 var obj=JSON.parse(raw),d=obj&&obj.type==="ryoju-study-backup"?obj.data:obj;
 if(!d||d.version!==4||!d.seen||!d.miss||!Array.isArray(d.history))throw new Error("このアプリのバックアップではありません。");
 if(d.studyRecords&&(!Array.isArray(d.studyRecords.sessions)||!d.studyRecords.questions||typeof d.studyRecords.questions!=="object"))throw new Error("記録データの形式が正しくありません。");
 return d;
}
function reset(db,questions){
 ensure(db,questions);pause(db,questions);
 var archive=JSON.parse(JSON.stringify(db.studyRecords));archive.cycle++;
 return {version:4,seen:{},miss:{},session:null,history:[],fxXp:0,fxTotalCorrect:0,fxSound:db.fxSound!==false,muscleFx:db.muscleFx!==false,studyRecords:archive};
}
window.StudyRecords={ensure:ensure,attach:attach,onAnswer:onAnswer,finish:finish,pause:pause,render:render,revision:revision,entries:entries,exportFile:exportFile,validateRestore:validateRestore,reset:reset};
})();