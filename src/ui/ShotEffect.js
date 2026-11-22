import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import { play } from '../sound';

const SIZE = 240;   // đường kính ổ đạn
const DOT = 34;
const RING = 88;    // bán kính vòng các ngăn
const BORDER = 6;
const CENTER = SIZE / 2 - BORDER; // tâm tính từ mép TRONG viền (con absolute định vị từ đó)
const SPIN_MS = 2600;  // thời gian ổ đạn quay (chỉnh số này để nhanh/chậm hơn)
const HOLD_MS = 700;   // dừng im dưới mũi tên cho người chơi nhìn ngăn bị chọn rồi mới bắn (tạo căng thẳng)
const TURNS = 2;       // số vòng quay đầy trước khi vào ngăn cuối

// Không dùng StyleSheet.absoluteFill(Object): ở bản RN mới hằng này có thể không còn -> overlay không phủ hết màn hình.
const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 };

/* MỤC ĐÍCH: chọn ngăn sẽ nằm dưới mũi tên khi ổ đạn dừng, khớp với kết quả thật.
 * CÁCH HOẠT ĐỘNG: kết quả (dead) đã do Game quyết định; hình chỉ DIỄN LẠI. Ngăn i<bullets là ngăn có đạn.
 * Trúng đạn -> chọn ngẫu nhiên 1 ngăn có đạn; sống sót -> chọn 1 ngăn trống. Nhờ vậy người chơi tự thấy "đạn nằm ở đâu, bắn trúng ngăn nào". */
function pickSlot(dead, bullets) {
  const pool = [];
  for (let i = 0; i < 10; i++) if ((i < bullets) === dead) pool.push(i);
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : 0;
}

// Hiệu ứng khi người thua bị bắt bóp cò (Hit): phủ TOÀN màn hình, làm tối/mờ bàn đấu phía sau.
// Ổ đạn quay chậm dần -> dừng sao cho ngăn bị chọn nằm đúng dưới mũi tên ▼ -> (nghỉ 0,7s) -> chớp sáng + âm thanh -> chữ nảy ra -> tự tắt.
export function ShotEffect({ dead, name, bullets, onDone }) {
  const spin = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const shake = useRef(new Animated.Value(0)).current;
  const [fired, setFired] = useState(false);
  const [landed, setLanded] = useState(false);
  const [slot] = useState(() => pickSlot(dead, bullets));

  useEffect(() => {
    // Ngăn i nằm ở góc -90+36i (i=0 ở trên cùng, tăng theo chiều kim đồng hồ). Quay ổ thêm θ độ thì ngăn đó ở -90+36i+θ.
    // Muốn nó về -90 (dưới mũi tên) thì θ ≡ -36i (mod 360).
    const finalDeg = 360 * TURNS + ((360 - 36 * slot) % 360);
    spin.setValue(0);
    // quad-out: đầu quay nhanh, cuối bò chậm qua từng ngăn -> hồi hộp, nhìn theo được
    const spinAnim = Animated.timing(spin, { toValue: finalDeg, duration: SPIN_MS, easing: Easing.out(Easing.quad), useNativeDriver: true });
    spinAnim.start();

    const land = setTimeout(() => setLanded(true), SPIN_MS);
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
    }, SPIN_MS + HOLD_MS);

    const end = setTimeout(onDone, SPIN_MS + HOLD_MS + (dead ? 2300 : 1500));
    return () => { clearTimeout(land); clearTimeout(fire); clearTimeout(end); spinAnim.stop(); };
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'], extrapolate: 'extend' });
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <View style={s.overlay}>
      <Animated.View pointerEvents="none" style={[FILL, { backgroundColor: dead ? '#ff2a1a' : '#ffffff', opacity: flash }]} />
      <Animated.View style={[s.center, { transform: [{ translateX: shake }] }]}>
        <View style={s.wheel}>
          <Animated.View style={[s.cyl, { transform: [{ rotate }] }]}>
            {Array.from({ length: 10 }, (_, i) => {
              const a = ((-90 + 36 * i) * Math.PI) / 180;
              return (
                <View key={i} style={[s.dot, i < bullets && s.loaded, landed && i === slot && s.picked, {
                  left: CENTER - DOT / 2 + Math.cos(a) * RING,
                  top: CENTER - DOT / 2 + Math.sin(a) * RING,
                }]} />
              );
            })}
            <View style={s.hub} />
          </Animated.View>
          {/* Mũi tên cố định ở trên: ngăn nào dừng dưới nó là ngăn bị bắn. */}
          <View pointerEvents="none" style={s.pointer} />
        </View>

        {!fired ? (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={s.aim}>{name} bóp cò… ({bullets}/10 viên)</Text>
            <Text style={s.legend}>🔴 ngăn có đạn   ⚫ ngăn trống   ▼ ngăn sẽ bắn</Text>
          </View>
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
  // Nền tối ~86% phủ cả màn hình: bàn đấu phía sau chỉ còn mờ mờ (làm mờ thật cần thêm expo-blur nên chưa dùng).
  overlay: { ...FILL, backgroundColor: 'rgba(8,12,24,0.86)', alignItems: 'center', justifyContent: 'center', zIndex: 10, elevation: 10 },
  center: { alignItems: 'center', gap: 28 },
  wheel: { width: SIZE, height: SIZE, alignItems: 'center' },
  cyl: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: '#d9ae3f', borderWidth: BORDER, borderColor: '#a8822a' },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: '#0b2a20', borderWidth: 3, borderColor: 'transparent' },
  loaded: { backgroundColor: '#d9534f' },
  picked: { borderColor: '#ffffff' },
  hub: { position: 'absolute', left: CENTER - 18, top: CENTER - 18, width: 36, height: 36, borderRadius: 18, backgroundColor: '#0b2a20' },
  // Tam giác chỉ xuống (▼) bằng border, đỉnh chạm vào ngăn trên cùng.
  pointer: { position: 'absolute', top: -14, width: 0, height: 0, borderLeftWidth: 14, borderRightWidth: 14, borderTopWidth: 26, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#ffffff' },
  aim: { color: '#e9efe9', fontSize: 18, fontWeight: '700' },
  legend: { color: '#9aa3b5', fontSize: 13 },
  big: { fontSize: 46, fontWeight: '900', letterSpacing: 1 },
  dead: { color: '#ff5a4a' },
  safe: { color: '#e0b84c' },
  sub: { color: '#e9efe9', fontSize: 16, marginTop: 6, textAlign: 'center' },
});
