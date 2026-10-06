/* Chinese is the source copy. English is applied to both static and newly rendered UI. */
(() => {
  'use strict';
  const KEY='caselab.language.v1';
  let storedLanguage;
  try {storedLanguage=localStorage.getItem(KEY);} catch {storedLanguage=null;}
  const lang=storedLanguage==='en'||(!storedLanguage&&new URL(location.href).searchParams.get('lang')==='en')?'en':'zh';
  document.documentElement.lang=lang==='en'?'en':'zh-CN';
  const words={
    '开箱模拟器':'Case Simulator','终端机':'Terminals','我的库存':'Inventory','数据与概率':'Data & Odds','沙盒模拟':'Sandbox Simulation','模拟设置':'Simulation Settings','切换语言':'Switch language',
    '赛博赌石':'The Case Lab','开箱有风险，购买需谨慎。':'Every opening is a risk. Spend thoughtfully.','BUFF 参考价':'BUFF Reference Prices','读取快照中':'Loading snapshot',
    '选择武器箱':'Choose a Case','搜索武器箱':'Search cases','武器箱列表':'Case list','上一组武器箱':'Previous cases','下一组武器箱':'Next cases','开启你的下一箱':'Open Your Next Case','查看箱内饰品':'View Contents',
    '未知的惊喜，就藏在下一次开启。':'Your next reveal is one opening away.','款武器涂装':'weapon finishes','罕见特殊物品':'Rare Special Item','罕见手套':'Rare Gloves','罕见刀具':'Rare Knives',
    '所有结果均为模拟，不产生真实交易':'All results are simulated. No real trades.','准备就绪':'Ready','单次成本':'Cost per Case','箱子':'Case','钥匙':'Key','开启武器箱':'Open Case','开启 10 箱':'Open 10 Cases','正在揭晓…':'Revealing…',
    '极速开箱':'Fast Open','连续':'Auto','自动开箱':'Auto Open','停止':'Stop','剩余':'remaining','开箱':'open','本次模拟':'Simulation Summary','本地保存':'Saved Locally','仅当前会话':'This Session Only',
    '累计盈亏':'Total Profit / Loss','已知估值下界':'Known Value Lower Bound','从第一箱开始，记录每一份运气。':'Every result is recorded from your first try.','盈亏走势':'Profit / Loss Trend','累计投入':'Total Spent','产出净值':'Net Output','已开箱数':'Attempts','模拟次数':'Attempts','回报率':'Return','产出品质分布':'Quality Distribution','重置实验记录':'Reset Records',
    '最近产出':'Recent Results','每一箱的结果，都留在这里':'Every result stays here','查看全部库存':'View Inventory','箱内饰品':'Case Contents','点击饰品，查看各磨损参考价与模拟掉落概率。':'Select an item for wear prices and simulated odds.','武器涂装':'Weapon Finishes','罕见特殊':'Rare Special','你的收藏，从第一箱开始':'Your collection starts here','开启一个武器箱，看看今天的手气。':'Open a case and see what you get.','点击检视详情':'Select to inspect',
    '导出 CSV':'Export CSV','搜索饰品名称':'Search items','搜索库存':'Search inventory','品质筛选':'Filter by rarity','库存排序':'Sort inventory','全部品质':'All Rarities','最近获得':'Newest First','参考价从高到低':'Value: High to Low','盈亏从高到低':'Profit: High to Low','饰品 / 武器箱':'Item / Case','磨损 / Float':'Wear / Float','参考价':'Reference Value','开箱成本':'Opening Cost','单次盈亏':'Profit / Loss','时间':'Time','加载更多':'Load More','没有符合条件的饰品，换个筛选试试。':'No matching items. Try another filter.','库存还是空的。回到开箱实验室，开启你的第一箱。':'Your inventory is empty. Open a case to begin.',
    '选择终端机':'Choose a Terminal','每台终端机依次提供 5 次购买报价。接受一件或全部跳过，终端机即结束。':'Each terminal gives five sequential offers. Buy one item or pass them all.','终端记录':'Terminal Ledger','已使用':'Used','已购买':'Purchased','总投入':'Total Spent','参考净值':'Reference Net Value','模拟盈亏':'Simulated Profit / Loss','报价是模拟值，参考净值来自本地价格快照。终端机消耗在启动时计入；未购买时仍计入亏损。':'Offers are simulated. Net value comes from the local price snapshot. A terminal is charged when opened, even if you buy nothing.',
    '终端机内容池':'Terminal Contents','饰品真实，出现频率与购买报价均为模拟设定。':'Real items; offer odds and prices are simulated.','启动终端机':'Open Terminal','终端已消耗 · 只能购买当前报价或跳过':'Terminal spent · buy this offer or pass','终端机实际报价未公开，此处用参考价的 90%–125% 模拟；不保证成交或盈利。':'Actual dealer pricing is unpublished. This simulates 90%–125% of the reference value; profit is not guaranteed.','模拟购买报价':'Simulated Offer','跳过此报价':'Pass This Offer','查看下一个':'See Next Offer','结束终端机':'End Terminal','购买这件':'Buy This Item','终端购买':'Terminal Purchase','无钥匙费':'No Key Fee','启动消耗':'Terminal Cost','一次最多查看 5 个随机报价，只能购买其中一件。跳过不能回退。':'Inspect up to five random offers. You may buy one. Passed offers cannot be revisited.','上次 5 个报价均已跳过。可再开启一台终端机。':'You passed all five offers. Open another terminal to try again.','上次已购买一件饰品。可再开启一台终端机。':'One item purchased. Open another terminal to continue.','我能提供这件饰品。查看磨损和报价后再决定；跳过后无法返回。':'Here is my offer. Check the wear and price. Once passed, it is gone.',
    '终端机各报价的饰品概率未公布；此页面仅模拟内容池与报价。':'Item odds for terminal offers are unpublished. This is a content and price simulation.','已跳过全部 5 个报价，终端机结束。':'All five offers passed. Terminal closed.','已购买，饰品与盈亏已记入库存。':'Purchased. The item and result are saved in inventory.',
    '真实概率，真实人品':'Odds & Data Sources','价格与贴图':'Prices & Artwork','名称、内容池、Float 范围及原始贴图':'Names, Contents, Float Ranges & Artwork','人民币换算 / 箱价与钥匙分开计费':'CNY Conversion / Separate Case & Key Costs','品质概率 · 每次独立抽取':'Rarity Odds · Independent Rolls','磨损概率 · 社区近似模型':'Wear Odds · Community Approximation','盈亏如何计算':'How Profit Is Calculated',
    '军规级':'Mil-Spec','受限级':'Restricted','保密级':'Classified','隐秘级':'Covert','崭新出厂':'Factory New','略有磨损':'Minimal Wear','久经沙场':'Field-Tested','破损不堪':'Well-Worn','战痕累累':'Battle-Scarred','无涂装':'Vanilla','无磨损等级':'No wear tier','暂无报价':'No quote','待估值':'Unpriced','模拟估价':'Simulated Value','参考售价':'Reference Price','参考价起':'From reference value','含模板估价':'Includes pattern values','含独立相位':'Includes phase values','待补充':'Pending quote','总成本':'Total Cost','本轮盈亏':'Batch Profit / Loss','本次盈亏':'Profit / Loss','成本':'Cost','盈亏':'Profit / Loss','已获得新饰品':'New Item','收下饰品':'Continue','全部收下':'Continue','继续开箱':'Continue Opening','停止连续开箱':'Stop Auto Open','十连开箱结果':'10-Case Results','一次揭晓':'Batch Reveal','件饰品':'items','磨损范围':'Wear Range','图案模板':'Pattern Seed','图案':'Pattern','模板':'Pattern','快照':'Snapshot','最近':'Latest','显示':'Showing','件':'items','款武器':'weapons','款手套':'gloves','款':'items','箱':'cases','次':'tries','台':'terminals',
    '相位 / 特殊模板':'Phase / Special Pattern','普通图案 · 基础报价':'Ordinary Pattern · Base Price','宝石相位':'Gem Phase','模板价格预览':'Pattern Price Preview','按磨损参考价':'Reference by Wear','磨损':'Wear','普通':'Normal','条件磨损概率':'Conditional Wear Odds','不适用':'N/A','在 BUFF 搜索':'Search BUFF','Steam 市场':'Steam Market','检视模板':'Inspect Pattern','按模板编号检视':'Inspect Seed','独立模拟价':'Individual Simulated Price','保存独立价格':'Save Individual Price','保存倍数':'Save Multiplier','恢复此规格默认价格':'Restore Default Price','版本':'Version','此编号未命中已收录的特殊模板，使用普通基础报价。':'This seed is not in the special pattern table. Base price applies.',
    '按你的成本来模拟。':'Set Your Costs','设置仅影响后续开箱，已有记录保持不变。':'Settings affect future openings only. Saved results do not change.','钥匙成本':'Key Cost','卖出手续费':'Selling Fee','宝石相位总占比':'Total Gem Phase Chance','当前箱价':'Selected Case Price','使用快照箱价':'Use Snapshot Price','保存设置':'Save Settings','已保存设置，下次开箱生效。':'Settings saved for future openings.',
    '默认 ¥18.00 为模拟设定，可按自己的游戏商店价格调整。':'The ¥18.00 default is simulated. Set your actual in-game key price.','从饰品参考价扣除，默认 0%。':'Deducted from the reference value. Default: 0%.','仅在抽中多普勒后生效，宝石之间均分；其余概率由普通相位均分。不是官方概率。':'Applies only to Doppler items. Gem phases split this share; standard phases split the rest. These are simulated odds.','设为 0 可模拟自有武器箱。所有价格均为人民币。':'Set to zero if you already own the case. All prices are CNY.','快照价':'Snapshot price','模拟 %':'simulated %','本次':'This opening','本轮':'This batch','正在揭晓':'Revealing','已保存至库存':'Saved to inventory','参考价不等于成交价':'Reference value is not a sale price','独立随机 · 无保底机制':'Independent rolls · no pity system',
    '磨损概率是已抽中此涂装后的条件概率，按 Float 范围和社区近似模型计算。':'Wear odds are conditional on receiving this finish and computed from its Float range with a community model.','此表为当前设置下的价格预览，上方记录保留当时的结算价。':'This table previews current settings. The saved result above keeps its original value.',
    '蓝淬火':'Blue Gem','金淬火':'Gold Gem','冰火':'Fire & Ice','伪冰火':'Fake Fire & Ice','红色和服':'Crimson Kimono','血网':'Crimson Web','屠夫':'Slaughter','钻石双心':'Double Diamond Hearts','钻石心形':'Diamond Heart','双钻石':'Double Diamond','钻石':'Diamond','居中星星':'Center Star','前侧星星':'Front Star','后侧星星':'Rear Star','金猫持刀':'Gold Cat with Knife','迷糊猫':'Confused Cat','金猫':'Gold Cat','粉色网格':'Pink Grid','蓝色多边形':'Blue Polygon','蓝色箭头':'Blue Arrow','金色手雷':'Gold Grenade','防毒面具':'Gas Mask','灰色模板':'Gray Pattern','混合蓝纹':'Mixed Blue','花纹':'Pattern','单网':'Single Web','双网':'Double Web','三网':'Triple Web','社区精选':'Community Selection',
    '模板分档采用所列社区指南，并非 Valve 官方或 BUFF 统一标准。T1 按具体武器与编号分别设价。':'Pattern tiers follow the linked community guides, not an official Valve or BUFF standard. T1 is priced separately for each weapon and seed.','贴图是通用涂装预览，不复现此种子的实际纹路。':'The artwork is a generic finish preview and does not render this seed.','以下为普通久经沙场的模拟价，每个模板可单独检视并设置各磨损 / StatTrak 的金额，均不代表真实成交价。':'These are simulated Field-Tested, non-StatTrak prices. Inspect each seed to set prices by wear and StatTrak; these are not actual sales.','默认按同磨损 / StatTrak 基价 ×':'Default: matching wear / StatTrak base value ×','模拟；已设置的独立模板价优先。溢价均为游戏设定，不是模板市场报价。单一模板概率为抽中此涂装后的 0.10%。':'simulation. An individual price overrides this multiplier. Premiums are game settings, not market quotes. One seed has a 0.10% conditional probability.','模板识别来源':'Pattern source','调整 #':'Edit #',' 的模拟价格':' simulated prices','T1 独立模板模拟价 · 共':'T1 individual simulated prices ·','未单独定价规格的模拟倍数':'Multiplier for variants without an individual price','仅影响今后开出的同一武器、模板、磨损与版本；历史记录保持原价。':'Affects only future results with the same weapon, seed, wear and version. Saved results keep their original price.','当前箱中基础掉落概率':'Base drop chance in selected case','（含普通与 StatTrak™ 合计）':'(including normal and StatTrak™)','其中 StatTrak™ 占 10%。':'StatTrak™ accounts for 10%.','含模拟设定，请查看上方计价说明':'Includes simulated values; see pricing note above','渐变比例采用 Skinport / CSFloat 社区算法，与 BUFF 的显示口径可能不同。默认 95% 以下不加价，95% / 98% / 99% / 99.5% 起分别模拟 ×1.15 / ×1.3 / ×1.5 / ×1.8。':'Fade percentages use the Skinport / CSFloat community method and may differ from BUFF. Simulated multipliers: none below 95%, then ×1.15 / ×1.3 / ×1.5 / ×1.8 at 95% / 98% / 99% / 99.5%.',
    '当时参考价':'Reference at acquisition','当时模拟估价':'Simulated value at acquisition','本次成本':'This opening cost','BUFF 聚合快照':'BUFF aggregate snapshot','终端消耗':'Terminal cost','手续费':'Fee','记录时间':'Recorded at','聚合快照':'aggregate snapshot','BUFF 聚合':'BUFF aggregate','历史聚合快照':'historical aggregate snapshot','品质':'Quality','普通图案':'Ordinary pattern','查看':'View','详情':'details','在售价':'listing price','参考价':'Reference Value','箱盈利':'profitable cases','次盈利':'profitable tries','次尝试':'attempts','含终端机消耗':'includes terminal costs','当前磨损':'Current wear','累计盈亏走势':'Cumulative profit / loss trend','开始一次新的实验？':'Start a new simulation?','将清空当前':'This will clear','库存和累计统计。':'inventory and cumulative statistics.','武器箱与成本设置会保留。你可以先导出 CSV 留作记录。':'Case selections and cost settings remain. You can export a CSV first.','台终端机记录':'terminal records','件库存':'inventory items','先导出记录':'Export First','清空并重新开始':'Clear & Restart','已生成':'Generated','条记录的 CSV 下载。':'CSV records for download.','终端未购买':'Terminal without purchase',
    '虚拟饰品 · 概率模拟 · 无充值与交易':'Virtual items · simulated odds · no payments or trades','数据来源与模型说明':'Sources & Methods','CS2 模拟器':'CS2 Simulator','关闭对话框':'Close dialog','请启用 JavaScript 以运行开箱模拟器。':'Enable JavaScript to run the simulator.','？':'?'
  };
  const catalog=window.CS2_DATA;
  for(const c of [...catalog.cases,...(catalog.terminals||[])])words[c.name]=c.en;
  for(const item of Object.values(catalog.items)) {
    words[item.name]=item.en;
    if(item.en.includes(' | ')) {
      words[item.weapon]=item.en.split(' | ')[0].replace(/^★ /,'');
      words[item.finish]=item.en.split(' | ').slice(1).join(' | ');
    }
  }
  const replacements=Object.entries(words).filter(([from,to])=>from&&to&&from!==to).sort((a,b)=>b[0].length-a[0].length);
  const translate=value=>{
    if(lang!=='en'||!/[\u3400-\u9fff？]/.test(value))return value;
    let result=value.replace(/第\s*(\d+)\s*箱/g,'Case #$1');
    for(const [from,to] of replacements)if(result.includes(from))result=result.replaceAll(from,to);
    result=result.replace(/\b1 terminals\b/g,'1 terminal').replace(/\b1 items\b/g,'1 item').replace(/\b1 cases\b/g,'1 case').replace(/(\d+)\s*个/g,'$1 seeds');
    return result;
  };
  function translateTree(root) {
    if(lang!=='en')return;
    if(root.nodeType===Node.TEXT_NODE){const next=translate(root.nodeValue);if(next!==root.nodeValue)root.nodeValue=next;return;}
    if(root.nodeType!==Node.ELEMENT_NODE)return;
    if(root.matches('script,style'))return;
    for(const attr of ['aria-label','placeholder','title','alt'])if(root.hasAttribute(attr)){const value=root.getAttribute(attr),next=translate(value);if(next!==value)root.setAttribute(attr,next);}
    for(const child of root.childNodes)translateTree(child);
  }
  if(lang==='en') {
    translateTree(document.body);
    const observer=new MutationObserver(changes=>{for(const change of changes){if(change.type==='characterData'||change.type==='attributes')translateTree(change.target);else for(const node of change.addedNodes)translateTree(node);}});
    observer.observe(document.body,{childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','placeholder','title','alt'],subtree:true});
    document.title='CASE LAB — CS2 Case & Terminal Simulator';
    document.querySelector('meta[name="description"]').content='CS2 case and terminal simulator with local records, item previews, wear, prices and profit tracking.';
  }
  window.LabI18n={lang,translate, toggle(view){
    try {sessionStorage.setItem('caselab.view.v1',view);} catch {}
    const next=lang==='en'?'zh':'en';
    try {localStorage.setItem(KEY,next);location.reload();}
    catch {const url=new URL(location.href);url.searchParams.set('lang',next);location.assign(url.href);}
  }};
  const button=document.getElementById('language-button');
  button.textContent=lang==='en'?'中文':'EN';
})();
