// node tests/hint.test.js - kiểm tra listOutsForHand (nút Gợi ý cho người mới)
const assert = require('assert');
const C = require('../src/core/cards.js');
const hand = (...codes) => codes.map(C.parseCard);
const byScore = (outs) => Object.fromEntries(outs.map((o) => [o.score, o]));

// 4 lá cùng chất ♠ chưa thành sảnh: thùng (5) cần đúng 9 lá ♠ còn lại + Joker x2 = 11 lá
{
  const o = byScore(C.listOutsForHand(hand('2S', '5S', '9S', 'KS'), []));
  assert.strictEqual(o[5].count, 9 + 2, 'Flush: 9 lá ♠ còn lại + 2 Joker');
  assert.ok(o[5].needs.startsWith('mọi lá ♠'));
  assert.ok(o[1], 'bốc trùng số vẫn được 1 đôi');
}
// 4 lá liên tiếp 4-5-6-7 hở hai đầu: sảnh cần số 3 hoặc 8 (8 lá) + 2 Joker
{
  const o = byScore(C.listOutsForHand(hand('4S', '5H', '6D', '7C'), []));
  assert.strictEqual(o[4].count, 8 + 2);
  assert.ok(o[4].needs.includes('số 3, 8'));
}
// Hai đôi 7-7-K-K: cù lũ cần 7 hoặc K (2+2 lá) + 2 Joker
{
  const o = byScore(C.listOutsForHand(hand('7S', '7H', 'KS', 'KH'), []));
  assert.strictEqual(o[6].count, 2 + 2 + 2);
  assert.ok(o[2], 'bốc lá khác vẫn giữ 2 đôi');
}
// Lá đã lộ (seen) bị loại khỏi danh sách cần
{
  const seen = hand('3H');
  const o = byScore(C.listOutsForHand(hand('4S', '5H', '6D', '7C'), seen));
  assert.strictEqual(o[4].count, 7 + 2);
}
// Tay không đủ 4 lá -> lỗi rõ ràng
assert.throws(() => C.listOutsForHand(hand('4S', '5H', '6D'), []));
console.log('hint.test.js: OK');
