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
  // Giải thích luật bằng tiếng Việt cho người mới (dùng ở nút Gợi ý).
  const HAND_HELP = {
    1: 'Một đôi: 2 lá cùng số (vd 7-7)',
    2: 'Hai đôi: 2 cặp, mỗi cặp 2 lá cùng số (vd 7-7 và K-K)',
    3: 'Sám: 3 lá cùng số',
    4: 'Sảnh: 5 lá số liên tiếp (vd 4-5-6-7-8); A tính thấp hoặc cao',
    5: 'Thùng: 5 lá cùng chất (♠ ♥ ♦ ♣)',
    6: 'Cù lũ: 1 bộ ba + 1 đôi (vd 8-8-8-K-K)',
    7: 'Tứ quý: 4 lá cùng số',
    8: 'Thùng phá sảnh: sảnh mà cả 5 lá cùng chất',
    9: 'Sảnh rồng: 10-J-Q-K-A cùng chất',
    10: 'Ngũ quý: 5 lá cùng số (cần Joker)',
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

  /* MỤC ĐÍCH: biến danh sách lá cần thiết thành câu ngắn dễ đọc cho người mới (vd "mọi lá ♠", "số 7", "5♥, 9♠").
   * CÁCH HOẠT ĐỘNG: thử lần lượt 3 kiểu mô tả từ gọn đến chi tiết: cùng một chất (>= 5 lá) -> "mọi lá <chất>";
   * nhiều lá trùng số -> liệt kê SỐ; còn ít lá -> liệt kê từng lá. Quá nhiều lá mà không gọn được thì trả null (chỉ hiện số lượng).
   * Joker luôn được thêm riêng ở cuối. Là mô tả gần đúng, không thay cho danh sách chính xác. */
  function describeNeededCards(cards) {
    const jokerCount = cards.filter((c) => c.joker).length;
    const normalCards = cards.filter((c) => !c.joker);
    const suitList = Array.from(new Set(normalCards.map((c) => c.suit)));
    const rankList = Array.from(new Set(normalCards.map((c) => c.rank))).sort((a, b) => a - b);
    let text = null;
    if (suitList.length === 1 && normalCards.length >= 5) text = 'mọi lá ' + SUIT_SYMBOL[suitList[0]];
    else if (rankList.length <= 6 && rankList.length < normalCards.length) text = 'số ' + rankList.map((r) => RANK_LABEL[r] || r).join(', ');
    else if (normalCards.length <= 6) text = normalCards.map(cardLabel).join(', ');
    if (jokerCount > 0) text = (text ? text + ' + ' : '') + 'Joker';
    return text;
  }

  /* MỤC ĐÍCH: gợi ý cho người mới. Với 4 lá trên tay, thêm 1 lá nào nữa (bốc từ bộ bài hoặc Call lá đối thủ bỏ)
   * thì được tổ hợp gì, cần bao nhiêu lá.
   * CÁCH HOẠT ĐỘNG: duyệt mọi lá còn chưa thấy (54 lá trừ 4 lá trên tay và các lá lộ ra trong seenCards),
   * ghép với 4 lá rồi chấm bằng evalHand (tái dùng luật + Joker vạn năng), gom theo điểm.
   * Trả về mảng {score, name, help, count, needs} xếp điểm cao -> thấp, bỏ qua các lá không tạo ra tổ hợp nào (0 điểm). */
  function listOutsForHand(hand, seenCards) {
    if (hand.length !== 4) throw new Error('Gợi ý chỉ dùng cho 4 lá trên tay');
    const unavailableIds = new Set(hand.concat(seenCards || []).map((c) => c.id));
    const cardsByScore = {};
    for (const candidate of makeDeck()) {
      if (unavailableIds.has(candidate.id)) continue;
      const score = evalHand(hand.concat(candidate)).score;
      if (score < 1) continue;
      (cardsByScore[score] = cardsByScore[score] || []).push(candidate);
    }
    return Object.keys(cardsByScore).map(Number).sort((a, b) => b - a).map((score) => ({
      score, name: HAND_NAMES[score], help: HAND_HELP[score],
      count: cardsByScore[score].length, needs: describeNeededCards(cardsByScore[score]),
    }));
  }

  return { SUITS, SUIT_SYMBOL, RANK_LABEL, HAND_NAMES, HAND_HELP, makeDeck, shuffle, cardLabel, parseCard, evalHand, listOutsForHand };
});
