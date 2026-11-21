import React, { useReducer, useState } from 'react';
import { View, Text, Pressable, StatusBar, StyleSheet } from 'react-native';
import { Game } from './src/core/game';
import { Table } from './src/ui/Table';
import { Online } from './src/ui/Online';

// Game là object có thể thay đổi (mutable) nên dùng bộ đếm `bump` để ép React vẽ lại sau mỗi hành động.
export default function App() {
  const [game, setGame] = useState(null);
  const [viewer, setViewer] = useState(0); // ai đang cầm máy
  const [online, setOnline] = useState(false);
  const [, bump] = useReducer((x) => x + 1, 0);

  const start = () => { setGame(new Game({ names: ['Người 1', 'Người 2'] })); setViewer(0); };
  const act = (fn) => { try { fn(); } catch (e) { console.warn(e.message); } bump(); };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      {online ? (
        <Online onExit={() => setOnline(false)} />
      ) : game ? (
        <Table game={game} viewer={viewer} onViewer={setViewer} act={act} onRestart={start} onExit={() => setGame(null)} />
      ) : (
        <View style={s.home}>
          <Text style={s.title}>MindGames</Text>
          <Text style={s.game}>🃏 10 Point Poker</Text>
          <Text style={s.desc}>Poker bất quy tắc: điểm tối đa 10, thua thì nạp đạn vào khẩu súng 10 ngăn.</Text>
          <Pressable style={s.btn} onPress={start}>
            <Text style={s.btnText}>Chơi 2 người (chung 1 máy)</Text>
          </Pressable>
          <Pressable style={s.btn} onPress={() => setOnline(true)}>
            <Text style={s.btnText}>Chơi online (nhiều máy, nhập mã phòng)</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f3d2e' },
  home: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  title: { color: '#e9efe9', fontSize: 34, fontWeight: '800', letterSpacing: 2 },
  game: { color: '#e0b84c', fontSize: 22, fontWeight: '700', marginTop: 12 },
  desc: { color: '#9db5a8', textAlign: 'center', fontSize: 15 },
  btn: { backgroundColor: '#e0b84c', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, marginTop: 12 },
  btnText: { color: '#222', fontWeight: '700', fontSize: 16 },
  soon: { color: '#9db5a8', marginTop: 4 },
});
