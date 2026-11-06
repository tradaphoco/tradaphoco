# Trà Đá Phố Cổ 3D — bản 6.2 đầy đủ

Quán trà đá vỉa hè giữa phố cổ Hà Nội 3D, nhiều người chơi. Thư mục này là **toàn bộ dự án**: tải nguyên thư mục lên GitHub và nguyên thư mục `public/` lên website, không cần dò file mới hay file cũ.

## Cấu trúc
| Thư mục / file | Dùng ở đâu | Nội dung |
|---|---|---|
| `server.js`, `package.json`, `admin/` | Render (qua GitHub) | Máy chủ nhiều người chơi, trang quản trị `/admin` |
| `public/` | Render **và** SiteGround | Toàn bộ game: `index.html`, `js/`, `models/`, `sound/`, `icons/`, `music/`, `kiemthu.html` |
| `public/js/config.js` | | **File duy nhất cần sửa**: địa chỉ máy chủ, nhạc có bản quyền |
| `tools/` | Chỉ trên máy tính | Công cụ dựng lại mô hình, nhân vật, giọng nói (Python) |
| `CHECKLIST-TRIEN-KHAI-6.2.md` | | Danh sách việc khi triển khai (bản tương tác: `kiemthu.html`) |

---

## Bước 1. Sửa một dòng trong `public/js/config.js`
Mở bằng Notepad, điền địa chỉ máy chủ Render của bạn:

```js
server: "wss://<tên-service>.onrender.com/ws",
```

`<tên-service>` lấy ở góc trên trang service trên Render (ví dụ trang Render ghi `https://tra-da-pho-co.onrender.com` thì điền `wss://tra-da-pho-co.onrender.com/ws`). Lưu file.

Nếu tên miền game không phải `hungq.sg-host.com`, sửa thêm dòng `og:image` trong `public/index.html` (ảnh hiện khi chia sẻ link lên Facebook, Zalo).

## Bước 2. GitHub → Render
1. Vào repo trên GitHub › **Add file › Upload files**.
2. Mở thư mục `tra-da-pho-co` trên máy, chọn **tất cả** bên trong (Ctrl+A), kéo thả vào trang GitHub. File trùng tên sẽ được thay, file mới được thêm.
3. Ghi commit `Bản 6.2 đầy đủ` › **Commit changes**. Render tự triển khai lại sau 1–3 phút.
4. Lần đầu dùng 6.2: trên Render › **Environment** thêm 3 biến `ADMIN_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (xem mục Upstash bên dưới). Đã thêm rồi thì bỏ qua.
5. **Logs** phải có dòng `lưu dữ liệu: Upstash Redis`.

## Bước 3. SiteGround
1. **Site Tools › Site › File Manager**, mở thư mục đang chứa game (thường là `public_html`).
2. Bấm **Upload**, chọn **toàn bộ nội dung bên trong thư mục `public/`** (không phải chính thư mục `public`). Khi hỏi, chọn **Overwrite / Ghi đè**.
3. Không xoá file khác của website (trang sách, trang giới thiệu…).
4. **Speed › Caching › Flush Cache**. Đóng hết tab game rồi mở lại.

## File cũ còn sót lại
Các file sau từ bản cũ không còn được dùng. Để nguyên **không gây lỗi**; muốn gọn thì xoá ở cả GitHub và SiteGround:
`public/js/gl.js`, `public/view_tmp.html`, `HUONG-DAN-CAP-NHAT-6.1.md`, `HUONG-DAN-CAP-NHAT-6.2.md`, `tools/__pycache__/`.

## Upstash (lưu dữ liệu lâu dài, miễn phí)
1. upstash.com › đăng ký › **Create Database** › Redis, tên `tra-da`, vùng `ap-southeast-1` (Singapore), gói Free.
2. Mục **REST API** › chép `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` vào Environment của Render.
3. `ADMIN_KEY`: mật khẩu dài ít nhất 16 ký tự, chỉ bạn biết. Dùng để vào `https://<tên-service>.onrender.com/admin`.

## Kiểm tra sau khi đưa lên
- Mở `…/kiemthu.html`: thẻ **Checklist triển khai** để tick từng việc; thẻ **Kiểm thử giọng rao** › Kiểm tra tất cả file phải ra 14/14.
- Mở game: màn hình chờ hiện "nạp mô hình …/14", bấm **Ngồi cùng người thật**, góc trên hiện "Quán số 1".
- Nếu nút "Ngồi cùng người thật" bị mờ trên SiteGround: dòng `server` trong `config.js` chưa điền hoặc điền sai.

## Quay lại bản cũ nếu có sự cố
- Render: **Events** › chọn lần triển khai trước › **Rollback**.
- SiteGround: giải nén bản sao lưu đè lên chỗ đặt game.

## Dựng lại mô hình, giọng nói (không bắt buộc)
Cần Python 3, numpy, scipy; giọng nói cần thêm espeak-ng và ffmpeg.

```
python3 tools/make_models.py     # ghế, xe máy, cây sấu, cột đèn, tủ trà (+ bản rút gọn)
python3 tools/make_vehicles.py   # xích lô, xe đạp chở hoa
python3 tools/make_people.py     # nhân vật có khung xương, 21 hoạt cảnh
python3 tools/make_voices.py     # tiếng rao, loa phường, cô bán hàng, tiếng xì xào, máy xe
```

Muốn giọng người thật: thu âm đúng các câu trong `tools/make_voices.py`, lưu thành `public/sound/<tên>.mp3` cùng tên.

## Giấy phép
Three.js r168 (MIT) — xem `public/js/vendor/LICENSE-three.txt`. Mô hình, âm thanh và mã còn lại do dự án tự tạo.
