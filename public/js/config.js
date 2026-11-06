/* ============================================================
   Trà Đá Phố Cổ — CẤU HÌNH (file duy nhất cần sửa khi triển khai)
   ============================================================

   server: địa chỉ máy chủ nhiều người chơi trên Render, dạng
           "wss://tradaphoco.onrender.com/ws"
           Lấy <tên-service> ở góc trên trang service trên Render (ví dụ https://tra-da-pho-co.onrender.com).
           Để trống "" thì:
             - mở game từ địa chỉ Render: vẫn chơi nhiều người bình thường;
             - mở game từ SiteGround: chỉ chơi được chế độ "Ngồi một mình".

   tracks: bài hát bạn ĐÃ CÓ QUYỀN phát công khai, file đặt trong public/music/, ví dụ
           { title: "Tên bài", artist: "Ca sĩ · Tác giả", src: "music/ten-bai.mp3" }
*/
window.TDPC_CONFIG = {
  server: "",
  tracks: []
};
