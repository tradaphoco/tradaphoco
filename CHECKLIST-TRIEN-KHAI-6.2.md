# Checklist triển khai Trà Đá Phố Cổ 6.2

Bản tương tác (tick được, tự lưu, có kiểm thử giọng rao): mở `kiemthu.html` trên trang game.

## A. Chuẩn bị trên máy tính

- [ ] **Sao lưu bản đang chạy** — SiteGround › File Manager: nén các file game trong `public_html` thành `backup-truoc-6.2.zip` rồi tải về. GitHub: ghi lại mã commit hiện tại để quay lại khi cần.
- [ ] **Giải nén `TraDa62_full.zip`** — Được thư mục `tra-da-pho-co` đầy đủ: `server.js`, `package.json`, `admin/`, `public/`, `tools/`.
- [ ] **Điền địa chỉ máy chủ vào `public/js/config.js`** — Dòng `server: "wss://<tên-service>.onrender.com/ws"`. Đây là file duy nhất cần sửa. Đổi `og:image` trong `public/index.html` nếu tên miền game không phải `hungq.sg-host.com`.
- [ ] **Đếm đủ file** — `public/models/`: 14 file `.glb`. `public/sound/`: 14 file `.mp3`. `public/js/`: 16 file `.js` và thư mục `vendor/` có 3 file `.js`.

## B. Upstash (lưu dữ liệu lâu dài)

- [ ] **Tạo database Redis** — upstash.com › Create Database › Redis, tên `tra-da`, vùng `ap-southeast-1` (Singapore), gói Free.
- [ ] **Chép 2 giá trị REST API** — `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`. Không gửi token qua chat hay email.

## C. Render (máy chủ)

- [ ] **Thêm 3 biến môi trường** — Environment: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ADMIN_KEY` (ít nhất 16 ký tự, lưu vào trình quản lý mật khẩu). Giữ nguyên `ALLOWED_ORIGIN`.
- [ ] **Đưa code lên GitHub** — Kéo **toàn bộ nội dung** thư mục `tra-da-pho-co` vào trang Upload files của repo. Trang đầu repo phải thấy `server.js` ở gốc. Commit ghi `Bản 6.2 đầy đủ`.
- [ ] **Xem Logs sau khi triển khai** — Phải có dòng `lưu dữ liệu: Upstash Redis` và **không** có `CHƯA đặt ADMIN_KEY`.
- [ ] **Mở `/health`** — Kết quả có `"ok":true` và `"store":"upstash"`.
- [ ] **Mở `/admin` và đăng nhập** — Đăng nhập bằng `ADMIN_KEY`. Không có khung cảnh báo màu vàng về lưu trữ.

## D. SiteGround (trang game)

- [ ] **Tải **toàn bộ nội dung** thư mục `public/` lên chỗ đặt game** — Chọn Ghi đè (Overwrite) khi được hỏi. Không xoá các file khác của website như trang sách, trang giới thiệu.
- [ ] **Mở thử 2 file trực tiếp** — `…/models/nguoi.glb` tải về được (không báo 404); `…/sound/rao_banhmi.mp3` phát được trong trình duyệt.
- [ ] **Xoá bộ nhớ đệm** — Site Tools › Speed › Caching › Flush Cache. Đóng hết tab game rồi mở lại. Vẫn thấy bản cũ: F12 › Application › Service Workers › Unregister, tải lại trang.

## E. Kiểm thử trên máy tính

- [ ] **Màn hình chờ nạp đủ mô hình** — Hiện “nạp mô hình …/14” rồi vào màn hình đặt tên.
- [ ] **Console không báo lỗi nạp** — F12 › Console: không có dòng `Không nạp được …`.
- [ ] **Nhân vật mới** — Khách quanh quán có mặt, tay chân, cầm cốc. Bấm Nhấp trà: nhân vật đưa cốc lên miệng. Cô bán hàng nghiêng ấm khi rót.
- [ ] **Xe mới** — Thấy xích lô (có người đạp phía sau) và xe đạp chở hoa đi qua.
- [ ] **Hướng dẫn chơi** — Lần đầu vào phố, khung “Hướng dẫn · bước 1/5” hiện ở dưới và tự sang bước khi làm xong. ☰ có 🎓 Hướng dẫn nhanh và 📜 Nội quy quán.
- [ ] **Trang kiểm thử giọng** — Mở `…/kiemthu.html`, thẻ Kiểm thử giọng rao › Kiểm tra tất cả file: 14/14 nạp được.
- [ ] **Giọng trong game** — Người gánh hàng đi ngang: nghe tiếng rao đúng câu trên bong bóng chữ. Quán từ 10 khách: loa phường đọc thông báo có tiếng vang. Đi xuống lòng đường quá 5 giây: dân phòng nhắc.

## F. Kiểm thử cộng đồng (2 thiết bị)

- [ ] **Hai máy vào cùng quán** — Cả hai bấm “Ngồi cùng người thật”, góc trên hiện cùng số quán.
- [ ] **Báo cáo** — Máy A chạm người của máy B (có dấu ●) › 🚩 Báo cáo › chọn lý do. Máy A thấy “Đã gửi báo cáo”.
- [ ] **Xử lý trong `/admin`** — Báo cáo hiện trong bảng. Bấm Ẩn tên: máy B nhận thông báo, tên chuyển về tên ngẫu nhiên.
- [ ] **Thông báo chung** — Gửi một câu từ `/admin`: cả hai máy thấy khung xanh “Thông báo từ quán”.
- [ ] **Chặn từ** — Chặn thử một từ, đổi tên chứa từ đó thì bị từ chối. Sau đó bỏ chặn.
- [ ] **Dữ liệu còn sau khi khởi động lại** — Viết một dòng lưu bút, rồi trên Render bấm Manual Deploy › Restart service. Lưu bút, báo cáo và thống kê vẫn còn.

## G. Kiểm thử trên điện thoại

- [ ] **Android (Chrome)** — Vào được phố, hướng dẫn không che nút, có tiếng sau khi chạm màn hình lần đầu, ☰ › Đồ hoạ hiện từ 30 khung/giây trở lên.
- [ ] **iPhone (Safari)** — Như trên. **Gạt tắt công tắc im lặng** bên hông máy: khi bật im lặng, iPhone tắt tiếng của game trên web.
- [ ] **Ghi lại số khung/giây** — Ghi tên máy, mức đồ hoạ tự chọn, số khung/giây ở quán trà và ở Hồ Gươm.

## H. Sau khi phát hành

- [ ] **Theo dõi 24 giờ đầu** — Vào `/admin` xem số lỗi, báo cáo, nhật ký máy chủ.
- [ ] **Lưu bản chuẩn** — Bản 6.2 đã ghép nằm trên GitHub là bản gốc duy nhất.
- [ ] **Biết cách quay lại** — Render › Events › Rollback; SiteGround: giải nén `backup-6.1.zip` đè lên `public_html`. Hai nơi phải cùng phiên bản.
