/* MUSCLE QUEST v7 | unique mastery-powered bodybuilder. No external dependencies. */
(function(){
"use strict";
var names=[
"ひよっこトレーニー","筋肉の芽生え","ウォームアップ戦士","駆け出しビルダー",
"新米マッチョ","鋼鉄の腕","胸筋ヒーロー","筋肉の守護者","超合金ボディ",
"黄金のビルダー","ハイパー筋肉","神話級ボディ","伝説の筋肉王","宇宙級マッスル","究極の筋肉神"];
var thresholds=[0,8,20,40,65,95,130,170,215,265,320,380,445,515,590];
var lifetimePeak=0,overlayTimer=null,unique=0;
function stats(db){
 var e=db&&db.economy||{},owned=e.mastered||{},cleared=e.cleared||{},m=0,c=0;
 for(var id in owned)if(Object.prototype.hasOwnProperty.call(owned,id)&&owned[id])m++;
 for(var n in cleared)if(Object.prototype.hasOwnProperty.call(cleared,n)&&cleared[n])c++;
 var power=m+25*c,s=0;for(var i=1;i<thresholds.length;i++)if(power>=thresholds[i])s=i;
 var from=thresholds[s],target=s<thresholds.length-1?thresholds[s+1]:thresholds[s],progress=s===thresholds.length-1?100:Math.max(0,Math.min(100,Math.floor((power-from)*100/(target-from))));
 return {stage:s,name:names[s],mastered:m,cleared:c,power:power,next:target,left:Math.max(0,target-power),progress:progress};
}
function stage(db){return stats(db).stage;}
function esc(v){return String(v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]});}
function palette(s){
 return s>=12?["#9d66ff","#28e7e2","#fee48c"]:s>=9?["#ff648b","#f9ba46","#fff18a"]:s>=6?["#f7a832","#ef538b","#fff59c"]:s>=3?["#159d8c","#f2b84c","#d6fff1"]:["#3a95b2","#50d1a4","#c7f6f2"];
}
function avatarSvg(s,pose,mode){
 var serial="mq"+(++unique),str=Math.min(s,14)/14,c=palette(s);
 var sh=49+s*3.1,waist=32+s*1.42,l=180-sh,r=180+sh,wl=180-waist,wr=180+waist;
 var armOuter=104-s*2.3,armMid=70-s*1.1,bicepX=83-s*.8,bicepR=16+s*1.52;
 var upperL=l-4,upperR=r+4,skin="url(#skin-"+serial+")",shine="url(#shine-"+serial+")",shorts="url(#shorts-"+serial+")";
 var abs="";
 if(s>=3){
  for(var j=0;j<(s>=11?4:3);j++){
   var y=232+j*19;
   for(var side=-1;side<=1;side+=2){
    var xx=180+side*(15+s*.23)-11;
    abs+='<rect x="'+xx.toFixed(1)+'" y="'+y+'" width="'+(21+s*.58).toFixed(1)+'" height="14" rx="5" fill="#ab543e" fill-opacity="'+(.13+str*.26).toFixed(2)+'" stroke="#a9543e" stroke-opacity="'+(.16+str*.33).toFixed(2)+'" stroke-width="1.6"/>';
   }
  }
 }
 var veins=s<7?"":'<path d="M '+(armOuter-29)+' 166 q -9 10 -4 22 M '+(360-(armOuter-29))+' 166 q 9 10 4 22" fill="none" stroke="#b85c60" stroke-width="'+(1+str*1.3)+'" stroke-opacity=".43" stroke-linecap="round"/>';
 var shoulderLight=s<4?"":'<ellipse cx="'+(l+4)+'" cy="169" rx="'+(19+s*1.32)+'" ry="'+(22+s*.65)+'" fill="'+shine+'" opacity=".37"/><ellipse cx="'+(r-4)+'" cy="169" rx="'+(19+s*1.32)+'" ry="'+(22+s*.65)+'" fill="'+shine+'" opacity=".37"/>';
 var stars=s<7?"":'<g fill="'+c[2]+'" opacity=".96"><path d="M 39 59 l 6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6Z"/><path d="M 309 70 l 5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5Z"/></g>';
 var crown=s<12?"":'<path d="M 146 63 L 154 40 169 55 180 30 194 55 209 39 217 62Z" fill="#ffd34e" stroke="#824faf" stroke-width="4" stroke-linejoin="round"/><circle cx="180" cy="51" r="5" fill="#fd60aa"/>';
 return '<svg class="muscle-svg pose-'+(pose||'flex')+' '+(mode||'')+'" viewBox="0 0 360 430" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="'+esc(names[s])+'の筋肉キャラクター">'+
 '<defs>'+
 '<linearGradient id="skin-'+serial+'" x1="0" y1="0" x2=".95" y2="1"><stop stop-color="#ffe2ae"/><stop offset=".5" stop-color="'+(s>=8?"#f2b078":"#ffc895")+'"/><stop offset="1" stop-color="#cd7a58"/></linearGradient>'+
 '<radialGradient id="shine-'+serial+'"><stop stop-color="#fffbd5" stop-opacity=".9"/><stop offset="1" stop-color="#fffbd5" stop-opacity="0"/></radialGradient>'+
 '<linearGradient id="shorts-'+serial+'" x1="0" y1="0" x2="1" y2="1"><stop stop-color="'+c[0]+'"/><stop offset="1" stop-color="'+c[1]+'"/></linearGradient>'+
 '<radialGradient id="aura-'+serial+'"><stop stop-color="'+c[2]+'" stop-opacity=".35"/><stop offset=".72" stop-color="'+c[1]+'" stop-opacity=".17"/><stop offset="1" stop-color="'+c[0]+'" stop-opacity="0"/></radialGradient>'+
 '</defs>'+
 '<ellipse cx="180" cy="395" rx="107" ry="17" fill="#172e36" opacity=".16"/>'+
 '<circle class="muscle-aura" cx="180" cy="210" r="162" fill="url(#aura-'+serial+')"/>'+
 stars+
 '<g class="muscle-legs" stroke="#643e44" stroke-width="3" stroke-linejoin="round">'+
 '<path d="M '+(wl-2)+' 292 C '+(wl-16)+' 312 115 338 127 370 L 145 394 L 171 386 Q 171 354 178 301 Z" fill="'+skin+'"/>'+
 '<path d="M '+(wr+2)+' 292 C '+(wr+16)+' 312 245 338 233 370 L 215 394 L 189 386 Q 189 354 182 301 Z" fill="'+skin+'"/>'+
 '<ellipse cx="151" cy="332" rx="'+(16+s*.9)+'" ry="33" fill="#f6b685" opacity=".82"/>'+
 '<ellipse cx="209" cy="332" rx="'+(16+s*.9)+'" ry="33" fill="#f6b685" opacity=".82"/>'+
 '<path d="M 133 370 L 163 366 164 388 Q 169 404 159 408 L 107 408 Q 100 401 108 395Z" fill="#213e51"/>'+
 '<path d="M 227 370 L 197 366 196 388 Q 191 404 201 408 L 253 408 Q 260 401 252 395Z" fill="#213e51"/></g>'+
 '<path d="M 160 105 Q 177 115 199 105 L 205 149 156 149Z" fill="'+skin+'" stroke="#704a49" stroke-width="3"/>'+
 '<g class="muscle-arm muscle-arm-left"><g class="muscle-arm-inner">'+
 '<path d="M '+upperL+' 147 Q '+(armOuter-22)+' 130 '+(armMid-4)+' 150 Q '+(armMid-28)+' 172 '+(armMid-21)+' 190 Q '+(armMid-14)+' 210 '+(armMid+4)+' 203 L '+(armOuter+19)+' 177 Z" fill="'+skin+'" stroke="#764744" stroke-width="4" stroke-linejoin="round"/>'+
 '<path d="M '+(armMid-22)+' 191 Q '+(armMid-36)+' 173 '+(armMid-34)+' 152 L '+(armMid-33)+' 110 Q '+(armMid-29)+' 96 '+(armMid-13)+' 98 Q '+(armMid+3)+' 100 '+(armMid+1)+' 115 L '+(armMid+3)+' 153 Q '+(armMid+8)+' 178 '+(armMid-2)+' 196 Z" fill="'+skin+'" stroke="#764744" stroke-width="4" stroke-linejoin="round"/>'+
 '<ellipse cx="'+bicepX+'" cy="167" rx="'+bicepR.toFixed(1)+'" ry="'+(22+s*.74)+'" fill="#efaa7d" stroke="#b8795d" stroke-width="2.5"/>'+
 '<path d="M '+(bicepX-6)+' 153 Q '+bicepX+' 142 '+(bicepX+9)+' 151" stroke="#ffebbd" stroke-width="3" opacity=".8" fill="none"/>'+
 '<rect x="'+(armMid-35)+'" y="114" width="38" height="12" rx="5" fill="'+c[0]+'" stroke="#473f66" stroke-width="2"/>'+
 '<ellipse cx="'+(armMid-17)+'" cy="104" rx="18" ry="17" fill="'+skin+'" stroke="#764744" stroke-width="3"/>'+
 '</g></g>'+
 '<g class="muscle-arm muscle-arm-right" transform="translate(360 0) scale(-1 1)"><g class="muscle-arm-inner">'+
 '<path d="M '+upperL+' 147 Q '+(armOuter-22)+' 130 '+(armMid-4)+' 150 Q '+(armMid-28)+' 172 '+(armMid-21)+' 190 Q '+(armMid-14)+' 210 '+(armMid+4)+' 203 L '+(armOuter+19)+' 177 Z" fill="'+skin+'" stroke="#764744" stroke-width="4" stroke-linejoin="round"/>'+
 '<path d="M '+(armMid-22)+' 191 Q '+(armMid-36)+' 173 '+(armMid-34)+' 152 L '+(armMid-33)+' 110 Q '+(armMid-29)+' 96 '+(armMid-13)+' 98 Q '+(armMid+3)+' 100 '+(armMid+1)+' 115 L '+(armMid+3)+' 153 Q '+(armMid+8)+' 178 '+(armMid-2)+' 196 Z" fill="'+skin+'" stroke="#764744" stroke-width="4" stroke-linejoin="round"/>'+
 '<ellipse cx="'+bicepX+'" cy="167" rx="'+bicepR.toFixed(1)+'" ry="'+(22+s*.74)+'" fill="#efaa7d" stroke="#b8795d" stroke-width="2.5"/>'+
 '<path d="M '+(bicepX-6)+' 153 Q '+bicepX+' 142 '+(bicepX+9)+' 151" stroke="#ffebbd" stroke-width="3" opacity=".8" fill="none"/>'+
 '<rect x="'+(armMid-35)+'" y="114" width="38" height="12" rx="5" fill="'+c[0]+'" stroke="#473f66" stroke-width="2"/>'+
 '<ellipse cx="'+(armMid-17)+'" cy="104" rx="18" ry="17" fill="'+skin+'" stroke="#764744" stroke-width="3"/>'+
 '</g></g>'+
 '<g class="muscle-torso">'+
 '<path d="M '+l+' 144 Q 180 130 '+r+' 144 Q '+(r+5)+' 179 '+wr+' 277 L '+(wr+5)+' 308 Q 180 323 '+(wl-5)+' 308 L '+wl+' 277 Q '+(l-5)+' 179 '+l+' 144Z" fill="'+skin+'" stroke="#704745" stroke-width="4" stroke-linejoin="round"/>'+
 shoulderLight+
 '<ellipse cx="'+(180-(27+s*.45))+'" cy="192" rx="'+(26+s*1.82)+'" ry="'+(19+s*.7)+'" fill="#f0aa7c" stroke="#c17d5d" stroke-width="'+(1.8+str)+'"/>'+
 '<ellipse cx="'+(180+(27+s*.45))+'" cy="192" rx="'+(26+s*1.82)+'" ry="'+(19+s*.7)+'" fill="#f0aa7c" stroke="#c17d5d" stroke-width="'+(1.8+str)+'"/>'+
 '<path d="M 180 199 L 180 215" stroke="#9d5a4d" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>'+
 '<path d="M '+(l+12)+' 195 Q '+(l+25)+' 219 '+(wl-1)+' 242 M '+(r-12)+' 195 Q '+(r-25)+' 219 '+(wr+1)+' 242" stroke="#b96d52" stroke-width="3" fill="none" opacity=".65"/>'+
 abs+
 '<ellipse cx="180" cy="291" rx="3.6" ry="4.5" fill="#b56a55" opacity=".65"/>'+
 veins+'</g>'+
 '<path d="M '+(wl-8)+' 301 Q 180 312 '+(wr+8)+' 301 L '+(wr+6)+' 336 Q 180 344 '+(wl-6)+' 336Z" fill="'+shorts+'" stroke="#384860" stroke-width="4"/>'+
 '<path d="M '+(wl-8)+' 308 Q 180 320 '+(wr+8)+' 308" stroke="#ffeec5" stroke-width="5" fill="none"/>'+
 '<path d="M 180 316 L 180 341" stroke="#fff" stroke-opacity=".46" stroke-width="2"/>'+
 '<g class="muscle-face">'+crown+
 '<ellipse cx="180" cy="90" rx="30" ry="34" fill="'+skin+'" stroke="#704745" stroke-width="3.5"/>'+
 '<path d="M 150 80 Q 153 50 174 60 Q 178 42 196 58 Q 213 58 210 82 Q 195 67 180 69 Q 167 65 150 80Z" fill="#263e45"/>'+
 '<path d="M 153 74 Q 180 67 207 74" stroke="'+c[0]+'" stroke-width="9" stroke-linecap="round"/>'+
 '<path d="M 167 93 q 4 -4 8 0 M 187 93 q 4 -4 8 0" stroke="#4f3734" stroke-width="3" fill="none" stroke-linecap="round"/>'+
 '<ellipse cx="163" cy="104" rx="5" ry="3" fill="#ee828a" opacity=".65"/><ellipse cx="198" cy="104" rx="5" ry="3" fill="#ee828a" opacity=".65"/>'+
 '<path d="M 169 108 Q 180 119 191 108" stroke="#854248" stroke-width="3.5" fill="none" stroke-linecap="round"/>'+
 '</g></svg>';
}
function characterCard(db,small){
 var a=stats(db),tone=palette(a.stage)[0],total=600;
 if(small)return '<div class="muscle-mini"><div class="muscle-mini-pic">'+avatarSvg(a.stage,"flex","muscle-idle")+'</div><div class="muscle-mini-text"><span class="muscle-overline">YOUR MUSCLE</span><b>💪 筋肉Lv.'+(a.stage+1)+' · '+esc(a.name)+'</b><small>習得 '+a.mastered+'/'+total+' 問　/　完全クリア '+a.cleared+' パック</small></div></div>';
 return '<section class="muscle-home" aria-label="筋肉キャラクター成長"><div class="muscle-home-heading"><span class="muscle-overline">MUSCLE GROWTH QUEST</span><span class="muscle-home-badge">筋肉Lv.'+(a.stage+1)+' / '+names.length+'</span></div>'+
 '<div class="muscle-home-content"><div class="muscle-home-art">'+avatarSvg(a.stage,"flex","muscle-idle")+'</div><div class="muscle-home-info"><h2>💪 '+esc(a.name)+'</h2><p>問題を身につけるたびに、体が強くなる。<br>パックを完全クリアすると特別に成長！</p><div class="muscle-stats"><span><b>'+a.mastered+'</b><small>習得問題数</small></span><span><b>'+a.cleared+'</b><small>完全クリア</small></span><span><b>'+a.power+'</b><small>筋肉パワー</small></span></div><div class="muscle-progress-caption"><b>'+(a.left?'次の進化まであと '+a.left+' パワー':'究極の肉体に到達！')+'</b><span>'+a.progress+'%</span></div><div class="muscle-progress"><span style="width:'+a.progress+'%;background:'+tone+'"></span></div></div></div>'+
 '<div class="muscle-home-footer"><span>✨ 正解するたびにポージング＆画面いっぱいの演出</span><button type="button" data-act="muscle-toggle" aria-pressed="'+(db.muscleFx!==false)+'">'+(db.muscleFx===false?'🎇 巨大演出 OFF':'🎇 巨大演出 ON')+'</button></div></section>';
}
function compact(db){return characterCard(db,true);}
function shouldAnimate(){
 try{return !window.matchMedia || !window.matchMedia("(prefers-reduced-motion: reduce)").matches;}catch(e){return true;}
}
function particle(layer,count){
 var colors=["#ffe27b","#fff","#ff719e","#79ffe4","#b781ff","#ffc163"],w=window.innerWidth||400,h=window.innerHeight||700;
 for(var i=0;i<count;i++){
  var p=document.createElement("i");p.className="mq-particle";var a=Math.random()*Math.PI*2,d=60+Math.random()*Math.min(440,w*.9),x=(w*.5+Math.cos(a)*d),y=(h*.44+Math.sin(a)*d);
  p.style.setProperty("--start-x",(Math.random()*w).toFixed(0)+"px");p.style.setProperty("--start-y",(h*.32+Math.random()*h*.2).toFixed(0)+"px");
  p.style.setProperty("--dx",(x-w*.5).toFixed(0)+"px");p.style.setProperty("--dy",(y-h*.43+90).toFixed(0)+"px");
  p.style.setProperty("--rot",(Math.random()*1080-540).toFixed(0)+"deg");p.style.setProperty("--size",(4+Math.random()*13).toFixed(0)+"px");p.style.setProperty("--bg",colors[i%colors.length]);p.style.setProperty("--delay",(Math.random()*.2).toFixed(2)+"s");
  p.style.setProperty("--life",(1.2+Math.random()*.9).toFixed(2)+"s");
  layer.appendChild(p);
 }
}
function celebrate(db,opt){
 opt=opt||{};if(db&&db.muscleFx===false||!shouldAnimate())return;
 var overlay=document.getElementById("muscle-stage");if(!overlay)return;
 if(overlayTimer)clearTimeout(overlayTimer);overlay.replaceChildren();
 var a=stats(db),streak=opt.streak||1,special=opt.evolved||a.stage>=10,pose=opt.pack?"victory":opt.exam?"power":["flex","victory","power","side"][(Math.max(0,streak-1))%4];
 var combo=Math.max(streak,opt.exam?15:0),isPhone=(window.innerWidth||390)<650,n=Math.min(isPhone?85:155,38+Math.min(50,combo*3)+(special?24:0));
 var splash=document.createElement("div");splash.className="mq-splash mq-tier-"+Math.min(5,Math.floor(a.stage/3)+1)+(special?" mq-evolved":"");
 var text1=opt.pack?"🎁 パック解放！":opt.evolved?"🦍 筋肉進化！":opt.exam?"🏆 模試突破！":combo>=20?"👑 MUSCLE GOD!":combo>=10?"⚡ MEGA FLEX!":combo>=5?"🔥 SUPER FLEX!":"💥 ナイスマッスル！";
 var tag=opt.evolved?"筋肉Lv."+(a.stage+1)+" に覚醒！":opt.pack?"NEW PACK UNLOCKED":combo>=2?combo+" COMBO!":"+1 STRENGTH!";
 splash.innerHTML='<div class="mq-rays"></div><div class="mq-halo"></div><div class="mq-shock-ring"></div><div class="mq-splash-content"><div class="mq-splash-head"><strong>'+esc(text1)+'</strong><span>'+esc(tag)+'</span></div><div class="mq-splash-body">'+avatarSvg(a.stage,pose,"muscle-burst")+'</div><div class="mq-splash-bottom">💪 '+esc(a.name)+'　｜　'+a.mastered+' 問習得 <small>'+a.cleared+' パック完全クリア</small></div></div>';
 overlay.appendChild(splash);particle(splash,n);
 overlayTimer=setTimeout(function(){if(overlay)overlay.replaceChildren();},2750);
}
window.Muscle={stats:stats,stage:stage,avatarSvg:avatarSvg,home:function(db){return characterCard(db,false);},compact:compact,celebrate:celebrate};
})();