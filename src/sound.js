// Phát âm thanh ngắn (hiệu ứng). Dùng expo-audio; lỗi âm thanh KHÔNG được làm hỏng game nên bọc try/catch.
// File wav sinh bằng: node tools/make-assets.js
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';

const SOURCES = {
  coin: require('../assets/sounds/coin.wav'),
  card: require('../assets/sounds/card.wav'),
  bang: require('../assets/sounds/bang.wav'),
  click: require('../assets/sounds/click.wav'),
};

const players = {};   // mỗi âm thanh tạo 1 player, dùng lại cho các lần sau
let modeSet = false;
let muted = false;

export const setMuted = (m) => { muted = !!m; };

export function play(name) {
  if (muted) return;
  try {
    if (!modeSet) {
      modeSet = true;
      Promise.resolve(setAudioModeAsync({ playsInSilentMode: true })).catch(() => {});
    }
    const p = players[name] || (players[name] = createAudioPlayer(SOURCES[name]));
    p.seekTo(0); // expo-audio không tự tua về đầu sau khi phát xong
    p.play();
  } catch (e) { /* bỏ qua */ }
}
