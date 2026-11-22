// Danh sách game hiển thị ở màn hình chính. Thêm game mới = thêm 1 phần tử vào đây.
//   Component: màn hình của game (nhận prop onExit). Không có Component => hiện thẻ "Sắp ra mắt", không bấm được.
//   badge: nhãn nghiêng góc thẻ (tùy chọn). bg/accent: màu nền thẻ và màu tiêu đề.
import { Online } from './ui/Online';
import { COLORS } from './theme';

export const GAMES = [
  {
    id: 'poker10',
    title: '10 Point Poker',
    icon: '🃏',
    bg: COLORS.gameBg,
    accent: '#e0b84c',
    badge: { text: 'ONLINE', color: '#2f8fd8' },
    Component: Online,
  },
  {
    id: 'soon-1',
    title: 'Sắp ra mắt',
    icon: '❓',
    bg: '#e9dfcf',
    accent: '#a89880',
  },
];
