(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CaseEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TIERS = [
    {name:'军规级', color:'#6588ff', weight:625},
    {name:'受限级', color:'#a080ff', weight:125},
    {name:'保密级', color:'#d36beb', weight:25},
    {name:'隐秘级', color:'#f26b73', weight:5},
    {name:'罕见特殊', color:'#eeb95c', weight:2},
  ];
  const WEARS = ['崭新出厂','略有磨损','久经沙场','破损不堪','战痕累累'];
  const WEARS_EN = ['Factory New','Minimal Wear','Field-Tested','Well-Worn','Battle-Scarred'];
  const EDGES = [0,.07,.15,.38,.45,1];
  const WEIGHTS = [.03,.24,.33,.24,.16];
  const buffer = new Uint32Array(1);
  function random() { globalThis.crypto.getRandomValues(buffer); return buffer[0] / 4294967296; }
  function weighted(weights, rng = random) {
    let point = rng() * weights.reduce((sum, n) => sum + n, 0);
    for (let i=0;i<weights.length;i++) { point -= weights[i]; if (point < 0) return i; }
    return weights.length - 1;
  }
  const pick = (arr, rng) => arr[Math.min(arr.length - 1, Math.floor(rng() * arr.length))];
  const cents = n => Math.round(n * 100);
  function wearIndex(float) {
    if (float === null) return null;
    for (let i=0;i<5;i++) if (float < EDGES[i+1] || i === 4) return i;
  }
  function rollFloat(item, rng = random) {
    if (item.min === null) return null;
    const bucket = weighted(WEIGHTS, rng);
    const unit = EDGES[bucket] + rng() * (EDGES[bucket+1] - EDGES[bucket]);
    return Math.max(item.min, Math.min(item.max, Math.fround(item.min + unit * (item.max-item.min))));
  }
  function wearProbabilities(item) {
    if (item.min === null) return [0,0,0,0,0];
    if (item.max === item.min) return WEARS.map((_,i)=>i===wearIndex(item.min)?1:0);
    return WEARS.map((_, w) => {
      const lo = Math.max(0, (EDGES[w] - item.min)/(item.max-item.min));
      const hi = Math.min(1, (EDGES[w+1] - item.min)/(item.max-item.min));
      return WEIGHTS.reduce((sum, weight, b) => sum + weight * Math.max(0, Math.min(hi, EDGES[b+1])-Math.max(lo, EDGES[b]))/(EDGES[b+1]-EDGES[b]), 0);
    });
  }
  function itemProbabilities(crate, items) {
    const result = {};
    for (let tier=0;tier<4;tier++) {
      const ids = crate.items.filter(id=>items[id].rarity===tier);
      for (const id of ids) result[id] = TIERS[tier].weight/782/ids.length;
    }
    const models = [...new Set(crate.rare.map(id=>items[id].model))];
    for (const model of models) {
      const ids = crate.rare.filter(id=>items[id].model===model);
      for (const id of ids) result[id] = 2/782/models.length/ids.length;
    }
    return result;
  }
  function variantProbabilities(item, gemChance = 5) {
    const variants = item.variants || [];
    const gems = variants.filter(v=>v.gem).length, regular = variants.length-gems;
    const fraction = Math.max(0, Math.min(100, Number.isFinite(gemChance)?gemChance:5))/100;
    return variants.map(v=>v.gem ? (regular?fraction:1)/gems : (gems?1-fraction:1)/regular);
  }
  function quote(item, {wear=0, stattrak=false, seed, variantKey} = {}, settings = {}) {
    const base = item.prices[stattrak?1:0]?.[wear??0] ?? null;
    const variant = item.variants?.find(v=>v.key===variantKey);
    const pattern = item.patterns?.find(p=>p.seed===seed);
    let price=base, priceSource='BUFF 聚合快照', specialLabel=null, simulation=false, multiplier=null;
    if (variantKey) {
      price=variant?.prices[stattrak?1:0]?.[wear??0]??null;
      priceSource='BUFF 独立相位报价'; specialLabel=variant?.label??variantKey;
    } else if (pattern) {
      const override=settings.patternMultipliers?.[`${item.id}:${seed}`];
      multiplier=Number.isFinite(override)&&override>=1&&override<=10000 ? override : pattern.multiplier;
      price=base===null?null:base*multiplier;
      priceSource=`模拟估价 · 同磨损 / StatTrak 基价 × ${multiplier}`;
      specialLabel=pattern.label; simulation=true;
    }
    return {value:price===null?null:cents(price), baseValue:base===null?null:cents(base),
      variantKey:variantKey||null, specialLabel, priceSource, simulation, multiplier};
  }
  function open(crate, items, settings = {}, rng = random) {
    const tier = weighted(TIERS.map(t=>t.weight), rng);
    let candidates;
    if (tier < 4) candidates = crate.items.filter(id=>items[id].rarity===tier);
    else {
      const models = [...new Set(crate.rare.map(id=>items[id].model))];
      const model = pick(models, rng);
      candidates = crate.rare.filter(id=>items[id].model===model);
    }
    if (!candidates.length) throw new Error('箱内数据不完整，无法模拟此品质');
    const item = items[pick(candidates, rng)];
    const stattrak = item.stattrak && rng()<.1;
    const float = rollFloat(item, rng);
    const wear = wearIndex(float);
    const seed = Math.floor(rng()*1000);
    const variantKey = item.variants?.length ? item.variants[weighted(variantProbabilities(item, settings.gemChance), rng)].key : null;
    const valuation = quote(item, {wear, stattrak, seed, variantKey}, settings);
    const {value} = valuation;
    const feeRate = Math.max(0, Math.min(100, Number(settings.fee ?? 0)));
    const netValue = value === null ? null : Math.round(value*(1-feeRate/100));
    const casePrice = settings.casePrice ?? crate.price;
    const cost = cents(casePrice) + cents(settings.keyPrice ?? 18);
    return {itemId:item.id, caseId:crate.id, tier, stattrak, float, wear,
      seed, ...valuation, netValue, cost, feeRate,
      caseCost:cents(casePrice), keyCost:cents(settings.keyPrice??18),
      profit:netValue === null ? null : netValue-cost, time:new Date().toISOString()};
  }
  function summarize(records) {
    const totals = {count:records.length, cost:0, value:0, profit:0, unknown:0, wins:0, stattrak:0, tiers:[0,0,0,0,0], wears:[0,0,0,0,0]};
    for (const r of records) {
      totals.cost += r.cost;
      if (r.netValue === null) totals.unknown++;
      else { totals.value += r.netValue; if (r.profit>0) totals.wins++; }
      if (r.stattrak) totals.stattrak++;
      totals.tiers[r.tier]++;
      if (r.wear !== null) totals.wears[r.wear]++;
    }
    totals.profit = totals.value - totals.cost;
    return totals;
  }
  return {TIERS, WEARS, WEARS_EN, EDGES, WEIGHTS, random, weighted, cents, wearIndex, rollFloat, wearProbabilities, itemProbabilities, variantProbabilities, quote, open, summarize};
});
