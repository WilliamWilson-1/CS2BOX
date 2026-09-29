const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const E = require('../engine.js');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../data/catalog.js'),'utf8'), context);
const D = context.window.CS2_DATA;
function seeded(seed=92743) { return () => { seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296; }; }
function sequence(...values) { let n=0;return ()=>values[n++]??.5; }

test('phase prices match source by model, wear and StatTrak; missing phase never falls back',()=>{
  const fullSource=path.join(__dirname,'../data/buff.json');
  const buff=JSON.parse(fs.readFileSync(fs.existsSync(fullSource)?fullSource:path.join(__dirname,'../data/phase-price-source.json'),'utf8'));
  for(const item of Object.values(D.items).filter(i=>i.variants?.length)) {
    assert.equal(new Set(item.variants.map(v=>v.key)).size,item.variants.length);
    const odds=E.variantProbabilities(item,5);
    assert.ok(Math.abs(odds.reduce((a,b)=>a+b,0)-1)<1e-12);
    assert.ok(Math.abs(odds.filter((_,i)=>item.variants[i].gem).reduce((a,b)=>a+b,0)-.05)<1e-12);
    for(const v of item.variants) for(const st of [false,true]) for(let w=0;w<5;w++) {
      const market=(st?item.en.replace('★ ','★ StatTrak™ '):item.en)+` (${E.WEARS_EN[w]})`;
      const usd=buff[market]?.starting_at?.doppler?.[v.key];
      const expected=typeof usd==='number'&&usd>0?Math.round(usd*D.meta.usdCny*100):null;
      const q=E.quote(item,{variantKey:v.key,stattrak:st,wear:w});
      assert.equal(q.value,expected,market+' '+v.key);
      assert.equal(q.simulation,false);
    }
    assert.equal(E.quote(item,{variantKey:'missing phase'}).value,null);
  }
});
test('template premiums match exact weapon and seed, preserving wear, StatTrak and fee accounting',()=>{
  const ak=Object.values(D.items).find(i=>i.en==='AK-47 | Case Hardened');
  const kara=Object.values(D.items).find(i=>i.en==='★ Karambit | Case Hardened');
  for(const st of [false,true]) for(let w=0;w<5;w++) {
    const q=E.quote(ak,{seed:661,wear:w,stattrak:st});
    assert.equal(q.value,E.cents(ak.prices[st?1:0][w]*100));
    assert.equal(q.simulation,true);assert.equal(q.multiplier,100);
  }
  assert.equal(E.quote(kara,{seed:661}).patternTier,2); // Same seed has a different tier on this knife.
  assert.equal(E.quote(ak,{seed:661}).patternTier,1);
  assert.equal(E.quote(kara,{seed:387}).simulation,true);
  assert.equal(E.quote(ak,{seed:660}).simulation,false);
  const settings={keyPrice:18,fee:2.5,patternMultipliers:{[`${ak.id}:661`]:125}};
  const r=E.open({id:'test',items:[ak.id],rare:[],price:2},{[ak.id]:{...ak,rarity:0}},settings,sequence(0,0,.5,0,0,.661));
  assert.equal(r.seed,661);assert.equal(r.multiplier,125);
  assert.equal(r.value,E.cents(ak.prices[0][0]*125));
  assert.equal(r.profit,Math.round(r.value*.975)-2000);
  const restored=JSON.parse(JSON.stringify(r));settings.patternMultipliers[`${ak.id}:661`]=200;
  assert.equal(restored.value,r.value);
  const noQuote={...ak,prices:[[null,null,null,null,null],[null,null,null,null,null]]};
  assert.equal(E.quote(noQuote,{seed:661}).value,null);
});
test('community pattern tables identify exact weapons, tiers and distinctive motifs',()=>{
  const item=name=>Object.values(D.items).find(i=>i.en.replace('★ ','')===name);
  assert.equal(E.patternInfo(item('AK-47 | Case Hardened'),661).tier,1);
  assert.equal(E.patternInfo(item('AK-47 | Case Hardened'),592).tier,2);
  assert.equal(E.patternInfo(item('AK-47 | Case Hardened'),555).tier,3);
  assert.equal(E.patternInfo(item('AK-47 | Case Hardened'),770).tier,4);
  assert.equal(E.patternInfo(item('M9 Bayonet | Case Hardened'),601).tier,1);
  assert.equal(E.patternInfo(item('Bayonet | Marble Fade'),412).group,'1st Max');
  assert.equal(E.patternInfo(item('M9 Bayonet | Marble Fade'),412),null);
  assert.equal(E.patternInfo(item('Glock-18 | Moonrise'),601).group,'Center Star');
  assert.equal(E.patternInfo(item('Specialist Gloves | Crimson Kimono'),458).tier,1);
  assert.equal(E.patternInfo(item('Flip Knife | Crimson Web'),525).group,'Triple Web');
  assert.equal(E.patternInfo(item('Karambit | Slaughter'),33).category,'slaughter');
  for(const skin of Object.values(D.items)) {
    assert.equal(new Set((skin.patterns||[]).map(p=>p.seed)).size,(skin.patterns||[]).length);
    for(const p of skin.patterns||[]) {assert.ok(Number.isInteger(p.seed)&&p.seed>=0&&p.seed<1000);assert.match(p.source,/^https:\/\//);}
  }
});
test('fade lookup is seed-specific, bounded, stable, and excludes gloves',()=>{
  const fades=Object.values(D.items).filter(i=>i.fade);
  assert.equal(fades.length,16);
  for(const item of fades) {
    assert.equal(item.fade.percentages.length,1000);
    for(let seed=0;seed<1000;seed++) {
      const info=E.patternInfo(item,seed), q=E.quote(item,{seed});
      assert.ok(info.fadePercentage>=80&&info.fadePercentage<=100);
      assert.equal(q.fadePercentage,info.fadePercentage);
      assert.equal(q.simulation,info.fadePercentage>=95);
    }
    assert.equal(E.patternInfo(item,-1),null);assert.equal(E.patternInfo(item,1000),null);
  }
  assert.ok(Object.values(D.items).filter(i=>i.en.includes('Gloves | Fade')).every(i=>!i.fade));
});
test('independent pattern prices isolate seed, wear and StatTrak and retain missing prices',()=>{
  const ak=Object.values(D.items).find(i=>i.en==='AK-47 | Case Hardened');
  const key=`${ak.id}:661:0:2`, settings={patternPrices:{[key]:12345.67},patternMultipliers:{[`${ak.id}:661`]:120}};
  const q=E.quote(ak,{seed:661,wear:2},settings);
  assert.equal(q.value,1234567);assert.equal(q.simulation,true);assert.equal(q.multiplier,null);
  assert.equal(E.quote(ak,{seed:661,wear:1},settings).value,E.cents(ak.prices[0][1]*120));
  assert.equal(E.quote(ak,{seed:661,wear:2,stattrak:true},settings).value,E.cents(ak.prices[1][2]*120));
  assert.equal(E.quote(ak,{seed:955,wear:2},settings).multiplier,30);
  const snapshot=JSON.parse(JSON.stringify(q));settings.patternPrices[key]=0;
  assert.equal(E.quote(ak,{seed:661,wear:2},settings).value,0);assert.equal(snapshot.value,1234567);
  const missing={...ak,prices:[[null,null,null,null,null],[null,null,null,null,null]]};
  assert.equal(E.quote(missing,{seed:661,wear:1},settings).value,null);
  const fade=Object.values(D.items).find(i=>i.fade),seed=fade.fade.percentages.findIndex(v=>v<95);
  const custom=E.quote(fade,{seed,wear:0},{patternPrices:{[`${fade.id}:${seed}:0:0`]:321}});
  assert.equal(custom.value,32100);assert.equal(custom.simulation,true);
});
test('Doppler openings generate gemstones at the configured conditional probability',()=>{
  const item=Object.values(D.items).find(i=>i.en==='★ Karambit | Doppler');
  const crate={id:'test',items:[],rare:[item.id],price:1};
  const rng=seeded(19);let gems=0;
  for(let i=0;i<10000;i++) {
    const r=E.open(crate,{[item.id]:item},{gemChance:5},sequence(.999,rng(),rng(),rng(),rng(),rng(),rng(),rng()));
    assert.equal(r.value,E.quote(item,r).value);
    if(item.variants.find(v=>v.key===r.variantKey).gem)gems++;
  }
  assert.ok(gems>400&&gems<600,String(gems));
  for(const chance of [0,100]) for(let i=0;i<50;i++) {
    const r=E.open(crate,{[item.id]:item},{gemChance:chance},sequence(.999,rng(),rng(),rng(),rng(),rng(),rng(),rng()));
    assert.equal(item.variants.find(v=>v.key===r.variantKey).gem,chance===100);
  }
});

test('24 complete cases, expected weapon counts, unique gold market names, valid local artwork',()=>{
  assert.equal(D.cases.length,24);
  const specialCounts = {'Operation Bravo Case':15, 'CS:GO Weapon Case':9, 'Operation Breakout Weapon Case':14, 'Shadow Case':16,
    'Chroma 2 Case':15, 'Operation Vanguard Weapon Case':14};
  for(const c of D.cases) {
    assert.equal(c.items.length,specialCounts[c.en]??17,c.en);
    assert.ok(c.price>0);
    assert.equal(new Set(c.rare.map(id=>D.items[id].en)).size,c.rare.length);
    for(let i=0;i<4;i++) assert.ok(c.items.some(id=>D.items[id].rarity===i));
    assert.ok(Math.abs(Object.values(E.itemProbabilities(c,D.items)).reduce((a,b)=>a+b,0)-1)<1e-12);
    // Exercise every tier in every case, including the newly added gold pools.
    [0,.8,.97,.995,.999].forEach((roll,tier)=>{
      const r=E.open(c,D.items,{},sequence(roll));
      assert.equal(r.tier,tier,c.en);
      assert.ok((tier===4?c.rare:c.items).includes(r.itemId),c.en);
    });
  }
  for(const s of [...D.cases,...Object.values(D.items),...Object.values(D.items).flatMap(s=>s.variants||[])]) {
    const file=path.join(__dirname,'..',s.image);
    assert.ok(fs.existsSync(file),s.image);
    assert.ok(fs.statSync(file).size>100,s.image);
  }
});
test('rarity thresholds use the disclosed ratio exactly, including boundaries',()=>{
  const weights=E.TIERS.map(t=>t.weight);
  assert.equal(E.weighted(weights,()=>0),0);
  assert.equal(E.weighted(weights,()=>625/782),1);
  assert.equal(E.weighted(weights,()=>750/782),2);
  assert.equal(E.weighted(weights,()=>775/782),3);
  assert.equal(E.weighted(weights,()=>780/782),4);
  assert.equal(E.weighted(weights,()=>1-Number.EPSILON),4);
});
test('seeded 250,000 rolls agree with rarity probabilities within six standard deviations',()=>{
  const rng=seeded(), weights=E.TIERS.map(t=>t.weight), counts=[0,0,0,0,0],n=250000;
  for(let i=0;i<n;i++)counts[E.weighted(weights,rng)]++;
  counts.forEach((count,i)=>{const p=weights[i]/782;assert.ok(Math.abs(count-n*p)<6*Math.sqrt(n*p*(1-p)),`${i}: ${count}`);});
});
test('float boundaries correctly classify wear',()=>{
  [0,.07,.15,.38,.45].forEach((float,i)=>assert.equal(E.wearIndex(float),i));
  assert.equal(E.wearIndex(1),4);assert.equal(E.wearIndex(null),null);
});
test('conditional wear probabilities integrate to 1 for every finish; vanilla has no wear',()=>{
  const rng=seeded();
  for(const item of Object.values(D.items)) {
    const probabilities=E.wearProbabilities(item);
    if(item.min===null){assert.equal(E.rollFloat(item,rng),null);continue;}
    assert.ok(Math.abs(probabilities.reduce((a,b)=>a+b,0)-1)<1e-10,item.en);
    for(let i=0;i<30;i++){
      const f=E.rollFloat(item,rng);assert.ok(f>=item.min&&f<=item.max,item.en);
      assert.ok(probabilities[E.wearIndex(f)]>0,item.en);
    }
  }
});
test('restricted float ranges change wear probability instead of using fixed buckets',()=>{
  const item={min:0,max:.08};
  const p=E.wearProbabilities(item);
  assert.ok(p[0]>.95);assert.equal(p[2],0);assert.equal(p[3],0);assert.equal(p[4],0);
  const rng=seeded(9),n=80000,counts=[0,0,0,0,0];
  for(let i=0;i<n;i++)counts[E.wearIndex(E.rollFloat(item,rng))]++;
  assert.ok(Math.abs(counts[0]/n-p[0])<.003);
});
test('all rare drops are in the selected case and gloves never get StatTrak',()=>{
  const c=D.cases.find(c=>c.en==='Revolution Case');
  for(let i=0;i<100;i++){
    const r=E.open(c,D.items,{},sequence(.999,.2,.3,0,.1,.5));
    assert.equal(r.tier,4);assert.ok(c.rare.includes(r.itemId));assert.equal(r.stattrak,false);
  }
});
test('ordinary guns can receive StatTrak with the correct independent threshold',()=>{
  const c=D.cases[0];
  const a=E.open(c,D.items,{},sequence(0,0,.099,0,0,0));
  const b=E.open(c,D.items,{},sequence(0,0,.1,0,0,0));
  assert.equal(a.stattrak,true);assert.equal(b.stattrak,false);
});
test('accounting rounds currency to cents, includes key price and fee, allows free cases',()=>{
  const item={id:'x',rarity:0,stattrak:false,min:0,max:1,prices:[[100,100,100,100,100]]};
  const c={id:'c',items:['x'],rare:[],price:1.23};
  const r=E.open(c,{x:item},{keyPrice:18,fee:2.5},()=>0);
  assert.equal(r.cost,1923);assert.equal(r.netValue,9750);assert.equal(r.profit,7827);
  const free=E.open(c,{x:item},{casePrice:0,keyPrice:0},()=>0);assert.equal(free.cost,0);assert.equal(free.profit,10000);
});
test('missing prices remain unknown rather than fabricated zero-price results',()=>{
  const item={id:'x',rarity:0,stattrak:false,min:0,max:1,prices:[[null,null,null,null,null]]};
  const r=E.open({id:'c',items:['x'],rare:[],price:1},{x:item},{keyPrice:18},()=>0);
  assert.equal(r.value,null);assert.equal(r.profit,null);
  const s=E.summarize([r]);assert.equal(s.unknown,1);assert.equal(s.cost,1900);assert.equal(s.profit,-1900);
});
test('10-box batches preserve individual accounting and quality counts across cases',()=>{
  const rng=seeded(),records=[];
  for(let i=0;i<10;i++)records.push(E.open(D.cases[i%D.cases.length],D.items,{keyPrice:18,fee:2.5},rng));
  const s=E.summarize(records);
  assert.equal(s.count,10);assert.equal(s.tiers.reduce((a,b)=>a+b),10);
  assert.equal(s.cost,records.reduce((sum,r)=>sum+r.cost,0));
  assert.equal(s.profit,records.reduce((sum,r)=>sum+(r.netValue??0)-r.cost,0));
});
