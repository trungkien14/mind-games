# PROGRESS — MindGames

## Đã làm
- **Nút Gợi ý cho người mới (code xong, test lõi đạt, CHƯA xem trên điện thoại)**: `listOutsForHand(hand4, seenCards)` trong `src/core/cards.js` duyệt các lá chưa thấy, ghép với 4 lá, chấm bằng `evalHand`, gom theo điểm -> {name, score, help (giải thích luật tiếng Việt), count, needs}. `src/ui/HintPanel.js` hiển thị; `Table.js` có nút 💡 (state `showHint`) đặt trên hàng bài của mình. Test: `node tests/hint.test.js`. Khi tay có 5 lá (pha bỏ bài) chỉ nhắc "bỏ 1 lá trước". `needs` là mô tả gần đúng (số/chất), `count` là chính xác trên các lá chưa lộ (chỉ trừ bài trên tay + lá đối thủ vừa bỏ).
- **Icon/splash + hiệu ứng bắn + âm thanh (code xong, CHƯA có file asset trên đĩa)**:
  - `tools/make-assets.js` (Node thuần, `npm run assets`) sinh `assets/icon.png`, `adaptive-icon.png`, `splash-icon.png` (logo ổ đạn 10 ngăn, 1024²) và `assets/sounds/{coin,bang,click,card}.wav` (tổng hợp bằng toán). Đã chạy thử trong sandbox Claude: PNG đúng CRC/kích thước, WAV 22050 Hz mono hợp lệ. **Trên máy user chưa chạy** → thư mục `assets/` chưa tồn tại.
  - `src/ui/ShotEffect.js`: overlay khi Hit (ổ đạn quay chậm dần → chớp sáng → chữ "ĐOÀNG!"/"CẠCH!", rung nếu chết). `Table.js` bật nó đúng 1 lần mỗi cú Hit nhờ khóa `round:victim:bullets` (`g.shot` còn nguyên sang vòng sau nên không dùng trực tiếp); khóa lúc vào bàn được ghi nhớ để không chiếu lại hiệu ứng cũ.
  - `src/sound.js`: `play(name)` dùng `expo-audio`, bọc try/catch, `setMuted`. Gọi ở CoinFlip (coin), Table (card khi rút/bỏ), ShotEffect (bang/click).
  - `app.json`: `icon`, `adaptiveIcon`, plugin `expo-splash-screen`; `package.json`: thêm `expo-audio`, `expo-splash-screen`, script `assets`.
  - Chưa nhìn trên điện thoại.
- **Thiết kế lại màn sảnh online** (`Online()` trong `src/ui/Online.js`, style `l`): header (← / ⚙ mở địa chỉ server), logo + tên game, ô tên, 2 thẻ "Tạo phòng mới" / "Vào phòng có sẵn" (nút vào phòng chỉ bật khi đủ 4 ký tự), khung lỗi đỏ, ScrollView + KeyboardAvoidingView. Màn chờ phòng (`Room`) chưa đổi. Chưa nhìn trên máy thật. Lưu ý: nút bánh răng tròn trong ảnh chụp cũ là menu dev của Expo Go, không phải của app.
- **Màn hình chính dạng lưới game + bỏ chế độ chung 1 máy**: `src/games.js`, `src/ui/Home.js` (lưới 2 cột), `App.js` (chỉ điều hướng). Chưa nhìn trên điện thoại (cần xem: 2 cột, nhãn ONLINE không bị cắt, status bar đổi màu). Ảnh minh họa thẻ đang là emoji.
- **Thêm game mới**: thêm 1 phần tử vào `GAMES` trong `src/games.js` (xem CONTEXT.md).
- **Hiệu ứng đồng xu** (`src/ui/CoinFlip.js`): `Animated` có sẵn, lật `rotateX` 6 vòng, dừng đúng mặt theo `g.turn`. Chưa chạy trên điện thoại; cần nhìn: Ngửa/Sấp dừng đúng, mặt sau có bị ngược chữ (`backfaceVisibility` Android), sau Rematch có hiện lại.
- **Tung đồng xu quyết định ai đi trước vòng 1** (`src/core/game.js`: `this.first`). Test lõi 29 nhóm đạt. `tests/online.test.js` đã sửa nhưng chưa chạy lại trên máy user.
- Lõi (`src/core`) đạt `node tests/core.test.js`. Online nhiều máy bằng mã phòng: `Game.viewFor(p)`, `server/server.js`, `src/net/client.js`, `src/ui/Online.js`; `npm run test:online` đạt trên môi trường Claude.

## CHƯA kiểm chứng (quan trọng)
- UI online + hiệu ứng bắn/âm thanh chưa chạy trên điện thoại thật. Nếu quên `npm run assets`, Metro báo lỗi "Unable to resolve ../assets/sounds/coin.wav" (require tĩnh) → app không build.


## Việc đầu tiên của phiên sau
1. Thử online: KHÔNG cần chạy `npm run server` trên PC vì app đã trỏ tới server Render (`SERVER_URL`). 2 điện thoại quét QR, "Chơi online": một người tạo phòng, người kia nhập mã.
2. Chơi 1 ván 2 máy: đồng xu (+tiếng), rút/bỏ bài (+tiếng), Call/Pass, Hit (hiệu ứng ổ đạn + tiếng bang/click, chỉ chiếu 1 lần, cả 2 máy đều thấy), Stay, Rematch. Icon/splash chỉ thấy đúng ở bản build (Expo Go dùng icon của nó).

## Còn dở / bước tiếp theo
- Gợi ý pha bỏ bài (5 lá): với mỗi lá có thể bỏ, hiện tiềm năng tối đa của 4 lá còn lại (gọi `listOutsForHand` 5 lần) để chỉ "nên bỏ lá nào".
- Gợi ý chưa trừ các lá đã bỏ từ trước (client không có `discardPile`); có thể chỉnh xác hơn nếu server gửi thêm.
- Nút tắt/bật âm (đã có `setMuted` trong `src/sound.js`, chưa có UI).
- Online còn thiếu: lưu phiên để vào lại phòng, báo khi đối thủ thoát, lưu địa chỉ server (AsyncStorage).
