/* 10 Point Poker - bộ bài + chấm điểm tổ hợp (Joker vạn năng).
 * Dùng được cả trình duyệt (window.TP) lẫn Node (require). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.TP = Object.assign(root.TP || {}, factory());
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SUITS = ['S', 'H', 'D', 'C'];
  const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
  const RANK_LABEL = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
  const HAND_NAMES = {
    0: 'Không có tổ hợp', 1: 'One Pair', 2: 'Two Pair', 3: 'Three of a Kind',
    4: 'Straight', 5: 'Flush', 6: 'Full House', 7: 'Four of a Kind',
    8: 'Straight Flush', 9: 'Royal Straight Flush', 10: 'Five of a Kind',
  };

  // id: 0..51 = lá thường (suitIndex*13 + rank-1), 52/53 = Joker
  function makeDeck() {
    const d = [];
    SUITS.forEach((s, si) => {
      for (let r = 1; r <= 13; r++) d.push({ id: si * 13 + r - 1, rank: r, suit: s, joker: false });
    });
    d.push({ id: 52, rank: 0, suit: null, joker: true });
    d.push({ id: 53, rank: 0, suit: null, joker: true });
    return d;
  }
  const FULL52 = makeDeck().slice(0, 52);

  function shuffle(arr, rng) {
    rng = rng || Math.random;
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function cardLabel(c) {
    if (c.joker) return 'Joker';
    return (RANK_LABEL[c.rank] || c.rank) + SUIT_SYMBOL[c.suit];
  }

  // 'AS', '10H', 'JK' (Joker 1), 'JK2' (Joker 2) -> card. Dùng cho test.
  function parseCard(code) {
    if (/^JK/.test(code)) return { id: code === 'JK2' ? 53 : 52, rank: 0, suit: null, joker: true };
    const suit = code.slice(-1);
    const r = code.slice(0, -1);
    const rank = { A: 1, J: 11, Q: 12, K: 13 }[r] || Number(r);
    return { id: SUITS.indexOf(suit) * 13 + rank - 1, rank, suit, joker: false };
  }

  // Chấm 5 lá THẬT (không Joker). Thứ tự ưu tiên đúng bảng điểm 10 -> 0.
  function evalFixed(cards) {
    const counts = {};
    for (const c of cards) counts[c.rank] = (counts[c.rank] || 0) + 1;
    const groups = Object.values(counts).sort((a, b) => b - a);
    const ranks = Object.keys(counts).map(Number).sort((a, b) => a - b);
    const flush = cards.every((c) => c.suit === cards[0].suit);
    let straight = false, royal = false;
    if (ranks.length === 5) {
      if (ranks[4] - ranks[0] === 4) straight = true;            // gồm cả A-2-3-4-5
      else if (ranks.join() === '1,10,11,12,13') straight = royal = true; // 10-J-Q-K-A
    }
    if (groups[0] === 5) return 10;
    if (straight && flush) return royal ? 9 : 8;
    if (groups[0] === 4) return 7;
    if (groups[0] === 3 && groups[1] === 2) return 6;
    if (flush) return 5;
    if (straight) return 4;
    if (groups[0] === 3) return 3;
    if (groups[0] === 2 && groups[1] === 2) return 2;
    if (groups[0] === 2) return 1;
    return 0;
  }

  // Joker: thử thay bằng cả 52 lá, lấy điểm cao nhất (tối đa 52^2 = 2704 tổ hợp).
  function bestWithJokers(fixed, jokers) {
    if (jokers === 0) return evalFixed(fixed);
    let best = 0;
    for (const c of FULL52) {
      const s = bestWithJokers(fixed.concat(c), jokers - 1);
      if (s > best) { best = s; if (best === 10) break; }
    }
    return best;
  }

  function evalHand(cards) {
    if (cards.length !== 5) throw new Error('Tổ hợp phải đúng 5 lá');
    const fixed = cards.filter((c) => !c.joker);
    const score = bestWithJokers(fixed, cards.length - fixed.length);
    return { score, name: HAND_NAMES[score] };
  }

  return { SUITS, SUIT_SYMBOL, RANK_LABEL, HAND_NAMES, makeDeck, shuffle, cardLabel, parseCard, evalHand };
});
