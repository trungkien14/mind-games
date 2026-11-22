/* Logic phòng chơi, KHÔNG phụ thuộc kiểu mạng: dùng chung cho server PC (HTTP) và host trong điện thoại (TCP).
 * handle(method, path, query, body) -> { status, body }
 *   POST /create {name}            -> {room, token, seat:0}
 *   POST /join   {room, name}      -> {room, token, seat:1}
 *   GET  /state  ?room&token&since -> {version, same:true} | {version, started, seat, room, view}
 *   POST /action {room, token, type, cardId?, choice?}  type: draw|discard|call|pass|ack|choose|forfeit|rematch
 * opts.fixedCode: ép mã phòng đầu tiên (chế độ host trong điện thoại: mã phòng cố định, mã hiển thị là IP). */
'use strict';
const { Game } = require('../core/game.js');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ I, O, 0, 1 cho khỏi nhầm khi đọc mã
const IDLE_MS = 2 * 60 * 60 * 1000;
const GONE_MS = 12000;   // 1 ghế im lặng (không poll/hành động) quá 12s => coi là đã thoát (client poll mỗi 1s, timeout 8s)

// Hermes (React Native) không có crypto.getRandomValues mặc định -> rơi về Math.random (đủ cho game LAN).
function randInt(n) {
  const c = typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues;
  if (c) { const a = new Uint32Array(1); globalThis.crypto.getRandomValues(a); return a[0] % n; }
  return Math.floor(Math.random() * n);
}
const randHex = (len) => { let s = ''; for (let i = 0; i < len; i++) s += randInt(16).toString(16); return s; };
const cleanName = (n, d) => (typeof n === 'string' && n.trim() ? n.trim().slice(0, 16) : d);
const res = (status, body) => ({ status, body });

function createRooms(opts) {
  opts = opts || {};
  const rooms = new Map();

  const newCode = () => {
    for (;;) {
      let c = '';
      for (let i = 0; i < 4; i++) c += ALPHABET[randInt(ALPHABET.length)];
      if (!rooms.has(c)) return c;
    }
  };
  // Ghế được suy ra từ token do server cấp, KHÔNG tin client tự khai ghế.
  const auth = (room, token) => (typeof token === 'string' && token ? room.tokens.indexOf(token) : -1);
  const snapshot = (room, seat) => ({
    version: room.version, started: !!room.game, seat, room: room.code, oppGone: oppGone(room, seat),
    view: room.game ? Object.assign(room.game.viewFor(seat), { rematch: room.rematch.slice() }) : null,   // rematch[i] = ghế i đã bấm Tiếp tục sau khi hết ván
  });
  const find = (code) => rooms.get(String(code || '').trim().toUpperCase());
  // Đối thủ của ghế `seat` đã thoát? Chỉ đúng khi ván đã bắt đầu. seen[i]=0 là ghế i bấm Rời phòng (báo ngay).
  const oppGone = (room, seat) => !!room.game && Date.now() - room.seen[1 - seat] > GONE_MS;

  function applyAction(room, seat, b) {
    const g = room.game;
    if (b.type === 'leave') { room.seen[seat] = 0; room.version++; return; }   // ghi nhận thoát phòng, không cần ván
    if (!g) throw new Error('Chưa đủ 2 người');
    switch (b.type) {
      case 'draw': g.draw(seat); break;
      case 'discard': g.discard(seat, b.cardId); break;
      case 'call': g.call(seat); break;
      case 'pass': g.pass(seat); break;
      case 'ack': g.ack(seat); break;
      case 'choose': g.choose(seat, b.choice); break;
      case 'forfeit':
        if (g.phase === 'over') throw new Error('Ván đã kết thúc');
        g.forfeit(seat); break;
      case 'rematch':
        if (g.phase !== 'over') throw new Error('Ván chưa kết thúc');
        // Cần CẢ HAI ghế bấm mới sang ván mới; bấm lặp lại là vô hại (cờ đã bật).
        room.rematch[seat] = true;
        if (room.rematch[0] && room.rematch[1]) { room.game = new Game({ names: g.names }); room.rematch = [false, false]; }
        break;
      default: throw new Error('Hành động không hợp lệ');
    }
    room.version++;
  }

  function handle(method, path, query, b) {
    b = b || {}; query = query || {};
    if (method === 'POST' && path === '/create') {
      const code = opts.fixedCode || newCode();
      if (rooms.has(code)) return res(409, { error: 'Mã phòng đã tồn tại' });
      const room = { code, tokens: [randHex(32), null], names: [cleanName(b.name, 'Người 1'), null], game: null, rematch: [false, false], seen: [Date.now(), Date.now()], version: 1, touched: Date.now() };
      rooms.set(code, room);
      return res(200, { room: code, token: room.tokens[0], seat: 0 });
    }
    if (method === 'POST' && path === '/join') {
      const room = find(b.room);
      if (!room) return res(404, { error: 'Không tìm thấy phòng' });
      if (room.tokens[1]) return res(409, { error: 'Phòng đã đủ 2 người' });
      room.tokens[1] = randHex(32);
      let n1 = cleanName(b.name, 'Người 2');
      if (n1 === room.names[0]) n1 += ' (2)';
      room.names[1] = n1;
      room.game = new Game({ names: room.names.slice() });
      room.version++; room.touched = Date.now(); room.seen = [Date.now(), Date.now()];
      return res(200, { room: room.code, token: room.tokens[1], seat: 1 });
    }
    if (method === 'GET' && path === '/state') {
      const room = find(query.room);
      if (!room) return res(404, { error: 'Phòng không còn tồn tại' });
      const seat = auth(room, query.token);
      if (seat < 0) return res(403, { error: 'Token sai' });
      room.touched = Date.now(); room.seen[seat] = Date.now();
      if (Number(query.since) === room.version) return res(200, { version: room.version, same: true, oppGone: oppGone(room, seat) });
      return res(200, snapshot(room, seat));
    }
    if (method === 'POST' && path === '/action') {
      const room = find(b.room);
      if (!room) return res(404, { error: 'Phòng không còn tồn tại' });
      const seat = auth(room, b.token);
      if (seat < 0) return res(403, { error: 'Token sai' });
      room.touched = Date.now(); room.seen[seat] = Date.now();
      try { applyAction(room, seat, b); } catch (e) { return res(400, { error: e.message }); }
      return res(200, snapshot(room, seat));
    }
    return res(404, { error: 'Không có đường dẫn này' });
  }

  function sweep() {
    const now = Date.now();
    for (const [c, r] of rooms) if (now - r.touched > IDLE_MS) rooms.delete(c);
  }

  return { handle, sweep };
}

module.exports = { createRooms, ALPHABET };
