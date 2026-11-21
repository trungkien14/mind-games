// Chạy: node tests/online.test.js  (cần Node >= 18 vì dùng fetch có sẵn)
const assert = require('assert');
const { createServer } = require('../server/server.js');

(async () => {
  const srv = createServer();
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const post = async (p, b) => { const r = await fetch(base + p, { method: 'POST', body: JSON.stringify(b) }); return { code: r.status, ...(await r.json()) }; };
  const get = async (q) => { const r = await fetch(base + '/state?' + new URLSearchParams(q)); return { code: r.status, ...(await r.json()) }; };

  // Tạo phòng, vào phòng bằng mã (viết thường cũng được), lỗi: sai mã / phòng đầy / token sai
  const a = await post('/create', { name: 'An' });
  assert.strictEqual(a.seat, 0); assert.match(a.room, /^[A-Z2-9]{4}$/);
  const wait = await get({ room: a.room, token: a.token, since: 0 });
  assert.strictEqual(wait.started, false);
  assert.strictEqual((await post('/join', { room: 'ZZZZ', name: 'x' })).code, 404);
  const b = await post('/join', { room: a.room.toLowerCase(), name: 'An' });
  assert.strictEqual(b.seat, 1);
  assert.strictEqual((await post('/join', { room: a.room, name: 'z' })).code, 409);
  assert.strictEqual((await get({ room: a.room, token: 'bad', since: 0 })).code, 403);

  // View bị lọc: bài đối thủ chỉ có {id}, không lộ bộ bài
  const seats = [a, b];
  const view = async (i) => (await get({ room: a.room, token: seats[i].token, since: 0 }));
  const v0 = await view(0), v1 = await view(1);
  assert.strictEqual(v0.view.names[1], 'An (2)');
  assert.strictEqual(v0.view.hands[0].length, 4); assert.ok(v0.view.hands[0][0].rank !== undefined || v0.view.hands[0][0].label !== undefined || Object.keys(v0.view.hands[0][0]).length > 1);
  v0.view.hands[1].forEach((c) => assert.deepStrictEqual(Object.keys(c), ['id']));
  v1.view.hands[0].forEach((c) => assert.deepStrictEqual(Object.keys(c), ['id']));
  assert.strictEqual(typeof v0.view.deckCount, 'number'); assert.ok(!('deck' in v0.view));
  // since == version -> same
  assert.strictEqual((await get({ room: a.room, token: a.token, since: v0.version })).same, true);

  // Sai lượt bị chặn: người KHÔNG có lượt (do đồng xu quyết định) không được rút
  const first = v0.view.turn, second = 1 - first;
  assert.ok(first === 0 || first === 1); assert.strictEqual(v1.view.turn, first);
  assert.strictEqual((await post('/action', { room: a.room, token: seats[second].token, type: 'draw' })).code, 400);

  // Chơi tới khi xong ván bằng hành động qua mạng
  let steps = 0;
  for (; steps < 3000; steps++) {
    const s0 = (await view(0)).view;
    if (s0.phase === 'over') break;
    const seat = s0.turn, tk = seats[seat].token;
    const v = (await view(seat)).view;
    let act;
    if (v.phase === 'draw') act = { type: 'draw' };
    else if (v.phase === 'discard') act = { type: 'discard', cardId: v.hands[seat][0].id };
    else if (v.phase === 'call') act = v.callPreview ? { type: 'call' } : { type: 'pass' };
    else act = { type: 'choose', choice: steps % 2 ? 'hit' : 'stay' };
    const r = await post('/action', { room: a.room, token: tk, ...act });
    assert.strictEqual(r.code, 200, JSON.stringify(r));
  }
  const end = (await view(0)).view;
  assert.strictEqual(end.phase, 'over');
  assert.strictEqual((await post('/action', { room: a.room, token: a.token, type: 'forfeit' })).code, 400);

  // Ván mới
  const rm = await post('/action', { room: a.room, token: b.token, type: 'rematch' });
  assert.strictEqual(rm.code, 200); assert.strictEqual(rm.view.phase, 'draw'); assert.strictEqual(rm.view.round, 1);

  console.log(`OK online: ván hoàn tất sau ${steps} hành động, lọc bài đúng, rematch OK`);
  srv.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
