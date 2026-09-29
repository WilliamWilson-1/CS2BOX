/* Pure browser application. No framework, build step, or API credentials. */
(() => {
  'use strict';
  const D = window.CS2_DATA, E = window.CaseEngine;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const money = (cents, signed = false) => cents === null ? '暂无报价' : `${cents < 0 ? '−' : signed && cents > 0 ? '+' : ''}¥${(Math.abs(cents)/100).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const colorClass = n => n === null || n === 0 ? 'neutral' : n > 0 ? 'gain' : 'loss';
  const pct = n => `${(n*100).toFixed(2)}%`;
  const KEY = 'caselab.session.v1';
  const defaults = {keyPrice:18, fee:0, gemChance:5, patternMultipliers:{}, casePrices:{}, fast:false, selected:D.cases[0].id};
  let settings = {...defaults}, records = [], quantity = 1, busy = false, auto = false, remaining = 0;
  let view = 'lab', contentMode = 'normal', pageSize = 100, animation = null, lastRevealed = null, toastTimer, autoTimer;
  let storageWarning = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const caseById = Object.fromEntries(D.cases.map(c=>[c.id,c]));
  function validRecord(r) {
    return r && D.items[r.itemId] && caseById[r.caseId] && Number.isInteger(r.tier) && r.tier>=0 && r.tier<5 &&
      Number.isSafeInteger(r.cost) && r.cost>=0 && (r.netValue===null || Number.isSafeInteger(r.netValue) && r.netValue>=0) &&
      (r.value===null || Number.isSafeInteger(r.value) && r.value>=0) &&
      (r.wear===null || Number.isInteger(r.wear) && r.wear>=0 && r.wear<5) &&
      (r.float===null || Number.isFinite(r.float) && r.float>=0 && r.float<=1) && typeof r.time==='string' && Number.isFinite(Date.parse(r.time));
  }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved?.version === 1) {
      records = Array.isArray(saved.records) ? saved.records.filter(validRecord).map((r,i)=>({...r,index:i+1,profit:r.netValue===null?null:r.netValue-r.cost})) : [];
      const s = saved.settings || {};
      if (Number.isFinite(s.keyPrice) && s.keyPrice>=0 && s.keyPrice<=100000) settings.keyPrice=s.keyPrice;
      if (Number.isFinite(s.fee) && s.fee>=0 && s.fee<=100) settings.fee=s.fee;
      if (caseById[s.selected]) settings.selected=s.selected;
      settings.fast=!!s.fast;
      if (Number.isFinite(s.gemChance) && s.gemChance>=0 && s.gemChance<=100) settings.gemChance=s.gemChance;
      settings.patternMultipliers=Object.fromEntries(Object.entries(s.patternMultipliers||{}).filter(([key,v])=>Number.isFinite(v)&&v>=1&&v<=10000&&Object.values(D.items).some(item=>item.patterns?.some(p=>`${item.id}:${p.seed}`===key))));
      settings.casePrices=Object.fromEntries(Object.entries(s.casePrices||{}).filter(([id,v])=>caseById[id] && Number.isFinite(v) && v>=0 && v<=100000));
    }
  } catch { setTimeout(()=>toast('无法读取本地存档，当前实验仍可正常使用。'),100); }
  const currentCase = () => caseById[settings.selected];
  const currentPrice = () => settings.casePrices[settings.selected] ?? currentCase().price;
  const currentCost = () => E.cents(currentPrice()) + E.cents(settings.keyPrice);
  const priceDate = D.meta.priceModified ? new Date(D.meta.priceModified) : null;
  const dateLabel = priceDate ? priceDate.toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit'}).replaceAll('/','.') : '上游时间未知';
  const timeLabel = priceDate ? priceDate.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}) + '（北京时间）' : '上游未提供更新时间';
  function toast(message) {
    clearTimeout(toastTimer); $('toast').textContent=message; $('toast').classList.add('visible');
    toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3200);
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({version:1,settings,records})); }
    catch {
      if (!storageWarning) { toast('本地存储已满或不可用，请导出记录；当前会话可继续。'); storageWarning=true; }
      document.querySelector('.live-badge').textContent='仅当前会话';
    }
  }
  function img(item, cls='', lazy=true) {
    return `<img src="${esc(item.image)}" data-fallback="${esc(item.remoteImage)}" alt="${esc(item.name)}" ${lazy?'loading="lazy"':''} decoding="async" class="${cls}">`;
  }
  document.addEventListener('error', e=>{
    if (e.target.tagName !== 'IMG') return;
    const el=e.target;
    if (el.dataset.fallback) { el.src=el.dataset.fallback; delete el.dataset.fallback; }
    else { el.src='assets/favicon.svg'; el.style.opacity='.35'; }
  },true);
  function renderCases() {
    const normalize = text => text.toLowerCase().replace(/[\s“”"']/g,'').replaceAll('伽马','伽玛');
    const query=normalize($('case-search').value.trim());
    const filtered=D.cases.filter(c=>normalize(c.name+' '+c.en).includes(query));
    $('case-count').textContent=`${filtered.length} 款`;
    $('case-rail').innerHTML=filtered.length ? filtered.map(c=>`<button class="case-card ${c.id===settings.selected?'selected':''}" data-case="${c.id}" aria-pressed="${c.id===settings.selected}" ${busy||auto?'disabled':''}>
      ${c.id===settings.selected?'<span class="selected-check">✓</span>':''}${img(c,'',false)}<span class="case-title">${esc(c.name)}</span><span class="case-bottom"><strong>${money(E.cents(settings.casePrices[c.id]??c.price))}</strong><span>${c.rare.some(id=>D.items[id].model.includes('glove') || D.items[id].model.includes('handwrap'))?'GLOVES':'KNIVES'}</span></span></button>`).join('') : '<div class="empty-recent">没有匹配的武器箱，试试「梦魇」或「千瓦」。</div>';
  }
  function appearance(item, record) {
    const variant=item.variants?.find(v=>v.key===record?.variantKey);
    return {...item, ...(variant?{image:variant.image,remoteImage:variant.remoteImage}:{}),
      finish:record?.specialLabel?`${item.finish} · ${record.specialLabel}`:item.finish};
  }
  const specialBadge = r => r?.specialLabel ? `<span class="variant-badge ${r.simulation?'simulated':''}">${esc(r.specialLabel)}${r.simulation?' · 模拟估价':''}</span>` : '';
  function reelCard(item) {
    return `<div class="reel-item" style="--rarity:${E.TIERS[item.rarity].color}">${img(item,'',false)}<span>${esc(item.weapon)}</span><strong>${esc(item.finish)}</strong></div>`;
  }
  function reelWidth() { return matchMedia('(max-width:600px)').matches ? 135 : 151; }
  function renderIdleReel() {
    const c=currentCase();
    const list=[c.items[0],c.items[8],c.items.at(-2),c.items[12%c.items.length],c.items[2],c.items[9%c.items.length],c.rare[0]];
    $('reel-track').innerHTML=list.map(id=>reelCard(D.items[id])).join('');
    $('reel-track').style.transform=`translateX(-${3*reelWidth()+(reelWidth()-5)/2}px)`;
  }
  function updateControls() {
    const locked=busy||auto;
    $('open-button').disabled=locked;
    $('open-button').querySelector('span').textContent=busy ? '正在揭晓…' : quantity===10 ? '开启 10 箱' : '开启武器箱';
    $('open-price').textContent=money(currentCost()*quantity);
    $('unit-cost').textContent=money(currentCost());
    $('cost-detail').textContent=`箱子 ${money(E.cents(currentPrice()))} + 钥匙 ${money(E.cents(settings.keyPrice))}`;
    $('auto-button').innerHTML=auto ? `<span>■</span> 停止 · 剩余 ${remaining} 箱` : '<span>↻</span> 自动开箱';
    $('auto-button').classList.toggle('running',auto);
    $('auto-button').disabled=busy&&!auto;
    $('auto-count').disabled=locked;
    $('fast-mode').disabled=locked;
    $('settings-button').disabled=locked;
    $('reset-button').disabled=locked;
    document.querySelectorAll('[data-quantity],[data-case]').forEach(el=>el.disabled=locked);
  }
  function selectCase(id) {
    if (busy||auto||!caseById[id]) return;
    settings.selected=id;
    lastRevealed=null;
    const c=currentCase();
    $('selected-en').textContent=c.en.toUpperCase();
    $('selected-name').textContent=c.name;
    $('selected-description').textContent='未知的惊喜，就藏在下一次开启。';
    document.querySelector('.stage-tags span').textContent=`${c.items.length} 款武器涂装`;
    $('hero-image').src=c.image;
    $('hero-image').dataset.fallback=c.remoteImage;
    $('hero-image').alt=c.name;
    const gloves=c.rare.some(id=>!D.items[id].stattrak);
    $('rare-tag').textContent=gloves?'★ 罕见手套':'★ 罕见刀具';
    $('result-bar').innerHTML='<span class="result-status"><span class="tiny-dot"></span> 准备就绪</span><span class="muted">所有结果均为模拟，不产生真实交易</span>';
    renderCases(); renderIdleReel(); renderContents(); updateControls(); save();
  }
  function skinCard(item, record=null, chance=null) {
    const tier=E.TIERS[item.rarity];
    item=appearance(item,record);
    const prices=item.prices[0].filter(p=>p!==null);
    const min=prices.length ? Math.min(...prices) : null;
    const head=record ? (record.float===null?'无涂装':E.WEARS[record.wear]) : tier.name;
    return `<button class="skin-card" style="--rarity:${tier.color}" data-skin="${item.id}" ${record?`data-record="${record.index}"`:''} aria-label="查看 ${esc(item.name)} 详情"><span class="card-top"><span>${head}</span>${record?.stattrak?'<span class="st-badge">ST™</span>':`<span>${record?'#'+record.index:chance===null?'':pct(chance)}</span>`}</span><span class="card-glow"></span>${img(item)}<div class="skin-weapon">${esc(item.weapon)}</div><div class="skin-finish">${esc(item.finish)}</div>${record?.simulation?'<small class="simulation-label">模拟估价</small>':''}<div class="skin-price">${record?`<span>${money(record.value)}</span><span class="${colorClass(record.profit)}">${money(record.profit,true)}</span>`:`<span>${min===null?'暂无报价':money(E.cents(min))}</span><small>${min===null?'待补充':item.variants?.length?'含独立相位':item.patterns?.length?'含模板估价':'参考价起'}</small>`}</div></button>`;
  }
  function renderContents() {
    const c=currentCase(), ids=contentMode==='normal'?c.items:c.rare;
    const probabilities=E.itemProbabilities(c,D.items);
    const sorted=[...ids].sort((a,b)=>D.items[b].rarity-D.items[a].rarity);
    $('contents-count').textContent=`${ids.length} 款${contentMode==='rare'&&ids.some(id=>D.items[id].variants?.length)?' · 可检视独立相位':''}`;
    $('contents-grid').innerHTML=sorted.map(id=>skinCard(D.items[id],null,probabilities[id])).join('');
    $('rarity-legend').innerHTML=E.TIERS.map(t=>`<span><i class="quality-dot" style="--rarity:${t.color}"></i>${t.name}<b>${pct(t.weight/782)}</b></span>`).join('');
    document.querySelectorAll('[data-content]').forEach(el=>el.classList.toggle('selected',el.dataset.content===contentMode));
  }
  function renderRecent() {
    $('recent-grid').innerHTML=records.length ? records.slice(-6).reverse().map(r=>skinCard(D.items[r.itemId],r)).join('') : '<div class="empty-recent"><span class="empty-symbol">▱</span><div><strong>你的收藏，从第一箱开始</strong>开启一个武器箱，看看今天的手气。</div></div>';
    $('recent-caption').textContent=`最近 ${Math.min(6,records.length)} 件 · 点击检视详情`;
  }
  function renderStats() {
    const s=E.summarize(records);
    $('total-profit').textContent=money(s.profit,true);
    $('total-profit').className='big-profit '+colorClass(s.profit);
    $('profit-label').textContent=s.unknown?'已知估值下界':'累计盈亏';
    $('profit-caption').textContent=s.unknown?`${s.unknown} 件暂无报价，完整盈亏待定` : s.count?`${s.wins} 箱盈利 / ${s.count} 箱 · 已扣除钥匙与设定手续费`:'从第一箱开始，记录每一份运气。';
    $('total-cost').textContent=money(s.cost);
    $('total-value').textContent=money(s.value);
    $('total-count').innerHTML=`${s.count.toLocaleString()} <small>箱</small>`;
    $('roi').textContent=s.unknown?'待估值':s.cost?`${s.profit>0?'+':''}${(s.profit/s.cost*100).toFixed(1)}%`:'—';
    $('roi').className=s.cost&&!s.unknown?colorClass(s.profit):'';
    $('stattrak-count').textContent=`StatTrak™ ${s.stattrak}`;
    $('nav-count').textContent=s.count.toLocaleString();
    $('chart-end').textContent=`${s.count.toLocaleString()} 次开箱`;
    $('quality-bar').innerHTML=E.TIERS.map((t,i)=>`<span style="width:${s.count?s.tiers[i]/s.count*100:[62,18,10,6,4][i]}%;background:${t.color};opacity:${s.count?1:.4};${s.count&&!s.tiers[i]?'display:none':''}"></span>`).join('');
    $('quality-list').innerHTML=E.TIERS.map((t,i)=>`<div class="quality-row"><span><i class="quality-dot" style="--rarity:${t.color}"></i>${t.name}</span><span><small>${s.count?pct(s.tiers[i]/s.count):'—'}</small><strong>${s.tiers[i]}</strong></span></div>`).join('');
    if(records.some(r=>r.simulation)) $('profit-caption').textContent+=' · 含模板模拟估价';
    renderChart(s);
  }
  function renderChart(summary) {
    const values=[0]; let total=0;
    for (const r of records) { total+=(r.netValue??0)-r.cost; values.push(total); }
    const min=Math.min(0,...values.filter((_,i)=>i%Math.max(1,Math.floor(values.length/200))===0),total);
    const max=Math.max(0,...values.filter((_,i)=>i%Math.max(1,Math.floor(values.length/200))===0),total);
    const range=max-min||1;
    const y=n=>74-(n-min)/range*66;
    const stride=Math.max(1,Math.ceil(values.length/240));
    const points=values.flatMap((v,i)=>i%stride===0||i===values.length-1?[[i/(values.length-1||1)*300,y(v)]]:[]);
    const line=points.map((p,i)=>`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const color=summary.profit<0?'#d87c73':summary.profit>0?'#78b799':'#65616a';
    $('profit-chart').innerHTML=`<defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${color}" stop-opacity=".16"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="M0 ${records.length?y(0):42}H300" stroke="#3c3b42" stroke-width="1" stroke-dasharray="3 5"/>${records.length?`<path d="${line}L300,85L0,85Z" fill="url(#chart-fill)"/><path d="${line}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/><circle cx="300" cy="${y(total)}" r="2.8" fill="${color}"/>`:''}`;
    $('profit-chart').setAttribute('aria-label',`累计盈亏走势，${records.length} 次开箱，${summary.unknown?'已知估值下界':'累计盈亏'} ${money(total)}`);
  }
  function setView(next) {
    if (next==='inventory' && auto) stopAuto();
    view=next;
    $('lab-view').hidden=view!=='lab'; $('inventory-view').hidden=view!=='inventory';
    document.querySelectorAll('[data-view]').forEach(el=>el.classList.toggle('active',el.dataset.view===view));
    if (view==='inventory') renderInventory();
  }
  function renderInventory() {
    const query=$('inventory-search').value.toLowerCase().trim(), tier=$('inventory-tier').value;
    let filtered=records.filter(r=>{
      const item=D.items[r.itemId];
      return (tier==='all'||r.tier===Number(tier)) && `${item.name} ${item.en} ${r.specialLabel||''} ${r.variantKey||''} ${r.seed} ${r.stattrak?'StatTrak 暗金':''}`.toLowerCase().includes(query);
    });
    const sort=$('inventory-sort').value;
    filtered.sort((a,b)=>sort==='value'?(b.value??-Infinity)-(a.value??-Infinity)||b.index-a.index:sort==='profit'?(b.profit??-Infinity)-(a.profit??-Infinity)||b.index-a.index:b.index-a.index);
    $('inventory-count').textContent=`${records.length.toLocaleString()} 件`;
    $('filter-count').textContent=`显示 ${Math.min(pageSize,filtered.length)} / ${filtered.length} 件`;
    $('inventory-body').innerHTML=filtered.length ? filtered.slice(0,pageSize).map(r=>{
      const item=appearance(D.items[r.itemId],r), t=E.TIERS[r.tier];
      return `<tr><td><button class="inventory-item" data-skin="${item.id}" data-record="${r.index}">${img(item)}<span><strong>${r.stattrak?'<span class="orange">ST™ </span>':''}${esc(item.name)}</strong>${specialBadge(r)}<small>#${r.index} · ${esc(caseById[r.caseId].name)}</small></span></button></td><td><span class="tier-pill" style="--rarity:${t.color}">${t.name}</span></td><td>${r.wear===null?'无涂装':E.WEARS[r.wear]}<small>${r.float===null?'—':r.float.toFixed(8)}</small></td><td>${money(r.value)}</td><td>${money(r.cost)}</td><td class="${colorClass(r.profit)}">${money(r.profit,true)}</td><td>${new Date(r.time).toLocaleTimeString('zh-CN',{hour12:false})}<small>${new Date(r.time).toLocaleDateString('zh-CN')}</small></td></tr>`;
    }).join('') : '<tr><td class="inventory-empty" colspan="7">'+(records.length?'没有符合条件的饰品，换个筛选试试。':'库存还是空的。回到开箱实验室，开启你的第一箱。')+'</td></tr>';
    $('load-more').hidden=filtered.length<=pageSize;
    $('export-button').disabled=!records.length;
  }
  function renderResultReel(result) {
    const c=currentCase();
    const ids=[c.items[1],c.items[8],result.itemId,c.items[3],c.items[12%c.items.length]];
    $('reel-track').innerHTML=ids.map((id,i)=>reelCard(i===2?appearance(D.items[id],result):D.items[id])).join('');
    $('reel-track').style.transform=`translateX(-${2*reelWidth()+(reelWidth()-5)/2}px)`;
  }
  async function spin(result, instant) {
    lastRevealed=result;
    if (instant || reducedMotion.matches) { renderResultReel(result); return; }
    const c=currentCase(), target=27;
    // Decorative neighbors do not determine the previously drawn result.
    const cards=Array.from({length:33},(_,i)=>i===target?appearance(D.items[result.itemId],result):D.items[c.items[Math.floor(E.random()*c.items.length)]]);
    const track=$('reel-track');
    track.innerHTML=cards.map(item=>reelCard(item)).join('');
    const width=reelWidth(), start=-(width-5)/2, end=-(target*width+(width-5)/2)+(E.random()-.5)*36;
    animation=track.animate([{transform:`translateX(${start}px)`},{transform:`translateX(${end}px)`}],{duration:2300,easing:'cubic-bezier(.12,.72,.12,1)',fill:'forwards'});
    try { await animation.finished; } catch { /* A hidden tab or user motion preference can finish the reveal. */ }
    track.style.transform=`translateX(${end}px)`;
    animation.cancel(); animation=null;
    if (width!==reelWidth()) renderResultReel(result);
  }
  async function performOpen(count=quantity, fromKeyboard=false) {
    if (busy) return;
    busy=true; updateControls();
    const c=currentCase(), batch=[];
    try {
      // Commit each result before animation: switching tabs cannot reroll a pending item.
      for (let i=0;i<count;i++) {
        const r=E.open(c,D.items,{...settings,casePrice:currentPrice()});
        r.index=records.length+1; r.priceDate=D.meta.priceModified; records.push(r); batch.push(r);
      }
      save();
      const last=batch.at(-1);
      $('result-bar').innerHTML=`<span class="result-status"><span class="tiny-dot"></span> 正在揭晓${count>1?` ${count} 箱`:''}…</span><span class="muted">独立随机 · 无保底机制</span>`;
      await spin(last,settings.fast||fromKeyboard);
      renderStats(); renderRecent();
      if (view==='inventory') renderInventory();
      const item=appearance(D.items[last.itemId],last), total=E.summarize(batch);
      $('result-bar').innerHTML=`<span class="result-status"><i class="quality-dot" style="--rarity:${E.TIERS[last.tier].color}"></i><span class="result-name">${last.stattrak?'ST™ ':''}${esc(item.weapon)} · ${esc(item.finish)}</span></span><span class="result-profit ${colorClass(total.unknown?null:total.profit)}">${batch.some(r=>r.simulation)?'模拟估价 · ':''}${count>1?'本轮 '+count+' 箱':'本次'} ${total.unknown?'待估值':money(total.profit,true)}</span>`;
      if (count===10) toast('10 箱已逐一结算，可在库存查看每一箱的盈亏。');
    } catch(error) {
      console.error(error); stopAuto(); toast('开箱未完成，请查看已保存的记录后重试。');
    } finally {
      busy=false;
      if (auto) {
        remaining-=batch.length;
        if (remaining<=0) { auto=false; toast('连续开箱完成，所有结果已保存。'); }
        else autoTimer=setTimeout(()=>{ if(auto) performOpen(1); }, settings.fast?130:450);
      }
      updateControls();
    }
  }
  function stopAuto() { auto=false;remaining=0;clearTimeout(autoTimer);updateControls(); }
  function modal(html) {
    $('modal-content').innerHTML=html;
    if (!$('modal').open) $('modal').showModal();
    $('modal').scrollTop=0;
  }
  function sourcesModal() {
    const age=priceDate?(Date.now()-priceDate.getTime())/86400000:null;
    modal(`<h2 class="modal-title">真实概率，真实人品</h2><p class="modal-subtitle">${D.cases.length} 款常见武器箱 · ${Object.keys(D.items).length} 款去重饰品 · 本地快照</p><div class="modal-body">
      <h3>价格与贴图</h3><div class="source-line"><strong>BUFF163 最低在售价 · 经 CSGO Trader 聚合</strong><small>上游文件更新：${esc(timeLabel)}<br>下载时间：${esc(new Date(D.meta.builtAt).toLocaleString('zh-CN'))}<br>这是聚合快照，不是 BUFF 实时成交价。上游文件时间不保证每件商品同一时刻更新。</small><p><a href="${D.meta.sources.buff}" target="_blank" rel="noopener noreferrer">价格原始 JSON ↗</a> · <a href="https://csgotrader.app/prices/" target="_blank" rel="noopener noreferrer">数据提供方 ↗</a></p></div>
      <div class="source-line"><strong>人民币换算 / 箱价与钥匙分开计费</strong><small>聚合源美元价 × ${D.meta.usdCny.toFixed(6)} CNY/USD，按分四舍五入。汇率来自同一提供方。默认钥匙 ¥18.00 为可调整的模拟设定，不冒充实时国服售价。</small><p><a href="${D.meta.sources.rates}" target="_blank" rel="noopener noreferrer">汇率原始 JSON ↗</a></p></div>
      <div class="source-line"><strong>名称、内容池、Float 范围及原始贴图</strong><small>ByMykel / CSGO-API 公开游戏数据，贴图来源 Valve Steam CDN。贴图是涂装预览，不会随模拟 Float 或图案种子动态变化。</small><p><a href="https://github.com/ByMykel/CSGO-API" target="_blank" rel="noopener noreferrer">CSGO-API ↗</a></p></div>
      ${age>2?`<div class="notice">当前快照距今约 ${Math.floor(age)} 天。请更新数据后再比较价格。</div>`:''}
      <h3>品质概率 · 每次独立抽取</h3><table class="modal-table"><thead><tr><th>品质</th><th>权重</th><th>开出概率</th></tr></thead><tbody>${E.TIERS.map(t=>`<tr><td><span style="color:${t.color}">●</span> ${t.name}</td><td>${t.weight} / 782</td><td>${pct(t.weight/782)}</td></tr>`).join('')}</tbody></table><p>按完美世界公开品质比例 5:1、特殊与隐秘 2:5 推导，使用整数权重而非四舍五入后的百分比。枪械同品质内等概率；支持的枪械与刀具有 10% StatTrak™ 概率，手套无 StatTrak™。没有连败补偿或保底。</p><p><a href="https://www.csgo.com.cn/hd/1707/lotteryrecords/index.html" target="_blank" rel="noopener noreferrer">国服概率公示 ↗</a></p>
      <h3>磨损概率 · 社区近似模型</h3><table class="modal-table"><thead><tr><th>基准磨损</th><th>归一化 Float 区间</th><th>模型权重</th></tr></thead><tbody>${E.WEARS.map((w,i)=>`<tr><td>${w}</td><td>${E.EDGES[i].toFixed(2)} – ${E.EDGES[i+1].toFixed(2)}</td><td>${pct(E.WEIGHTS[i])}</td></tr>`).join('')}</tbody></table><p>参考 CSFloat 2020 年统计：先按权重选段，在段内均匀生成 u，再映射 Float = min + u × (max − min)。饰品磨损概率据其范围重新积分，不能把 3% / 24% / 33% / 24% / 16% 直接套给每件饰品。该模型近似统计形状，不复刻服务端 RNG 或区间缝隙，不属于 Valve 官方磨损概率。</p><p><a href="https://blog.csfloat.com/analysis-of-float-value-and-paint-seed-distribution-in-cs-go/" target="_blank" rel="noopener noreferrer">CSFloat 分布研究 ↗</a></p>
      <div class="notice">金色池先等概率选刀型/手套型号，再等概率选涂装，此为模拟假设。多普勒按具体相位使用独立报价与预览图。抽中多普勒后，宝石相位合计默认占 5%（可在设置中调整），普通相位均分其余概率、宝石之间均分；此为模拟设定，并非官方概率。AK 淬火 661、爪子刀淬火 387 使用同磨损 / StatTrak 基价 × 可调倍数的模拟估价，默认 100 倍不是市场报价。未模拟超低磨溢价。图案种子 0–999。缺失报价保留为空，并提示盈亏未完整估值。</div>
      <h3>盈亏如何计算</h3><p>单次盈亏 = 参考价 × (1 − 手续费率) − 箱价 − 钥匙费；货币按分计算。历史记录锁定开箱当时的价格和设置。参考在售价不等于实际可售金额，所有开箱只在本地模拟。</p><p>在项目目录运行 <code>python scripts/build_data.py --refresh --images</code> 可重新获取公开快照和贴图。刷新页面后新开箱使用新数据，已保存的旧记录保持原值。</p></div>`);
  }
  function skinModal(id, recordIndex, selected) {
    const base=D.items[id], r=recordIndex?records.find(r=>r.index===Number(recordIndex)):null;
    const choice=selected ?? (r ? (r.variantKey || (base.patterns?.some(p=>p.seed===r.seed)?`seed:${r.seed}`:'')) : base.variants?.[0]?.key || '');
    const pattern=base.patterns?.find(p=>`seed:${p.seed}`===choice);
    const variant=base.variants?.find(v=>v.key===choice);
    const quoteAt=(wear,stattrak)=>E.quote(base,{wear,stattrak,seed:pattern?.seed,variantKey:variant?.key},settings);
    const item={...appearance(base,{variantKey:variant?.key,specialLabel:variant?.label||pattern?.label}),
      prices:[false,true].map(st=>[0,1,2,3,4].map(w=>{const value=quoteAt(w,st).value;return value===null?null:value/100;}))};
    const variants=base.variants||[], patterns=base.patterns||[];
    const variantOdds=E.variantProbabilities(base,settings.gemChance);
    const multiplier=pattern?quoteAt(0,false).multiplier:null;
    const c=r?caseById[r.caseId]:currentCase();
    const probabilities=E.wearProbabilities(item), chance=E.itemProbabilities(c,D.items)[id] || 0;
    modal(`<div class="detail-hero"><div><span class="detail-tier" style="--rarity:${E.TIERS[item.rarity].color}">${E.TIERS[item.rarity].name}${r?.stattrak?' · StatTrak™':''}</span><div class="eyebrow">${esc(item.weapon)}</div><h2 class="modal-title">${esc(item.finish)}</h2><span class="muted" style="font-size:10px">${esc(item.en)}</span></div>${img(item,'',false)}</div><div class="modal-body">
      ${r?`<div class="notice">${specialBadge(r)}第 ${r.index} 箱 · ${esc(c.name)}<br>${r.float===null?'无磨损等级':`${E.WEARS[r.wear]} · Float ${r.float.toFixed(8)}`} · 图案 #${r.seed}<br>${r.simulation?'当时模拟估价':'当时参考价'} ${money(r.value)} · 成本 ${money(r.cost)} · 手续费 ${r.feeRate}%<br>单次盈亏 <strong class="${colorClass(r.profit)}">${money(r.profit,true)}</strong><br><small>${esc(r.priceSource||'历史聚合快照（未细分相位）')}<br>记录时间 ${esc(new Date(r.time).toLocaleString('zh-CN'))}</small></div>`:''}
      ${!r&&(variants.length||patterns.length)?`<div class="variant-panel"><label for="special-select">相位 / 特殊模板</label><select id="special-select">${variants.length?'':`<option value="">普通图案 · 基础报价</option>`}${variants.map(v=>`<option value="${esc(v.key)}" ${choice===v.key?'selected':''}>${esc(v.label)}${v.gem?' · 宝石相位':''}</option>`).join('')}${patterns.map(p=>`<option value="seed:${p.seed}" ${pattern===p?'selected':''}>${esc(p.label)} · 模拟估价</option>`).join('')}</select></div>`:''}
      ${variant?`<div class="notice">${esc(variant.label)} · 独立相位报价 · ${dateLabel}<br>抽中此多普勒后，相位占比 ${pct(variantOdds[variants.indexOf(variant)])}（模拟设定，可在模拟设置中调整宝石总占比）。缺失报价保留为空。</div>`:''}
      ${pattern?`<div class="notice simulation-notice"><strong>模拟估价 · ${esc(pattern.label)}</strong><br>同磨损 / StatTrak 普通淬火基价 × ${multiplier}。默认 100 倍仅为游戏模拟设定，不是该模板的市场报价。<br>命中种子 #${pattern.seed} 才生效，抽中此涂装后模板概率 0.10%。贴图为通用涂装预览，不复现该种子的纹路。<br><a href="${esc(pattern.source)}" target="_blank" rel="noopener noreferrer">模板识别依据 ↗</a>（该来源不提供本模拟倍数）</div>${!r?`<form id="pattern-form" class="pattern-form"><label>模拟溢价倍数<input aria-label="模拟溢价倍数" name="multiplier" type="number" min="1" max="10000" step="0.1" required value="${multiplier}"></label><button class="secondary-button" type="submit">保存倍数</button><small>只影响后续开箱，历史记录保留原估值。</small></form>`:''}`:''}
      <p>当前箱中基础掉落概率 <strong>${pct(chance)}</strong>（含普通与 StatTrak™ 合计）${item.stattrak?' · 其中 StatTrak™ 占 10%':''}。${item.rarity===4?'金色池内部采用型号 / 涂装均分假设。':''}</p>
      ${item.min===null?'<p>原版刀无磨损等级，所有报价均指同一件原版物品。</p>':`<h3>磨损范围 ${item.min.toFixed(2)} – ${item.max.toFixed(2)}</h3><div class="wear-range">${Number.isFinite(r?.float)?`<span class="wear-pointer" style="left:${Math.max(0,Math.min(1,r.float))*100}%" role="img" aria-label="当前磨损 Float ${r.float.toFixed(8)}" title="Float ${r.float.toFixed(8)}"></span>`:''}</div><div class="wear-labels">${E.EDGES.map(edge=>`<span style="left:${edge*100}%">${edge.toFixed(2)}</span>`).join('')}</div>`}
      <h3>${pattern?'按磨损模拟估价':'按磨损参考价'} <span class="muted" style="font-size:10px">${pattern?'模拟倍数 × BUFF 基价':'BUFF 聚合'} · ${dateLabel}</span></h3><table class="modal-table"><thead><tr><th>磨损</th><th>普通</th><th>StatTrak™</th><th>条件磨损概率</th></tr></thead><tbody>${(item.min===null?[0]:[0,1,2,3,4]).map(i=>`<tr><td>${item.min===null?'无涂装':E.WEARS[i]}</td><td>${item.min!==null&&!probabilities[i]?'不适用':money(item.prices[0][i]===null?null:E.cents(item.prices[0][i]))}</td><td>${!item.stattrak||item.min!==null&&!probabilities[i]?'不适用':money(item.prices[1][i]===null?null:E.cents(item.prices[1][i]))}</td><td>${item.min===null?'100.00%':pct(probabilities[i])}</td></tr>`).join('')}</tbody></table><p>磨损概率是已抽中此涂装后的条件概率，按 Float 范围和社区近似模型计算。${r?'此表为当前设置下的价格预览，上方记录保留当时的结算价。':''}</p><div class="detail-links"><a class="secondary-button" href="https://buff.163.com/market/csgo#tab=selling&page_num=1&search=${encodeURIComponent(item.en)}" target="_blank" rel="noopener noreferrer">在 BUFF 搜索 ↗</a><a class="secondary-button" href="https://steamcommunity.com/market/search?appid=730&q=${encodeURIComponent(item.en)}" target="_blank" rel="noopener noreferrer">Steam 市场 ↗</a></div></div>`);
    if ($('special-select')) $('special-select').onchange=event=>{
      skinModal(id,recordIndex,event.target.value); $('special-select').focus({preventScroll:true});
    };
    if ($('pattern-form')) $('pattern-form').onsubmit=event=>{
      event.preventDefault();if(!event.currentTarget.reportValidity())return;
      settings.patternMultipliers[`${id}:${pattern.seed}`]=Number(event.currentTarget.elements.multiplier.value);
      save();skinModal(id,recordIndex,choice);toast('模板模拟倍数已保存，下次开箱生效。');
    };
  }
  function settingsModal() {
    if (busy||auto) return;
    modal(`<h2 class="modal-title">按你的成本来模拟。</h2><p class="modal-subtitle">设置仅影响后续开箱，已有记录保持不变。</p><form id="settings-form"><div class="settings-form"><label>钥匙成本（¥）<input name="keyPrice" type="number" min="0" max="100000" step="0.01" required value="${settings.keyPrice}"><small>默认 ¥18.00 为模拟设定，可按自己的游戏商店价格调整。</small></label><label>卖出手续费（%）<input name="fee" type="number" min="0" max="100" step="0.01" required value="${settings.fee}"><small>从饰品参考价扣除，默认 0%。</small></label><label>宝石相位总占比（模拟 %）<input name="gemChance" type="number" min="0" max="100" step="0.1" required value="${settings.gemChance}"><small>仅在抽中多普勒后生效，宝石之间均分；其余概率由普通相位均分。不是官方概率。</small></label><label>当前箱价（¥）<input name="casePrice" type="number" min="0" max="100000" step="0.01" required value="${currentPrice()}"><small>${esc(currentCase().name)} · 快照价 ${money(E.cents(currentCase().price))}</small></label><div class="notice" style="margin:0;align-self:start">设为 0 可模拟自有武器箱。所有价格均为人民币。</div></div><div class="settings-actions"><button type="button" class="secondary-button" id="restore-price">使用快照箱价</button><button type="submit" class="primary-button">保存设置</button></div></form>`);
    $('restore-price').onclick=()=>$('settings-form').elements.casePrice.value=currentCase().price;
    $('settings-form').onsubmit=event=>{
      event.preventDefault();const form=event.currentTarget;
      if (!form.reportValidity()) return;
      settings.keyPrice=Number(form.elements.keyPrice.value);settings.fee=Number(form.elements.fee.value);settings.gemChance=Number(form.elements.gemChance.value);
      settings.casePrices[settings.selected]=Number(form.elements.casePrice.value);
      save();renderCases();updateControls();$('modal').close();toast('已保存设置，下次开箱生效。');
    };
  }
  function exportCSV() {
    if (!records.length) return;
    const headers=['序号','时间','武器箱','饰品','英文名','品质','StatTrak','磨损','Float','图案种子','箱价_CNY','钥匙_CNY','成本_CNY','参考价_CNY','手续费百分比','产出净值_CNY','盈亏_CNY','价格快照时间','特殊模板','相位','估价来源','模拟估价','溢价倍数'];
    const rows=records.map(r=>{const s=D.items[r.itemId];return [r.index,r.time,caseById[r.caseId].name,s.name,s.en,E.TIERS[r.tier].name,r.stattrak?'是':'否',r.wear===null?'无涂装':E.WEARS[r.wear],r.float??'',r.seed,r.caseCost/100,r.keyCost/100,r.cost/100,r.value===null?'':r.value/100,r.feeRate,r.netValue===null?'':r.netValue/100,r.profit===null?'':r.profit/100,r.priceDate??'',r.specialLabel??'',r.variantKey??'',r.priceSource??'历史快照',r.simulation?'是':'否',r.multiplier??''];});
    const quote=v=>'"'+String(v).replaceAll('"','""')+'"';
    const blob=new Blob(['\ufeff'+[headers,...rows].map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`case-lab-${new Date().toISOString().slice(0,10)}.csv`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast(`已生成 ${records.length} 条记录的 CSV 下载。`);
  }
  $('case-search').addEventListener('input',renderCases);
  $('case-prev').onclick=()=>$('case-rail').scrollBy({left:-$('case-rail').clientWidth*.8,behavior:reducedMotion.matches?'instant':'smooth'});
  $('case-next').onclick=()=>$('case-rail').scrollBy({left:$('case-rail').clientWidth*.8,behavior:reducedMotion.matches?'instant':'smooth'});
  document.addEventListener('click',event=>{
    const caseButton=event.target.closest('[data-case]'); if(caseButton)selectCase(caseButton.dataset.case);
    const skinButton=event.target.closest('[data-skin]'); if(skinButton)skinModal(skinButton.dataset.skin,skinButton.dataset.record);
    const nav=event.target.closest('[data-view]');if(nav)setView(nav.dataset.view);
    const q=event.target.closest('[data-quantity]');if(q&&!busy&&!auto){quantity=Number(q.dataset.quantity);document.querySelectorAll('[data-quantity]').forEach(el=>{el.classList.toggle('selected',el===q);el.setAttribute('aria-pressed',String(el===q));});updateControls();}
    const content=event.target.closest('[data-content]');if(content){contentMode=content.dataset.content;renderContents();}
  });
  $('open-button').onclick=event=>performOpen(quantity,event.detail===0);
  $('fast-mode').checked=settings.fast;
  $('fast-mode').onchange=()=>{settings.fast=$('fast-mode').checked;save();};
  $('auto-button').onclick=()=>{
    if(auto){stopAuto();toast('已停止连续开箱，当前一箱仍会完成结算。');return;}
    if(busy)return;
    auto=true;remaining=Number($('auto-count').value);performOpen(1);
  };
  $('settings-button').onclick=settingsModal;
  for(const id of ['nav-sources','snapshot-button','footer-sources'])$(id).onclick=sourcesModal;
  $('case-info').onclick=()=>$('contents-section').scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth',block:'start'});
  $('view-inventory').onclick=()=>{setView('inventory');window.scrollTo({top:0,behavior:'instant'});};
  $('close-modal').onclick=()=>$('modal').close();
  $('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('modal').close();}});
  $('reset-button').onclick=()=>{
    if(busy||auto)return;
    if(!records.length){toast('当前实验还没有开箱记录。');return;}
    modal(`<h2 class="modal-title">开始一次新的实验？</h2><p class="modal-subtitle">将清空当前 ${records.length} 条开箱记录、库存和累计统计。武器箱与成本设置会保留。你可以先导出 CSV 留作记录。</p><div class="settings-actions"><button class="secondary-button" id="reset-export">先导出记录</button><button class="danger-button" id="confirm-reset">清空并重新开始</button></div>`);
    $('reset-export').onclick=exportCSV;
    $('confirm-reset').onclick=()=>{records=[];lastRevealed=null;save();renderStats();renderRecent();renderIdleReel();$('result-bar').innerHTML='<span class="result-status"><span class="tiny-dot"></span> 新实验已就绪</span><span class="muted">从零开始，试试新的手气。</span>';$('modal').close();toast('实验记录已重置。');};
  };
  for (const id of ['inventory-search','inventory-tier','inventory-sort']) $(id).addEventListener(id==='inventory-search'?'input':'change',()=>{pageSize=100;renderInventory();});
  $('load-more').onclick=()=>{pageSize+=100;renderInventory();};
  $('export-button').onclick=exportCSV;
  document.addEventListener('keydown',event=>{
    document.body.classList.add('keyboard-input');
    if(event.code==='Space'&&!event.repeat&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&view==='lab'&&!$('modal').open&&!busy&&!auto&&!event.target.closest('input,textarea,select,button,a,[contenteditable]')){event.preventDefault();performOpen(quantity,true);}
  });
  document.addEventListener('pointerdown',()=>document.body.classList.remove('keyboard-input'));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(auto){stopAuto();toast('已暂停连续开箱，回到页面后可继续。');}if(animation)animation.finish();}});
  window.addEventListener('resize',()=>{if(!busy){if(lastRevealed)renderResultReel(lastRevealed);else renderIdleReel();}});
  $('snapshot-date').textContent=`快照 ${dateLabel}`;
  selectCase(settings.selected);renderStats();renderRecent();
})();
