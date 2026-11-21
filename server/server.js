/* Server PC (HTTP) cho 10 Point Poker. Chỉ dùng module có sẵn của Node - không cần npm install.
 * Chạy: node server/server.js   (PORT mặc định 3000)
 * Logic phòng nằm ở src/server/rooms.js (dùng chung với chế độ host trong điện thoại); file này chỉ là lớp HTTP. */
'use strict';
const http = require('http');
const { createRooms } = require('../src/server/rooms.js');

function createServer() {
  const rooms = createRooms();

  function reply(res, code, obj) {
    res.writeHead(code, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(obj));
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      let s = '';
      req.on('data', (d) => { s += d; if (s.length > 10000) { reject(new Error('Body quá lớn')); req.destroy(); } });
      req.on('end', () => { try { resolve(s ? JSON.parse(s) : {}); } catch (e) { reject(new Error('JSON sai')); } });
      req.on('error', reject);
    });
  }

  const server = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return reply(res, 204, {});
    try {
      const url = new URL(req.url, 'http://x');
      const body = req.method === 'POST' ? await readBody(req) : {};
      const r = rooms.handle(req.method, url.pathname, Object.fromEntries(url.searchParams), body);
      return reply(res, r.status, r.body);
    } catch (e) {
      return reply(res, 400, { error: e.message });
    }
  });

  const timer = setInterval(rooms.sweep, 10 * 60 * 1000);
  timer.unref();
  server.on('close', () => clearInterval(timer));
  return server;
}

module.exports = { createServer };

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, '0.0.0.0', () => {
    console.log(`MindGames server cổng ${port}. Trong LAN dùng một trong các địa chỉ:`);
    const nets = require('os').networkInterfaces();
    Object.keys(nets).forEach((k) => nets[k].forEach((n) => { if (n.family === 'IPv4' && !n.internal) console.log(`  http://${n.address}:${port}`); }));
  });
}
