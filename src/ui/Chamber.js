import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { MAX_BULLETS } from '../core/game';

// Ổ đạn 10 ngăn: chỉ hiện SỐ viên đã nạp (vị trí đạn ẩn).
export function Chamber({ bullets }) {
  return (
    <View style={s.wrap}>
      <View style={s.row}>
        {Array.from({ length: MAX_BULLETS }, (_, i) => (
          <View key={i} style={[s.slot, i < bullets && s.full]} />
        ))}
      </View>
      <Text style={s.text}>{bullets}/10 viên · nguy cơ {bullets * 10}%</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 4 },
  row: { flexDirection: 'row', gap: 4 },
  slot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#ffffff55' },
  full: { backgroundColor: '#d9534f', borderColor: '#d9534f' },
  text: { color: '#9db5a8', fontSize: 12 },
});
