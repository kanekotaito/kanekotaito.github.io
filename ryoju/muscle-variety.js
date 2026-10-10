/* MUSCLE FX COLLECTION v8: a no-repeat deck of evolving, full-screen pose effects. */
(function(){
"use strict";
if(!window.Muscle)return;
var M=window.Muscle,timeoutId=null;
var THEMES=[
{id:"pulse",at:0,icon:"💥",name:"マッスル衝撃波",title:"💥 POWER IMPACT!",sub:"衝撃波が全身から炸裂！",pose:"power",glyph:"✦"},
{id:"festival",at:0,icon:"🎊",name:"祝祭マッチョ",title:"🎊 PARTY FLEX!",sub:"紙吹雪の筋肉カーニバル！",pose:"victory",glyph:"◆"},
{id:"thunder",at:0,icon:"⚡",name:"稲妻バルク",title:"⚡ THUNDER MUSCLE!",sub:"雷鳴とともにダブルバイセップス！",pose:"double",glyph:"ϟ"},
{id:"comet",at:0,icon:"☄️",name:"彗星の筋圧",title:"☄️ COMET SMASH!",sub:"流星が降り注ぐ超重量ポーズ！",pose:"side",glyph:"✧"},
{id:"volcano",at:12,icon:"🌋",name:"マグマ覚醒",title:"🌋 VOLCANO FLEX!",sub:"熱すぎる筋肉が噴火した！",pose:"crab",glyph:"✷"},
{id:"neon",at:30,icon:"🪩",name:"ネオン・マッチョ",title:"🪩 DISCO POWER!",sub:"虹色の筋肉ステージへ！",pose:"disco",glyph:"✦"},
{id:"ocean",at:60,icon:"🌊",name:"大海原の筋波",title:"🌊 TSUNAMI POSE!",sub:"筋肉の波が世界を揺らす！",pose:"power",glyph:"◈"},
{id:"blossom",at:90,icon:"🌸",name:"桜吹雪ビルダー",title:"🌸 SAKURA FLEX!",sub:"桜の花びらと決めポーズ！",pose:"salute",glyph:"❀"},
{id:"glacier",at:130,icon:"❄️",name:"氷結マッスル",title:"❄️ FROST BICEPS!",sub:"筋肉でブリザードを呼ぶ！",pose:"double",glyph:"❄"},
{id:"laser",at:180,icon:"🟢",name:"レーザー・ポーザー",title:"🟢 LASER BLAST!",sub:"ビームの中心に立つ筋肉！",pose:"disco",glyph:"✳"},
{id:"gold",at:240,icon:"🏆",name:"黄金の筋肉王",title:"🏆 GOLDEN FLEX!",sub:"全身が黄金の輝きを放つ！",pose:"crown",glyph:"✶"},
{id:"galaxy",at:320,icon:"🌌",name:"銀河ボディ",title:"🌌 GALAXY MUSCLE!",sub:"銀河を背負う究極のポーズ！",pose:"crab",glyph:"✹"},
{id:"supernova",at:430,icon:"🌠",name:"超新星マッチョ",title:"🌠 SUPERNOVA!",sub:"超新星の爆発を超える筋圧！",pose:"power",glyph:"✺"},
{id:"celestial",at:550,icon:"👑",name:"宇宙の筋肉神",title:"👑 COSMIC BODY GOD!",sub:"最終奥義・神々のマッチョ！",pose:"crown",glyph:"✷"}
];
var SPECIAL={
pack:{id:"treasure",icon:"🎁",name:"問題パック解放",title:"🎁 50問ゲット！",sub:"筋トレの次なるステージへ！",pose:"victory",glyph:"★"},
exam:{id:"champion",icon:"🏅",name:"模試突破",title:"🏅 EXAM CHAMPION!",sub:"本番で鍛えた成果が輝いた！",pose:"crown",glyph:"✶"}
};
function motionOn(db){if(db&&db.muscleFx===false)return false;try{if(window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches)return false;}catch(e){}return true;}
function pool(db){var p=M.stats(db).power;return THEMES.filter(function(t){return t.at<=p;});}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=a[i];a[i]=a[j];a[j]=t;}return a;}
function plan(db,opt){
 opt=opt||{};if(!motionOn(db))return null;
 if(opt.pack)return {theme:SPECIAL.pack,unlock:false,special:"pack"};
 if(opt.exam)return {theme:SPECIAL.exam,unlock:false,special:"exam"};
 var unlocked=pool(db),key=unlocked.map(function(x){return x.id;}).join("|");
 var prior=db.muscleThemeKey||"",unlock=!!prior&&prior!==key;
 var deck=Array.isArray(db.muscleThemeDeck)?db.muscleThemeDeck.slice():[];
 var expected=unlocked.map(function(x){return x.id;});
 if(prior!==key||!deck.length||deck.some(function(id){return expected.indexOf(id)===-1;})){
  deck=shuffle(expected.slice());
  if(unlock){
   var fresh=unlocked.filter(function(x){return prior.split("|").indexOf(x.id)===-1;});
   if(fresh.length){deck=deck.filter(function(id){return id!==fresh[0].id;});deck.unshift(fresh[0].id);}
  }
 }
 if(deck.length>1&&deck[0]===db.muscleLastTheme){
  var j=deck.findIndex(function(id){return id!==db.muscleLastTheme;});
  if(j>0){var t=deck[0];deck[0]=deck[j];deck[j]=t;}
 }
 var id=deck.shift(),t=unlocked.filter(function(x){return x.id===id;})[0]||unlocked[0];
 db.muscleLastTheme=t.id;db.muscleThemeKey=key;db.muscleThemeDeck=deck;
 db.muscleEffectsSeen=(Number(db.muscleEffectsSeen)||0)+1;
 return {theme:t,unlock:unlock&&prior.split("|").indexOf(t.id)===-1,special:false};
}
function escapeHtml(s){return String(s).replace(/[&<>"]/g,function(x){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[x]});}
function collection(db){
 var current=pool(db),next=THEMES.filter(function(t){return t.at>M.stats(db).power;})[0],info=M.stats(db);
 var items=THEMES.map(function(t){return t.at<=info.power?'<span title="'+escapeHtml(t.name)+'">'+escapeHtml(t.icon)+'</span>':'<span class="mqv-missing" title="未解放">◌</span>';}).join("");
 return '<section class="mqv-collection"><div class="mqv-collection-title"><div><span>THE FLEX COLLECTION</span><h3>🎆 正解エフェクト図鑑</h3></div><b>'+current.length+' / '+THEMES.length+' 解放</b></div><div class="mqv-collection-icons">'+items+'</div><p>'+(
   next?'あと <b>'+(next.at-info.power)+'</b> 筋肉パワーで <b>'+escapeHtml(next.icon+' '+next.name)+'</b> が解放！':'🏆 全14種類解放！ 毎回ポーズと背景が入れ替わるよ。')+
 '</p><small>習得した問題とパック完全クリアで新演出を獲得。同じ演出が連続しないように循環します。</small></section>';
}
function pieces(parent,theme,amount){
 var shapes=["star","circle","petal","line","bolt","square"],kind=
  theme.id==="blossom"?"petal":theme.id==="thunder"?"bolt":theme.id==="neon"?"line":theme.id==="laser"?"line":theme.id==="ocean"?"circle":theme.id==="galaxy"?"star":theme.id==="glacier"?"star":null;
 var w=window.innerWidth||390,h=window.innerHeight||800,colors=["#ffe680","#ff75c3","#7ffde7","#fffbf1","#9b96ff","#ffc05c"];
 for(var i=0;i<amount;i++){
  var p=document.createElement("i"),shape=kind||shapes[i%shapes.length];
  p.className="mqv-piece mqv-"+shape;
  var x=w*(.08+Math.random()*.84),y=h*(.15+Math.random()*.63),angle=Math.random()*Math.PI*2,d=55+Math.random()*Math.min(w*.85,450),sz=4+Math.random()*(theme.id==="blossom"?17:13);
  p.style.setProperty("--x",x.toFixed(0)+"px");p.style.setProperty("--y",y.toFixed(0)+"px");
  p.style.setProperty("--dx",(Math.cos(angle)*d).toFixed(0)+"px");p.style.setProperty("--dy",(Math.sin(angle)*d+50).toFixed(0)+"px");
  p.style.setProperty("--rotate",(Math.random()*1000-500).toFixed(0)+"deg");
  p.style.setProperty("--sz",sz.toFixed(0)+"px");
  p.style.setProperty("--hue",colors[i%colors.length]);p.style.setProperty("--delay",(Math.random()*.28).toFixed(2)+"s");
  p.style.setProperty("--duration",(1+Math.random()*1.3).toFixed(2)+"s");
  if(shape==="star"||shape==="bolt"||shape==="petal"){p.textContent=shape==="petal"?"🌸":shape==="bolt"?"⚡":theme.glyph;}
  parent.appendChild(p);
 }
}
function markCombo(n){return [3,5,10,15,20,30,50,75,100,150,200].indexOf(n)>=0;}
function render(db,opt){
 opt=opt||{};if(!motionOn(db))return;
 var overlay=document.getElementById("muscle-stage");if(!overlay)return;
 if(timeoutId)clearTimeout(timeoutId);overlay.replaceChildren();
 var chosen=opt.plan||plan(db,opt);if(!chosen)return;
 var theme=chosen.theme,stat=M.stats(db),combo=Number(opt.streak)||0,levelup=!!opt.evolved,major=markCombo(combo)||levelup||!!opt.pack||!!opt.exam;
 var n=Math.min((window.innerWidth||390)<700?105:170,26+Math.min(52,combo*3)+(major?27:0)+(stat.stage>=8?16:0)),duration=major?3000:2250;
 var splash=document.createElement("section");
 splash.className="mqv-splash mqv-theme-"+theme.id+(major?" mqv-big":"")+(chosen.unlock?" mqv-first-unlock":"");
 splash.setAttribute("aria-hidden","true");
 var announcement=levelup?"🦍 筋肉が進化した！":chosen.unlock?"🔓 新演出ゲット！":major&&combo>=5?combo+" COMBO!!":theme.title;
 var detail=(levelup?"筋肉Lv."+(stat.stage+1)+" に覚醒！":theme.sub);
 var copy='<div class="mqv-world"><div class="mqv-beams"></div><div class="mqv-pulse-ring"></div><div class="mqv-emblem mqv-emblem-a">'+escapeHtml(theme.icon)+'</div><div class="mqv-emblem mqv-emblem-b">'+escapeHtml(theme.glyph)+'</div></div>'+
 '<div class="mqv-stage-content"><div class="mqv-label">'+escapeHtml(theme.name)+'　·　'+(db.muscleEffectsSeen||"BONUS")+'th FLEX</div>'+
 '<div class="mqv-headline">'+escapeHtml(announcement)+'</div><div class="mqv-caption">'+escapeHtml(detail)+'</div>'+
 '<div class="mqv-hero">'+M.avatarSvg(stat.stage,theme.pose,"mqv-avatar")+'</div>'+
 '<div class="mqv-footer"><strong>'+escapeHtml(theme.title)+'</strong><span>💪 '+stat.mastered+' 問習得'+(combo?'　🔥 '+combo+'連続正解':'')+'</span></div></div>';
 splash.innerHTML=copy;overlay.appendChild(splash);pieces(splash,theme,n);
 // Keep the screen spectacular without blocking the next answer button.
 timeoutId=setTimeout(function(){if(overlay)overlay.replaceChildren();},duration);
}
M.plan=plan;M.celebrate=render;M.collection=collection;M.themeCatalog=THEMES.map(function(t){return {id:t.id,requiredPower:t.at,name:t.name};});
})();
