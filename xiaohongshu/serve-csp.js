// 本地复刻小红书容器的 CSP，用来验证小工具包能不能启动。
// 必须用 strict：真机不放行内联脚本，带 unsafe-inline 的宽松模式会给出假阳性。
//
//   node serve-csp.js <目录> <端口> [strict|csp|none]
//   默认 strict = "script-src 'self'; style-src 'self' 'unsafe-inline'"
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || '.');
const PORT = Number(process.argv[3] || 8803);
const MODE = process.argv[4] || 'strict';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.bin': 'application/octet-stream',
};

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end();
    return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404');
      return;
    }
    const headers = {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    };
    if (MODE === 'strict') headers['Content-Security-Policy'] = "script-src 'self'; style-src 'self' 'unsafe-inline'";
    if (MODE === 'csp') headers['Content-Security-Policy'] = "script-src 'self' 'unsafe-inline'";
    res.writeHead(200, headers).end(buf);
  });
}).listen(PORT, '127.0.0.1', () => {
  console.log(`serving ${ROOT} on http://127.0.0.1:${PORT} mode=${MODE}`);
});
