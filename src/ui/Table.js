import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Platform, StatusBar, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Chamber } from './Chamber';
import { CoinFlip } from './CoinFlip';

const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 52;

function Btn({ text, onPress, kind }) {
  return (
    <Pressable onPress={onPress} style={[s.btn, kind === 'danger' && s.danger, kind === 'ghost' && s.ghost]}>
      <Text style={[s.btnText, kind === 'danger' && { color: '#fff' }, kind === 'ghost' && { color: '#9db5a8' }]}>{text}</Text>
    </Pressable>
  );
}

// Màn chắn khi đổi lượt: che bài, chỉ hiện sau khi người kế tiếp bấm "sẵn sàng".
function Handoff({ game, onReady }) {
  return (
    <View style={s.cover}>
      <Text style={s.coverTitle}>Chuyển máy cho</Text>
      <Text style={s.coverName}>{game.names[game.turn]}</Text>
      <Text style={s.coverLog}>{game.log[game.log.length - 1]}</Text>
      <Btn text={`Tôi là ${game.names[game.turn]} — sẵn sàng`} onPress={onReady} />
    </View>
  );
}

export function Table({ game: g, viewer, onViewer, act, onRestart, onExit, online }) {
  const me = viewer, opp = 1 - viewer;
  const over = g.phase === 'over';

  // Đồng xu: chỉ hiện ở đầu ván (log mới có 1 dòng). Lúc này g.turn chính là người đi trước do Game đã chọn.
  // Hook phải đứng trước mọi `return` sớm bên dưới.
  const [coinDone, setCoinDone] = useState(false);
  useEffect(() => { if (g.log.length > 1 && coinDone) setCoinDone(false); }, [g.log.length]); // chuẩn bị cho ván mới
  if (g.log.length === 1 && !coinDone) {
    return <CoinFlip names={g.names} first={g.turn} onDone={() => setCoinDone(true)} />;
  }

  // Hot-seat: che bài khi đổi lượt. Online: mỗi người một máy nên không cần màn chắn.
  if (!online && !over && g.turn !== viewer) return <Handoff game={g} onReady={() => onViewer(g.turn)} />;

  const myTurn = g.turn === me;
  const canDiscard = !over && myTurn && g.phase === 'discard';
  const canDraw = !over && myTurn && g.phase === 'draw';

  const forfeit = () => Alert.alert('Bỏ cuộc?', 'Bỏ cuộc nghĩa là thua ván này.', [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Bỏ cuộc', style: 'destructive', onPress: () => act(() => g.forfeit(me)) },
  ]);

  let actions = null;
  if (over) actions = <Btn text="Ván mới" onPress={onRestart} />;
  else if (!myTurn) actions = <Text style={s.hint}>Đang chờ {g.names[g.turn]}…</Text>;
  else if (g.phase === 'draw') actions = <Text style={s.hint}>Chạm bộ bài để rút 1 lá.</Text>;
  else if (g.phase === 'discard') actions = <Text style={s.hint}>Chạm 1 lá trên tay để bỏ.</Text>;
  else if (g.phase === 'call') {
    const r = g.previewCall(me);
    actions = (
      <View style={s.row}>
        <Btn text={`Call! ${r.name} (${r.score})`} onPress={() => act(() => g.call(me))} />
        <Btn text="Bỏ qua" kind="ghost" onPress={() => act(() => g.pass(me))} />
      </View>
    );
  } else if (g.phase === 'choose') {
    const n = g.bullets[g.result.loser];
    actions = (
      <View style={s.row}>
        <Btn text={`Hit (${n * 10}% chết)`} kind="danger" onPress={() => act(() => g.choose(me, 'hit'))} />
        <Btn text="Stay" onPress={() => act(() => g.choose(me, 'stay'))} />
      </View>
    );
  }

  const r = g.result;
  return (
    <ScrollView contentContainerStyle={s.page}>
      <View style={s.header}>
        <Pressable onPress={onExit}><Text style={s.link}>← Menu</Text></Pressable>
        <Text style={s.round}>Vòng {g.round}</Text>
        {!over ? <Pressable onPress={forfeit}><Text style={s.link}>Bỏ cuộc</Text></Pressable> : <View style={{ width: 60 }} />}
      </View>

      <Text style={s.name}>{g.names[opp]}</Text>
      <Chamber bullets={g.bullets[opp]} />
      <View style={s.row}>
        {g.hands[opp].map((c) => <Card key={c.id} back small />)}
      </View>

      <View style={s.mid}>
        <View style={s.row}>
          <Card back count={g.deckCount} highlight={canDraw} onPress={canDraw ? () => act(() => g.draw(me)) : undefined} />
          {g.lastDiscard ? <Card card={g.lastDiscard} /> : <View style={s.empty} />}
        </View>
        <Text style={s.banner}>{g.log[g.log.length - 1]}</Text>

        {g.phase === 'choose' && (
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

      <View style={s.row}>
        {g.hands[me].map((c) => (
          <Card key={c.id} card={c} highlight={canDiscard} onPress={canDiscard ? () => act(() => g.discard(me, c.id)) : undefined} />
        ))}
      </View>
      <Chamber bullets={g.bullets[me]} />
      <Text style={s.name}>{g.names[me]} (bạn)</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: { flexGrow: 1, paddingTop: TOP, paddingBottom: 24, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch' },
  link: { color: '#9db5a8', width: 60 },
  round: { color: '#9db5a8', fontWeight: '600' },
  name: { color: '#9db5a8', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  mid: { alignItems: 'center', gap: 10, alignSelf: 'stretch' },
  empty: { width: 62, height: 90, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: '#ffffff30' },
  banner: { color: '#e0b84c', textAlign: 'center', fontSize: 15, minHeight: 20 },
  hint: { color: '#9db5a8', textAlign: 'center', fontSize: 13 },
  panel: { backgroundColor: '#00000059', borderRadius: 12, borderWidth: 1, borderColor: '#ffffff25', padding: 10, gap: 8, alignItems: 'center', alignSelf: 'stretch' },
  panelTitle: { color: '#e9efe9', fontWeight: '700', textAlign: 'center' },
  actions: { minHeight: 44, justifyContent: 'center' },
  btn: { backgroundColor: '#e0b84c', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 10 },
  btnText: { color: '#222', fontWeight: '700' },
  danger: { backgroundColor: '#d9534f' },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#ffffff30' },
  cover: { flex: 1, backgroundColor: '#0b2e23', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  coverTitle: { color: '#9db5a8', fontSize: 16 },
  coverName: { color: '#e0b84c', fontSize: 36, fontWeight: '800' },
  coverLog: { color: '#9db5a8', textAlign: 'center', marginBottom: 12 },
});
