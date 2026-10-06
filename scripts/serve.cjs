const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
const args = process.argv.slice(2);
const lan = args.includes('--lan');
const portIndex = args.indexOf('--port');
let port = portIndex === -1 ? (lan ? 8080 : 5173) : Number(args[portIndex + 1]);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  console.error('端口无效，请使用 --port 8080 这样的参数。');
  process.exit(1);
}
const host = lan ? '0.0.0.0' : '127.0.0.1';
let retries = 0;
const publicFiles = new Set(['/index.html', '/styles.css', '/app.js', '/engine.js', '/i18n.js', '/data/catalog.js']);
const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, {'Allow':'GET, HEAD'}).end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (pathname === '/') pathname = '/index.html';
  // Share only the simulator's public files, not source scripts or future private project files.
  if (!publicFiles.has(pathname) && !/^\/assets\/[a-zA-Z0-9_-]+\.(png|svg)$/.test(pathname)) {
    res.writeHead(404).end('Not found'); return;
  }
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.realpath(file, (pathError, resolved) => {
    if (pathError || !resolved.startsWith(root + path.sep)) { res.writeHead(404).end('Not found'); return; }
    fs.readFile(resolved, (err, data) => {
      if (err) { res.writeHead(404).end('Not found'); return; }
      res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream',
        'Content-Length':data.length, 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff'});
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
});
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && lan && portIndex === -1 && retries++ < 10) {
    port++;
    server.listen(port, host);
    return;
  }
  console.error(error.code === 'EADDRINUSE'
    ? `端口 ${port} 已被占用，请关闭之前的服务窗口，或使用 --port 8081 指定其他端口。`
    : `启动失败：${error.message}`);
  process.exitCode = 1;
});
server.on('listening', () => {
  const actualPort = server.address().port;
  console.log('\n  CASE LAB · CS2 开箱实验室\n');
  console.log(`  本机访问：http://127.0.0.1:${actualPort}/`);
  if (lan) {
    const addresses = [...new Set(Object.values(os.networkInterfaces()).flat()
      .filter(entry => entry && entry.family === 'IPv4' && !entry.internal)
      .map(entry => entry.address))];
    for (const address of addresses) console.log(`  局域网访问：http://${address}:${actualPort}/`);
    if (!addresses.length) console.log('  暂未发现局域网 IPv4 地址，请连接 Wi-Fi 或网线后重新启动。');
    console.log('\n  其他设备连接同一 Wi-Fi / 局域网，在浏览器打开上面的局域网地址。');
    console.log('  如 Windows 弹出防火墙提示，请允许 Node.js 在“专用网络”通信。');
    console.log('  多个地址对应不同网卡，请使用当前 Wi-Fi / 以太网的地址。');
  }
  console.log('\n  保持此窗口打开；按 Ctrl+C 或关闭窗口即可停止服务。\n');
});
server.listen(port, host);
