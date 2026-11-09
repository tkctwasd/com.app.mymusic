# Đánh giá và đề xuất cải thiện My Music (09/11/2026)

Trạng thái: `[ ]` chưa làm, `[x]` đã làm, `[~]` đang làm.
Mỗi nhóm xếp theo ưu tiên từ trên xuống. Mức độ: 🔴 nên làm sớm, 🟡 nên làm, 🟢 làm khi rảnh.

## Tóm tắt
App đã khá hoàn chỉnh: khởi động từ cache, offline, crossfade, lời bài hát, chuyển trang mượt, PWA, hỗ trợ iPhone.
Phần còn thiếu chủ yếu là **dọn code cũ**, **kiểm thử**, **trải nghiệm lần đầu/trạng thái rỗng** và **vài tính năng "giữ chân"** (thống kê, gợi ý).

## 1. Dọn dẹp code (dễ làm, lợi lâu dài)
- [x] 🔴 Xóa các file không còn được dùng: HomeView, LibraryView, SearchView, Sidebar, RightPanel, PlayerBar, FullPlayer, MiniPlayer, FullscreenView, TrackTable. (TopNav, MobileNav vẫn đang dùng)
- [x] 🟡 Cập nhật [readme.md](../readme.md) theo giao diện "Studio" hiện tại.
- [ ] 🟢 Thêm ESLint + Prettier để code đồng nhất.

## 2. Hiệu năng
- [ ] 🟡 Tìm trong lời bài hát ([server/src/index.js](../server/src/index.js) `/api/search/lyrics`) đang tải **toàn bộ** bài từ MongoDB rồi lọc bằng JS mỗi lần gõ. Nên dùng text index của MongoDB (hoặc `$regex` + projection chỉ lấy `lyrics`, `title`, `artist`, `coverUrl`), và debounce phía client ~300ms.
- [ ] 🟡 `GET /api/tracks` luôn trả cả thư viện. Thêm `ETag`/`If-None-Match` (hoặc `?since=updatedAt`) để lần mở sau chỉ nhận 304 / phần thay đổi — tiết kiệm mạng trên điện thoại.
- [ ] 🟡 Ảnh bìa: dùng biến đổi của Cloudinary (`w_300,f_auto,q_auto`) cho ảnh nhỏ trong danh sách, ảnh gốc chỉ cho Stage. Thêm `loading="lazy"` và `decoding="async"` nếu chưa có.
- [ ] 🟢 Service worker ([web/public/sw.js](../web/public/sw.js)): cache asset không bao giờ bị dọn (tên cache cố định `my-music-v1`, file hash cũ tích tụ). Nên xóa asset cũ khi có bản mới, hoặc giới hạn số mục.
- [ ] 🟢 Virtual scroll thật sự cho thư viện > 1000 bài (hiện dùng `content-visibility`, ổn với vài trăm bài).
- [ ] 🟢 Đo Lighthouse trước/sau (việc còn tồn từ kế hoạch cũ).

## 3. Giao diện: đơn giản, hiện đại, dễ dùng
- [ ] 🔴 **Trạng thái rỗng + lần đầu dùng**: thư viện trống thì hiện 1 màn hình hướng dẫn rõ ràng với nút lớn "Dán link YouTube" / "Chọn file", thay vì các kệ trống.
- [ ] 🔴 **Skeleton thống nhất** khi tải (trang nghệ sĩ, lời bài hát, kết quả tìm lời) để không bị nhảy bố cục.
- [ ] 🟡 Màn hình Đang phát trên điện thoại: ưu tiên ảnh bìa lớn + 3 nút chính (Trước / Phát / Sau); đưa Shuffle, Repeat, Hẹn giờ, Crossfade vào một hàng phụ hoặc menu "…". Giảm số nút nhìn thấy cùng lúc.
- [ ] 🟡 Vuốt (gesture) trên điện thoại: vuốt trái/phải trên mini player để đổi bài, vuốt xuống để thu nhỏ Đang phát, vuốt trái một dòng bài để "Phát tiếp theo".
- [ ] 🟡 Dấu "đã tải offline" trên từng dòng bài (hiện chỉ có trong menu và Cài đặt).
- [ ] 🟢 Chế độ sáng/tối theo hệ thống, kiểm tra độ tương phản chữ phụ (`--text-2`) đạt WCAG AA trên nền màu động từ ảnh bìa.
- [ ] 🟢 Khả năng truy cập: `aria-label` cho các nút chỉ có icon, điều hướng bằng bàn phím trong danh sách bài, focus ring rõ ràng.

## 4. Tính năng nên thêm
- [ ] 🟡 **Thống kê nghe nhạc**: top bài / nghệ sĩ theo tuần, tháng, năm; tổng giờ nghe; "Nhìn lại năm 2026" (kiểu tổng kết cuối năm) — dữ liệu `plays`, `lastPlayedAt` đã có.
- [ ] 🟡 **Radio từ một bài**: phát liên tục các bài cùng nghệ sĩ/album/playlist có chung bài đó, tự nối hàng đợi khi hết.
- [ ] 🟡 **Import playlist YouTube** (cả danh sách một lần) nếu chưa hỗ trợ; tự đề xuất bài mới của nghệ sĩ đã có.
- [ ] 🟡 **Chuẩn hóa âm lượng** (loudness normalization) giữa các bài: tính khi import bằng ffmpeg `loudnorm`, lưu gain vào track.
- [ ] 🟢 Equalizer đơn giản (Bass / Treble) bằng Web Audio API (lưu ý giới hạn iOS).
- [ ] 🟢 Sắp xếp/lọc thư viện: theo ngày thêm, lượt nghe, thời lượng; lọc "chưa có lời", "chưa có ảnh bìa" để dọn dữ liệu.
- [ ] 🟢 Tự động sao lưu định kỳ (hằng tuần) ra Cloudinary hoặc tải file JSON về.
- [ ] 🟢 Chia sẻ playlist qua link chỉ-xem.

## 5. Ổn định và bảo mật
- [ ] 🔴 **Chưa có test nào.** Tối thiểu: test logic hàng đợi/shuffle/repeat trong [player.js](../web/src/stores/player.js) (Vitest) và test API chính của server. Đây là phần dễ vỡ nhất khi sửa.
- [ ] 🟡 Theo dõi lỗi: ghi lỗi client (`window.onerror`, lỗi phát audio) gửi về `/api/log`, xem được trong Cài đặt — giúp bắt lỗi trên iPhone mà không cần cắm máy.
- [ ] 🟡 Mật khẩu: `APP_SECRET` mặc định bằng chính mật khẩu → nên bắt buộc đặt `APP_SECRET` riêng; đổi mật khẩu thì token cũ vẫn dùng được nếu secret không đổi.
- [ ] 🟢 Giới hạn `/api/upload` 200MB và `/api/restore` 50MB: thêm kiểm tra kiểu file (chỉ audio) và rate limit.
- [ ] 🟢 Việc còn tồn: test checklist trên iPhone thật (khóa màn hình, mất mạng, mở lại app), kiểm tra `CLOUDINARY_URL` và gói Render.

## Đề xuất thứ tự làm
1. ~~Xóa file thừa + cập nhật readme~~ (xong).
2. Màn hình rỗng/lần đầu + skeleton.
3. Test cho player store.
4. Tối ưu tìm lời + ETag cho danh sách bài + ảnh bìa thu nhỏ.
5. Thống kê nghe nhạc và Radio từ một bài.
