# My Music – Ứng dụng nghe nhạc cá nhân (giao diện "Studio")

Web app nghe nhạc cá nhân: tải nhạc từ YouTube (hoặc upload file), lưu trên cloud miễn phí, nghe với giao diện "Studio" lấy bài đang nghe làm trung tâm: Dock nổi, Stage, Command bar, màu đổi theo ảnh bìa. Cài được như app (PWA), nghe offline.

- **Backend:** Node.js 20 (Express) + MongoDB Atlas + Cloudinary (file nhạc/ảnh) + yt-dlp/ffmpeg
- **Frontend:** Vue 3 + Vite + Pinia + Vue Router, PWA (service worker)
- Cài cloud: [docs/setup-cloud.md](docs/setup-cloud.md) · Kế hoạch cải thiện: [docs/feed-back.md](docs/feed-back.md)

## Chạy

Cần cài sẵn: Node 20+, `yt-dlp`, `ffmpeg`.

```bash
npm run setup     # lần đầu: cài thư viện server + web
npm run build     # build giao diện (web/dist)
npm start         # → http://localhost:3000
```

Phát triển (hot reload): `npm run dev:server` và `npm run dev:web` (→ http://localhost:5173, tự proxy `/api` sang :3000).

Biến môi trường: chép `server/.env.example` thành `server/.env`.

| Biến | Ý nghĩa |
|---|---|
| `APP_PASSWORD` | Mật khẩu đăng nhập. Bỏ trống = không khóa (chỉ dùng ở máy mình) |
| `APP_SECRET` | Khóa ký token. Nên đặt riêng, khác mật khẩu |
| `MONGODB_URI`, `MONGODB_DB` | MongoDB Atlas |
| `CLOUDINARY_URL`, `CLOUDINARY_FOLDER` | Cloudinary lưu nhạc và ảnh bìa |

Triển khai: [Dockerfile](Dockerfile) (đã cài sẵn yt-dlp, ffmpeg) + [render.yaml](render.yaml) cho Render.

## Tính năng

| Nhóm | Tính năng |
|---|---|
| Thêm nhạc | Dán link YouTube (bài hoặc playlist) ở bất cứ đâu, xem trước, chống trùng; upload nhiều file; tiến độ realtime, job lưu trong DB, thử lại |
| Thư viện | Kệ: Playlist / Album / Nghệ sĩ / Bài hát, lưới hoặc danh sách, ghim; sửa thông tin, đổi ảnh bìa, xóa có Hoàn tác; chọn nhiều |
| Playlist | Tạo, đổi tên, mô tả, kéo-thả sắp xếp, gợi ý bài; Đã thích, Mix từ bài đã thích, Chưa nghe bao giờ |
| Tìm kiếm | Command bar (`Ctrl+K`): tìm không dấu, lệnh `>` (hẹn giờ, trộn bài, playlist mới…), tìm trong lời bài hát; trang Khám phá |
| Phát nhạc | Dock + Stage: thanh tua waveform, Shuffle, Repeat, crossfade, hẹn giờ tắt (có fade), hàng đợi "Tiếp theo", lời bài hát đồng bộ, chế độ trình chiếu (`F`), Media Session |
| Offline | Tải bài/playlist về máy, mở app tức thì từ cache, tự phát tiếp khi có mạng lại |
| Khác | Theme Sáng/Tối theo ảnh bìa, bảng xếp hạng, sao lưu/khôi phục JSON, phím tắt, tối ưu iPhone |

## Cấu trúc

```
server/src/
  index.js       API Express + phục vụ web/dist
  auth.js        đăng nhập 1 mật khẩu, token HMAC (header hoặc cookie httpOnly)
  db.js          MongoDB: tracks, playlists, jobs
  jobs.js        hàng đợi import + SSE tiến độ
  youtube.js     yt-dlp/ffmpeg → MP3 + ảnh bìa
  storage.js     Cloudinary   ·   localaudio.js: chế độ lưu file cục bộ

web/src/
  App.vue                 khung: TopNav + trang + Dock + Stage (+ MobileNav)
  views/                  ListenView (Nghe), ShelfView (Kệ), ExploreView, CollectionView, ArtistView, OfflineView, LoginView
  components/layout/      TopNav, Dock, Stage, MobileNav, JobsPanel
  components/media/       TrackList, SelectionBar, Card, Lyrics, Waveform, TopChart…
  components/ui|modals/   CommandBar, ContextMenu, Toasts, Modal, Settings, Import, EditTrack…
  stores/                 player (2 thẻ audio để crossfade), library (cache IndexedDB), ui
  composables/            useTheme (màu động), usePeaks (waveform), useShortcuts, useDragSort…
  offline.js, cache.js    nghe offline (Cache Storage) và cache thư viện
```

## Ghi chú kỹ thuật
- `GET /api/tracks` trả danh sách gọn (bỏ `peaks`, `lyrics`); chi tiết tải qua `GET /api/tracks/:id` khi cần.
- Waveform: trình duyệt giải mã file khi bài được phát lần đầu rồi lưu `track.peaks` (200 giá trị) qua `PATCH`.
- Theme: `useTheme.js` lấy màu bìa → bảng màu HSL, tự chỉnh tương phản ≥ 4.5:1; token dùng `@property` để chuyển màu mượt.
- iOS: ẩn thanh âm lượng (Safari bỏ qua `audio.volume`), tắt crossfade.
- Các trang được tải sẵn khi rảnh, 3 tab chính giữ bằng KeepAlive để chuyển tab tức thì.
