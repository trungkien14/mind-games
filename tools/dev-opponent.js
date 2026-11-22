#!/usr/bin/env node
/* Đối thủ giả (bot) để test 10 Point Poker online khi chỉ có 1 điện thoại.
 * Bot nói chuyện với server bằng ĐÚNG API HTTP như app (create/join/state/action), nên server thấy nó như người thật.
 * Dùng:
 *   node tools/dev-opponent.js ABCD            -> bot VÀO phòng mã ABCD (bạn tạo phòng trên điện thoại)
 *   node tools/dev-opponent.js                 -> bot TẠO phòng, in mã, bạn nhập mã trên điện thoại
 *   thêm: --server https://...  --name Bot  (mặc định lấy SERVER_URL trong src/net/config.js)
 * Chỉ cần Node 18+ (fetch có sẵn), không cần npm install. Dừng bằng Ctrl+C. */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const CODE = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const NAME = opt('--name', 'Bot');
const DELAY = Number(process.env.BOT_DELAY_MS) || 1500;   // bot "suy nghĩ" để bạn kịp nhìn UI
const POLL = Math.min(1000, DELAY);

function defaultServer() {
  try {
    const src = fs.readFileSync(path.join(__dirname, '../src/net/config.js'), 'utf8');
    const m = src.match(/SERVER_URL\s*=\s*'([^']*)'/);
    if (m && m[1]) return m[1];
  } catch (e) { /* rơi về localhost */ }
  return 'http://localhost:3000';
}
const BASE = opt('--server', defaultServer()).replace(/\/+$/, '');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(method, p, query, body) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 60000); // Render free ngủ: lần gọi đầu có thể ~30-60s
  try {
    const qs = query ? '?' + Object.keys(query).map((k) => `${k}=${encodeURIComponent(query[k])}`).join('&') : '';
    const res = await fetch(BASE + p + qs, method === 'GET' ? { signal: ctl.signal } :
      { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}), signal: ctl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Lỗi ${res.status}`);
    return data;
  } finally { clearTimeout(timer); }
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Quyết định hành động theo view (đã bị che bài đối thủ) - chỉ dùng thông tin bot được phép thấy.
function decide(v, seat) {
  if (v.phase === 'over') return v.rematch && v.rematch[seat] ? null : { type: 'rematch', wait: 5000 };   // chờ 5s cho bạn xem màn kết thúc; đã bấm rồi thì chờ người kia
  if (v.turn !== seat) return null;
  switch (v.phase) {
    case 'draw': return { type: 'draw' };
    case 'discard': return { type: 'discard', cardId: pick(v.hands[seat]).id };
    case 'call': return Math.random() < 0.7 && v.callPreview ? { type: 'call' } : { type: 'pass' };
    case 'review': return { type: 'ack', wait: DELAY * 2 };   // người thua (bot) "xem bài" lâu hơn 1 chút rồi bấm Tiếp tục
    case 'choose': return { type: 'choose', choice: Math.random() < 0.5 ? 'hit' : 'stay' };
    default: return null;
  }
}

async function main() {
  const s = CODE ? await call('POST', '/join', null, { room: CODE, name: NAME }) : await call('POST', '/create', null, { name: NAME });
  const { room, token, seat } = s;
  console.log(`[bot] ${NAME} ngồi ghế ${seat}, phòng ${room}, server ${BASE}`);
  if (!CODE) console.log(`[bot] Nhập mã ${room} trên điện thoại (Vào phòng có sẵn).`);

  let version = 0, printed = 0, st = null;
  const show = (v) => {
    if (v.log.length < printed) printed = 0;                    // ván mới -> log reset
    v.log.slice(printed).forEach((l) => console.log('  ' + l));
    printed = v.log.length;
  };

  for (;;) {
    if (!st) {   // chưa có trạng thái mới từ hành động của chính mình -> hỏi server (polling như app)
      try { st = await call('GET', '/state', { room, token, since: version }); }
      catch (e) { console.log('[bot] lỗi state:', e.message); if (/không còn tồn tại/.test(e.message)) return; await sleep(2000); continue; }
      if (st.same) { st = null; await sleep(POLL); continue; }
    }
    version = st.version;
    if (!st.started) { st = null; console.log('[bot] chờ đối thủ vào phòng…'); await sleep(POLL); continue; }
    show(st.view);
    const act = decide(st.view, seat);
    if (!act) { st = null; await sleep(POLL); continue; }
    await sleep(act.wait || DELAY);
    try {
      const { wait, ...payload } = act;
      st = await call('POST', '/action', null, { room, token, ...payload });   // snapshot mới -> quyết định tiếp ngay, không cần poll
    } catch (e) { console.log('[bot] hành động', act.type, 'bị từ chối:', e.message); st = null; version = 0; await sleep(POLL); }
  }
}

main().catch((e) => { console.error('[bot] dừng:', e.message); process.exit(1); });
