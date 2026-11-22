import React, { useState } from 'react';
import { View, StatusBar, StyleSheet } from 'react-native';
import { Home } from './src/ui/Home';
import { GAMES } from './src/games';
import { COLORS } from './src/theme';

// Điều hướng đơn giản: active = id game đang mở (null = màn hình chính). Mỗi game là một Component nhận onExit.
export default function App() {
  const [active, setActive] = useState(null);
  const game = GAMES.find((g) => g.id === active);

  return (
    <View style={[s.root, !game && s.home]}>
      <StatusBar barStyle={game ? 'light-content' : 'dark-content'} />
      {game ? <game.Component onExit={() => setActive(null)} /> : <Home games={GAMES} onOpen={setActive} />}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.gameBg },
  home: { backgroundColor: '#fbf0df' },
});
