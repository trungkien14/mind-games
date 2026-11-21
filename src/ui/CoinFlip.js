import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Animated, Easing, StyleSheet } from 'react-native';

const FLIPS = 6;         // số vòng lật trước khi dừng
const DURATION = 2200;   // ms

// Hiệu ứng tung đồng xu. Kết quả đã được Game quyết định sẵn (`first`): hiệu ứng chỉ "diễn" lại,
// nên không thể lệch với logic. Ngửa (mặt trước) = người 1, Sấp (mặt sau) = người 2.
export function CoinFlip({ names, first, onDone }) {
  const spin = useRef(new Animated.Value(0)).current;  // góc quay, đơn vị: nửa vòng (180°)
  const rise = useRef(new Animated.Value(0)).current;  // độ cao đồng xu bay lên
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    // Dừng ở bội số chẵn của 180° => thấy mặt trước (Ngửa); lẻ => mặt sau (Sấp).
    const target = FLIPS * 2 + (first === 0 ? 0 : 1);
    const anim = Animated.parallel([
      Animated.timing(spin, { toValue: target, duration: DURATION, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(rise, { toValue: 1, duration: DURATION * 0.45, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(rise, { toValue: 0, duration: DURATION * 0.55, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    ]);
    anim.start(({ finished }) => { if (finished) setLanded(true); });
    return () => anim.stop();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const lift = rise.interpolate({ inputRange: [0, 1], outputRange: [0, -140] });
  const shadow = rise.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] });

  return (
    <View style={s.wrap}>
      <Text style={s.title}>Tung đồng xu chọn người đi trước</Text>
      <Text style={s.rule}>Ngửa = {names[0]}   ·   Sấp = {names[1]}</Text>

      <View style={s.stage}>
        <Animated.View style={[s.coin, { transform: [{ perspective: 800 }, { translateY: lift }, { rotateX: rotate }] }]}>
          <View style={[s.face, s.heads]}><Text style={s.faceText}>NGỬA</Text></View>
          <View style={[s.face, s.tails, { transform: [{ rotateX: '180deg' }] }]}><Text style={s.faceText}>SẤP</Text></View>
        </Animated.View>
        <Animated.View style={[s.shadow, { transform: [{ scaleX: shadow }] }]} />
      </View>

      <View style={s.result}>
        {landed ? (
          <>
            <Text style={s.winner}>{names[first]} đi trước!</Text>
            <Pressable style={s.btn} onPress={onDone}><Text style={s.btnText}>Bắt đầu</Text></Pressable>
          </>
        ) : <Text style={s.wait}>Đang tung…</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#e9efe9', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  rule: { color: '#9db5a8', marginTop: 8, fontSize: 14 },
  stage: { height: 260, alignItems: 'center', justifyContent: 'flex-end', marginTop: 12 },
  coin: { width: 110, height: 110 },
  face: { position: 'absolute', width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center', borderWidth: 5, backfaceVisibility: 'hidden' },
  heads: { backgroundColor: '#e0b84c', borderColor: '#b8912f' },
  tails: { backgroundColor: '#c9ccd1', borderColor: '#9a9ea6' },
  faceText: { color: '#3a2d08', fontWeight: '900', fontSize: 20, letterSpacing: 1 },
  shadow: { width: 90, height: 12, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.35)', marginTop: 14 },
  result: { height: 100, alignItems: 'center', justifyContent: 'center' },
  wait: { color: '#9db5a8', fontSize: 16 },
  winner: { color: '#e0b84c', fontSize: 24, fontWeight: '800' },
  btn: { backgroundColor: '#e0b84c', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 10, marginTop: 14 },
  btnText: { color: '#222', fontWeight: '700', fontSize: 16 },
});
