/* KEIBA LAB v1.0
 * local-first horse racing hypothesis testing tool.
 * Synthetic examples are never represented as licensed official results.
 * Forecasts are heuristics, not statistically calibrated probabilities.
 */
'use strict';
(() => {
const $ = (s,root=document) => root.querySelector(s);
const $$ = (s,root=document) => Array.from(root.querySelectorAll(s));
const KEY='keiba-lab-state-v1';
const VERSION=1;
const FACTORS=[
 ['form','近走・能力','直近の走破内容・相手関係・上昇度'],
 ['pace','脚質・展開','想定ペースと脚質の相性'],
 ['course','競馬場適性','コース形状・左右回り・直線'],
 ['distance','距離適性','距離帯に対する適性'],
 ['going','馬場適性','良・稍重・重・不良や芝/ダート'],
 ['bloodline','血統','父系・母父系の距離/馬場相性'],
 ['jockey','騎手','騎手の近走傾向とコース条件'],
 ['trainer','厩舎','調整力・レース選択の傾向'],
 ['training','調教・状態','追切、休み明け気配、馬体'],
 ['gate','枠順','コースの枠有利不利、馬番'],
 ['weight','斤量','負担重量と減量・増減'],
 ['class','クラス・相手','同条件での相手レベルと実績'],
 ['layoff','間隔・疲労','休養間隔と連戦の負担'],
 ['market','市場評価','発走前取得の単勝オッズによる市場の見解']
];
const KEYS=FACTORS.map(x=>x[0]);
const PRESETS={
 balanced:{label:'総合バランス',weights:[22,12,11,10,8,8,6,5,5,3,2,6,2,0],desc:'多面的に検討する基準となる仮説。'},
 form:{label:'近走重視',weights:[37,12,10,10,6,2,6,2,6,1,1,6,1,0],desc:'近走の能力評価・展開・クラスを重視。'},
 blood:{label:'血統重視',weights:[10,8,10,10,10,30,5,3,5,1,1,5,2,0],desc:'血統とコース/馬場の相性を重視。'},
 pace:{label:'展開重視',weights:[14,29,10,8,9,4,5,3,8,3,2,4,1,0],desc:'脚質と想定ペースを重く評価。'},
 market:{label:'オッズ重視',weights:[10,4,4,3,2,2,2,1,1,1,0,0,0,70],desc:'発走前オッズを情報の集約値として重視。'},
 custom:{label:'自分の仮説',weights:[],desc:'各指標の重要度を自由に設定。'}
};
const DEMO_SIRES=['ノースウインド','グランシエル','サンライズフォード','アステリア','オーシャンリーフ','ミストファルコン','スカイラグーン','アルバロッサ'];
const DEMO_DAMS=['クリスタルスノー','エターナルリリー','メイプルクレスト','パールシャイン','ステラルージュ','アクアローズ'];
const DEMO_NAMES=['アオバノカゼ','ミナトノホシ','フユノアカツキ','ツキヨノユメ','サクラノトビラ','リュウセイロード','ホシノカケラ','アカネシグナル','ナギサノヒカリ','ハルカゼソング','シロガネムーン','タカラバシ','ユウヒノソラ','ナツノツバサ','コモレビライン','キリノミヤコ','ヒカリノオト','ミドリノキセキ','アサヒノミチ','ワカバステップ','イズミノホノオ','マリンステラ','モリノホタル','カゲロウアーチ','レイメイノツキ','サザナミリズム','アイスブリーズ','ハナノハヤテ'];
const DEMO_JOCKEYS=['山城','藤波','水野','海野','川原','浅倉','西崎','新田','広瀬','岸本','小森','清田'];
const DEMO_TRAINERS=['小宮','若松','西園','多田','柳田','夏目','黒川','武井'];
const COURSES=['東京','中山','京都','阪神','中京','新潟','福島','小倉','札幌','函館'];
const COURSE_DETAILS=['芝 1600m','芝 2000m','芝 2400m','芝 1200m','ダート 1800m','芝 1800m','ダート 1400m'];
const RACE_TITLES=['青葉オータム杯','紅葉ステークス','秋風特別','銀杏記念','菊花オープン','星影ステークス','若葉カップ','月光特別','風鈴ステークス','水晶カップ','実験重賞A','実験オープンB'];
const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(x,d=1)=>Number.isFinite(x)?x.toFixed(d):'—';
const pct=x=>fmt(100*x)+'%';
const clamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
const sum=xs=>xs.reduce((a,b)=>a+b,0);
const avg=xs=>xs.length?sum(xs)/xs.length:0;
const int=x=>Math.round(Number(x)||0);
const safeJson=x=>JSON.parse(JSON.stringify(x));
const prng=seed=>()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
const hash=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0;};
function makeDemo(){
 let result=[];
 for(let r=0;r<12;r++){
  const random=prng(4051+r*997), isFuture=r>=10, dt=new Date(Date.UTC(2026,7,3+r*6));
  const date=isFuture?(r===10?'2026-10-18':'2026-10-25'):dt.toISOString().slice(0,10);
  const course=COURSES[(r*7+2)%COURSES.length], detail=COURSE_DETAILS[(r*3+1)%COURSE_DETAILS.length];
  const [surface,distanceS]=detail.split(' '), distance=Number(distanceS.replace('m',''));
  const going=['良','稍重','良','重'][r%4];
  let horses=[];
  for(let n=1;n<=12;n++){
   const latent=32+random()*40, f={};
   KEYS.filter(k=>k!=='market').forEach((k,i)=>{const noise=(random()-.5)*62;f[k]=int(clamp(latent+noise+(i%3-1)*5,8,96))});
   const oddBase=clamp(25+(latent-50)*.8+(random()-.5)*53,10,95);
   const chance=Math.exp((oddBase-50)/13);
   const odds=Number(clamp(18/chance*(.7+random()*.7),1.4,150).toFixed(1));
   horses.push({id:'d'+r+'-'+n,number:n,name:DEMO_NAMES[(n+4*r)%DEMO_NAMES.length],age:3+int(random()*4),sex:random()>.55?'牡':'牝',jockey:DEMO_JOCKEYS[(n+r)%DEMO_JOCKEYS.length],trainer:DEMO_TRAINERS[(n*3+r)%DEMO_TRAINERS.length],sire:DEMO_SIRES[(n+r*2)%DEMO_SIRES.length],damSire:DEMO_DAMS[(n+r)%DEMO_DAMS.length],draw:Math.ceil(n/2),weight:Math.round((52+random()*6)*2)/2,odds,style:['逃げ','先行','差し','追込'][int(random()*3.99)],form:'前走 '+(1+int(random()*11))+'着 / 近3走 '+int(20+random()*70)+'pt',lastRunDays:10+int(random()*90),factors:f,latent});
  }
  const actual=isFuture?null:horses.map(h=>({id:h.id,perf:h.latent*.77+h.factors.form*.21+h.factors.pace*.12+(random()-.5)*56})).sort((a,b)=>b.perf-a.perf).map(x=>x.id);
  horses.forEach(h=>delete h.latent);
  result.push({id:'demo-'+(r+1),date,name:RACE_TITLES[r]+'（架空）',course,surface,distance,going,weather:['晴','曇','小雨'][r%3],pace:['ハイ','ミドル','スロー'][r%3],start:'15:45',type:'demo',source:'合成データ（実際の競走と無関係）',asOf:date+'T10:00:00+09:00',notes:'全て架空の馬・指数・結果。モデル操作と検証の練習用。',horses,result:actual});
 }
 return result;
}
function restore(){
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');return saved&&typeof saved==='object'?saved:{}}catch{return{}}
}
const persisted=restore(), DEMO=makeDemo();
const state={view:'lab',races:DEMO.concat(Array.isArray(persisted.imported)?persisted.imported.filter(validateRace):[]),records:Array.isArray(persisted.records)?persisted.records:[],preset:PRESETS[persisted.preset]?persisted.preset:'balanced',weights:normalizeWeights(persisted.weights||PRESETS.balanced.weights),raceId:persisted.raceId||DEMO[10].id,selectedId:null,revealed:new Set(),benchScope:'all',benchGroup:'all',benchPeriod:'all',rawDataTab:'csv'};
if(!state.races.some(r=>r.id===state.raceId))state.raceId=DEMO[10].id;
function store(){
 try{localStorage.setItem(KEY,JSON.stringify({v:VERSION,imported:state.races.filter(r=>r.type!=='demo'),records:state.records.slice(-800),preset:state.preset,weights:state.weights,raceId:state.raceId}));return true}catch{toast('容量上限です。JSONを保存してデータを整理してください。');return false}
}
function normalizeWeights(weights){const raw=Array.isArray(weights)?Object.fromEntries(KEYS.map((k,i)=>[k,weights[i]])):weights;return Object.fromEntries(KEYS.map(k=>[k,clamp(Number(raw?.[k]??0),0,100)]))}
function setPreset(name){state.preset=name;state.weights=normalizeWeights(name==='custom'?state.weights:PRESETS[name].weights);store();render();}
function currentRace(){return state.races.find(r=>r.id===state.raceId)||state.races[0]}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),3500)}
function hideOutcome(race){return Boolean(race.result)&&!state.revealed.has(race.id)}
function factorValue(h,k,r){
 if(k!=='market')return Number(h.factors?.[k]??50);
 const odds=h.odds;
 if(!(Number.isFinite(odds)&&odds>1))return 50;
 const sumImp=sum(r.horses.filter(x=>x.odds>1).map(x=>1/x.odds));
 if(sumImp<=0)return 50;
 const implied=1/odds/sumImp;
 return clamp(50+15*Math.log(implied*r.horses.length),5,95);
}
function calculate(race,weights,simCount=1400){
 const all=normalizeWeights(weights);
 if(race.type!=='demo'){
  const shared=KEYS.filter(k=>race.horses.every(h=>k==='market'
   ?(Number.isFinite(h.odds)&&h.odds>1)
   :(Number.isFinite(h.factors?.[k])&&h.factors[k]>=0&&h.factors[k]<=100)));
  KEYS.forEach(k=>{if(!shared.includes(k))all[k]=0});
 }
 const active=KEYS.filter(k=>all[k]>0), wsum=sum(active.map(k=>all[k]))||1;
 const logits=race.horses.map(h=>sum(active.map(k=>((factorValue(h,k,race)-50)*all[k])/wsum))/8);
 const max=Math.max(...logits), raw=logits.map(v=>Math.exp(v-max)), norm=sum(raw), probs=raw.map(v=>v/norm);
 const rng=prng(hash(race.id+'|'+active.map(k=>k+all[k]).join(':'))), win=new Array(probs.length).fill(0), top3=new Array(probs.length).fill(0), rankSum=new Array(probs.length).fill(0);
 for(let i=0;i<simCount;i++){
  const order=logits.map((logit,j)=>({j,v:logit-Math.log(-Math.log(Math.max(1e-10,rng())))})).sort((a,b)=>b.v-a.v);
  order.forEach(({j},pos)=>{rankSum[j]+=pos+1;if(pos===0)win[j]++;if(pos<3)top3[j]++});
 }
 const rows=race.horses.map((h,i)=>({...h,win:probs[i],top3:top3[i]/simCount,expected:rankSum[i]/simCount,score:logits[i]*8,ev:h.odds>1?probs[i]*h.odds:null,features: Object.fromEntries(KEYS.map(k=>[k,factorValue(h,k,race)]))}));
 rows.sort((a,b)=>b.win-a.win);
 return {rows,active:active.length,missing:race.horses.reduce((n,h)=>n+KEYS.filter(k=>k!=='market'&&h.factors?.[k]===undefined&&all[k]>0).length,0)};
}
function actualCoverage(r,weights){
 if(r.type==='demo')return {ready:true,missing:0,shared:KEYS.length};
 const keys=KEYS.filter(k=>Number(weights[k])>0);
 const shared=keys.filter(k=>r.horses.every(h=>k==='market'
   ?(Number.isFinite(h.odds)&&h.odds>1)
   :(Number.isFinite(h.factors?.[k])&&h.factors[k]>=0&&h.factors[k]<=100)));
 return {ready:shared.length>=2,missing:Math.max(0,2-shared.length),shared:shared.length};
}
function byId(r,id){return r.horses.find(h=>h.id===id)}
function intro(title,desc,mark='RESEARCH TERMINAL'){return '<section class="intro"><div><div class="eyebrow">'+escapeHtml(mark)+'</div><h1>'+escapeHtml(title)+'</h1><p>'+escapeHtml(desc)+'</p></div><span class="pill">● LOCAL ANALYSIS</span></section>'}
function card(title,body,extra=''){return '<section class="card"><div class="cardhead"><h3>'+title+'</h3>'+extra+'</div>'+body+'</section>'}
function raceLabel(r){return r.date+' · '+r.course+' '+r.surface+''+r.distance+'m · '+r.name}
function hero(race){
 return '<section class="hero"><div class="hero-row"><div><span class="badge '+(race.type==='demo'?'':'blue')+'">'+(race.type==='demo'?'SYNTHETIC DATA · 架空':'IMPORTED DATA · 取込')+'</span><h2>'+escapeHtml(race.name)+'</h2><p>'+escapeHtml(race.date+'  /  '+race.course+'  /  '+race.surface+' '+race.distance+'m')+'</p></div><span class="pill">'+escapeHtml(race.going)+' 馬場</span></div><div class="herostats"><div class="stat"><label>ENTRIES</label><strong>'+race.horses.length+' 頭</strong></div><div class="stat"><label>PACE</label><strong>'+escapeHtml(race.pace||'未設定')+'</strong></div><div class="stat"><label>TRACK</label><strong>'+escapeHtml(race.going||'未設定')+'</strong></div><div class="stat"><label>DATA SNAPSHOT</label><strong>'+escapeHtml((race.asOf||'未入力').slice(0,16).replace('T',' '))+'</strong></div></div></section>'
}
function renderLab(){
 const r=currentRace(), coverage=actualCoverage(r,state.weights);
 if(!coverage.ready){
  const rows=r.horses.slice().sort((a,b)=>a.number-b.number).map(h=>'<tr><td>'+escapeHtml(h.number)+'</td><td><strong>'+escapeHtml(h.name)+'</strong></td><td>'+escapeHtml(h.sex||'—')+escapeHtml(h.age??'—')+'</td><td>'+escapeHtml(h.jockey||'未取得')+'</td><td>'+escapeHtml(h.trainer||'未取得')+'</td><td>'+escapeHtml(h.odds??'—')+'</td><td>'+escapeHtml(h.pastRuns?.length||0)+'</td></tr>').join('');
  const source=r.sourceUrl&&/^https:\/\/(?:race|db)\.netkeiba\.com\//.test(r.sourceUrl)?'<p class="hint">出典: <a href="'+escapeHtml(r.sourceUrl)+'" target="_blank" rel="noopener noreferrer">netkeiba出馬表</a> / 取得: '+escapeHtml(r.asOf||'不明')+'</p>':'';
  const message='<div class="notice"><strong>実データの予測は保留中です。</strong><p>全'+r.horses.length+'頭に共通して取得できた分析項目は '+coverage.shared+'種類です。最低2種類必要です。馬ごとに異なる欠損を架空の評価値で埋め、正しい勝率のように表示することはしません。</p></div>';
  const table='<div class="tablewrap"><table class="smalltable"><thead><tr><th>馬番</th><th>馬名</th><th>性齢</th><th>騎手</th><th>厩舎</th><th>単勝</th><th>過去走</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+source;
  return intro('実データを、正しく扱う。','取得できた事実だけを表示します。勝率の根拠が不足している間は数値予測を保留します。','REAL RACE DATA / NO GUESSED SCORES')+hero(r)+message+'<div class="spaced">'+card('実際の出走情報',table)+'</div><div class="spaced">'+card('次に必要なこと','<p class="paneltext">過去走や許諾済みの適性データをJSONに追加すると、分析を進められます。<a href="https://github.com/kanekotaito/kanekotaito.github.io/blob/main/keiba-lab/tools/NETKEIBA.md" target="_blank" rel="noopener noreferrer">netkeiba取込ツールの使い方 ↗</a></p><button class="button alt" data-goto="data">データ管理へ</button>')+'</div>';
 }
 const pred=calculate(r,state.weights), selected=pred.rows.find(x=>x.id===state.selectedId)||pred.rows[0];
 state.selectedId=selected?.id||null;
 const racePicker='<div class="controls"><label class="field full">対象レース<select id="raceSelect">'+state.races.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(x=>'<option value="'+escapeHtml(x.id)+'" '+(r.id===x.id?'selected':'')+'>'+escapeHtml(raceLabel(x))+'</option>').join('')+'</select></label><label class="field">競馬場 / 距離<input readonly value="'+escapeHtml(r.course+' / '+r.surface+' '+r.distance+'m')+'"></label><label class="field">馬場 / 想定ペース<input readonly value="'+escapeHtml(r.going+' / '+(r.pace||'不明'))+'"></label></div><p class="hint">入力は発走前に確定した情報だけを使用してください。取込データの正確性は提供元に依存します。</p>';
 const coverageMessage=r.type!=='demo'?'<div class="notice goodnotice">全馬共通で確認できた '+coverage.shared+'種類の項目だけを用いて比較しています。確率は未校正の試算で、実際の勝率ではありません。</div>':'';
 const ranking='<div class="table-top"><span>馬番</span><span>出走馬 / 騎手</span><span>勝率の大きさ</span><span>試算勝率</span><span>単勝</span></div>'+pred.rows.map((h,i)=>'<button class="horserow '+(h.id===selected.id?'selected':'')+'" data-horse="'+escapeHtml(h.id)+'" aria-label="'+escapeHtml(h.name)+' の詳細を表示"><span class="num w'+h.draw+'">'+h.number+'</span><span><span class="hn">'+escapeHtml(h.name)+'</span><small>'+escapeHtml(h.jockey)+' · '+h.age+'歳 · '+escapeHtml(h.style||'未登録')+'</small></span><div class="bar-track"><div class="bar-fill" style="width:'+Math.min(100,100*h.win/.5)+'%"></div></div><span class="metric">'+pct(h.win)+'</span><span class="odds">'+(h.odds?fmt(h.odds):'—')+'</span></button>').join('')+'<p class="hint">推定勝率は重み付き指数から作った未校正モデルの値です。実際の勝率を保証しません。緑バーは50%を最大幅として表示。</p>';
 const presets='<div class="modetabs">'+Object.entries(PRESETS).map(([k,v])=>'<button data-preset="'+k+'" class="'+(state.preset===k?'active':'')+'">'+v.label+'</button>').join('')+'</div><p class="hint">'+escapeHtml(PRESETS[state.preset].desc)+'</p>';
 const weights='<div class="weightlist">'+FACTORS.map(([key,label,title])=>'<label title="'+escapeHtml(title)+'" class="weightrow"><span>'+escapeHtml(label)+'</span><input type="range" min="0" max="100" step="1" data-weight="'+key+'" value="'+state.weights[key]+'" aria-label="'+escapeHtml(label)+'"><strong data-weight-label="'+key+'">'+state.weights[key]+'</strong></label>').join('')+'</div><p class="weighthelp">0は評価から除外。各重みは合計値で正規化して計算します。指標は独立とは限らないため重複評価に注意。</p><label class="field full mt12">予想の理由や迷った点<textarea id="forecastNote" placeholder="例：前半が速くなると予想。外差し馬場を重視した。" rows="2"></textarea></label><div class="btnrow"><button class="button alt" data-action="resetWeights">基準に戻す</button><button class="button ghost" data-action="saveForecast">この予想を記録</button></div>';
 const kpis='<div class="detailstats"><div class="micro"><span>試算勝率</span><strong class="lime">'+pct(selected.win)+'</strong></div><div class="micro"><span>3着以内</span><strong>'+pct(selected.top3)+'</strong></div><div class="micro"><span>期待着順</span><strong>'+fmt(selected.expected)+'着</strong></div></div>';
 const factors='<div class="sectiontag">FACTOR PROFILE / 適性スコア</div>'+FACTORS.filter(x=>x[0]!=='market').map(([key,label])=>'<div class="factor"><span>'+label+'</span><div class="bar-track"><div class="bar-fill" style="width:'+selected.features[key]+'%"></div></div><strong>'+fmt(selected.features[key],0)+'</strong></div>').join('');
 const detail='<div class="detailtop"><span class="num w'+selected.draw+'">'+selected.number+'</span><div><h3>'+escapeHtml(selected.name)+'</h3><p>'+escapeHtml(selected.sex||'?')+selected.age+'歳 / '+escapeHtml(selected.jockey)+'騎手</p></div></div>'+kpis+factors+'<div class="line"></div><table class="info-table"><tr><td>父 / 母父</td><td>'+escapeHtml(selected.sire||'未登録')+' / '+escapeHtml(selected.damSire||'未登録')+'</td></tr><tr><td>厩舎</td><td>'+escapeHtml(selected.trainer||'未登録')+'</td></tr><tr><td>斤量 / 枠</td><td>'+selected.weight+'kg / '+selected.draw+'枠</td></tr><tr><td>近走</td><td>'+escapeHtml(selected.form||'未登録')+'</td></tr><tr><td>レース間隔</td><td>'+escapeHtml(selected.lastRunDays??'未登録')+' 日</td></tr><tr><td>期待倍率</td><td>'+((selected.odds&&selected.ev!==null)?fmt(selected.ev,2)+' 倍（勝率×単勝）':'オッズ未登録')+'</td></tr></table><p class="hint">期待倍率は控除率・購入タイミング・オッズ変動・推定誤差を考慮していません。</p>';
 const resultStatus = !r.result?'<div class="notice">このレースには結果が登録されていません。実際の結果を反映するにはJSON/CSVを再取込してください。</div>':hideOutcome(r)?'<div class="notice">過去の結果は非表示です。先に自分の仮説を保存してから答え合わせしましょう。</div><div class="btnrow"><button class="button alt" data-action="reveal">結果を表示する</button></div>':renderRaceOutcome(r,pred);
 const scoreNote=pred.missing?'<div class="notice">未登録の評価項目が'+pred.missing+'件あります。該当項目は中立値50で補完しています。精度の根拠にはなりません。</div>':'';
 return intro('勝ち筋を、研究しよう。','馬の能力だけでなく、展開・適性・市場の見立てを分解する。重みを動かして、自分の予想理論を検証。')+hero(r)+coverageMessage+'<div class="cols"><div class="stack">'+card('01 / レースを選ぶ',racePicker,'<small>RACE SELECTOR</small>')+card('02 / 勝率シミュレーション',ranking,'<small>'+r.horses.length+' runners · Monte Carlo</small>')+card('04 / 結果と答え合わせ',resultStatus)+'</div><div class="stack">'+card('予想モデル',presets+'<div class="line"></div>'+weights,'<small>MODEL WEIGHTS</small>')+card('03 / 注目馬を深掘り',detail,'<small>HORSE DETAIL</small>')+scoreNote+'</div></div>';
}
function renderRaceOutcome(r,pred){
 const map=new Map(pred.rows.map(h=>[h.id,h]));
 const winners=r.result.slice(0,Math.min(5,r.result.length));
 const top=map.get(r.result[0]);
 return '<div class="grid2"><div><div class="sectiontag">RESULT / 実際の着順データ</div><div class="resultlist">'+winners.map((id,i)=>'<div class="resrow"><span>'+(i+1)+'着 '+escapeHtml(byId(r,id)?.name||id)+'</span><strong>'+pct(map.get(id)?.win||0)+'</strong></div>').join('')+'</div></div><div><div class="sectiontag">FORECAST CHECK</div><div class="result-top">'+(pred.rows[0].id===r.result[0]?'✓ 的中':'× 不的中')+'</div><p class="paneltext">1着 '+escapeHtml(top?.name||'不明')+' を予想モデルは '+pct(top?.win||0)+' と評価しました。<br>予想1位 '+escapeHtml(pred.rows[0].name)+'（'+pct(pred.rows[0].win)+'）</p><span class="badge orange">※記録した予想とは別の現在設定による再計算</span></div></div>';
}
function saveForecast(){
 const r=currentRace(), pred=calculate(r,state.weights,2500), top=pred.rows[0];
 const note=$('#forecastNote')?.value||'';
 const date=new Date().toISOString(), racePast=new Date(r.date+'T23:59:59+09:00').getTime()<Date.now();
 const snapshot={id:'fc-'+Date.now().toString(36)+'-'+Math.floor(Math.random()*9999),raceId:r.id,raceName:r.name,raceDate:r.date,course:r.course,createdAt:date,preset:state.preset,weights:{...state.weights},horseCount:r.horses.length,modelVersion:'heuristic-1.0',raceSnapshot:safeJson(r),probabilities:pred.rows.map(({id,name,number,win,top3,odds})=>({id,name,number,win,top3,odds})),topId:top.id,topName:top.name,note,retrospective:racePast || Boolean(r.result) || state.revealed.has(r.id),isDemo:r.type==='demo'};
 state.records.unshift(snapshot);store();toast('予想を記録しました。後から予想時点の条件を検証できます。');render();
}
function metrics(pred,race){
 if(!Array.isArray(race.result)||!race.result.length)return null;
 const winner=race.result[0], map=new Map(pred.rows.map(x=>[x.id,x]));
 const winnerP=clamp(map.get(winner)?.win||1e-9,1e-9,1);
 const brier=sum(pred.rows.map(x=>(x.win-(x.id===winner?1:0))**2));
 const favorite=pred.rows[0], hit=favorite.id===winner?1:0;
 const returned=hit&&favorite.odds?favorite.odds*100:0;
 return {hit,logloss:-Math.log(winnerP),brier,returned,winningProb:winnerP,top:favorite,winner};
}
function outcomeFor(rec){
 const latest=state.races.find(x=>x.id===rec.raceId);
 const result=latest?.result||rec.raceSnapshot?.result;
 const ids=new Set(rec.probabilities.map(x=>x.id));
 return Array.isArray(result)&&result.length===rec.horseCount&&result.every(id=>ids.has(id))?result:null;
}
function historyView(){
 const records=state.records;
 const resolved=records.filter(x=>outcomeFor(x));
 const settled=resolved.map(rec=>{
 const outcome=outcomeFor(rec),first=rec.probabilities.find(x=>x.id===outcome[0]);
 const pick=rec.probabilities.find(x=>x.id===rec.topId);
 return {...rec,correct:rec.topId===outcome[0],winnerP:first?.win||0,returned:rec.topId===outcome[0]?(pick?.odds||0)*100:0};
 });
 const eligible=settled.filter(x=>!x.retrospective&&!x.isDemo);
 const hit=eligible.filter(x=>x.correct).length;
 const kpi='<div class="chartgrid"><div class="kpi"><span>保存した予想</span><strong>'+records.length+'</strong><small>ブラウザー保存</small></div><div class="kpi"><span>事前の実戦記録</span><strong>'+eligible.length+'</strong><small>デモ・事後作成を除外</small></div><div class="kpi"><span>1着的中率</span><strong>'+(eligible.length?pct(hit/eligible.length):'—')+'</strong><small>実戦記録のみ</small></div><div class="kpi"><span>仮想単勝回収率</span><strong>'+(eligible.length?pct(sum(eligible.map(x=>x.returned))/(eligible.length*100)):'—')+'</strong><small>1レース100円と仮定</small></div></div>';
 const list=records.length?records.map(rec=>{
 const outcome=outcomeFor(rec),valid=Boolean(outcome);
 const winner=valid?outcome[0]:null, pick=rec.probabilities.find(x=>x.id===rec.topId), winnerName=rec.probabilities.find(x=>x.id===winner)?.name;
 return '<div class="record"><div class="recordtitle"><strong>'+escapeHtml(rec.raceName)+'</strong><span class="badge '+(rec.isDemo?'orange':'blue')+'">'+(rec.isDemo?'架空':'取込データ')+'</span></div><p>'+escapeHtml(rec.raceDate)+' · 予想保存 '+escapeHtml((rec.createdAt||'').replace('T',' ').slice(0,16))+' UTC · '+escapeHtml(PRESETS[rec.preset]?.label||'カスタム')+'</p><div class="grid2"><div><span class="tiny">予想本命</span><h4>'+escapeHtml(rec.topName)+' <span class="mono">'+pct(pick?.win||0)+'</span></h4></div><div><span class="tiny">判定</span><h4>'+(valid?(winner===rec.topId?'<span style="color:var(--lime)">1着的中</span>':'不的中 / 1着 '+escapeHtml(winnerName||'?')):'結果未登録')+'</h4></div></div>'+(rec.retrospective?'<span class="badge orange">事後練習（実戦統計には含めない）</span>':'')+(rec.note?'<p>メモ：'+escapeHtml(rec.note)+'</p>':'')+'<div class="btnrow"><button class="smallbtn" data-record="'+escapeHtml(rec.id)+'">予想の詳細</button><button class="smallbtn" data-delete-record="'+escapeHtml(rec.id)+'">削除</button></div></div>';
 }).join(''):'<div class="empty"><strong>まだ予想記録がありません</strong>「予想ラボ」で勝率を計算してから、仮説を保存してみましょう。<div class="btnrow" style="justify-content:center"><button class="button" data-goto="lab">予想を始める</button></div></div>';
 return intro('予想の足跡を残す。','結果を見る前の予想を保存し、考え方と実際の着順を後から比較します。','PREDICTION JOURNAL')+kpi+card('記録一覧',list,'<small>'+records.length+' predictions</small>')+'<p class="hint">保存時点の馬・オッズ・結果・予想重みをスナップショット化。過去レースやデモの事後学習は、実戦成績から分離します。</p>';
}
function recordDetail(rec){
 const r=rec.raceSnapshot, rows=rec.probabilities.slice().sort((a,b)=>b.win-a.win);
 const result=outcomeFor(rec);
 const body='<p class="paneltext">予想保存: '+escapeHtml(rec.createdAt)+' / モデル: '+escapeHtml(rec.modelVersion||'旧形式')+'</p><div class="tablewrap"><table class="smalltable"><thead><tr><th>馬番</th><th>馬名</th><th>保存時点の勝率</th><th>単勝</th><th>結果</th></tr></thead><tbody>'+rows.map(x=>'<tr><td>'+x.number+'</td><td>'+escapeHtml(x.name)+'</td><td class="numtd">'+pct(x.win)+'</td><td>'+fmt(Number(x.odds))+'</td><td>'+(result?((result.indexOf(x.id)+1)||'—')+'着':'未登録')+'</td></tr>').join('')+'</tbody></table></div><div class="line"></div><div class="sectiontag">保存された重み</div><div class="flags">'+FACTORS.map(([k,n])=>'<span>'+n+' '+(rec.weights[k]||0)+'</span>').join('')+'</div>'+(rec.note?'<p class="paneltext">予想メモ: '+escapeHtml(rec.note)+'</p>':'')+'<div class="btnrow"><button class="button alt" data-goto="history">← 記録一覧に戻る</button></div>';
 return intro('予想を検証する。',rec.raceName+' / 保存された確率と重みは変更しません。','SNAPSHOT / IMMUTABLE RECORD')+card('保存時点の予想',body);
}
function benchmark(){
 const scope=state.benchScope;
 const available=state.races.filter(r=>Array.isArray(r.result)&&r.result.length>0&&actualCoverage(r,state.weights).ready);
 const subset=available.filter(r=>scope==='all'||(scope==='demo'?r.type==='demo':r.type!=='demo')).filter(r=>{
  switch(state.benchGroup){
   case 'turf':return r.surface==='芝';
   case 'dirt':return r.surface==='ダート';
   case 'wet':return ['重','不良','稍重'].includes(r.going);
   case 'short':return Number(r.distance)<=1600;
   case 'long':return Number(r.distance)>1600;
   default:return true;
  }
 }).sort((a,b)=>a.date.localeCompare(b.date));
 const cut=Math.max(1,Math.floor(subset.length*.7));
 const races=state.benchPeriod==='train'?subset.slice(0,cut):state.benchPeriod==='test'?subset.slice(cut):subset;
 const strategies=[...Object.entries(PRESETS).filter(([k])=>k!=='custom').map(([key,v])=>({key,label:v.label,weights:normalizeWeights(v.weights)})),{key:'custom',label:'自分の仮説',weights:state.weights}];
 const sets=strategies.map(method=>{
  const stats=races.map(r=>metrics(calculate(r,method.weights,450),r)).filter(Boolean);
  return {...method,starts:stats.length,hits:sum(stats.map(x=>x.hit)),winrate:avg(stats.map(x=>x.hit)),logloss:avg(stats.map(x=>x.logloss)),brier:avg(stats.map(x=>x.brier)),roi:stats.length?sum(stats.map(x=>x.returned))/(stats.length*100):null,paid:sum(stats.map(x=>x.returned))};
 }).sort((a,b)=>a.logloss-b.logloss);
 const scopePick='<div class="segment"><button data-scope="all" class="'+(scope==='all'?'active':'')+'">全データ</button><button data-scope="demo" class="'+(scope==='demo'?'active':'')+'">架空データのみ</button><button data-scope="imported" class="'+(scope==='imported'?'active':'')+'">取込データのみ</button></div>';
 const groupChoices=[['all','全条件'],['turf','芝'],['dirt','ダート'],['wet','道悪'],['short','1600m以下'],['long','1601m以上']];
 const groupPick='<div class="segment">'+groupChoices.map(([id,label])=>'<button data-group="'+id+'" class="'+(state.benchGroup===id?'active':'')+'">'+label+'</button>').join('')+'</div>';
 const periodPick='<div class="segment"><button data-period="all" class="'+(state.benchPeriod==='all'?'active':'')+'">全期間</button><button data-period="train" class="'+(state.benchPeriod==='train'?'active':'')+'">古い70%（開発用）</button><button data-period="test" class="'+(state.benchPeriod==='test'?'active':'')+'">新しい30%（検証用）</button></div><p class="hint">レース開催日の順で分割。期間が少ない場合はデータが空になることがあります。繰り返し検証用区間を見てモデルを調整すると厳密な未使用データではなくなります。</p>';
 const calibrationPoints=races.flatMap(r=>calculate(r,state.weights,100).rows.map(h=>({p:h.win,y:h.id===r.result[0]?1:0})));
 const buckets=[[0,.05],[.05,.10],[.10,.20],[.20,.35],[.35,1.001]];
 const calibration='<div class="tablewrap"><table class="smalltable"><thead><tr><th>予想勝率帯</th><th>出走件数</th><th>平均予想勝率</th><th>実際の1着率</th><th>勝ち馬数</th></tr></thead><tbody>'+buckets.map(([lo,hi])=>{
  const bin=calibrationPoints.filter(x=>x.p>=lo&&x.p<hi);const wins=sum(bin.map(x=>x.y));
  return '<tr><td>'+(100*lo).toFixed(0)+'〜'+(100*Math.min(hi,1)).toFixed(0)+'%</td><td>'+bin.length+'</td><td>'+(bin.length?pct(avg(bin.map(x=>x.p))):'—')+'</td><td>'+(bin.length?pct(wins/bin.length):'—')+'</td><td>'+wins+'</td></tr>';
 }).join('')+'</tbody></table></div><p class="hint">「自分の仮説」の確率校正を確認します。デモや少数のレースでは大きくばらつきます。予想と実際の割合が近いほど、確率配分が良い可能性があります。</p>';
 const summary='<div class="chartgrid"><div class="kpi"><span>結果登録済みレース</span><strong>'+races.length+'</strong><small>時系列順に集計</small></div><div class="kpi"><span>比較する仮説</span><strong>'+strategies.length+'</strong><small>保存された重みで評価</small></div><div class="kpi"><span>評価する勝ち馬</span><strong>'+races.length+'</strong><small>各レース1着馬</small></div><div class="kpi"><span>もっとも小さい Log Loss</span><strong>'+(races.length?fmt(sets[0].logloss,3):'—')+'</strong><small>小さいほど良い</small></div></div>';
 const table='<div class="tablewrap"><table class="smalltable"><thead><tr><th>仮説</th><th>1着的中</th><th>Log Loss ↓</th><th>Brier ↓</th><th>仮想単勝回収率</th></tr></thead><tbody>'+sets.map((s,i)=>'<tr><td><strong>'+(i===0&&races.length?'★ ':'')+escapeHtml(s.label)+'</strong></td><td>'+(races.length?s.hits+'/'+s.starts+' ('+pct(s.winrate)+')':'—')+'</td><td class="numtd">'+(races.length?fmt(s.logloss,3):'—')+'</td><td>'+ (races.length?fmt(s.brier,3):'—')+'</td><td>'+((s.roi!==null)?pct(s.roi):'—')+'</td></tr>').join('')+'</tbody></table></div><div class="notice mt12">比較順位は読み込んだレースだけに対する結果です。ここで重みを調整して最良の手法を選ぶと、データへの過適合が起こります。評価用の未使用レースを別に用意してください。</div>';
 const guide='<div class="grid2"><div><h3>Log Loss とは</h3><p class="paneltext">実際に勝った馬へ高い勝率を付けられたかを見る指標。勝った馬の予想確率が低いほど厳しく減点されます。小さいほど良い。</p></div><div><h3>Brier Score とは</h3><p class="paneltext">全出走馬の勝率予想と、実際に1着だったか（1 / 0）の二乗差を合計。全馬の勝率の配分を測ります。小さいほど良い。</p></div><div><h3>仮想単勝回収率とは</h3><p class="paneltext">各レースで勝率1位の馬に100円購入したと仮定した払戻 / 合計額。単勝オッズは事前スナップショットと仮定。利益を保証しません。</p></div><div><h3>本番に近づくには</h3><p class="paneltext">開催日で学習期間と検証期間を分ける。調教・人気・馬場は必ず発走前のスナップショットを残す。血統や騎手評価も未来の実績で更新しない。</p></div></div>';
 return intro('その予想法、本当に強い？','同じ出走表を複数の仮説で評価。正解率だけでなく、確率予想の誤差も見比べます。','METHOD BENCHMARK')+scopePick+'<div class="spaced">'+groupPick+'</div><div class="spaced">'+periodPick+'</div>'+summary+card('仮説別パフォーマンス',table,'<small>BEST: LOWEST LOG LOSS</small>')+'<div class="spaced">'+card('予想確率は実際に当たっている？',calibration,'<small>CALIBRATION CHECK</small>')+'</div><div class="spaced">'+card('検証指標の読み方',guide)+'</div>';
}
function dataView(){
 const imported=state.races.filter(r=>r.type!=='demo');
 const table='<div class="tablewrap"><table class="smalltable"><thead><tr><th>レース</th><th>出走</th><th>結果</th><th>種類</th><th>操作</th></tr></thead><tbody>'+state.races.map(r=>'<tr><td><strong>'+escapeHtml(r.name)+'</strong><br><span class="tiny">'+escapeHtml(r.date+' · '+r.course+' '+r.surface+r.distance+'m')+'</span></td><td>'+r.horses.length+'頭</td><td>'+(r.result?'登録済':'未登録')+'</td><td><span class="badge '+(r.type!=='demo'?'blue':'orange')+'">'+(r.type==='demo'?'架空':'取込')+'</span></td><td>'+(r.type==='demo'?'<span class="tiny">標準</span>':'<button class="smallbtn" data-remove-race="'+escapeHtml(r.id)+'">削除</button>')+'</td></tr>').join('')+'</tbody></table></div>';
 const file='<label class="filezone"><strong>↑ JSON / CSV ファイルを読み込む</strong><span>ローカル処理。アップロード先のサーバーはありません。</span><input id="dataFile" type="file" accept=".json,.csv,application/json,text/csv"></label><p class="hint">同じrace_idのレースは上書き更新します。レース日は YYYY-MM-DD、時点情報は as_of に指定してください。JSONを読み込む場合は horses 配列が必須です。</p><div class="btnrow"><button class="button alt" data-action="downloadCsv">CSV テンプレート</button><button class="button alt" data-action="downloadJson">JSON サンプル</button><button class="button ghost" data-action="export">全データをバックアップ</button></div>';
 const sources='<p class="paneltext"><a target="_blank" rel="noopener noreferrer" href="https://github.com/kanekotaito/kanekotaito.github.io/blob/main/keiba-lab/tools/NETKEIBA.md">▶ netkeiba実データ取込の手順を開く（Windows / Python）</a></p><p class="paneltext">実戦では、正当に取得・利用できるレースデータを用意する必要があります。アプリには自動取得機能や公式API連携はありません。JRA-VAN Data Lab.等の許諾条件を確認して自分の環境で整形し、CSVまたはJSONに取り込んでください。</p><div class="notice">公式戦績データやオッズをこのアプリが自動で取得・更新するわけではありません。提供元の利用規約、再配布・公開の可否に注意。特にレース後オッズを事前オッズとして用いないこと。</div>';
 const coverage='<div class="grid2"><div><div class="sectiontag">COVERAGE</div><div class="detailstats"><div class="micro"><span>全レース</span><strong>'+state.races.length+'</strong></div><div class="micro"><span>取込</span><strong>'+imported.length+'</strong></div><div class="micro"><span>出走馬</span><strong>'+sum(state.races.map(r=>r.horses.length))+'</strong></div></div></div><div><div class="sectiontag">DATA INTEGRITY</div><p class="paneltext">スコアがない項目は中立値50で補完されます。データの欠損、仮想レースと実戦データの混同、結果発表後の情報混入に注意してください。</p></div></div>';
 return intro('データを、競馬の武器に。','外部のレース情報を取り込み、実戦的な比較分析に使用できます。','DATA SOURCES / IMPORT')+card('登録状況',coverage)+'<div class="grid2 spaced">'+card('データの取込',file)+card('実データ利用に関する注意',sources)+'</div><div class="spaced">'+card('レース一覧',table)+'</div>';
}
function guideView(){
 const steps=[
 ['01','予想前の状態を保存する','近走、枠順、騎手、調教、馬場、単勝オッズなど、発走時刻より前に利用可能だった情報だけを記録。後日更新された指標を混ぜない。'],
 ['02','予想の理由を分解する','能力、距離・コース、展開、血統、陣営、当日の状態を分けて考える。同じ事実を複数指標で加点しないようにする。'],
 ['03','勝率を予想する','全頭の勝率の合計が100%になるように配分する。本アプリの値は重み付きスコアに基づく仮の確率で、統計的な校正前。'],
 ['04','事前に予想を固定する','重みとオッズ、勝率、馬情報、選択理由を保存してから結果を開く。後から予想を動かして「当たった」と扱わない。'],
 ['05','未来のレースで検証する','検証に使ったレースで重みを最適化すると実力を過大評価する。日付で分割し、最後の未使用期間をテストに残す。'],
 ['06','的中率以外も見る','Log Loss・Brier・予測確率と実際の勝率の校正・単勝回収率・取引コストを確認。サンプル数と信頼区間も重要。']
 ];
 const blocks=steps.map(([n,t,d])=>'<section class="card"><span class="stepno">'+n+'</span><h3>'+t+'</h3><p class="paneltext">'+d+'</p></section>').join('');
 const definitions='<table class="info-table">'+FACTORS.map(([k,n,desc])=>'<tr><td>'+n+'</td><td>'+desc+'</td></tr>').join('')+'</table>';
 const limitations='<div class="notice"><strong>重要: 予測エンジンは研究用の初期実装です。</strong><div class="mt12">モンテカルロは同じスコアから着順のばらつきを計算しますが、競馬固有の事故・馬群・不利・相互作用まで再現するレースシミュレーターではありません。実戦の予測精度や回収率は未検証です。架空の学習レースから得た値を実際の的中見込みと解釈しないでください。</div></div>';
 return intro('予想を、再現可能な研究に。','勝ち馬を後追いするのではなく、発走前に見えていた情報を固定して検証する。','RESEARCH METHODOLOGY')+'<div class="guidegrid">'+blocks+'</div><div class="spaced">'+card('分析する14の要素',definitions)+'</div><div class="spaced">'+card('モデルの限界',limitations)+'</div><div class="spaced"><p class="paneltext">データ取込の仕様はこのGitHubリポジトリ内の <code>keiba-lab/DATA_FORMAT.md</code> を参照してください。ブラウザーのローカルストレージは端末別です。定期的にJSONバックアップを保存してください。</p></div>';
}
function render(){
 const views={lab:['予想ラボ',renderLab],history:['予想記録',historyView],bench:['手法を比較',benchmark],data:['データ管理',dataView],guide:['分析の考え方',guideView]};
 const v=views[state.view]||views.lab;$('#viewName').textContent=v[0];$('#main').innerHTML=v[1]();
 $$('.navitem').forEach(b=>{b.classList.toggle('active',b.dataset.view===state.view);b.setAttribute('aria-current',b.dataset.view===state.view?'page':'false')});
 $('#dataStatus').textContent='分析可能: '+state.races.length+'レース · 取込 '+state.races.filter(x=>x.type!=='demo').length+'件';
}
function go(view){state.view=view;render();window.scrollTo({top:0,behavior:'auto'})}
function showRecord(id){const rec=state.records.find(x=>x.id===id);if(!rec)return;state.view='record';$('#viewName').textContent='予想記録 / 詳細';$('#main').innerHTML=recordDetail(rec);$$('.navitem').forEach(b=>b.classList.toggle('active',b.dataset.view==='history'));window.scrollTo(0,0)}
function download(name,data,type='application/json;charset=utf-8'){const blob=new Blob([data],{type});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000)}
const CSV_HEADERS=['race_id','date','race_name','course','surface','distance','going','weather','pace','as_of','class_grade','track_bias_inside','track_bias_outside','horse_id','number','horse_name','age','sex','draw','weight','jockey','trainer','sire','dam_sire','style','form_text','last_run_days','odds','result_position','past_runs_json','jockey_stats_json','trainer_stats_json','pedigree_stats_json','training_score',...KEYS.filter(k=>k!=='market').map(k=>'score_'+k)];
const csvEscape=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
function csvTemplate(){
 const r=DEMO[10],horses=r.horses.slice(0,3);
 return [CSV_HEADERS.join(','),...horses.map(h=>CSV_HEADERS.map(k=>csvEscape(({race_id:r.id,date:r.date,race_name:r.name,course:r.course,surface:r.surface,distance:r.distance,going:r.going,weather:r.weather,pace:r.pace,as_of:r.asOf,horse_id:h.id,number:h.number,horse_name:h.name,age:h.age,sex:h.sex,draw:h.draw,weight:h.weight,jockey:h.jockey,trainer:h.trainer,sire:h.sire,dam_sire:h.damSire,style:h.style,form_text:h.form,last_run_days:h.lastRunDays,odds:h.odds,result_position:'',...Object.fromEntries(Object.entries(h.factors).map(([k,v])=>['score_'+k,v]))})[k])).join(','))].join('\r\n');
}
function exportAll(){download('keiba-lab-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({app:'keiba-lab',version:VERSION,exportedAt:new Date().toISOString(),races:state.races.filter(x=>x.type!=='demo'),records:state.records,weights:state.weights},null,2));toast('バックアップを保存しました')}
function csvParse(s){
 const out=[],row=[];let cell='',quoted=false;
 s=String(s).replace(/^\uFEFF/,'');
 for(let i=0;i<s.length;i++){
  const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){cell+='"';i++}else quoted=!quoted}
  else if(c===','&&!quoted){row.push(cell);cell=''}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x!==''))out.push(row.slice());row.length=0;cell=''}
  else cell+=c;
 }
 if(quoted)throw Error('CSVの引用符が閉じられていません');
 row.push(cell);if(row.some(x=>x!==''))out.push(row.slice());
 if(!out.length)throw Error('CSVが空です');
 const head=out.shift().map(x=>x.trim());
 for(const k of ['race_id','date','horse_id','horse_name','number'])if(!head.includes(k))throw Error('CSVに必須列 '+k+' がありません');
 return out.map(a=>Object.fromEntries(head.map((k,i)=>[k,a[i]??''])));
}
function convertCsv(txt){
 const lines=csvParse(txt), groups=new Map();
 for(const item of lines){
  const id=String(item.race_id).trim();if(!id)throw Error('race_id がありません');
  if(!groups.has(id))groups.set(id,{id,date:item.date,name:item.race_name||id,course:item.course||'不明',surface:item.surface||'芝',distance:Number(item.distance)||1600,going:item.going||'良',weather:item.weather||'',pace:item.pace||'未設定',asOf:item.as_of||'',classGrade:item.class_grade?Number(item.class_grade):null,trackBias:{inside:item.track_bias_inside?Number(item.track_bias_inside):null,outside:item.track_bias_outside?Number(item.track_bias_outside):null},source:'ユーザーのCSV取込',horses:[],result:[],type:'imported'});
  const r=groups.get(id), factors={};
  for(const k of KEYS.filter(k=>k!=='market'))if(item['score_'+k]!==''&&item['score_'+k]!==undefined)factors[k]=Number(item['score_'+k]);
  const parseCell=k=>{if(!item[k])return undefined;try{return JSON.parse(item[k])}catch{throw Error(k+' に正しいJSONを入力してください')}};
  const h={pastRuns:parseCell('past_runs_json'),jockeyStats:parseCell('jockey_stats_json'),trainerStats:parseCell('trainer_stats_json'),pedigreeStats:parseCell('pedigree_stats_json'),trainingScore:item.training_score?Number(item.training_score):undefined,id:item.horse_id,number:Number(item.number),name:item.horse_name,age:Number(item.age)||0,sex:item.sex||'',draw:Number(item.draw)||Math.ceil(Number(item.number)/2),weight:Number(item.weight)||0,jockey:item.jockey||'',trainer:item.trainer||'',sire:item.sire||'',damSire:item.dam_sire||'',style:item.style||'',form:item.form_text||'',lastRunDays:item.last_run_days?Number(item.last_run_days):null,odds:item.odds?Number(item.odds):null,factors};
  r.horses.push(h);
  if(item.result_position!=='')r.result.push({id:h.id,position:Number(item.result_position)});
 }
 return Array.from(groups.values()).map(r=>{r.result=r.result.length===r.horses.length&&r.result.every(x=>x.position>0)?r.result.sort((a,b)=>a.position-b.position).map(x=>x.id):null;return r});
}
function validateRace(r){
 if(!r||typeof r!=='object'||typeof r.id!=='string'||!r.id||!Array.isArray(r.horses)||r.horses.length<2||r.horses.length>30||!r.date||!r.name||!/^\d{4}-\d{2}-\d{2}$/.test(r.date))return false;
 const ids=new Set(),numbers=new Set();
 for(const h of r.horses){
  if(!h||typeof h.id!=='string'||!h.id||ids.has(h.id)||!Number.isInteger(Number(h.number))||numbers.has(Number(h.number))||!h.name||!h.factors||typeof h.factors!=='object')return false;
  ids.add(h.id);numbers.add(Number(h.number));
  for(const k of Object.keys(h.factors))if(KEYS.includes(k)&&(!Number.isFinite(Number(h.factors[k]))||Number(h.factors[k])<0||Number(h.factors[k])>100))return false;
  if(h.odds!=null&&(!Number.isFinite(Number(h.odds))||Number(h.odds)<=1))return false;
 }
 if(r.result!==null&&r.result!==undefined&&(!Array.isArray(r.result)||r.result.length!==r.horses.length||r.result.some(id=>!ids.has(id))||new Set(r.result).size!==ids.size))return false;
 return true;
}
function cleanRace(r){
 return {...r,id:String(r.id),name:String(r.name),type:'imported',source:r.source||'ユーザー提供',horses:r.horses.map(h=>({...h,id:String(h.id),number:Number(h.number),odds:h.odds==null?null:Number(h.odds),factors:Object.fromEntries(Object.entries(h.factors||{}).filter(([k])=>KEYS.includes(k)).map(([k,v])=>[k,Number(v)]))})),result:r.result||null};
}
async function importFile(file){
 if(!file)return;
 if(file.size>4*1024*1024){toast('4MB以下のファイルを選んでください');return}
 try{
  const text=await file.text(),obj=file.name.toLowerCase().endsWith('.csv')?convertCsv(text):JSON.parse(text);
  if(!file.name.toLowerCase().endsWith('.csv')&&obj?.app==='keiba-lab'&&Array.isArray(obj.races)&&Array.isArray(obj.records)){
   const incoming=obj.races;if(!incoming.every(validateRace))throw Error('バックアップ内のレース形式が不正です');
   incoming.forEach(r=>upsert(window.KEIBA_FEATURES.enrichRace(cleanRace(r))));
   state.records=[...obj.records.filter(x=>x&&x.id&&x.raceSnapshot&&Array.isArray(x.probabilities)),...state.records].filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i).slice(0,800);
   state.weights=normalizeWeights(obj.weights||state.weights);
   store();go('data');toast(incoming.length+'件のレースと予想記録を復元しました');return;
  }
  const list=Array.isArray(obj)?obj:Array.isArray(obj.races)?obj.races:[obj];
  if(!list.length||list.length>300)throw Error('1回の取込は1〜300レースまでです');
  if(!list.every(validateRace))throw Error('レースの形式が正しくありません。DATA_FORMAT.mdを確認してください。');
  list.forEach(r=>upsert(window.KEIBA_FEATURES.enrichRace(cleanRace(r))));state.raceId=list[0].id.startsWith('demo-')?'import-'+list[0].id:list[0].id;state.selectedId=null;store();go('lab');toast(list.length+'レースを取り込みました');
 }catch(e){toast('取込できません: '+String(e.message||e).slice(0,130))}
}
function upsert(r){if(r.id.startsWith('demo-'))r.id='import-'+r.id;const i=state.races.findIndex(x=>x.id===r.id);if(i>=0){if(state.races[i].type==='demo')throw Error('デモレースは上書きできません');state.races[i]=r}else state.races.push(r)}
const MAIN=$('#main');
MAIN.addEventListener('click',e=>{
 const target=e.target.closest('button');if(!target)return;
 if(target.dataset.goto){go(target.dataset.goto);return}
 if(target.dataset.horse){state.selectedId=target.dataset.horse;render();return}
 if(target.dataset.preset){setPreset(target.dataset.preset);return}
 if(target.dataset.scope){state.benchScope=target.dataset.scope;render();return}
 if(target.dataset.group){state.benchGroup=target.dataset.group;render();return}
 if(target.dataset.period){state.benchPeriod=target.dataset.period;render();return}
 if(target.dataset.record){showRecord(target.dataset.record);return}
 if(target.dataset.deleteRecord){if(confirm('この予想記録を削除しますか？')){state.records=state.records.filter(x=>x.id!==target.dataset.deleteRecord);store();render()}return}
 if(target.dataset.removeRace){if(confirm('この取込レースを削除しますか？ 保存済み予想スナップショットは残ります。')){state.races=state.races.filter(x=>x.id!==target.dataset.removeRace);if(!state.races.some(x=>x.id===state.raceId))state.raceId=DEMO[10].id;store();render()}return}
 switch(target.dataset.action){
  case 'resetWeights':setPreset('balanced');break;
  case 'saveForecast':saveForecast();break;
  case 'reveal':state.revealed.add(state.raceId);render();break;
  case 'downloadCsv':download('keiba-lab-template.csv','\ufeff'+csvTemplate(),'text/csv;charset=utf-8');break;
  case 'downloadJson':download('keiba-lab-example.json',JSON.stringify({...DEMO[10],type:'imported',id:'example-20261018',name:'JSON形式サンプル（架空）'},null,2));break;
  case 'export':exportAll();break;
 }
});
MAIN.addEventListener('change',e=>{
 if(e.target.id==='raceSelect'){state.raceId=e.target.value;state.selectedId=null;store();render()}
 if(e.target.dataset.weight){state.preset='custom';store();render()}
 if(e.target.id==='dataFile')importFile(e.target.files?.[0]);
});
MAIN.addEventListener('input',e=>{
 if(e.target.dataset.weight){const key=e.target.dataset.weight;state.weights[key]=Number(e.target.value);const label=$('[data-weight-label="'+key+'"]');if(label)label.textContent=e.target.value;state.preset='custom';}
});
$$('.navitem').forEach(b=>b.addEventListener('click',()=>go(b.dataset.view)));
$('#exportTop').addEventListener('click',exportAll);
$('#today').textContent=new Intl.DateTimeFormat('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
render();
window.KEIBA_LAB_TEST={calculate,makeDemo,validateRace,convertCsv,csvTemplate,metrics,normalizeWeights,DEMO}; // optional dev console inspection
})();