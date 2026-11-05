# Trà Đá Phố Cổ 3D — bản 5.1

Quán trà đá vỉa hè giữa phố cổ Hà Nội, dựng bằng 3D thời gian thực (WebGL2), chơi được nhiều người cùng lúc.
Không dùng thư viện ngoài: bộ dựng hình, máy chủ, âm thanh và luật cờ tướng đều tự viết.

## Mới trong bản 5.1: tự đặt tên
- **Màn hình đầu:** ô "Tên của bạn trong quán", có nút 🎲 Gợi ý. Game kiểm tra tên ngay khi gõ (✓ dùng được, hoặc báo lý do). Để trống thì dùng tên ngẫu nhiên như cũ. Tên được nhớ cho lần sau.
- **Đổi tên khi đang chơi:** ☰ › Đổi tên (phím N). Mỗi phút đổi được một lần, cả quán thấy tên mới.
- **Luật tên** (`cleanName` trong `public/js/room.js`, chạy ở cả máy chủ lẫn trình duyệt):
  - 2–20 ký tự; chỉ chữ (có dấu), số, khoảng trắng và `. ' -`; phải có ít nhất một chữ cái; không lặp một ký tự quá 3 lần.
  - Chặn từ ngữ thô tục tiếng Việt và tiếng Anh, kể cả viết không dấu, viết cách hoặc thay chữ bằng số (ví dụ `D1t`, `F u c k`).
  - Chặn tên giả danh nhân vật của game: công an, dân phòng, admin, quản trị, cô bán hàng…
  - Máy chủ kiểm tra lại mọi tên. Tên không hợp lệ thì người chơi vẫn vào được, nhưng dùng tên ngẫu nhiên và được báo lý do.
- **Trùng tên:** trong cùng một quán, người vào sau được thêm số (ví dụ "Hưng 2").
- **Ẩn tên:** chạm vào một người, chọn "🙈 Ẩn tên". Chỉ máy của bạn không hiện tên, bong bóng chữ và dòng lưu bút của người đó nữa.
- Danh sách từ cấm nằm trong `BAD_EXACT`, `BAD_TOKEN`, `BAD_SUB`, `RESERVED` ở đầu `room.js`, có thể bổ sung. Bộ lọc tự động không bắt được hết mọi cách viết lách luật, nên nếu game mở rộng, cần thêm cơ chế báo cáo và người kiểm duyệt.

## Chạy thử
    node server.js
Mở http://localhost:8080.

## Triển khai: trang trên SiteGround, máy chủ trên Render
1. **Render:** đưa cả thư mục lên GitHub (`package.json` và `server.js` ở gốc repo). Web Service, Language **Node**, Build `npm install`, Start `node server.js`, Health Check Path `/health`. Biến `ALLOWED_ORIGIN=https://hungq.sg-host.com` (nhiều địa chỉ thì cách nhau bằng dấu phẩy). Tuỳ chọn `STATS_KEY` để khoá `/stats`.
2. **SiteGround:** tải **nội dung thư mục `public/`** lên. Trong `js/game.js` sửa:
        const DEFAULT_SERVER = "wss://ten-service.onrender.com/ws";
3. Trong `index.html`, đổi `og:image` thành `https://hungq.sg-host.com/og-image.jpg`.
4. Xoá cache SiteGround. Nếu chưa thấy bản mới, đóng hết tab game rồi mở lại (trang có service worker).

**Quan trọng:** luật tên nằm trong `room.js`, file này dùng ở cả hai nơi. Khi cập nhật, phải đưa bản mới lên **cả Render lẫn SiteGround**.

## Tính năng có sẵn từ bản 5.0
- **Đồng bộ chung:** khách vãng lai, ghế, lời nhắc của công an phường, tàu điện, tàu hoả do máy chủ quyết định; ngồi một mình thì trình duyệt chạy cùng luật. Giờ trong game theo giờ Hà Nội. Trang theo dõi `/stats`.
- **Tương tác:** mời trà, cụng ly, vẫy chào, nhường ghế; cờ tướng vỉa hè (đánh với người hoặc máy); sổ lưu bút chọn câu có sẵn.
- **Lan toả:** bưu thiếp Hà Nội (3 kiểu), cài như ứng dụng (PWA), ảnh xem trước khi chia sẻ link.
- **Theo mùa:** mùa đông, Tết Đinh Mùi 2027 tự đổi theo ngày; thời tiết theo trời Hà Nội thật (Open-Meteo).
- **Bản đồ:** chợ Đồng Xuân, phố đường tàu (tàu hoả, rào chắn, chuông báo), cầu Long Biên; hộ chiếu 10 dấu và 2 dấu thưởng.

## Cấu trúc
| File | Nội dung |
|---|---|
| `server.js` | Web + WebSocket, chạy các quán bằng `room.js`, thời tiết, sổ lưu bút, `/health`, `/stats` |
| `public/js/room.js` | Luật đồng bộ của quán và luật đặt tên (dùng chung) |
| `public/js/xiangqi.js` | Luật cờ tướng và máy đánh (dùng chung) |
| `public/js/gl.js`, `world.js`, `actors.js` | Bộ dựng hình, phố và địa danh, người và xe |
| `public/js/audio.js` | Âm thanh 3D, nhạc nền, đài |
| `public/js/passport.js` | Hộ chiếu phố cổ |
| `public/js/ui.js` | Lưu bút, cờ tướng, bưu thiếp, đổi tên, cài ứng dụng |
| `public/js/game.js` | Vòng lặp game, điều khiển, mạng |

## Ghi chú
- Con phố gom các địa danh về gần nhau, không đúng vị trí thật. Các câu chuyện trong hộ chiếu nên được người am hiểu lịch sử Hà Nội đọc lại.
- Ca khúc Hà Nội xưa còn bản quyền nên game không kèm bản thu; khi có giấy phép, khai báo trong `LICENSED_TRACKS` ở đầu `js/game.js`.
- Sổ lưu bút trên gói Free của Render sẽ mất khi máy chủ khởi động lại.
