import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { Table } from './Table';
import { createRoom, joinRoom, sendAction, fetchState } from '../net/client';
import { SERVER_URL } from '../net/config';

const POLL_MS = 1000;

// Có SERVER_URL (bản APK, server Render) thì dùng luôn. Không thì (dev trong Expo Go):
// đoán server chạy trên PC đang chạy Expo (cùng IP, cổng 3000).
function defaultServer() {
  if (SERVER_URL) return SERVER_URL;
  const c = Constants || {};
  const host = (c.expoConfig && c.expoConfig.hostUri) || (c.expoGoConfig && c.expoGoConfig.debuggerHost) || '';
  const ip = String(host).split(':')[0];
  return ip ? `http://${ip}:3000` : '';
}

// Bọc view nhận từ server thành object có cùng "hình dạng" với Game để Table dùng lại nguyên:
// đọc trạng thái = thuộc tính của view, hành động = gửi lên server (server mới là nơi kiểm luật).
function remoteGame(view, send) {
  return {
    ...view,
    previewCall: () => view.callPreview,
    draw: () => send({ type: 'draw' }),
    discard: (_p, cardId) => send({ type: 'discard', cardId }),
    call: () => send({ type: 'call' }),
    pass: () => send({ type: 'pass' }),
    choose: (_p, choice) => send({ type: 'choose', choice }),
    forfeit: () => send({ type: 'forfeit' }),
  };
}

function Room({ session, onExit }) {
  const { base, room, token, seat } = session;
  const [snap, setSnap] = useState(null);
  const [error, setError] = useState(null);
  const ver = useRef(0);
  const busy = useRef(false);

  const apply = (r) => {
    if (r.same) return;
    ver.current = r.version;
    setSnap(r);
  };
  const send = async (action) => {
    try { apply(await sendAction(base, room, token, action)); setError(null); } catch (e) { setError(e.message); }
  };

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const r = await fetchState(base, room, token, ver.current);
        if (alive) { apply(r); setError(null); }
      } catch (e) { if (alive) setError(e.message); }
      busy.current = false;
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!snap || !snap.started) {
    return (
      <View style={s.center}>
        <Text style={s.label}>Mã phòng</Text>
        <Text style={s.code}>{room}</Text>
        <Text style={s.hint}>Đưa mã này cho bạn bè để vào phòng.{'\n'}Đang chờ đối thủ…</Text>
        {error ? <Text style={s.err}>{error}</Text> : null}
        <Pressable style={s.ghost} onPress={onExit}><Text style={s.ghostText}>Rời phòng</Text></Pressable>
      </View>
    );
  }

  const game = remoteGame(snap.view, send);
  return (
    <View style={{ flex: 1 }}>
      <Table game={game} viewer={seat} onViewer={() => {}} act={(fn) => { fn(); }}
        onRestart={() => send({ type: 'rematch' })} onExit={onExit} online />
      {error ? <Text style={s.errBar}>⚠ {error}</Text> : null}
    </View>
  );
}

export function Online({ onExit }) {
  const [base, setBase] = useState(defaultServer);
  const [adv, setAdv] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [session, setSession] = useState(null);

  if (session) return <Room session={session} onExit={() => setSession(null)} />;

  const go = async (fn) => {
    setError(null);
    if (!base.trim()) { setError('Chưa có địa chỉ server. Mở "Nâng cao" để nhập, hoặc điền SERVER_URL trong src/net/config.js.'); return; }
    try { setSession({ base, ...(await fn()) }); } catch (e) { setError(e.message); }
  };

  return (
    <View style={s.center}>
      <Text style={s.title}>Chơi online</Text>
      <Text style={s.label}>Tên của bạn</Text>
      <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Tên hiển thị" placeholderTextColor="#6b8678" />
      <Pressable style={s.btn} onPress={() => go(() => createRoom(base, name))}><Text style={s.btnText}>Tạo phòng</Text></Pressable>
      <Text style={s.label}>hoặc nhập mã phòng bạn bè đưa</Text>
      <TextInput style={[s.input, s.codeInput]} value={code} onChangeText={(t) => setCode(t.toUpperCase())}
        autoCapitalize="characters" autoCorrect={false} maxLength={4} placeholder="ABCD" placeholderTextColor="#6b8678" />
      <Pressable style={s.btn} onPress={() => go(() => joinRoom(base, code, name))}><Text style={s.btnText}>Vào phòng</Text></Pressable>
      {error ? <Text style={s.err}>{error}</Text> : null}
      <Pressable onPress={() => setAdv(!adv)}><Text style={s.ghostText}>{adv ? 'Ẩn nâng cao' : 'Nâng cao: địa chỉ server'}</Text></Pressable>
      {adv ? <TextInput style={s.input} value={base} onChangeText={setBase} autoCapitalize="none" autoCorrect={false} /> : null}
      <Pressable style={s.ghost} onPress={onExit}><Text style={s.ghostText}>← Menu</Text></Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
  title: { color: '#e9efe9', fontSize: 26, fontWeight: '800', marginBottom: 6 },
  label: { color: '#9db5a8', fontSize: 13 },
  code: { color: '#e0b84c', fontSize: 56, fontWeight: '800', letterSpacing: 8 },
  hint: { color: '#9db5a8', textAlign: 'center' },
  input: { alignSelf: 'stretch', backgroundColor: '#00000059', color: '#e9efe9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#ffffff25' },
  codeInput: { textAlign: 'center', fontSize: 24, letterSpacing: 6, fontWeight: '700' },
  btn: { backgroundColor: '#e0b84c', paddingVertical: 12, paddingHorizontal: 22, borderRadius: 10, marginTop: 4 },
  btnText: { color: '#222', fontWeight: '700' },
  ghost: { marginTop: 8, padding: 8 },
  ghostText: { color: '#9db5a8' },
  err: { color: '#ff8a80', textAlign: 'center' },
  errBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#d9534f', color: '#fff', textAlign: 'center', padding: 6 },
});
