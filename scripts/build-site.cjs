// Package only browser resources for public static hosting, including project subpaths.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root, 'data/catalog.js'), 'utf8'), context);
const data = context.window.CS2_DATA;
const files = new Set(['index.html', 'styles.css', 'app.js', 'engine.js', 'i18n.js',
  'data/catalog.js', 'data/CSGO-API-LICENSE.txt', 'data/FADE-LICENSE.txt', 'assets/favicon.svg']);
for (const item of [...data.cases, ...(data.terminals || []), ...Object.values(data.items)]) {
  for (const asset of [item, ...(item.variants || [])]) {
    if (!/^assets\/[a-zA-Z0-9_-]+\.png$/.test(asset.image)) throw new Error('Invalid asset path');
    files.add(asset.image);
  }
}
// Verify every input before replacing the previous generated output.
for (const file of files) {
  const source = path.join(root, file);
  if (!fs.statSync(source).isFile() || !fs.realpathSync(source).startsWith(root+path.sep)) {
    throw new Error('Invalid source: '+file);
  }
}
if (fs.existsSync(output)) {
  if (path.dirname(output)!==root || fs.realpathSync(output)!==output) throw new Error('Unsafe output directory');
  fs.rmSync(output, {recursive:true});
}
fs.mkdirSync(output, {recursive:true});
let bytes=0;
for (const file of files) {
  const destination=path.join(output,file);
  fs.mkdirSync(path.dirname(destination), {recursive:true});
  fs.copyFileSync(path.join(root,file),destination);
  bytes+=fs.statSync(destination).size;
}
fs.writeFileSync(path.join(output,'.nojekyll'),'');
// Give each asset its own content version so a deployment cannot mix cached engines/catalogs.
const html=fs.readFileSync(path.join(output,'index.html'),'utf8').replace(/(src|href)="([^"]+\.(?:js|css))"/g,(match,attribute,file)=>{
  if(!files.has(file))return match;
  const hash=createHash('sha256').update(fs.readFileSync(path.join(output,file))).digest('hex').slice(0,12);
  return `${attribute}="${file}?v=${hash}"`;
});
fs.writeFileSync(path.join(output,'index.html'),html);
console.log(`Built ${files.size+1} static files (${(bytes/1024/1024).toFixed(1)} MiB) in dist/`);
