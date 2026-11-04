# Trà Đá Phố Cổ 3D

Quán trà đá vỉa hè giữa phố cổ Hà Nội, dựng bằng 3D thời gian thực (WebGL2), chơi được nhiều người cùng lúc.
Không dùng thư viện ngoài: bộ dựng hình, máy chủ và âm thanh đều tự viết.

## Chạy thử
Cần Node.js 18 trở lên.

    node server.js

Mở http://localhost:8080. Mở hai tab hoặc hai máy cùng mạng để thấy nhau.
Trình duyệt cần hỗ trợ WebGL2 (Chrome, Edge, Firefox, Safari 15+).

## Đưa lên mạng
Đẩy thư mục lên GitHub rồi tạo Web Service trên Render, Railway hoặc Fly.io, với start command là `node server.js`.

Nếu để trang game ở GitHub Pages còn máy chủ ở nơi khác: điền `DEFAULT_SERVER` trong `public/js/game.js`, và đặt biến `ALLOWED_ORIGIN` trên máy chủ.

## Cấu trúc
| File | Nội dung |
|---|---|
| `server.js` | Máy chủ web + WebSocket (phòng 15 ghế, đồng bộ ngồi, đi lại, động tác) |
| `public/js/gl.js` | Bộ dựng hình WebGL2: ánh sáng mặt trời, bóng đổ, sương, bầu trời, đèn đêm, mặt nước, đường mưa |
| `public/js/world.js` | Dựng phố: vân mặt tiền vẽ bằng canvas, nhà ống, ban công, mái ngói, cây sấu, dây điện, các địa danh |
| `public/js/actors.js` | Người, xe máy, xích lô, xe đạp hoa, tàu điện, gánh hàng |
| `public/js/audio.js` | Tiếng phố, 3 bản nhạc nền tự soạn, "Đài phố cổ" |
| `public/js/passport.js` | Hộ chiếu phố cổ: dấu, câu chuyện, giấy chứng nhận |
| `public/js/game.js` | Vòng lặp game, camera, điều khiển, mạng, khách vãng lai |

## Có gì mới ở bản 4.1
- **Hộ chiếu phố cổ** (`public/js/passport.js`): đứng gần mỗi địa danh khoảng 1 giây để được đóng dấu và mở một câu chuyện ngắn. Đủ 7 dấu thì tải được giấy chứng nhận PNG. Có thêm dấu thưởng "Nếp sống văn minh". Dấu lưu bằng localStorage trên máy người chơi.
- **Âm thanh 3D theo vị trí** (`public/js/audio.js`): người nghe đặt tại nhân vật, hướng theo camera (PannerNode HRTF). Có tiếng máy 5 xe gần nhất, còi, chuông xe đạp, chuông và tiếng lăn bánh tàu điện, tiếng rao của gánh hàng (giọng tổng hợp kèm bong bóng chữ), tiếng rì rầm ở quán (to dần khi đông khách), chợ, phở, nước và chim ở Hồ Gươm.
- **Công an phường và dân phòng**: hai người đi tuần dọc phố. Khi quán trà đá có từ 10 khách trở lên, họ tới quán, phát loa nhắc kê ghế gọn và chừa lối đi. Người chơi bấm "Kê ghế gọn lại" thì ghế dồn sát tường, lối đi được tô sáng và người chơi nhận dấu thưởng. Không ai bấm thì sau khoảng 16 giây cô bán hàng tự kê gọn. Lần nhắc tiếp theo cách ít nhất 4 phút. Thấy người chơi đứng dưới lòng đường quá lâu, họ cũng nhắc lên vỉa hè.
- Việc kê gọn ghế và lời nhắc được tính riêng trên từng máy, không cần sửa máy chủ.

## Nhạc
Ca khúc Hà Nội xưa vẫn còn bản quyền nên game không kèm sẵn bản thu.
Khi đã có giấy phép phát công khai, chép file vào `public/music/` rồi khai báo trong `LICENSED_TRACKS` ở đầu `public/js/game.js`.

## Hiệu năng
- Nút "Đồ hoạ: Nhẹ" tắt bóng đổ và giảm độ phân giải. Điện thoại mặc định dùng chế độ này.
- Cảnh có khoảng 250 nghìn tam giác tĩnh. Nhân vật và xe được vẽ gộp (instancing).

## Ghi chú
- Con phố là phố tưởng tượng, gom các địa danh về gần nhau, không đúng vị trí thật.
- Không có chat. Máy chủ chỉ chuyển số thứ tự tên ngẫu nhiên, ngoại hình, ghế ngồi, toạ độ đi lại (đã kiểm tra trong vùng cho phép) và 3 động tác.
