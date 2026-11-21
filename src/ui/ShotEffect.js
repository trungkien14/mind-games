import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { play } from '../sound';

const SIZE = 132;   // đường kính ổ đạn minh họa
const DOT = 18;
const RING = 46;    // bán kính vòng các ngăn
const BORDER = 5;
const CENTER = SIZE / 2 - BORDER; // tâm tính từ mép TRONG viền (con absolute định vị từ đó)
const AIM_MS = 900; // thời gian "bóp cò…" trước khi có kết quả

// Hiệu ứng khi người thua bị bắt bóp cò (Hit). Kết quả `dead` đã do Game quyết định sẵn; component chỉ diễn lại:
// ổ đạn quay chậm dần -> chớp sáng + âm thanh -> chữ nảy ra (và rung nếu trúng đạn) -> tự tắt.
export function ShotEffect({ dead, name, bullets, onDone }) {
  const spin = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const [fired, setFired] = useState(false);

  useEffect(() => {
    const spinAnim = Animated.timing(spin, { toValue: 1, duration: AIM_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    spinAnim.start();

    const fire = setTimeout(() => {
      setFired(true);
      play(dead ? 'bang' : 'click');
      const jolts = [18, -18, 14, -14, 9, -9, 4, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 45, useNativeDriver: true }));
      Animated.parallel([
        Animated.sequence([
          Animated.timing(flash, { toValue: 1, duration: 60, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, duration: dead ? 550 : 250, useNativeDriver: true }),
        ]),
        Animated.spring(pop, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
        dead ? Animated.sequence(jolts) : Animated.delay(0),
      ]).start();
    }, AIM_MS);

    const end = setTimeout(onDone, AIM_MS + (dead ? 2300 : 1500));
    return () => { clearTimeout(fire); clearTimeout(end); spinAnim.stop(); };
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '1080deg'] });
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <View style={s.overlay}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: dead ? '#ff2a1a' : '#ffffff', opacity: flash }]} />
      <Animated.View style={[s.center, { transform: [{ translateX: shake }] }]}>
        <Animated.View style={[s.cyl, { transform: [{ rotate }] }]}>
          {Array.from({ length: 10 }, (_, i) => {
            const a = ((-90 + 36 * i) * Math.PI) / 180;
            return (
              <View key={i} style={[s.dot, i < bullets && s.loaded, {
                left: CENTER - DOT / 2 + Math.cos(a) * RING,
                top: CENTER - DOT / 2 + Math.sin(a) * RING,
              }]} />
            );
          })}
          <View style={s.hub} />
        </Animated.View>

        {!fired ? (
          <Text style={s.aim}>{name} bóp cò… ({bullets}/10 viên)</Text>
        ) : (
          <Animated.View style={{ alignItems: 'center', opacity: pop, transform: [{ scale }] }}>
            <Text style={[s.big, dead ? s.dead : s.safe]}>{dead ? '💥 ĐOÀNG!' : 'CẠCH!'}</Text>
            <Text style={s.sub}>{dead ? `${name} trúng đạn` : `${name} sống sót — ổ đạn về 0`}</Text>
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000000b8', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  center: { alignItems: 'center', gap: 22 },
  cyl: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: '#d9ae3f', borderWidth: BORDER, borderColor: '#a8822a' },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: '#0b2a20' },
  loaded: { backgroundColor: '#d9534f' },
  hub: { position: 'absolute', left: CENTER - 12, top: CENTER - 12, width: 24, height: 24, borderRadius: 12, backgroundColor: '#0b2a20' },
  aim: { color: '#e9efe9', fontSize: 18, fontWeight: '700' },
  big: { fontSize: 46, fontWeight: '900', letterSpacing: 1 },
  dead: { color: '#ff5a4a' },
  safe: { color: '#e0b84c' },
  sub: { color: '#e9efe9', fontSize: 16, marginTop: 6, textAlign: 'center' },
});
