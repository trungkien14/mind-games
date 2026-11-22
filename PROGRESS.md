# PROGRESS — MindGames

## Đã làm
- **Bỏ dòng log "X không Call" (lộ bài) (code xong, `npm test` 30 nhóm + test online đạt, CHƯA thử điện thoại)**: pha `call` chỉ mở khi người đó có tổ hợp điểm >= 1, nên log công khai (hiện ở banner `Table.js` = dòng log cuối) nói "không Call" là lộ đang có bài. `Game.pass` trong `src/core/game.js` giờ KHÔNG ghi log. Thêm test `pass không ghi log`. Đã kiểm Table.js: chữ "Đang chờ X…" giống nhau ở pha `call` và `draw` nên không lộ. Tự rút dùng khóa `round:log.length` vẫn duy nhất (mỗi lượt rút đứng sau 1 dòng log khác). Còn lộ ngầm không sửa được: thời gian người kia ngần ngừ trước khi rút (có tay Call thì phải quyết định, không thì rút ngay).
- **Sau Call (Stay hoặc Hit sống) xáo lại TOÀN BỘ bài rồi chia 4+4 (code xong, `npm test` 29 nhóm + test online đạt, CHƯA thử điện thoại)**: trước đây `Game._nextRound` chỉ đẩy bài cũ vào chồng bỏ, bộ chính KHÔNG xáo nên 8 lá mới là đôi đuôi bộ cũ. Giờ `deck = shuffle(deck + discardPile + hands[0] + hands[1] + result.called)`, `discardPile = []`, rồi chia. Hit chết vẫn `over`, không chia. Sửa test `ron + stay + vòng sau` (chồng bỏ rỗng, deckCount = tổng - 8, bài cũ quay lại bộ); mô phỏng 100 ván vẫn bảo toàn 54 lá. Lưu ý: nhờ vậy bộ bài luôn còn 46 lá đầu mỗi vòng (cạn bài gần như không xảy ra, nhánh `_take` xáo chồng bỏ chủ yếu là dự phòng). Gợi ý `HintPanel` có thể đơn giản hóa vì chồng bỏ rỗng sau mỗi Call (chưa kiểm tra/sửa).
- **Báo đối thủ thoát phòng / mất kết nối (code xong, test online đạt, Online.js mới chỉ kiểm đếm ngoặc vì sandbox không có parser JSX, CHƯA thử điện thoại)**
- **Hết ván: cả 2 người bấm "Tiếp tục" mới sang ván mới (code xong, test online đạt, CHƯA thử điện thoại)**
- **Pha `review`: sau Call người thua có thời gian xem bài rồi bấm "Tiếp tục" (code xong, `npm test` + test online đạt, CHƯA thử trên điện thoại)**
- **Đổi luật: sau Call CẢ HAI chia lại 4 lá (code xong, `npm test` đạt 29 nhóm, CHƯA thử trên điện thoại)**
- **Làm lại hiệu ứng bắn `src/ui/ShotEffect.js` (code xong, cú pháp JSX + toán góc dừng đạt, CHƯA xem trên điện thoại)**
- **Chỉnh UI sau khi thử 2 máy thật (code xong, cú pháp JSX đạt, CHƯA xem lại trên điện thoại)**
- **Bot đối thủ để test online 1 mình (code xong, test 2 bot đấu nhau đạt, CHƯA thử với điện thoại thật)**
- **Đổi màu nền game sang xám than ngả navy `#1b2233` (code xong, CHƯA xem trên điện thoại)**
- **Tự rút bài + bỏ gợi ý trên nút Call (code xong, CHƯA thử trên điện thoại)**
- **Sửa lỗi lệch đồng bộ 2 máy + loading khi tạo/chờ phòng (code xong, CHƯA thử 2 điện thoại)**
- **Nút Gợi ý cho người mới (code xong, test lõi đạt, CHƯA xem trên điện thoại)**
- **Thiết kế lại màn sảnh online**
- **Thêm game mới**: thêm 1 phần tử vào `GAMES` trong `src/games.js` (xem CONTEXT.md).
- **Hiệu ứng đồng xu**
- **Tung đồng xu quyết định ai đi trước vòng 1**

## CHƯA kiểm chứng (quan trọng)
- UI online + hiệu ứng bắn/âm thanh chưa chạy trên điện thoại thật. Nếu quên `npm run assets`, Metro báo lỗi "Unable to resolve ../assets/sounds/coin.wav" (require tĩnh) → app không build.


## Việc đầu tiên của phiên sau
- Luật chơi nằm ở `src/core/game.js` chạy trên SERVER: sửa xong phải deploy lại Render (hoặc tắt/chạy lại `npm run server`) thì 2 máy mới thấy đổi. Dấu hiệu server đã lên bản mới: log đầu vòng 2 có chữ "bộ bài được xáo lại". (User từng báo "bài vẫn không đổi sau Call" trong khi code đúng, nghi server chưa deploy.)


## Còn dở / bước tiếp theo
- Dựng lại giao diện bàn chơi na ná game bài VN (bàn bầu dục, avatar người chơi, bài xòe quạt, bộ bài giữa bàn): CHƯA LÀM, việc lớn, cần tách thành nhiều bước (theme màu -> bố cục bàn -> avatar -> xòe bài). Chung với việc đổi màu nền (màu nền đã xong, xem mục Đã làm). Chưa xem được video YouTube user gửi, chỉ có ảnh chụp.
- Nút tắt/bật âm (đã có `setMuted` trong `src/sound.js`, chưa có UI).
- Online còn thiếu: lưu phiên để vào lại phòng, báo khi đối thủ thoát, lưu địa chỉ server (AsyncStorage).
