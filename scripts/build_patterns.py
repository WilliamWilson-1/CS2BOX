"""Extract factual seed tables from saved source pages; never import price claims.

Usage: python scripts/build_patterns.py --source-dir .deployment/pattern-research
The source directory contains CSGOSKINS.GG blog pages named by their URL slug,
and fades.json from chescos/csgo-fade-percentage-calculator (MIT).
Normal catalog rebuilds use the committed normalized snapshot, not these pages.
"""
import argparse
import datetime as dt
from html.parser import HTMLParser
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
args = argparse.ArgumentParser()
args.add_argument('--source-dir', type=Path, required=True)
source_dir = args.parse_args().source_dir
catalog = json.loads((ROOT / 'data/catalog.js').read_text('utf-8').removeprefix('window.CS2_DATA = ').strip().removesuffix(';'))
by_name = {item['en'].removeprefix('★ '): item for item in catalog['items'].values()}
BLOG = 'https://csgoskins.gg/blog/'
FADE_SOURCE = 'https://github.com/chescos/csgo-fade-percentage-calculator'

class Tables(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell = [], None, None
    def handle_starttag(self, tag, attrs):
        if tag == 'tr': self.row = []
        elif tag in ('td', 'th'): self.cell = ''
    def handle_data(self, text):
        if self.cell is not None: self.cell += text
    def handle_endtag(self, tag):
        if tag in ('td', 'th') and self.cell is not None:
            if self.row is not None: self.row.append(self.cell.strip())
            self.cell = None
        elif tag == 'tr' and self.row is not None:
            self.rows.append(self.row)
            self.row = None

def table(slug):
    parser = Tables()
    parser.feed((source_dir / (slug + '.html')).read_text('utf-8'))
    return [(row[0], [int(n) for n in re.findall(r'\d+', row[1])]) for row in parser.rows
            if len(row) == 2 and re.fullmatch(r'[\d,\s]+', row[1])]

profiles = {}
def add(name, group, seeds, label, multiplier, source, category, tier=None):
    if name not in by_name: return
    profile = profiles.setdefault(name, {'patterns': []})
    for seed in seeds:
        if not 0 <= seed <= 999: continue  # Simulator models case-opening seeds only.
        existing = next((p for p in profile['patterns'] if p['seed'] == seed), None)
        if existing:
            # A seed may have several decorative motifs. Retain both labels, one premium.
            if label not in existing['label']:
                existing['label'] += ' / ' + label
                existing['multiplier'] = max(existing['multiplier'], multiplier)
            continue
        profile['patterns'].append({'seed': seed, 'label': label, 'group': group,
            'category': category, 'tier': tier, 'multiplier': multiplier, 'source': source})

# Game-only premiums. Individual T1 seeds can be edited independently in the UI.
# These numbers are deliberately disclosed as simulation settings, never market quotes.
T1_OVERRIDES = {
    'AK-47': {661:100,670:35,955:30,151:18,321:16,387:14,179:12},
    'Karambit': {387:100,442:35,269:25,321:18,73:16,955:14,853:13,902:12,507:11,776:10},
    'M9 Bayonet': {601:35,417:18},
    'Butterfly Knife': {182:25,652:18,398:15,838:13,29:12,494:10},
    'Talon Knife': {55:30,923:22,241:18,602:16,899:14},
    'Skeleton Knife': {403:30,456:20,169:16},
}
for name in by_name:
    weapon, _, finish = name.partition(' | ')
    if finish == 'Case Hardened' and 'Gloves' not in weapon:
        slug = weapon.lower().replace(' ', '-') + '-case-hardened-blue-gem-seed-patterns'
        if not (source_dir / (slug + '.html')).exists(): continue
        for group, seeds in table(slug):
            match = re.fullmatch(r'Tier ([1-4])', group)
            if not match: continue
            tier = int(match[1])
            for seed in seeds:
                premium = T1_OVERRIDES.get(weapon, {}).get(seed, 10) if tier == 1 else {2:4,3:1.6,4:1.15}[tier]
                add(name, f'T{tier}', [seed], f'蓝淬火 T{tier} · #{seed}', premium, BLOG+slug, 'blue-gem', tier)
    if finish == 'Marble Fade' and weapon in ('Karambit','Bayonet','Flip Knife','Gut Knife'):
        slug = weapon.lower().replace(' ', '-') + '-marble-fade-fire-and-ice-seed-patterns'
        for group, seeds in table(slug):
            rank = re.match(r'(\d+)(?:st|nd|rd|th) Max', group)
            label = f'冰火 · {rank[1]} 档' if rank else '伪冰火 · '+group
            premium = round(1.3+(11-int(rank[1]))*.17,2) if rank else 1.1
            add(name, group, seeds, label, premium, BLOG+slug, 'fire-ice', int(rank[1]) if rank else None)

GOLD = {'Navaja Knife':[36], 'Falchion Knife':[926,279,386], 'Bowie Knife':[113,599],
    'Gut Knife':[837], 'Classic Knife':[943,527], 'Flip Knife':[731], 'Huntsman Knife':[759,41],
    'Survival Knife':[927,159], 'Paracord Knife':[521], 'Ursus Knife':[425], 'Nomad Knife':[39,912],
    'Stiletto Knife':[268,895], 'Bayonet':[395,848,359], 'Talon Knife':[834,993,757,852,802,895,119],
    'Skeleton Knife':[914,943], 'M9 Bayonet':[739,787,471], 'Karambit':[896,231,939,388], 'Butterfly Knife':[75,599]}
for weapon, seeds in GOLD.items():
    add(weapon+' | Case Hardened','Gold Gem',seeds,'金淬火',1.3,BLOG+'the-best-gold-gem-patterns-for-every-cs2-knife','gold-gem')
add('AK-47 | Case Hardened','Gold Gem',[784,219],'金淬火 T1',1.5,
    'https://steamcommunity.com/sharedfiles/filedetails/?id=3384048347','gold-gem')

extras = {
    'Glock-18 | Moonrise': ('glock-18-moonrise-guide-rare-star-pattern-seeds','star'),
    'AWP | PAW': ('awp-paw-guide-all-rare-seed-patterns','paw'),
    'Specialist Gloves | Crimson Kimono': ('crimson-kimono-gloves-guide-all-rare-seed-patterns','kimono'),
    'Hand Wraps | Overprint': ('hand-wraps-overprint-guide-all-rare-seed-patterns','overprint'),
    'XM1014 | XOXO': ('xm1014-xoxo-guide-all-rare-seed-patterns','xoxo'),
}
labels = {'Center Star':'居中星星','Front Star':'前侧星星','Back Star':'后侧星星','Polygon':'蓝色多边形',
    'Arrow':'蓝色箭头','Mixed':'混合蓝纹','Flower':'花纹','Max Gray':'灰色模板','Gold Cat Knife':'金猫持刀',
    'Gold Cat':'金猫','Gold Grenade':'金色手雷','Gas Mask':'防毒面具','Stoner Cat':'迷糊猫',
    'Skull':'骷髅','Mohawk':'莫霍克','Cyan Glyph':'青色符号','Cyan Glypth':'青色符号',
    'Pink Mesh':'粉色网格','Black Smiley':'黑色笑脸','Pink Smiley':'粉色笑脸'}
for name, (slug, category) in extras.items():
    for group, seeds in table(slug):
        tier_match = re.search(r'(?:Tier |T)([1-5])$', group)
        tier = int(tier_match[1]) if tier_match else None
        label = '红色和服 '+group.replace('Tier ','T') if category == 'kimono' and tier else group
        for en, zh in labels.items(): label = label.replace(en,zh)
        premium = {1:2,2:1.5,3:1.25,4:1.15,5:1.05}.get(tier,1.15)
        if group == 'Center Star': premium=1.5
        if group in ('Max Gray','Flower'): premium=1
        add(name,group,seeds,label,premium,BLOG+slug,category,tier)

STEAM = 'https://steamcommunity.com/sharedfiles/filedetails/?id='
add('Karambit | Slaughter','Diamond',[33,349,948,13,105,225,258,261,333,355,367,585,677,815,997],
    '屠夫 · 钻石（社区精选）',1.25,STEAM+'3599271558','slaughter')
for group, seeds, tier in [('钻石双心',[2,753,765],1),('钻石双心',[37,906,498],2),
    ('钻石双心',[953,566,32,916],3),('双钻石',[700,124],1),('双钻石',[90,165],2),
    ('双钻石',[108,385,464],3),('钻石心形',[72,81,115,179,290,291,335,402,483,491,551,666,687,724,881],None)]:
    add('Bayonet | Slaughter',group,seeds,'屠夫 · '+group+(f' T{tier}' if tier else ''),
        {1:1.4,2:1.2,3:1.1}.get(tier,1.2),STEAM+'3580332424','slaughter',tier)
for tier, seeds in {
    1:[10,21,59,60,86,92,112,148,162,172,189,235,251,257,309,310,324,334,377,390,411,453,460,461,515,526,532,571,629,689,779,786,803,813,842,904,911,958,964,977,983],
    2:[16,17,19,22,30,32,40,43,48,52,54,113,117,123,125,133,215,231,233,242,245,379,388,397,412,421,423,464,485,506,520,544,550,614,619,627,662,687,699,716,718,723,724,740,746,815,818,821,832,914,932,934,940,948,962,965],
    3:[3,5,20,33,41,44,46,55,57,70,85,99,107,110,111,246,252,255,263,266,273,275,281,284,288,498,501,503,504,511,512,513]
}.items():
    add('Karambit | Crimson Web',f'Single Web T{tier}',seeds,f'血网 · 单网 T{tier}',
        {1:1.5,2:1.2,3:1.05}[tier],STEAM+'3235445605','crimson-web',tier)
add('Karambit | Crimson Web','Double Web',[76,103,171,441,608,640,676,722,725,726,930,960],
    '血网 · 双网',1.8,STEAM+'3235445605','crimson-web')
add('Flip Knife | Crimson Web','Single Web T1',[280], '血网 · 居中单网 T1',1.5,STEAM+'3332429982','crimson-web',1)
add('Flip Knife | Crimson Web','Double Web T1',[287,372,613,659,742,810,830,839,850,899],
    '血网 · 双网 T1',1.8,STEAM+'3332429982','crimson-web',1)
add('Flip Knife | Crimson Web','Triple Web',[525], '血网 · 三网',2.5,STEAM+'3332429982','crimson-web',1)

fade_data = json.loads((source_dir/'fades.json').read_text('utf-8-sig'))
for weapon in fade_data:
    name = weapon['weapon'] + ' | Fade'
    if name not in by_name: continue
    values = {v['seed']: v['percentage'] for v in weapon['percentages']}
    assert all(s in values for s in range(1000)), name
    profiles.setdefault(name,{})['fade'] = {'source': FADE_SOURCE,
        'percentages':[round(values[s],4) for s in range(1000)], 'convention':'Skinport / CSFloat community algorithm'}

result = {'updatedAt':dt.datetime.now(dt.timezone.utc).isoformat(),
    'note':'Tier tables are community classifications, not Valve or BUFF standards. All pattern premiums here are fictional simulation settings. Fade values use the chescos algorithm, not BUFF percentages.',
    'profiles':profiles}
(ROOT/'data/special-patterns.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n','utf-8')
print(f'{len(profiles)} finishes, {sum(len(v.get("patterns",[])) for v in profiles.values())} special seeds, {sum("fade" in v for v in profiles.values())} Fade tables')
