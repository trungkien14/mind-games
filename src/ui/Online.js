import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, Platform, StatusBar, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { Table } from './Table';
import { createRoom, joinRoom, sendAction, fetchState } from '../net/client';
import { SERVER_URL } from '../net/config';

const POLL_MS = 1000;
const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 52;

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
      <Table game={game} viewer={seat} act={(fn) => { fn(); }}
        onRestart={() => send({ type: 'rematch' })} onExit={onExit} />
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

  const canJoin = code.length === 4;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={l.page} keyboardShouldPersistTaps="handled">
        <View style={l.top}>
          <Pressable onPress={onExit} hitSlop={12} style={l.iconBtn}><Text style={l.iconText}>←</Text></Pressable>
          <Pressable onPress={() => setAdv(!adv)} hitSlop={12} style={[l.iconBtn, adv && l.iconOn]}><Text style={l.iconText}>⚙</Text></Pressable>
        </View>

        <Text style={l.hero}>🃏</Text>
        <Text style={l.title}>10 Point Poker</Text>
        <Text style={l.sub}>Chơi online cùng bạn bè</Text>

        <Text style={l.label}>TÊN CỦA BẠN</Text>
        <TextInput style={l.input} value={name} onChangeText={setName} placeholder="Tên hiển thị" placeholderTextColor="#6b8678" maxLength={16} />

        <View style={l.card}>
          <Text style={l.cardTitle}>Tạo phòng mới</Text>
          <Text style={l.cardHint}>Bạn sẽ nhận mã 4 ký tự để gửi cho bạn bè.</Text>
          <Pressable style={l.primary} onPress={() => go(() => createRoom(base, name))}><Text style={l.primaryText}>Tạo phòng</Text></Pressable>
        </View>

        <View style={l.card}>
          <Text style={l.cardTitle}>Vào phòng có sẵn</Text>
          <TextInput style={l.codeInput} value={code} onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters" autoCorrect={false} maxLength={4} placeholder="ABCD" placeholderTextColor="#4f6b5d" />
          <Pressable disabled={!canJoin} style={[l.secondary, !canJoin && l.disabled]} onPress={() => go(() => joinRoom(base, code, name))}>
            <Text style={l.secondaryText}>Vào phòng</Text>
          </Pressable>
        </View>

        {error ? <View style={l.errBox}><Text style={l.errText}>{error}</Text></View> : null}

        {adv ? (
          <View style={l.card}>
            <Text style={l.cardTitle}>Địa chỉ server</Text>
            <TextInput style={l.input} value={base} onChangeText={setBase} autoCapitalize="none" autoCorrect={false} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
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

// Style riêng cho màn sảnh (nhập tên / tạo phòng / vào phòng).
const l = StyleSheet.create({
  page: { flexGrow: 1, paddingTop: TOP, paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  top: { flexDirection: 'row', justifyContent: 'space-between' },
  iconBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#ffffff18', alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: '#e0b84c40' },
  iconText: { color: '#e9efe9', fontSize: 20 },
  hero: { fontSize: 60, textAlign: 'center', marginTop: 4 },
  title: { color: '#e0b84c', fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: 0.5 },
  sub: { color: '#9db5a8', textAlign: 'center', marginBottom: 8 },
  label: { color: '#9db5a8', fontSize: 12, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },
  input: { backgroundColor: '#00000059', color: '#e9efe9', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, borderWidth: 1, borderColor: '#ffffff25' },
  card: { backgroundColor: '#ffffff12', borderRadius: 20, padding: 16, gap: 10, borderWidth: 1, borderColor: '#ffffff20' },
  cardTitle: { color: '#e9efe9', fontSize: 17, fontWeight: '800' },
  cardHint: { color: '#9db5a8', fontSize: 13 },
  primary: { backgroundColor: '#e0b84c', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#222', fontWeight: '800', fontSize: 16 },
  secondary: { borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 2, borderColor: '#e0b84c' },
  secondaryText: { color: '#e0b84c', fontWeight: '800', fontSize: 16 },
  disabled: { opacity: 0.4 },
  codeInput: { backgroundColor: '#00000059', color: '#e0b84c', borderRadius: 14, paddingVertical: 12, fontSize: 30, fontWeight: '800', letterSpacing: 12, textAlign: 'center', borderWidth: 1, borderColor: '#ffffff25' },
  errBox: { backgroundColor: '#d9534f30', borderRadius: 12, borderWidth: 1, borderColor: '#d9534f', padding: 12 },
  errText: { color: '#ffb4ab', textAlign: 'center' },
});
