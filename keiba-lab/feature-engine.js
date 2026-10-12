/* Feature engineering for pre-race data. Transparent heuristics, not trained ratings. */
'use strict';
window.KEIBA_FEATURES=(()=>{
 const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
 const n=v=>(v===null||v===undefined||v==='')?null:(Number.isFinite(Number(v))?Number(v):null);
 const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
 const shrink=(signal,sample,prior=50,k=3)=>signal===null?null:clamp((signal*sample+prior*k)/(sample+k));
 function runsBefore(h,race){
  const cutoff=String(race.date||'');
  return (Array.isArray(h.pastRuns)?h.pastRuns:[])
   .filter(p=>p&&typeof p.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(p.date)&&p.date<cutoff&&n(p.finish)>0&&n(p.fieldSize)>1&&n(p.finish)<=n(p.fieldSize))
   .sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
 }
 function quality(p){
  const f=n(p.finish),field=n(p.fieldSize);
  const rank=100*(field-f)/(field-1);
  const si=n(p.speedIndex);
  return clamp(si!==null?rank*.75+clamp(si)*.25:rank);
 }
 function subsetScore(past,filter){
  const subset=past.filter(filter).slice(0,8);
  return shrink(mean(subset.map(quality)),subset.length);
 }
 function rate(stats){
  if(!stats||n(stats.starts)===null||n(stats.wins)===null||n(stats.starts)<0||n(stats.wins)<0||n(stats.wins)>n(stats.starts))return null;
  const starts=n(stats.starts),wins=n(stats.wins);
  const smoothed=(wins+2.2)/(starts+20);
  return clamp(50+125*(smoothed-.11));
 }
 function build(h,race){
  const past=runsBefore(h,race), f={};
  if(past.length){
   let w=0,weighted=0;
   past.slice(0,5).forEach((p,i)=>{const ww=Math.pow(.78,i);weighted+=quality(p)*ww;w+=ww});
   f.form=shrink(weighted/w,past.length,50,1.5);
   f.course=subsetScore(past,p=>p.course===race.course&&(!p.surface||p.surface===race.surface));
   const relevant=past.filter(p=>n(p.distance)!==null&&Math.abs(n(p.distance)-n(race.distance))<=350&&(!p.surface||p.surface===race.surface));
   f.distance=shrink(mean(relevant.map(p=>quality(p)*Math.exp(-Math.abs(n(p.distance)-n(race.distance))/700))),relevant.length);
   f.going=subsetScore(past,p=>p.going===race.going&&(!p.surface||p.surface===race.surface));
   const rest=(Date.parse(race.date+'T00:00:00Z')-Date.parse(past[0].date+'T00:00:00Z'))/86400000;
   if(rest>=0) f.layoff=rest<10?39:rest<20?48:rest<56?56:rest<120?51:44;
   if(n(race.classGrade)!==null){
    const rel=past.filter(p=>n(p.classGrade)!==null);
    if(rel.length){
     const score=mean(rel.map(p=>quality(p)+clamp((n(p.classGrade)-n(race.classGrade))*5,-15,15)));
     f.class=shrink(score,rel.length);
    }
   }
  }
  if(h.style&&race.pace){
   const settings={'ハイ':{'逃げ':35,'先行':48,'差し':68,'追込':73},'ミドル':{'逃げ':54,'先行':58,'差し':57,'追込':55},'スロー':{'逃げ':72,'先行':66,'差し':49,'追込':39}};
   if(settings[race.pace]?.[h.style]!==undefined)f.pace=settings[race.pace][h.style];
  }
  const pedigree=rate(h.pedigreeStats);if(pedigree!==null)f.bloodline=pedigree;
  const jockey=rate(h.jockeyStats);if(jockey!==null)f.jockey=jockey;
  const trainer=rate(h.trainerStats);if(trainer!==null)f.trainer=trainer;
  if(n(h.trainingScore)!==null)f.training=clamp(n(h.trainingScore));
  const inside=race.trackBias&&n(race.trackBias.inside)!==null?n(race.trackBias.inside):null;
  const outside=race.trackBias&&n(race.trackBias.outside)!==null?n(race.trackBias.outside):null;
  const draw=n(h.draw);
  if(draw!==null&&(inside!==null||outside!==null)){const insideDraw=draw<=4;const adjustment=insideDraw?(inside??0):(outside??0);f.gate=clamp(50+clamp(adjustment,-30,30));}
  if(n(h.weight)!==null&&n(h.weight)>0){
   const average=mean(race.horses.map(x=>n(x.weight)).filter(x=>x!==null&&x>0));
   if(average!==null)f.weight=clamp(50+(average-n(h.weight))*3,35,65);
  }
  return {factors:Object.fromEntries(Object.entries(f).filter(([k,v])=>v!==null&&Number.isFinite(v)).map(([k,v])=>[k,Math.round(v)])),runsUsed:past.length};
 }
 function enrichRace(race){
  return {...race,horses:race.horses.map(h=>{
   const derived=build(h,race);
   return {...h,factors:{...derived.factors,...(h.factors||{})},derivedFromRuns:derived.runsUsed};
  })};
 }
 return {build,enrichRace,runsBefore,quality};
})();