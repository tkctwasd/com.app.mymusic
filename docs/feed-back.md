# Kế hoạch cải thiện My Music

Trạng thái: `[ ]` chưa làm, `[x]` đã làm, `[~]` đang làm.
Thứ tự ưu tiên từ trên xuống. Các mục chưa test trên iPhone thật đều cần kiểm tra lại.

## 1. Khởi động nhanh và hiệu năng
- [x] Hiện giao diện ngay từ thư viện đã cache (IndexedDB), rồi tải dữ liệu mới ở nền. Hiện tại [App.vue](web/src/App.vue) đợi `lib.load()` xong mới hiển thị.
- [x] Tách các trường nặng (`peaks`, `lyrics`, `plays`) khỏi `GET /api/tracks`, chỉ tải khi cần.
- [x] Thêm nén phản hồi (`compression`) trong [server/src/index.js](server/src/index.js).
- [x] Lazy-load các route/view ít dùng (`ArtistView`, `ExploreView`, ...).
- [ ] Virtual scroll cho danh sách bài dài.
- [x] Tự host font thay vì tải Google Fonts.
- [ ] Đo trước và sau bằng Lighthouse / DevTools Network để so sánh.

## 2. Server và triển khai (Render)
- [x] Cài sẵn yt-dlp trong [Dockerfile](Dockerfile), ghim phiên bản, bỏ `pip install -U` lúc khởi động.
- [x] Chuyển job import từ bộ nhớ sang DB (collection `jobs`) để không mất khi restart.
- [ ] Kiểm tra `CLOUDINARY_URL` đã được set trên Render.
- [ ] Cân nhắc gói Render không ngủ nếu dùng hằng ngày.

## 3. Phát nhạc trên iPhone
- [ ] Âm lượng: Safari iOS bỏ qua `audio.volume`. Ẩn thanh âm lượng trong app trên iOS, hoặc dùng Web Audio API (`GainNode`) cho crossfade và fade-out hẹn giờ.
- [ ] Phát nền và khóa màn hình: kiểm tra chuyển bài tự động, crossfade và hẹn giờ khi khóa. Tắt crossfade khi chạy nền nếu cần.
- [ ] Đăng nhập: ghi chú trong [InstallHint.vue](web/src/components/ui/InstallHint.vue) rằng app trên màn hình chính có thể cần đăng nhập lại.
- [ ] Test checklist: thêm vào màn hình chính, khóa màn hình giữa bài, tắt mạng, đóng/mở lại app, upload từ app Files.

## 4. Nghe offline
- [ ] Tải bài hoặc playlist về máy để nghe khi mất mạng.
- [ ] Service worker cache file nhạc đã tải, tránh cache toàn bộ thư viện.
- [ ] Hiển thị trạng thái "đã tải" và dung lượng đã dùng.

## 5. Giao diện trên điện thoại
- [ ] Splash screen iOS (`apple-touch-startup-image`) để không hiện màn hình trống khi mở app.
- [x] Bọc hiệu ứng `:hover` trong `@media (hover: hover)` để không bị dính sau khi chạm.
- [x] Vùng bấm tối thiểu 44px trên điện thoại (`.icon-btn` hiện 36px).
- [x] Dùng `100dvh` có fallback thay cho `100vh` trong [base.css](web/src/styles/base.css).
- [ ] Menu trên điện thoại dùng bottom sheet thay cho menu ngữ cảnh.
- [ ] Skeleton và trạng thái rỗng/đang tải thống nhất.
- [x] Hỗ trợ `prefers-reduced-motion`.
- [ ] Màn hình đang phát rút gọn điều khiển, ưu tiên ảnh bìa.

## 6. Bảo mật
- [x] Chuyển token SSE khỏi query string ([library.js](web/src/stores/library.js)) sang cookie hoặc cách khác, tránh ghi vào log.
- [ ] Thêm rate limit cho `/api/login`.
- [ ] Cân nhắc URL nhạc Cloudinary là public: đánh giá rủi ro nếu URL bị lộ.

## 7. Tính năng mới
- [ ] Chống trùng lặp khi import (kiểm tra video YouTube đã có trong thư viện).
- [ ] Thống kê: top tuần/tháng, bài nghe nhiều nhất (dựa trên `plays`, `lastPlayedAt`).
- [ ] Playlist thông minh: "Mới thêm", "Nghe gần đây", "Chưa nghe bao giờ".
- [ ] Sao lưu và khôi phục thư viện (xuất/nhập JSON).
- [ ] Tìm kiếm trong lời bài hát.
- [ ] Mix từ bài đã thích.
- [ ] Nhập nhiều file cùng lúc từ iPhone (kéo thả hoặc chọn từ Files).

## 8. Không làm (tạm thời)
- Viết lại server bằng Rust hoặc C++: nút thắt nằm ở mạng và YouTube, không nằm ở ngôn ngữ.
- Viết lại app bằng SwiftUI: cân nhắc sau, nếu Capacitor không đủ.
