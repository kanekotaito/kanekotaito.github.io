/* Motivation Quest v13
 * Short, purposeful study loops. Transparent, fixed rewards rather than endless
 * feeds, artificial scarcity or punishment for taking a break.
 * All progress is saved in the existing localStorage DB; does not reset prior records.
 */
(function(){
"use strict";
var QUESTS=[
 {id:"start",name:"点火の1問",icon:"⚡",field:"answered",target:1,xp:15,detail:"まず1問だけ解く"},
 {id:"learn",name:"新たな筋肉",icon:"💪",field:"learned",target:1,xp:25,detail:"未習得の問題を1問身につける"},
 {id:"triple",name:"3つの勝利",icon:"🔥",field:"correct",target:3,xp:35,detail:"正解を3つ集める"},
 {id:"revenge",name:"リベンジ達成",icon:"🎯",field:"fixed",target:1,xp:35,detail:"間違えた問題を解き直す"},
 {id:"daily",name:"今日のゴール",icon:"🏆",field:"answered",target:null,xp:50,detail:"今日の目標に到達"}
];
var MEDALS=[
 {at:1,icon:"🌱",name:"最初の一歩"},
 {at:5,icon:"💪",name:"筋肉の予感"},
 {at:15,icon:"🔥",name:"鍛錬の始まり"},
 {at:40,icon:"🛡️",name:"安全マスターへの道"},
 {at:100,icon:"🥇",name:"百問の壁"},
 {at:200,icon:"🏋️",name:"知識のビルダー"},
 {at:400,icon:"👑",name:"伝説の候補生"},
 {at:600,icon:"🌌",name:"全問マスター"}
];
function dayKey(d){d=d||new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function dayReset(m,day){
 m.day=day;m.answered=0;m.correct=0;m.learned=0;m.fixed=0;
 m.dayAnswered={};m.dayCorrect={};m.dayLearned={};m.dayFixed={};m.claimed={};
}
function ensure(db,day){
 if(!db.motivation||db.motivation.version!==1){
   db.motivation={version:1,goal:5,day:"",totalDailyWins:0,totalQuestWins:0,visitDates:{},answered:0,correct:0,learned:0,fixed:0,dayAnswered:{},dayCorrect:{},dayLearned:{},dayFixed:{},claimed:{}};
 }
 var m=db.motivation,k=day||dayKey();
 if(m.day!==k)dayReset(m,k);
 if(![3,5,10].includes(m.goal))m.goal=5;
 if(!m.visitDates||typeof m.visitDates!=="object")m.visitDates={};
 m.visitDates[k]=true;
 return m;
}
function target(q,m){return q.target||m.goal;}
function values(m){return {answered:m.answered,correct:m.correct,learned:m.learned,fixed:m.fixed};}
function questStats(db){
 var m=ensure(db);
 return QUESTS.map(function(q){var t=target(q,m),v=Number(m[q.field])||0;return {id:q.id,name:q.name,icon:q.icon,xp:q.xp,detail:q.detail,target:t,value:Math.min(t,v),done:!!m.claimed[q.id],percent:Math.min(100,Math.round(v/t*100))};});
}
function record(db,params){
 params=params||{};
 var m=ensure(db),id=String(params.id||"");if(!id)return {newAwards:[],answered:false};
 var answeredNew=!m.dayAnswered[id],correctNew=!!params.correct&&!m.dayCorrect[id],fixedNew=!!params.correct&&!!params.wasWrong&&!m.dayFixed[id],
 learnedNew=!!params.correct&&!!params.newMastered&&!m.dayLearned[id];
 if(answeredNew){m.dayAnswered[id]=true;m.answered++;}
 if(correctNew){m.dayCorrect[id]=true;m.correct++;}
 if(learnedNew){m.dayLearned[id]=true;m.learned++;}
 if(fixedNew){m.dayFixed[id]=true;m.fixed++;}
 var newAwards=[];
 for(var i=0;i<QUESTS.length;i++){
   var q=QUESTS[i];
   if(!m.claimed[q.id]&&m[q.field]>=target(q,m)){
     m.claimed[q.id]=true;newAwards.push(q);
     m.totalQuestWins++;db.fxXp=(Number(db.fxXp)||0)+q.xp;
     if(q.id==="daily")m.totalDailyWins++;
   }
 }
 return {newAwards:newAwards,answered:answeredNew,correct:correctNew,fixed:fixedNew,learned:learnedNew};
}
function escapeHtml(x){return String(x).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]});}
function medals(db){
 var mastered=db&&db.economy&&db.economy.mastered||{},c=Object.keys(mastered).filter(function(k){return !!mastered[k];}).length;
 return MEDALS.map(function(x){return {at:x.at,name:x.name,icon:x.icon,earned:c>=x.at};});
}
function home(db){
 var m=ensure(db),progress=Math.min(100,Math.round(100*m.answered/m.goal)),completed=m.answered>=m.goal;
 var html='<section class="mot-hero" aria-label="今日の3問チャレンジ"><div class="mot-tag"><span>DAILY QUEST</span><span class="mot-day">'+escapeHtml(m.day)+'</span></div>'+
 '<div class="mot-hero-main"><div><h2>'+(completed?'🏆 今日の目標クリア！':'⚡ まずは3問だけ！')+'</h2><p>'+(completed?'今日の成果は残っています。続けるか、ここで終えるかは自由。':'数分だけ挑戦。マッチョも勉強も、始めると動き出す。')+'</p></div><div class="mot-ring" style="--mot-progress:'+progress+'%"><div><strong>'+Math.min(m.answered,m.goal)+'</strong><small>/ '+m.goal+'問</small></div></div></div>'+
 '<div class="mot-track"><div class="mot-track-progress" style="width:'+progress+'%"></div></div><div class="mot-start-actions">'+
 '<button class="mot-main-btn" type="button" data-act="start" data-mode="sprint">▶ 3問クエスト開始 <span>（短時間）</span></button>'+
 '<button class="mot-review-btn" type="button" data-act="start" data-mode="focus">🎯 おまかせ5問特訓</button></div>'+
 '<div class="mot-goal-chooser"><span>今日の目標</span>'+
 [3,5,10].map(function(n){return '<button type="button" data-act="mot-goal" data-goal="'+n+'" aria-pressed="'+(m.goal===n)+'" class="'+(m.goal===n?'active':'')+'">'+n+'問</button>';}).join('')+'</div></section>';
 html+='<section class="mot-quests"><div class="mot-section-head"><h3>🎖️ 今日のミッション</h3><span>5つの小さな達成</span></div><div class="mot-quests-grid">';
 questStats(db).forEach(function(q){
  html+='<div class="mot-quest '+(q.done?'mot-complete':'')+'"><div class="mot-quest-icon">'+q.icon+'</div><div class="mot-quest-copy"><strong>'+escapeHtml(q.name)+'</strong><span>'+escapeHtml(q.detail)+'</span><div class="mot-quest-meter"><span style="width:'+q.percent+'%"></span></div></div><div class="mot-quest-end">'+(q.done?'✓ GET':q.value+'/'+q.target)+'<small>+'+q.xp+' XP</small></div></div>';
 });
 html+='</div></section>';
 var badgeList=medals(db),total=badgeList.filter(function(x){return x.earned;}).length,next=badgeList.find(function(x){return !x.earned;});
 html+='<section class="mot-collection"><div class="mot-section-head"><h3>🏅 成長の勲章</h3><span>'+total+'/'+badgeList.length+' 獲得</span></div>'+
 '<div class="mot-badges">'+badgeList.map(function(x){return '<div class="mot-medal '+(x.earned?'have':'locked')+'" title="'+escapeHtml(x.name)+'">'+(x.earned?x.icon:'🔒')+'</div>';}).join('')+'</div><p>'+(next?'次の勲章「'+escapeHtml(next.name)+'」まで、あと '+Math.max(0,next.at-(db.economy?Object.keys(db.economy.mastered||{}).filter(function(id){return db.economy.mastered[id];}).length:0))+' 問習得':'すべての勲章を獲得！')+'</p>'+
 '<small>休んでも勲章は消えません。未達成のミッションも、翌日また挑戦できます。</small></section>';
 return html;
}
function quiz(db,s){
 if(!s||s.mode==="exam")return "";
 var m=ensure(db),pct=Math.round(100*Math.min(m.answered,m.goal)/m.goal);
 var current=Number(s.index)+1,total=s.order.length;
 return '<div class="mot-quiz-strip"><span>💪 今日 '+m.answered+'/'+m.goal+' 問</span><strong>'+(s.mode==="sprint"?'⚡ 3問クエスト':s.mode==="focus"?'🎯 5問特訓':'🎖️ マッチョ特訓')+'</strong><span>あと '+Math.max(0,total-current)+' 問</span><div class="mot-quiz-line"><span style="width:'+pct+'%"></span></div></div>';
}
function feedback(out){
 if(!out)return "";
 var a=out.newAwards||[],positive=[];
 if(out.learned)positive.push("新しい問題を習得！");
 if(out.fixed)positive.push("間違いを克服！");
 if(!a.length&&!positive.length)return "";
 return '<div class="mot-answer-quests" role="status">'+(positive.length?'<strong>💎 '+positive.join(" ")+'</strong>':'')+
 a.map(function(q){return '<div class="mot-award"><span>'+q.icon+' '+escapeHtml(q.name)+' 達成</span><b>+'+q.xp+' XP</b></div>';}).join('')+
 '</div>';
}
function result(db,s){
 var m=ensure(db);
 return '<div class="mot-result"><h3>💪 今日はここまででも大成功！</h3><p>今日の進捗 '+m.answered+' 問 · 新たに習得 '+m.learned+' 問 · 復習クリア '+m.fixed+' 問</p>'+
 '<div class="mot-result-actions"><button data-act="start" data-mode="sprint">⚡ 次の3問</button><button class="mot-stop" data-act="home">🏡 今日はここで終える</button></div></div>';
}
function spark(out){
 if(!out||!out.newAwards||!out.newAwards.length)return;
 var node=document.getElementById("mot-spark");if(!node)return;
 node.replaceChildren();
 var a=out.newAwards;
 var elem=document.createElement("div");elem.className="mot-spark-content";
 elem.textContent=(a.length>1?"🏆 "+a.length+"ミッション達成！":a[0].icon+" "+a[0].name+" 達成！")+
   "　+"+a.reduce(function(n,q){return n+q.xp;},0)+" XP";
 node.appendChild(elem);
 if(node._motClear)clearTimeout(node._motClear);
 node._motClear=setTimeout(function(){if(node)node.replaceChildren();},1600);
}
window.Motivation={ensure:ensure,record:record,questStats:questStats,medals:medals,home:home,quiz:quiz,feedback:feedback,result:result,spark:spark,dayKey:dayKey};
})();