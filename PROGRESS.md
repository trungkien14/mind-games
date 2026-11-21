# PROGRESS — MindGames

## Đã làm
- **Hiệu ứng đồng xu** (`src/ui/CoinFlip.js`, mới): dùng `Animated` có sẵn của React Native (không thêm thư viện), lật `rotateX` 6 vòng + bay lên/hạ xuống, dừng đúng mặt theo `g.turn`. `Table.js` hiện nó khi `g.log.length === 1` (đầu ván) và chưa bấm "Bắt đầu"; hoạt động cả hot-seat lẫn online (không cần sửa `viewFor`). **Chưa chạy trên điện thoại/Expo Go**, mới kiểm cú pháp JSX bằng @babel/parser. Cần nhìn thử: mặt Ngửa/Sấp có dừng đúng, mặt sau có bị lật ngược chữ (`backfaceVisibility` trên Android), sau Rematch có hiện lại đồng xu.
- **Tung đồng xu quyết định ai đi trước vòng 1** (`src/core/game.js`: `this.first`, ghi log "Ngửa/Sấp → X đi trước"). Test lõi 29 nhóm đạt (có test đồng xu 400 lần). `tests/online.test.js` đã sửa bỏ giả định ghế 0 đi trước nhưng **chưa chạy lại** (chạy `npm run test:online` trên máy bạn). UI chưa có hiệu ứng đồng xu: kết quả chỉ hiện ở dòng log/banner (hot-seat: nếu Người 2 đi trước sẽ hiện màn chắn "Chuyển máy cho Người 2" kèm log đồng xu).
- Đổi hướng: web+AI → **Expo mobile, người với người (hot-seat 1 máy)**. Bỏ AI; bản cũ cất ở `legacy-web/`.
- Lõi (`src/core`) đạt test: `node tests/core.test.js` → 28 nhóm (bảng điểm có Joker, cộng đạn vượt 10, xác suất bóp cò, Ron được/Tsumo cấm, Stay/Hit, log không lộ lá rút, 100 ván giả lập 2 người: đủ 54 lá, luôn kết thúc).
- UI Expo viết xong: `App.js` (menu + `viewer`), `src/ui/{Card,Chamber,Table}.js`, màn chắn đổi lượt.
- **Online nhiều máy bằng mã phòng**: `Game.viewFor(p)`, `server/server.js`, `src/net/client.js`, `src/ui/Online.js`, `Table` có prop `online`. `npm run test:online` đạt (tạo/vào phòng, sai mã 404, phòng đầy 409, token sai 403, sai lượt 400, bài đối thủ bị ẩn, chơi hết ván, rematch). Test chạy trên môi trường Claude, chưa chạy trên máy user.

## CHƯA kiểm chứng (quan trọng)
- **UI online chưa chạy trên điện thoại thật**: chỉ server+luồng hành động được test bằng Node.
- **Server trên Render chưa deploy** (user tự làm, xem bước dưới).
- **Chưa cài Expo / chưa chạy app lần nào** (môi trường làm việc không chạy được `npm`/`npx`). UI mobile mới chỉ được viết, chưa nhìn thấy trên máy thật hay giả lập.
- Phiên bản Expo: chưa ghim; cần `npx expo install --fix` sau `npm install`.

## Việc đầu tiên của phiên sau
0. Thử online (cùng LAN, chỉ nhập mã): `npm install` rồi `npx expo install --fix` (ghim `expo-constants`). Terminal 1: `npm run server` (mở port 3000 trong Windows Firewall; server in IP LAN). Terminal 2: `npx expo start`. Cả 2 điện thoại quét QR, vào "Chơi online": app tự đoán server = IP của PC (`Constants.expoConfig.hostUri`) + cổng 3000, A tạo phòng, B nhập mã. Nếu đoán sai: mục "Nâng cao" để sửa địa chỉ (dùng IP server in ra).
1. `cd D:\Vibe\MindGames` → `npm install` → `npx expo install --fix` → `npx expo start`, mở bằng Expo Go. Báo lỗi (nếu có) để sửa.
2. Chơi thử 1 ván 2 người: kiểm màn chắn đổi lượt, Call/Pass, Hit/Stay, kết thúc ván.

## Còn dở / bước tiếp theo
- **Deploy Render + build APK (user tự làm)**: (1) đẩy repo lên GitHub; (2) Render > New Web Service > chọn repo: Runtime Node, **Build Command để trống hoặc `echo ok`** (server không cần npm install), **Start Command `node server/server.js`** (server tự đọc biến PORT); (3) kiểm tra mở `https://<tên>.onrender.com/state` phải trả JSON lỗi `Phòng không còn tồn tại`/`Token sai` (là server đang sống); (4) dán URL vào `src/net/config.js` (`SERVER_URL`); (5) `npm install` → `npx expo install --fix` → `npx eas-cli login` → `npx eas-cli build -p android --profile preview` → tải APK cài lên 2 máy. Host miễn phí ngủ sau ~15 phút không dùng (lần đầu mở chậm ~1 phút) — mở URL trước khi chơi để đánh thức. Server giữ phòng trong RAM: Render khởi động lại thì mất phòng.
- Online còn thiếu: lưu phiên để vào lại phòng khi tắt app, báo khi đối thủ thoát, lưu địa chỉ server (cần AsyncStorage).
- Chưa có icon/splash, âm thanh, hiệu ứng bắn
- Làm rõ giả định trong CONTEXT.md (ai đi trước, có nhặt lá bỏ không).
