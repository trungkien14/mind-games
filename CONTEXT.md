# CONTEXT — MindGames

Bộ sưu tập trò chơi trí tuệ trên **điện thoại (Expo / React Native)**. Trò đầu tiên: **10 Point Poker**, **người với người** (không có máy/AI).

## Kiến trúc (quyết định)
- **Expo (React Native), JavaScript thuần**, không TypeScript. Chạy: `npm install` → `npx expo install --fix` (căn phiên bản react/react-native theo SDK) → `npx expo start`, quét QR bằng Expo Go. `package.json` cố ý để `expo: latest`, `react`/`react-native: *`, chờ `expo install --fix` ghi phiên bản đúng.
- **Lõi logic tách khỏi UI**: `src/core/` không import react/DOM, chạy được bằng Node (test) lẫn Metro. File lõi dạng UMD-lite CommonJS (`module.exports`).
- **Chế độ hiện tại: hot-seat** (2 người chung 1 máy). Mỗi lần đổi lượt hiện **màn chắn "Chuyển máy cho X"** để che bài; `viewer` (ai đang cầm máy) nằm trong `App.js`.
- **Log của Game là công khai**: không ghi lá rút từ bộ bài (đã có test).
- **Online (đã cài, qua server HTTP)**: logic phòng nằm trong `src/server/rooms.js` (thuần, không phụ thuộc mạng) giữ `Game` authoritative; `server/server.js` chỉ là lớp HTTP mỏng bọc nó. Client chỉ gửi hành động và **polling 1s** `/state?since=<version>`, server trả `Game.viewFor(seat)` (ẩn bài đối thủ + bộ bài). Ghế suy ra từ token server cấp. **Quyết định: triển khai server trên Render** (HTTPS, không cần PC khi chơi); URL điền vào `src/net/config.js` (`SERVER_URL`). Thử phương án điện thoại làm host (TCP + mã phòng = IP) rồi **bỏ** vì khó đáng tin trên máy thật (nền/tắt màn hình, hotspot, cô lập Wi-Fi). Trong Expo Go dev, ô địa chỉ tự đoán server = IP PC chạy Expo + cổng 3000 (`npm run server`).
- Bản web cũ (có AI) ở `legacy-web/` chỉ để tham khảo, không file nào tham chiếu tới; xóa an toàn nếu đã commit git.

## Cấu trúc
```
index.js, App.js, app.json, package.json
src/core/cards.js   bộ 54 lá, evalHand (Joker vạn năng, vét cạn)
src/core/game.js    class Game: draw/discard/call/pass/choose/forfeit
src/ui/Card.js, Chamber.js, Table.js, Online.js (màn nhập mã + vòng polling)
src/net/client.js   request HTTP tới server
src/net/config.js   SERVER_URL (URL server trên Render)
src/server/rooms.js logic phòng (thuần, không phụ thuộc mạng)
server/server.js    lớp HTTP mỏng (node server/server.js)
tests/core.test.js  node tests/core.test.js  (npm test)
tests/online.test.js  npm run test:online
legacy-web/         bản web+AI cũ
```

## Luật 10 Point Poker (đã cài)
54 lá (52 + 2 Joker). Mỗi người 4 lá; lượt = rút 1 từ bộ bài, bỏ 1. Đối thủ **Call** nếu 4 lá + lá vừa bỏ thành tổ hợp ≥ 1 điểm (Ron). Tự bốc đủ bài KHÔNG được thắng (Tsumo): pha `discard` không cho `call`.
Điểm: Pair 1, Two Pair 2, Three 3, Straight 4, Flush 5, Full House 6, Four 7, Straight Flush 8, Royal SF 9, Five of a Kind 10 (chất/độ lớn không quan trọng; A thấp và cao, không nối vòng).
Người thua nạp đạn = điểm. Ổ 10 ngăn, `P(chết) = đạn/10`. Vượt 10 → chỉ giữ hàng đơn vị (đúng 10 giữ 10; 10+10=20 → 0).
Người thắng chọn **Hit** (thua bóp cò; sống → đạn về 0; chết → hết ván) hoặc **Stay** (giữ đạn). Vòng sau: người thắng bỏ bài cũ, nhận 4 lá mới; người thua giữ nguyên 4 lá.
Luồng pha: `draw → discard → (call | draw của đối thủ) → choose → vòng mới | over`.

## Giả định (đề không nói rõ — đổi nếu sai)
- Người đi trước vòng 1 do **tung đồng xu** (`Game.first`, `opts.first` để ép khi test); sau mỗi Call, **người thắng đi trước** vòng sau.
- Chỉ rút từ bộ bài (không nhặt lá vừa bỏ, ngoài việc Call). Hết bài thì xáo lại chồng bài đã bỏ.
- Call là tùy chọn (có nút "Bỏ qua").
- "Chiến thuật riêng / mánh dùng bài" ở lượt mình: **chưa cài** (đề chưa mô tả cụ thể).
