/* No external packages necessary. Run: node keiba-lab/tests/smoke.test.cjs */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
const listeners={};
const makeEl=()=>({innerHTML:'',textContent:'',value:'',classList:{add(){},remove(){},toggle(){}},addEventListener(evt,fn){this.listeners??={};this.listeners[evt]=fn},setAttribute(){},closest(){return this}});
const elements=new Map();
const doc={querySelector(s){if(!elements.has(s))elements.set(s,makeEl());return elements.get(s)},querySelectorAll(){return []},createElement(){return makeEl()},body:{appendChild(){}}};
const state={};
const storage={getItem(k){return state[k]||null},setItem(k,v){state[k]=v}};
const win={scrollTo(){}};
const ctx=vm.createContext({document:doc,window:win,localStorage:storage,setTimeout(){return 0},clearTimeout(){},Date,Intl,Math,JSON,URL,Blob,console,confirm(){return true}});
for(const file of ['feature-engine.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx,{filename:file});
const a=win.KEIBA_LAB_TEST;
const f=win.KEIBA_FEATURES;
assert(a,'app did not initialize');
assert(f,'feature engine did not initialize');
assert.equal(a.DEMO.length,12);
assert.equal(a.DEMO.filter(x=>x.result).length,10);
assert(a.DEMO.every(x=>a.validateRace(x)));
const sample=a.calculate(a.DEMO[0],a.normalizeWeights([22,12,11,10,8,8,6,5,5,3,2,6,2,0]),3000);
assert(Math.abs(sample.rows.reduce((s,x)=>s+x.win,0)-1)<1e-10,'win probabilities should sum to 1');
assert(Math.abs(sample.rows.reduce((s,x)=>s+x.top3,0)-3)<1e-10,'top-three probabilities should sum to 3');
assert(sample.rows.every(x=>x.win>=0&&x.win<=1&&x.top3>=0&&x.top3<=1));
assert.equal(a.validateRace(a.convertCsv(a.csvTemplate())[0]),true,'CSV sample should roundtrip');
const race=JSON.parse(JSON.stringify(a.DEMO[10]));
race.asOf='2026-10-12T10:00:00+09:00';
race.horses[0].pastRuns=[
 {date:'2026-10-10',finish:1,fieldSize:12,course:race.course,surface:race.surface,distance:race.distance,going:race.going},
 {date:'2026-10-14',finish:2,fieldSize:12,course:race.course,surface:race.surface,distance:race.distance,going:race.going},
 {date:'2026-10-18',finish:1,fieldSize:12,course:race.course,surface:race.surface,distance:race.distance,going:race.going}
];
const prior=f.runsBefore(race.horses[0],race);
assert.equal(prior.length,1,'must exclude day-of and future runs');
assert.equal(f.enrichRace(race).horses.length,race.horses.length);
assert(a.metrics(sample,a.DEMO[0]).logloss>0);
console.log('KEIBA LAB smoke tests passed: startup, 12 synthetic races, probabilities, CSV, prior-only features, evaluation.');