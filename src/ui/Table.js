import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Platform, StatusBar, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Chamber } from './Chamber';
import { CoinFlip } from './CoinFlip';
import { ShotEffect } from './ShotEffect';
import { HintPanel } from './HintPanel';
import { play } from '../sound';

const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 52;

function Btn({ text, onPress, kind }) {
  return (
    <Pressable onPress={onPress} style={[s.btn, kind === 'danger' && s.danger, kind === 'ghost' && s.ghost]}>
      <Text style={[s.btnText, kind === 'danger' && { color: '#fff' }, kind === 'ghost' && { color: '#9db5a8' }]}>{text}</Text>
    </Pressable>
  );
}

export function Table({ game: g, viewer, act, onRestart, onExit }) {
  const me = viewer, opp = 1 - viewer;
  const over = g.phase === 'over';

  // Đồng xu: chỉ hiện ở đầu ván (log mới có 1 dòng). Lúc này g.turn chính là người đi trước do Game đã chọn.
  // Hook phải đứng trước mọi `return` sớm bên dưới.
  const [coinDone, setCoinDone] = useState(false);
  useEffect(() => { if (g.log.length > 1 && coinDone) setCoinDone(false); }, [g.log.length]); // chuẩn bị cho ván mới

  // Hiệu ứng bắn: chạy MỘT lần cho mỗi cú Hit mới. g.shot còn nguyên sang các lượt sau nên phải dùng khóa nhận diện
  // (vòng + nạn nhân + số đạn). Khóa lúc vào bàn được ghi nhớ sẵn để vào giữa ván không chiếu lại hiệu ứng cũ.
  const shotKey = g.shot && g.shot.action === 'hit' ? `${g.round}:${g.shot.victim}:${g.shot.bullets}` : null;
  const seenShot = useRef(shotKey);
  const [fx, setFx] = useState(null);
  const [showHint, setShowHint] = useState(false);   // bảng Gợi ý cho người mới (bật/tắt bằng nút 💡)
  useEffect(() => {
    if (!shotKey) { seenShot.current = null; return; }   // ván mới: xóa khóa cũ
    if (shotKey !== seenShot.current) {
      seenShot.current = shotKey;
      setFx({ dead: g.shot.dead, victim: g.shot.victim, bullets: g.shot.bullets });
    }
  }, [shotKey]);

  /* MỤC ĐÍCH: tự rút 1 lá khi đến lượt mình (pha 'draw'), người chơi khỏi phải chạm bộ bài.
   * CÁCH HOẠT ĐỘNG: đợi 500ms cho người chơi kịp thấy đã đến lượt rồi gọi g.draw. autoDrawKey (vòng + độ dài log) ghi nhớ
   * "lượt rút này đã gửi rồi" để render lại trong lúc request đang bay không rút 2 lần; khóa chỉ được ghi KHI timer chạy, nên timer
   * bị hủy giữa chừng (cleanup) thì lần sau vẫn rút được. Không rút khi đang chiếu đồng xu. Nếu gửi lỗi thì vẫn còn cách
   * chạm bộ bài để rút tay. Hook phải đứng trước return sớm bên dưới. */
  const autoDrawKey = useRef(null);
  const shouldAutoDraw = !over && g.turn === me && g.phase === 'draw' && !(g.log.length === 1 && !coinDone);
  useEffect(() => {
    if (!shouldAutoDraw) return;
    const key = `${g.round}:${g.log.length}`;
    if (autoDrawKey.current === key) return;
    const timer = setTimeout(() => {
      autoDrawKey.current = key;
      play('card');
      act(() => g.draw(me));
    }, 500);
    return () => clearTimeout(timer);
  }, [shouldAutoDraw, g.round, g.log.length]);
  if (g.log.length === 1 && !coinDone) {
    return <CoinFlip names={g.names} first={g.turn} onDone={() => setCoinDone(true)} />;
  }

  const myTurn = g.turn === me;
  const canDiscard = !over && myTurn && g.phase === 'discard';
  const canDraw = !over && myTurn && g.phase === 'draw';

  const forfeit = () => Alert.alert('Bỏ cuộc?', 'Bỏ cuộc nghĩa là thua ván này.', [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Bỏ cuộc', style: 'destructive', onPress: () => act(() => g.forfeit(me)) },
  ]);

  let actions = null;
  // Hết ván: mỗi người bấm "Tiếp tục"; phải cả hai bấm server mới tạo ván mới (g.rematch[i] do server gửi).
  if (over) actions = g.rematch && g.rematch[me]
    ? <Text style={s.hint}>Đang chờ {g.names[opp]} bấm Tiếp tục…</Text>
    : <Btn text="Tiếp tục" onPress={onRestart} />;
  else if (!myTurn) actions = <Text style={s.hint}>{g.phase === 'review' ? `Đang chờ ${g.names[g.turn]} xem bài…` : `Đang chờ ${g.names[g.turn]}…`}</Text>;
  else if (g.phase === 'draw') actions = <Text style={s.hint}>Đang rút bài… (nếu không tự rút, chạm bộ bài)</Text>;
  else if (g.phase === 'discard') actions = <Text style={s.hint}>Chạm 1 lá trên tay để bỏ.</Text>;
  else if (g.phase === 'call') {
    actions = (
      <View style={s.actRow}>
        <Btn text="Call!" onPress={() => act(() => g.call(me))} />
        <Btn text="Bỏ qua" kind="ghost" onPress={() => act(() => g.pass(me))} />
      </View>
    );
  } else if (g.phase === 'review') {
    // Người thua (đang có lượt) xem bài Call ở panel bên trên rồi bấm Tiếp tục
    actions = <Btn text="Tiếp tục" onPress={() => act(() => g.ack(me))} />;
  } else if (g.phase === 'choose') {
    const n = g.bullets[g.result.loser];
    actions = (
      <View style={s.actRow}>
        <Btn text={`Hit (${n * 10}% chết)`} kind="danger" onPress={() => act(() => g.choose(me, 'hit'))} />
        <Btn text="Stay" onPress={() => act(() => g.choose(me, 'stay'))} />
      </View>
    );
  }

  const r = g.result;
  return (
    <View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.header}>
        <View style={s.side}><Pressable onPress={onExit}><Text style={s.link}>← Menu</Text></Pressable></View>
        <Text style={s.round}>Vòng {g.round}</Text>
        <View style={[s.side, s.sideRight]}>
          {!over ? (
            <>
              <Pressable onPress={() => setShowHint((v) => !v)} hitSlop={10} style={[s.hintIcon, showHint && s.hintIconOn]}>
                <Text style={s.hintIconText}>💡</Text>
              </Pressable>
              <Pressable onPress={forfeit}><Text style={s.link}>Bỏ cuộc</Text></Pressable>
            </>
          ) : null}
        </View>
      </View>

      <Text style={s.name}>{g.names[opp]}</Text>
      <Chamber bullets={g.bullets[opp]} />
      <View style={s.row}>
        {g.hands[opp].map((c) => <Card key={c.id} back small />)}
      </View>

      <View style={s.mid}>
        <View style={s.row}>
          <Card back count={g.deckCount} highlight={canDraw} onPress={canDraw ? () => { play('card'); act(() => g.draw(me)); } : undefined} />
          {g.lastDiscard ? <Card card={g.lastDiscard} /> : <View style={s.empty} />}
        </View>
        <Text style={s.banner}>{g.log[g.log.length - 1]}</Text>

        {(g.phase === 'review' || g.phase === 'choose') && (
          <View style={s.panel}>
            <Text style={s.panelTitle}>{g.names[r.winner]} thắng: {r.name} ({r.score} điểm)</Text>
            <View style={s.row}>
              {r.cards.map((c) => <Card key={c.id} card={c} small highlight={c.id === r.called.id} />)}
            </View>
            <Text style={s.hint}>
              {g.names[r.loser]} nạp +{r.added}: {r.before} → {r.after}{r.wrapped ? ' (vượt 10 → hàng đơn vị)' : ''}
            </Text>
          </View>
        )}
        {over && (
          <View style={[s.panel, { borderColor: '#d9534f' }]}>
            <Text style={s.panelTitle}>
              {g.shot && g.shot.dead ? '💥 Đoàng! ' : ''}{g.names[g.loser]} {g.shot && g.shot.dead ? 'trúng đạn' : 'bỏ cuộc'} — {g.names[1 - g.loser]} thắng!
            </Text>
          </View>
        )}
        <View style={s.actions}>{actions}</View>
      </View>

      {showHint && !over ? <HintPanel hand={g.hands[me]} seenCards={g.lastDiscard ? [g.lastDiscard] : []} /> : null}
      <View style={s.row}>
        {g.hands[me].map((c) => (
          <Card key={c.id} card={c} highlight={canDiscard} onPress={canDiscard ? () => { play('card'); act(() => g.discard(me, c.id)); } : undefined} />
        ))}
      </View>
      <Chamber bullets={g.bullets[me]} />
      <Text style={s.name}>{g.names[me]} (bạn)</Text>
    </ScrollView>
    {fx ? <ShotEffect dead={fx.dead} name={g.names[fx.victim]} bullets={fx.bullets} onDone={() => setFx(null)} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  page: { flexGrow: 1, paddingTop: TOP, paddingBottom: 24, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch' },
  link: { color: '#9db5a8' },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center' },   // 2 bên header bằng nhau để chữ "Vòng N" luôn nằm giữa
  sideRight: { justifyContent: 'flex-end', gap: 16 },
  hintIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e0b84c80' },
  hintIconOn: { backgroundColor: '#e0b84c40' },
  hintIconText: { fontSize: 18 },
  round: { color: '#9db5a8', fontWeight: '600' },
  name: { color: '#9db5a8', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  mid: { alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  empty: { width: 62, height: 90, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: '#ffffff30' },
  banner: { color: '#e0b84c', textAlign: 'center', fontSize: 15, minHeight: 20 },
  hint: { color: '#9db5a8', textAlign: 'center', fontSize: 13 },
  panel: { backgroundColor: '#00000059', borderRadius: 12, borderWidth: 1, borderColor: '#ffffff25', padding: 10, gap: 8, alignItems: 'center', alignSelf: 'stretch' },
  panelTitle: { color: '#e9efe9', fontWeight: '700', textAlign: 'center' },
  actions: { minHeight: 44, justifyContent: 'center', alignSelf: 'stretch' },
  actRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' },   // KHÔNG flexWrap: wrap làm khung tính sai chiều cao -> nút chồng lên phần dưới
  btn: { backgroundColor: '#e0b84c', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
  btnText: { color: '#222', fontWeight: '700' },
  danger: { backgroundColor: '#d9534f' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ffffff30' },
});
