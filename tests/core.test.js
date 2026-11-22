// Chạy: node tests/core.test.js   (hoặc: npm test)
const assert = require('assert');
const D = '../src/core/';
const { parseCard: P, evalHand, cardLabel } = require(D + 'cards.js');
const { Game, addBullets } = require(D + 'game.js');

const H = (s) => s.split(' ').map(P);
let n = 0;
const ok = (name, fn) => { fn(); n++; };

// 1) Bảng điểm tổ hợp (kể cả Joker, A thấp/cao, không nối vòng Q-K-A-2-3)
const cases = [
  ['5S 5H 5D 5C JK', 10], ['JK JK 7S 7H 7D', 10],
  ['10S JS QS KS AS', 9], ['JK JS QS KS AS', 9],
  ['9S 10S JS QS KS', 8], ['AS 2S 3S 4S 5S', 8],
  ['9S 9H 9D 9C 2S', 7], ['9S 9H 9D 2C 2S', 6], ['JK 5S 5H 9D 9C', 6],
  ['2S 7S 9S JS KS', 5], ['5S 6H 7D 8C 9S', 4], ['10S JH QD KC AS', 4],
  ['QS KH AD 2C 3S', 0], ['4S 4H 4D 9C KS', 3], ['JK 2S 2H 9D JC', 3],
  ['JK JK 2S 9H KD', 3], ['4S 4H 9D 9C KS', 2], ['AS AH 4D 9C KS', 1],
  ['2S 2H 4D 9C KS', 1], ['JK 2S 5H 9D JC', 1], ['2S 5H 9D JC KS', 0],
];
cases.forEach(([h, want]) => ok(h, () => assert.strictEqual(evalHand(H(h)).score, want, `${h} phải = ${want}`)));

// 2) Quy tắc đạn
ok('bullets', () => {
  assert.strictEqual(addBullets(9, 2), 1);
  assert.strictEqual(addBullets(4, 3), 7);
  assert.strictEqual(addBullets(8, 2), 10);
  assert.strictEqual(addBullets(10, 1), 1);
});
ok('fire prob', () => {
  const g = new Game();
  const rate = (k) => { let d = 0; for (let i = 0; i < 20000; i++) if (g._fire(k)) d++; return d / 20000; };
  assert.strictEqual(rate(0), 0);
  assert.strictEqual(rate(10), 1);
  assert.ok(Math.abs(rate(3) - 0.3) < 0.02);
});

// 3) Ron được, Tsumo không; thắng bằng lá đối thủ bỏ (ví dụ đề: A,2,3,8 + 3 => đôi 3)
ok('tsumo bị cấm', () => {
  const g = new Game({ first: 0 });
  g.hands[0] = H('AS 2S 3H 8D'); g.deck.push(P('3C')); g.draw(0);
  assert.strictEqual(g.phase, 'discard');
  assert.strictEqual(g.previewCall(0), null);
  assert.throws(() => g.call(0));
});
ok('ron + stay + vòng sau', () => {
  const g = new Game();
  g.hands[0] = H('AS 2S 3H 8D'); g.hands[1] = H('KS QH 4D 9C');
  g.turn = 1; g.phase = 'draw'; g.deck.push(P('3S'));
  g.draw(1); g.discard(1, P('3S').id);
  assert.strictEqual(g.phase, 'call'); assert.strictEqual(g.turn, 0);
  g.call(0);
  assert.strictEqual(g.result.score, 1); assert.strictEqual(g.bullets[1], 1);
  assert.strictEqual(g.phase, 'review'); assert.strictEqual(g.turn, 1);   // người thua xem bài Call trước
  assert.throws(() => g.choose(0, 'stay'));                                // chưa Tiếp tục thì người thắng chưa được chọn
  assert.throws(() => g.ack(0));                                           // chỉ người thua được Tiếp tục
  g.ack(1); assert.strictEqual(g.phase, 'choose'); assert.strictEqual(g.turn, 0);
  const totalBefore = g.deck.length + g.discardPile.length + 9;   // bộ + chồng bỏ + 8 lá trên tay + lá Call
  g.choose(0, 'stay');
  assert.strictEqual(g.bullets[1], 1);               // Stay: đạn giữ nguyên
  assert.strictEqual(g.round, 2); assert.strictEqual(g.turn, 0);
  // Sau Call CẢ HAI chia lại: mỗi người 4 lá mới, TOÀN BỘ 54 lá được gom xáo lại => chồng bỏ rỗng, bộ bài còn 54-8 lá
  assert.strictEqual(g.hands[0].length, 4); assert.strictEqual(g.hands[1].length, 4);
  assert.strictEqual(g.deckCount, totalBefore - 8); assert.strictEqual(g.discardPile.length, 0);
  const all = g.deck.concat(g.hands[0], g.hands[1]).map((c) => c.id);
  H('AS 2S 3H 8D KS QH 4D 9C 3S').forEach((c) => assert.ok(all.includes(c.id)));   // bài cũ + lá Call quay lại bộ bài (đã xáo)   (bảo toàn 54 lá: xem mô phỏng 100 ván bên dưới; test này tự gán tay bài nên có lá trùng)
});
ok('pass không ghi log (không lộ việc đối thủ đang có tổ hợp để Call)', () => {
  const g = new Game();
  g.hands[0] = H('AS 2S 3H 8D'); g.hands[1] = H('KS QH 4D 9C');
  g.turn = 1; g.phase = 'draw'; g.deck.push(P('3S'));
  g.draw(1); g.discard(1, P('3S').id);
  assert.strictEqual(g.phase, 'call'); assert.strictEqual(g.turn, 0);
  const before = g.log.length;
  g.pass(0);
  assert.strictEqual(g.phase, 'draw'); assert.strictEqual(g.turn, 0);
  assert.strictEqual(g.log.length, before);
  assert.ok(!g.log.some((l) => /không Call/i.test(l)));
});
ok('hit chết ở 10 viên', () => {
  const g = new Game();
  g.hands[0] = H('AS 2S 3H 8D'); g.hands[1] = H('KS QH 4D 9C');
  g.turn = 1; g.phase = 'draw'; g.deck.push(P('3S')); g.bullets[1] = 9;
  g.draw(1); g.discard(1, P('3S').id); g.call(0);   // 9 + 1 = 10
  assert.strictEqual(g.bullets[1], 10);
  g.ack(1);
  g.choose(0, 'hit');
  assert.strictEqual(g.phase, 'over'); assert.strictEqual(g.loser, 1);
});

// 4a) Tung đồng xu: first ép được; rng<0.5 -> người 1, >=0.5 -> người 2; ngẫu nhiên thật thì cả hai đều xuất hiện
ok('đồng xu', () => {
  assert.strictEqual(new Game({ first: 1 }).turn, 1);
  assert.strictEqual(new Game({ first: 0 }).turn, 0);
  let a = 0;
  for (let i = 0; i < 400; i++) { const g = new Game(); assert.strictEqual(g.turn, g.first); a += g.first; }
  assert.ok(a > 120 && a < 280, 'đồng xu lệch: ' + a + '/400');
});

// 4) Chơi chung 1 máy: log công khai KHÔNG được lộ lá vừa rút
ok('log không lộ lá rút', () => {
  const g = new Game({ first: 0 });
  const c = P('KD'); g.deck.push(c); g.draw(0);
  assert.ok(!g.log[g.log.length - 1].includes(cardLabel(c)));
});

// 5) Mô phỏng 2 người chơi ngẫu nhiên (hành động hợp lệ bất kỳ): bảo toàn 54 lá, ván luôn kết thúc
function mulberry(a) { return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function randomMove(g, rng) {
  const p = g.turn;
  if (g.phase === 'draw') g.draw(p);
  else if (g.phase === 'discard') g.discard(p, g.hands[p][Math.floor(rng() * g.hands[p].length)].id);
  else if (g.phase === 'call') (rng() < 0.7 ? g.call(p) : g.pass(p));
  else if (g.phase === 'review') g.ack(p);
  else if (g.phase === 'choose') g.choose(p, rng() < 0.5 ? 'hit' : 'stay');
}
ok('mô phỏng', () => {
  let rounds = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const rng = mulberry(seed), g = new Game({ rng });
    for (let s = 0; g.phase !== 'over'; s++) {
      assert.ok(s < 20000, 'seed ' + seed + ' không kết thúc');
      randomMove(g, rng);
      // lá vừa Call nằm trong result.called (pha choose, hoặc over khi có người chết)
      const total = g.deck.length + g.discardPile.length + g.hands[0].length + g.hands[1].length
        + (g.lastDiscard ? 1 : 0) + ((g.phase === 'review' || g.phase === 'choose' || (g.phase === 'over' && g.result)) ? 1 : 0);
      assert.strictEqual(total, 54, `seed ${seed}: mất/thừa lá bài`);
    }
    rounds += g.round;
  }
  console.log(`  mô phỏng 100 ván, trung bình ${(rounds / 100).toFixed(1)} vòng/ván`);
});

console.log(`OK: ${n} nhóm kiểm tra đạt`);
