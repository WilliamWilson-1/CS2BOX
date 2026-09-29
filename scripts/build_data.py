"""Build a self-contained browser snapshot from public item and price datasets.
Run: python scripts/build_data.py [--refresh] [--images]
No credentials needed. Remote sources and HTTP modification dates are retained.
"""
import concurrent.futures
import datetime as dt
import gzip
import json
import pathlib
import subprocess
import sys
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
DATA.mkdir(exist_ok=True)
SOURCES = {
    'crates_en': 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/crates.json',
    'crates_zh': 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/zh-CN/crates.json',
    'skins_en': 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json',
    'skins_zh': 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/zh-CN/skins.json',
    'buff': 'https://prices.csgotrader.app/latest/buff163.json',
    'rates': 'https://prices.csgotrader.app/latest/exchange_rates.json',
}
NAMES = ['Dreams & Nightmares Case', 'Revolution Case', 'Kilowatt Case', 'Fever Case',
         'Gallery Case', 'Recoil Case', 'Fracture Case', 'Snakebite Case', 'Clutch Case',
         'Prisma 2 Case', 'Spectrum 2 Case', 'Operation Breakout Weapon Case',
         'Danger Zone Case', 'Shadow Case', 'Prisma Case', 'Horizon Case', 'Gamma Case',
         'Chroma 2 Case', 'Chroma 3 Case', 'Spectrum Case', 'Operation Vanguard Weapon Case',
         'Glove Case', 'CS:GO Weapon Case']
WEARS = ['Factory New', 'Minimal Wear', 'Field-Tested', 'Well-Worn', 'Battle-Scarred']
metadata_path = DATA / 'source-metadata.json'
metadata = json.loads(metadata_path.read_text('utf-8')) if metadata_path.exists() else {}

def fetch(key, url):
    dest = DATA / (key + '.json')
    if '--refresh' in sys.argv or not dest.exists():
        tmp = dest.with_suffix('.tmp')
        headers = dest.with_suffix('.headers')
        subprocess.run(['curl.exe' if sys.platform == 'win32' else 'curl', '-fLsS', '--retry', '2',
                        '--compressed', '-D', str(headers), '-o', str(tmp), url], check=True)
        raw = tmp.read_bytes()
        if raw[:2] == b'\x1f\x8b':
            raw = gzip.decompress(raw)
        json.loads(raw)  # Validate before replacing the last usable snapshot.
        dest.write_bytes(raw)
        modified = next((line.split(':', 1)[1].strip() for line in headers.read_text().splitlines()
                         if line.lower().startswith('last-modified:')), None)
        metadata[key] = {'url': url, 'fetchedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'lastModified': modified}
    return json.loads(dest.read_bytes())

with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    loaded = dict(zip(SOURCES, pool.map(lambda kv: fetch(*kv), SOURCES.items())))
metadata_path.write_text(json.dumps(metadata, indent=2), 'utf-8')
en = {s['id']: s for s in loaded['skins_en']}
zh = {s['id']: s for s in loaded['skins_zh']}
crates_zh = {c['id']: c for c in loaded['crates_zh']}
buff = loaded['buff']
rate = loaded['rates']['CNY'] / loaded['rates']['USD']
assets = {}
items = {}

def image_path(id_, url):
    local = 'assets/' + id_ + '.png'
    assets[local] = url + '/512fx384f'
    return local

def price_for(name, phase=None):
    entry = buff.get(name, {}).get('starting_at', {})
    price = entry.get('doppler', {}).get(phase) if phase else entry.get('price')
    return round(price * rate, 2) if isinstance(price, (int, float)) and price > 0 else None

def add_skin(skin):
    id_ = skin['id']
    if id_ in items:
        return id_
    chinese = zh.get(id_, skin)
    prices = []
    for st in [False, True]:
        name = skin['name']
        if st:
            name = name.replace('★ ', '★ StatTrak™ ', 1) if name.startswith('★ ') else 'StatTrak™ ' + name
        prices.append([price_for(name + (f' ({w})' if skin['min_float'] is not None else '')) for w in WEARS])
    items[id_] = {
        'id': id_, 'name': chinese['name'], 'en': skin['name'],
        'weapon': chinese['weapon']['name'], 'finish': (chinese.get('pattern') or {}).get('name', '原版'),
        'model': skin['weapon']['id'], 'min': skin['min_float'], 'max': skin['max_float'],
        'stattrak': skin['stattrak'], 'phaseMerged': bool(skin.get('phase')),
        'rarity': {'rarity_rare_weapon': 0, 'rarity_mythical_weapon': 1,
                   'rarity_legendary_weapon': 2, 'rarity_ancient_weapon': 3}.get(skin['rarity']['id'], 4),
        'image': image_path(id_, skin['image']), 'remoteImage': skin['image'] + '/512fx384f', 'prices': prices,
    }
    if skin.get('phase'):
        labels = {'Ruby': '红宝石', 'Sapphire': '蓝宝石', 'Emerald': '绿宝石', 'Black Pearl': '黑珍珠'}
        variants = []
        for variant in en.values():
            if variant['name'] != skin['name'] or not variant.get('phase'):
                continue
            phase = variant['phase']
            variant_prices = []
            for st in [False, True]:
                market = skin['name']
                if st:
                    market = market.replace('★ ', '★ StatTrak™ ', 1)
                variant_prices.append([price_for(market + f' ({w})', phase) for w in WEARS])
            variants.append({'key': phase, 'label': labels.get(phase, phase.replace('Phase ', '相位 ')),
                             'gem': phase in labels, 'prices': variant_prices,
                             'image': image_path(variant['id'], variant['image']),
                             'remoteImage': variant['image'] + '/512fx384f'})
        items[id_]['variants'] = sorted(variants, key=lambda v: (v['gem'], v['key']))
        items[id_]['phaseMerged'] = False
    # Template identification is sourced; multipliers are explicitly fictional simulation settings.
    patterns = {
        'AK-47 | Case Hardened': (661, '蓝顶 / Scar 661', 100, 'https://skinport.com/blog/ak-47-case-hardened-tier-guide'),
        '★ Karambit | Case Hardened': (387, '蓝淬火 / Blue Gem 387', 100, 'https://tradeit.gg/blog/blue-gem-karambit/'),
    }
    if skin['name'] in patterns:
        seed, label, multiplier, source = patterns[skin['name']]
        items[id_]['patterns'] = [{'seed': seed, 'label': label, 'multiplier': multiplier, 'source': source}]
    return id_

cases = []
for name in NAMES:
    c = next(c for c in loaded['crates_en'] if c['name'] == name)
    # Keep stable finish IDs; phase variants are nested and drawn separately by the engine.
    gold = {}
    for raw in c['contains_rare']:
        s = en[raw['id']]
        if s['name'] not in gold or s.get('phase') == 'Phase 1':
            gold[s['name']] = s
    case = {'id': c['id'], 'name': crates_zh[c['id']]['name'], 'en': name,
            'image': image_path(c['id'], c['image']), 'remoteImage': c['image'] + '/512fx384f',
            'price': price_for(c['market_hash_name']), 'release': c['first_sale_date'],
            'items': [add_skin(en[x['id']]) for x in c['contains']],
            'rare': [add_skin(s) for s in gold.values()]}
    assert case['price'] is not None, 'Missing case price: ' + name
    for id_ in case['rare']:
        items[id_]['rarity'] = 4
    cases.append(case)

snapshot = {'meta': {'builtAt': dt.datetime.now(dt.timezone.utc).isoformat(),
                    'priceModified': metadata.get('buff', {}).get('lastModified'),
                    'rateModified': metadata.get('rates', {}).get('lastModified'),
                    'usdCny': rate, 'sources': SOURCES, 'priceSource': 'BUFF163 · CSGO Trader 聚合快照'},
            'cases': cases, 'items': items}
(DATA / 'catalog.js').write_text('window.CS2_DATA = ' + json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')) + ';\n', 'utf-8')
(DATA / 'asset-manifest.json').write_text(json.dumps(assets, indent=2), 'utf-8')
# Retain just the upstream phase quotes needed for reproducible tests on a clean clone.
phase_source = {}
for item in items.values():
    if not item.get('variants'):
        continue
    for st in [False, True]:
        name = item['en'].replace('★ ', '★ StatTrak™ ', 1) if st else item['en']
        for wear in WEARS:
            market = name + f' ({wear})'
            if market in buff:
                phase_source[market] = {'starting_at': buff[market].get('starting_at', {})}
(DATA / 'phase-price-source.json').write_text(json.dumps(phase_source, separators=(',', ':')), 'utf-8')
print(f'Built {len(cases)} cases, {len(items)} skins, USD/CNY {rate:.6f}', flush=True)
if '--images' in sys.argv:
    def download(entry):
        local, url = entry
        dest = ROOT / local
        if dest.exists() and dest.stat().st_size > 100:
            return True
        try:
            with urllib.request.urlopen(url, timeout=25) as r:
                raw = r.read()
            if not (raw.startswith(b'\x89PNG') or raw.startswith(b'\xff\xd8') or raw.startswith(b'RIFF')):
                raise ValueError('Unexpected image format')
            dest.write_bytes(raw)
            return True
        except Exception as e:
            try:
                subprocess.run(['curl.exe' if sys.platform == 'win32' else 'curl', '-fLsS', '--retry', '2',
                                '--max-time', '40', '-o', str(dest), url], check=True, capture_output=True)
                return dest.stat().st_size > 100
            except Exception:
                print('Image fallback:', local, str(e)[:70], flush=True)
                return False
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
        results = list(pool.map(download, assets.items()))
    print(f'Images cached: {sum(results)}/{len(assets)}; remote fallback for missing assets')
