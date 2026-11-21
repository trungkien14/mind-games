import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { RANK_LABEL, SUIT_SYMBOL } from '../core/cards';

// Một lá bài. `back` = úp; `onPress` chỉ truyền khi lá được phép chạm.
export function Card({ card, back, small, count, highlight, onPress }) {
  const size = small ? s.small : s.big;
  if (back) {
    return (
      <Pressable disabled={!onPress} onPress={onPress} style={[s.card, size, s.back, highlight && s.glow]}>
        {count != null && <Text style={s.count}>{count}</Text>}
      </Pressable>
    );
  }
  if (card.joker) {
    return (
      <Pressable disabled={!onPress} onPress={onPress} style={[s.card, size, highlight && s.glow, onPress && s.lift]}>
        <Text style={s.jokerIcon}>🃏</Text>
        <Text style={s.jokerText}>JOKER</Text>
      </Pressable>
    );
  }
  const red = card.suit === 'H' || card.suit === 'D';
  const color = red ? '#c0392b' : '#1d1d1d';
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={[s.card, size, highlight && s.glow, onPress && s.lift]}>
      <Text style={[s.rank, small && s.rankSmall, { color }]}>{RANK_LABEL[card.rank] || card.rank}</Text>
      <Text style={[s.suit, small && s.suitSmall, { color }]}>{SUIT_SYMBOL[card.suit]}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#fbfaf5', borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#0003', elevation: 3,
  },
  big: { width: 62, height: 90 },
  small: { width: 44, height: 64 },
  back: { backgroundColor: '#274a8a', borderWidth: 3, borderColor: '#fbfaf5' },
  count: { color: '#fff', fontWeight: '700' },
  glow: { borderColor: '#e0b84c', borderWidth: 3 },
  lift: { borderColor: '#e0b84c', borderWidth: 2 },
  rank: { fontSize: 26, fontWeight: '800' },
  suit: { fontSize: 28, lineHeight: 30 },
  rankSmall: { fontSize: 17 },
  suitSmall: { fontSize: 19, lineHeight: 20 },
  jokerIcon: { fontSize: 26 },
  jokerText: { fontSize: 9, letterSpacing: 1, color: '#6c3fb5', fontWeight: '700' },
});
