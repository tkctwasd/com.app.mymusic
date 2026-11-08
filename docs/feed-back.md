# Kế hoạch cải thiện My Music

Trạng thái: `[ ]` chưa làm, `[x]` đã làm, `[~]` đang làm.
Thứ tự ưu tiên từ trên xuống. Các mục chưa test trên iPhone thật đều cần kiểm tra lại.

## 1. Khởi động nhanh và hiệu năng
- [x] Hiện giao diện ngay từ thư viện đã cache (IndexedDB), rồi tải dữ liệu mới ở nền. Hiện tại [App.vue](web/src/App.vue) đợi `lib.load()` xong mới hiển thị.
- [x] Tách các trường nặng (`peaks`, `lyrics`, `plays`) khỏi `GET /api/tracks`, chỉ tải khi cần.
- [x] Thêm nén phản hồi (`compression`) trong [server/src/index.js](server/src/index.js).
- [x] Lazy-load các route/view ít dùng (`ArtistView`, `ExploreView`, ...).
- [x] Virtual scroll cho danh sách bài dài. (dùng content-visibility cho dòng bài; chưa virtual DOM đầy đủ)
- [x] Tự host font thay vì tải Google Fonts.
- [ ] Đo trước và sau bằng Lighthouse / DevTools Network để so sánh.

## 2. Server và triển khai (Render)
- [x] Cài sẵn yt-dlp trong [Dockerfile](Dockerfile), ghim phiên bản, bỏ `pip install -U` lúc khởi động.
- [x] Chuyển job import từ bộ nhớ sang DB (collection `jobs`) để không mất khi restart.
- [ ] Kiểm tra `CLOUDINARY_URL` đã được set trên Render.
- [ ] Cân nhắc gói Render không ngủ nếu dùng hằng ngày.

## 3. Phát nhạc trên iPhone
- [x] Âm lượng: Safari iOS bỏ qua `audio.volume`. Ẩn thanh âm lượng trong app trên iOS, hoặc dùng Web Audio API (`GainNode`) cho crossfade và fade-out hẹn giờ.
- [x] Phát nền và khóa màn hình: kiểm tra chuyển bài tự động, crossfade và hẹn giờ khi khóa. Tắt crossfade khi chạy nền nếu cần. (đã tắt crossfade trên iOS; phát nền khi khóa màn hình CHƯA kiểm tra trên máy thật)
- [x] Đăng nhập: ghi chú trong [InstallHint.vue](web/src/components/ui/InstallHint.vue) rằng app trên màn hình chính có thể cần đăng nhập lại. (đã thêm ghi chú vào hướng dẫn cài)
- [ ] Test checklist: thêm vào màn hình chính, khóa màn hình giữa bài, tắt mạng, đóng/mở lại app, upload từ app Files.

## 4. Nghe offline
- [x] Tải bài hoặc playlist về máy để nghe khi mất mạng.
- [x] Service worker cache file nhạc đã tải, tránh cache toàn bộ thư viện. (thiết kế: Cache Storage của trang, chỉ bài người dùng tải về; không cache cả thư viện)
- [x] Hiển thị trạng thái "đã tải" và dung lượng đã dùng. (nhãn trong menu bài và số bài/dung lượng trong Cài đặt; chưa có dấu trên từng dòng)

## 5. Giao diện trên điện thoại
- [x] Splash screen iOS (`apple-touch-startup-image`) để không hiện màn hình trống khi mở app. (đã tạo 3 cỡ iPhone 390x844, 393x852, 430x932)
- [x] Bọc hiệu ứng `:hover` trong `@media (hover: hover)` để không bị dính sau khi chạm.
- [x] Vùng bấm tối thiểu 44px trên điện thoại (`.icon-btn` hiện 36px).
- [x] Dùng `100dvh` có fallback thay cho `100vh` trong [base.css](web/src/styles/base.css).
- [x] Menu trên điện thoại dùng bottom sheet thay cho menu ngữ cảnh.
- [ ] Skeleton và trạng thái rỗng/đang tải thống nhất.
- [x] Hỗ trợ `prefers-reduced-motion`.
- [ ] Màn hình đang phát rút gọn điều khiển, ưu tiên ảnh bìa.

## 6. Bảo mật
- [x] Chuyển token SSE khỏi query string ([library.js](web/src/stores/library.js)) sang cookie hoặc cách khác, tránh ghi vào log.
- [x] Thêm rate limit cho `/api/login`.
- [ ] Cân nhắc URL nhạc Cloudinary là public: đánh giá rủi ro nếu URL bị lộ.

## 7. Tính năng mới
- [x] Chống trùng lặp khi import (kiểm tra video YouTube đã có trong thư viện). (đã có sẵn từ trước: kiểm tra theo ID video)
- [ ] Thống kê: top tuần/tháng, bài nghe nhiều nhất (dựa trên `plays`, `lastPlayedAt`).
- [x] Playlist thông minh: "Mới thêm", "Nghe gần đây", "Chưa nghe bao giờ". (đã thêm kệ Chưa nghe bao giờ; Mix từ bài đã thích)
- [x] Sao lưu và khôi phục thư viện (xuất/nhập JSON). (Cài đặt > Dữ liệu; khôi phục là upsert, không xóa bài hiện có)
- [x] Tìm kiếm trong lời bài hát.
- [x] Mix từ bài đã thích.
- [x] Nhập nhiều file cùng lúc từ iPhone (kéo thả hoặc chọn từ Files). (đã có sẵn: chọn nhiều file và kéo-thả)

## 8. Không làm (tạm thời)
- Viết lại server bằng Rust hoặc C++: nút thắt nằm ở mạng và YouTube, không nằm ở ngôn ngữ.
- Viết lại app bằng SwiftUI: cân nhắc sau, nếu Capacitor không đủ.


## Ghi chú: việc còn lại hoặc cần bạn quyết định
- Đo bằng Lighthouse: chưa làm (cần chạy trên trình duyệt có Lighthouse). Kích thước bundle JS hiện ~81KB gzip.
- Stage (màn hình đang phát) trên điện thoại: cần chọn điều khiển nào ẩn, chưa đổi.
- Skeleton: màn hình khởi động đã hiện ngay từ cache, nên chưa cần thêm.
- Thống kê theo tuần/tháng: bảng xếp hạng hiện có (TopChart) đã theo ngày/giờ; chưa thêm trang thống kê riêng.
- Cloudinary: URL nhạc vẫn public (ID ngẫu nhiên). Giữ nguyên vì đổi sang URL có chữ ký sẽ làm chậm phát; cân nhắc nếu app công khai.
- Render: kiểm tra CLOUDINARY_URL và gói có ngủ hay không là việc trên dashboard Render, bạn cần làm.
- Cài đặt phát nền trên iPhone: cần test thật theo checklist mục 3.
