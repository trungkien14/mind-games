import React from 'react';
import { View, Text, Pressable, ScrollView, useWindowDimensions, Platform, StatusBar, StyleSheet } from 'react-native';

const TOP = Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 52;
const PAD = 14;
const GAP = 14;

// Một thẻ game: viền trắng bo tròn bên ngoài, nền màu riêng bên trong, tiêu đề + gạch chân, hình lớn, nhãn nghiêng.
function GameCard({ game, width, onPress }) {
  const playable = !!game.Component;
  return (
    <Pressable onPress={playable ? onPress : undefined} style={[s.rim, { width, height: width * 1.25 }, !playable && s.soon]}>
      <View style={[s.card, { backgroundColor: game.bg }]}>
        <Text style={[s.title, { color: game.accent }]} numberOfLines={2}>{game.title}</Text>
        <View style={[s.underline, { backgroundColor: game.accent }]} />
        <View style={s.art}><Text style={s.icon}>{game.icon}</Text></View>
      </View>
      {game.badge ? (
        <View style={[s.badge, { backgroundColor: game.badge.color }]}>
          <Text style={s.badgeText}>{game.badge.text}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Home({ games, onOpen }) {
  const { width } = useWindowDimensions();
  const cardW = (width - PAD * 2 - GAP) / 2;
  return (
    <View style={s.root}>
      <View style={s.header}>
        <Text style={s.brand}>MindGames</Text>
      </View>
      <ScrollView contentContainerStyle={s.grid}>
        {games.map((g) => <GameCard key={g.id} game={g} width={cardW} onPress={() => onOpen(g.id)} />)}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fbf0df' },
  header: { paddingTop: TOP, paddingBottom: 12, paddingHorizontal: PAD + 4, borderBottomWidth: 3, borderBottomColor: '#e2b79b', backgroundColor: '#fff' },
  brand: { color: '#8b5a9a', fontSize: 26, fontWeight: '900', letterSpacing: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, padding: PAD },
  rim: { backgroundColor: '#fff', borderRadius: 28, padding: 6 },
  soon: { opacity: 0.6 },
  card: { flex: 1, borderRadius: 22, padding: 16, overflow: 'hidden' },
  title: { fontSize: 20, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  underline: { height: 4, width: 56, borderRadius: 2, marginTop: 6 },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 72 },
  badge: { position: 'absolute', left: -2, bottom: 26, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, transform: [{ rotate: '-6deg' }] },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 0.5 },
});
