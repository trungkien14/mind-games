/* 10 Point Poker - máy trạng thái của một ván cho 2 NGƯỜI (không đụng UI, không có AI).
 * Pha (phase): draw -> discard -> (call) -> choose -> [vòng mới | over]
 * Người chơi: 0 và 1. Log là thông tin CÔNG KHAI nên không bao giờ ghi lá bài rút từ bộ bài. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./cards.js'));
  else root.TP = Object.assign(root.TP || {}, factory(root.TP));
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';

  const MAX_BULLETS = 10;

  // Vượt 10 thì chỉ giữ chữ số hàng đơn vị (9+2=11 -> 1). Đúng 10 vẫn là 10.
  function addBullets(cur, add) {
    const t = cur + add;
    return t > MAX_BULLETS ? t % 10 : t;
  }

  class Game {
    constructor(opts) {
      opts = opts || {};
      this.rng = opts.rng || Math.random;
      this.names = opts.names || ['Người 1', 'Người 2'];
      this.bullets = [0, 0];
      this.round = 1;
      this.log = [];
      this.deck = C.shuffle(C.makeDeck(), this.rng);
      this.discardPile = [];
      this.lastDiscard = null;     // lá vừa bỏ, còn "treo" để đối thủ Call
      this.lastDiscarder = null;
      this.result = null;          // kết quả lần Call gần nhất
      this.shot = null;            // kết quả Hit/Stay gần nhất
      this.loser = null;           // chỉ có khi phase === 'over' (người chết/bỏ cuộc)
      this.hands = [this._deal(4), this._deal(4)];
      // Tung đồng xu chọn người đi trước vòng 1: Ngửa -> người 1, Sấp -> người 2. opts.first (0|1) ép kết quả (dùng cho test).
      this.first = opts.first === 0 || opts.first === 1 ? opts.first : (this.rng() < 0.5 ? 0 : 1);
      this.turn = this.first;
      this.phase = 'draw';
      this._log(`Ván bắt đầu. Mỗi người 4 lá. Tung đồng xu: ${this.first === 0 ? 'Ngửa' : 'Sấp'} → ${this.names[this.first]} đi trước.`);
    }

    get deckCount() { return this.deck.length; }

    // Ảnh chụp trạng thái cho người p: chỉ bài của p là thật; bài đối thủ chỉ còn {id} (úp), bộ bài chỉ còn số lượng.
    viewFor(p) {
      const hidden = this.hands[1 - p].map((_, i) => ({ id: 'hidden' + i }));
      const pv = this.previewCall(p);
      return {
        names: this.names, bullets: this.bullets, round: this.round, log: this.log,
        phase: this.phase, turn: this.turn, loser: this.loser, shot: this.shot, result: this.result,
        lastDiscard: this.lastDiscard, deckCount: this.deck.length,
        hands: p === 0 ? [this.hands[0], hidden] : [hidden, this.hands[1]],
        callPreview: pv ? { name: pv.name, score: pv.score } : null,
      };
    }

    _log(s) { this.log.push(s); }
    _take() {
      if (!this.deck.length) this.deck = C.shuffle(this.discardPile.splice(0), this.rng);
      return this.deck.pop();
    }
    _deal(n) { const o = []; for (let i = 0; i < n; i++) o.push(this._take()); return o; }
    _expect(p, phase) {
      if (this.phase !== phase || this.turn !== p) {
        throw new Error(`Không hợp lệ: cần pha "${phase}" của người ${p}, đang là "${this.phase}" của người ${this.turn}`);
      }
    }

    // Bước 1: rút 1 lá từ bộ bài (5 lá trên tay). Không ghi tên lá vào log.
    draw(p) {
      this._expect(p, 'draw');
      const c = this._take();
      this.hands[p].push(c);
      this.phase = 'discard';
      this._log(`${this.names[p]} rút 1 lá.`);
      return c;
    }

    // Bước 2: bỏ 1 lá. Đối thủ được quyền Call lá này (Ron). Tự bốc đủ bài thì KHÔNG thắng (Tsumo).
    discard(p, cardId) {
      this._expect(p, 'discard');
      const i = this.hands[p].findIndex((c) => c.id === cardId);
      if (i < 0) throw new Error('Lá bài không có trên tay');
      const [card] = this.hands[p].splice(i, 1);
      if (this.lastDiscard) this.discardPile.push(this.lastDiscard);
      this.lastDiscard = card;
      this.lastDiscarder = p;
      this._log(`${this.names[p]} bỏ ${C.cardLabel(card)}.`);
      const o = 1 - p;
      this.turn = o;
      this.phase = C.evalHand(this.hands[o].concat(card)).score >= 1 ? 'call' : 'draw';
    }

    // Tổ hợp nếu Call lúc này (null nếu không được/không đúng lượt).
    previewCall(p) {
      if (this.phase !== 'call' || this.turn !== p) return null;
      const r = C.evalHand(this.hands[p].concat(this.lastDiscard));
      return r.score >= 1 ? r : null;
    }

    pass(p) {
      this._expect(p, 'call');
      this.phase = 'draw';
      this._log(`${this.names[p]} không Call.`);
    }

    call(p) {
      this._expect(p, 'call');
      const r = C.evalHand(this.hands[p].concat(this.lastDiscard));
      if (r.score < 1) throw new Error('Không có tổ hợp để Call');
      const loser = 1 - p;
      const before = this.bullets[loser];
      const after = addBullets(before, r.score);
      this.bullets[loser] = after;
      this.result = {
        winner: p, loser, score: r.score, name: r.name,
        cards: this.hands[p].concat(this.lastDiscard), called: this.lastDiscard,
        before, added: r.score, after, wrapped: before + r.score > MAX_BULLETS,
      };
      this.lastDiscard = null;
      this.phase = 'choose';
      this.turn = p;
      this._log(`${this.names[p]} CALL! ${r.name} = ${r.score} điểm. ${this.names[loser]} nạp +${r.score} đạn (${before} → ${after}${this.result.wrapped ? ', vượt 10 nên chỉ tính hàng đơn vị' : ''}).`);
    }

    // Người thắng chọn Hit (bắt người thua bóp cò) hoặc Stay (giữ đạn sang vòng sau).
    choose(p, action) {
      this._expect(p, 'choose');
      if (action !== 'hit' && action !== 'stay') throw new Error('action phải là hit hoặc stay');
      const { winner, loser } = this.result;
      const n = this.bullets[loser];
      if (action === 'stay') {
        this.shot = { action, victim: loser, bullets: n, dead: false };
        this._log(`${this.names[winner]} chọn STAY. ${this.names[loser]} giữ ${n} viên sang vòng sau.`);
        this._nextRound(winner);
        return this.shot;
      }
      const dead = this._fire(n);
      this.shot = { action, victim: loser, bullets: n, dead };
      if (dead) {
        this.phase = 'over';
        this.loser = loser;
        this._log(`${this.names[winner]} chọn HIT. Đoàng! ${this.names[loser]} trúng đạn (${n}/10). Ván kết thúc.`);
      } else {
        this.bullets[loser] = 0;
        this._log(`${this.names[winner]} chọn HIT. Cạch! ${this.names[loser]} sống sót (${n}/10). Ổ đạn về 0.`);
        this._nextRound(winner);
      }
      return this.shot;
    }

    forfeit(p) {
      this.phase = 'over';
      this.loser = p;
      this.shot = null;
      this._log(`${this.names[p]} bỏ cuộc.`);
    }

    // Ổ 10 ngăn, n ngăn có đạn, xáo vị trí rồi bóp 1 ngăn ngẫu nhiên => P(chết) = n/10.
    _fire(n) {
      const chamber = C.shuffle(Array.from({ length: MAX_BULLETS }, (_, i) => i < n), this.rng);
      return chamber[Math.floor(this.rng() * MAX_BULLETS)];
    }

    // Người thắng bỏ hết bài cũ, nhận 4 lá mới và đi trước; người thua giữ nguyên 4 lá.
    _nextRound(winner) {
      this.discardPile.push(...this.hands[winner], this.result.called);
      this.hands[winner] = this._deal(4);
      this.round++;
      this.turn = winner;
      this.phase = 'draw';
      this._log(`Vòng ${this.round}: ${this.names[winner]} nhận 4 lá mới và đi trước.`);
    }
  }

  return { Game, addBullets, MAX_BULLETS };
});
