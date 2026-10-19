# My Music – Ứng dụng nghe nhạc cá nhân (giao diện "Studio")

Web app nghe nhạc cá nhân: tải nhạc từ YouTube về, lưu trên cloud miễn phí, nghe với giao diện "Studio" lấy bài đang nghe làm trung tâm (Dock nổi, Stage, Command bar, màu đổi theo ảnh bìa).

- **Backend:** Node.js (Express) + MongoDB Atlas + Cloudinary (file nhạc/ảnh) + yt-dlp/ffmpeg
- **Frontend:** Vue 3 (sẽ chuyển sang Vite + SFC + Pinia + Vue Router), PWA
- Cách cài cloud: [docs/setup-cloud.md](docs/setup-cloud.md)

### Chạy
```bash
npm run setup     # lần đầu: cài thư viện server + web
npm run build     # build giao diện (web/dist)
npm start         # → http://localhost:3000
```
Phát triển giao diện (hot reload): chạy `npm run dev:server` và `npm run dev:web` (→ http://localhost:5173, tự proxy `/api` sang :3000).

Cần cài sẵn trên máy: Node 20+, `yt-dlp`, `ffmpeg`.

---

## 1. Hiện trạng (đã xong – MVP)

| Nhóm | Tính năng |
|---|---|
| Import | Dán link YouTube → MP3 320kbps + ảnh bìa → Cloudinary + MongoDB |
| Thư viện | Danh sách bài hát, sửa tên/ca sĩ/album, xóa (xóa luôn file trên cloud) |
| Playlist | Tạo, đổi tên, xóa; thêm/bỏ bài |
| Yêu thích | Like/unlike, trang Yêu thích |
| Tìm kiếm | Lọc tức thì theo bài, ca sĩ, album, playlist; lưu 10 lần tìm gần nhất |
| Player | Play/Pause/Next/Prev, tua, âm lượng, Shuffle, Repeat (off/all/one), hẹn giờ tắt 15–90 phút, Media Session (phím media, màn hình khóa) |

> **Cập nhật:** đã hoàn thành toàn bộ giao diện kiểu Spotify (mục 2–6) và các API mới. Xem trạng thái ở mục 7.

---

## 2. Thiết kế giao diện (Design System)

### Màu sắc (Dark mode mặc định)
| Token | Giá trị | Dùng cho |
|---|---|---|
| `--bg` | `#000000` | Nền ngoài cùng |
| `--surface` | `#121212` | Các panel (sidebar, nội dung) |
| `--surface-2` | `#1f1f1f` | Hover, card |
| `--surface-3` | `#2a2a2a` | Input, nút phụ |
| `--text` | `#ffffff` | Chữ chính |
| `--text-2` | `#b3b3b3` | Chữ phụ (ca sĩ, thời lượng) |
| `--accent` | `#1ed760` | Nút Play, bài đang phát, trạng thái bật |

- **Màu động theo ảnh bìa:** lấy màu chủ đạo của ảnh (canvas, tự tính) và đổ gradient phía trên header trang Playlist/Album/Now Playing, giống Spotify.
- **Font:** `Inter` / `Be Vietnam Pro` (đủ dấu tiếng Việt); tiêu đề lớn đậm 700–900.
- **Bo góc:** panel 8px, ảnh bìa 4–8px, ảnh nghệ sĩ tròn, nút Play tròn.
- **Icon:** bộ SVG inline (Lucide/Material Symbols), không dùng emoji.

### Bố cục tổng thể (Desktop ≥ 1024px)
```
┌──────────┬───────────────────────────────────┬────────────┐
│ Sidebar  │  Main view (cuộn riêng)           │ Now Playing│
│ trái     │  - Topbar: ← → | Search | Import   │ panel phải │
│ (thu gọn │  - Nội dung trang                  │ (ẩn/hiện)  │
│ được)    │                                   │            │
├──────────┴───────────────────────────────────┴────────────┤
│ Player bar: [bìa + tên + ♥] [⇄ ⏮ ▶ ⏭ 🔁 + thanh tua] [hàng đợi, lời, âm lượng, hẹn giờ] │
└───────────────────────────────────────────────────────────┘
```
- Ba cột là các panel bo góc, có khoảng cách 8px trên nền đen (đúng kiểu Spotify 2024+).
- Sidebar trái kéo được độ rộng; thu gọn thì chỉ còn ảnh bìa.

### Mobile (< 768px)
- Bottom nav: **Trang chủ / Tìm kiếm / Thư viện**.
- **Mini player** nổi phía trên bottom nav (bìa, tên, ▶, thanh tiến trình mỏng ở dưới).
- Chạm vào mini player → **Full player** trượt lên: ảnh bìa lớn, nền gradient theo màu bìa, vuốt xuống để đóng, vuốt trái/phải để chuyển bài.

---

## 3. Các màn hình

### 3.1 Sidebar trái – "Thư viện của bạn"
- Nút **Trang chủ**, **Tìm kiếm**.
- Mục "Thư viện": chip lọc **Playlist / Album / Nghệ sĩ**, ô tìm nhỏ, sắp xếp (Gần đây, Tên A–Z, Ngày thêm).
- Item: ảnh bìa vuông (nghệ sĩ là ảnh tròn), tên, dòng phụ "Playlist • 12 bài". Playlist đang phát có icon loa màu xanh.
- Mục ghim cố định: **Bài hát đã thích** (ảnh gradient tím–xanh với icon ♥).
- Nút **+** → Tạo playlist mới.

### 3.2 Trang chủ (Home)
- Lời chào theo giờ: "Chào buổi sáng / chiều / tối".
- **Lưới truy cập nhanh** (2×4): các playlist/album hay nghe; hover hiện nút ▶ xanh.
- Các hàng cuộn ngang (card):
  - **Nghe gần đây**
  - **Mới thêm vào**
  - **Nghệ sĩ của bạn** (tự gom theo `artist`)
  - **Album của bạn**
- Card: ảnh bìa, tiêu đề, phụ đề; hover thì nền sáng lên và nút ▶ trượt lên từ dưới.

### 3.3 Trang Playlist / Album / Bài hát đã thích
- **Header lớn:** ảnh bìa 232px (playlist tự ghép lưới 2×2 từ 4 bài đầu), chữ "Playlist", tên rất to, dòng "N bài, X phút". Nền gradient theo màu bìa.
- **Thanh hành động:** nút ▶ xanh lớn, Shuffle, ⋯ (đổi tên, đổi ảnh, xóa).
- **Bảng bài hát:** `#` | Tiêu đề (bìa + tên + ca sĩ) | Album | Ngày thêm | ⏱
  - Hover: số thứ tự đổi thành ▶, hiện ♥ và ⋯.
  - Bài đang phát: tên màu xanh, số thứ tự thành icon sóng nhạc động.
  - Click đúp để phát; chuột phải hoặc ⋯ mở **context menu**: Thêm vào hàng đợi, Thêm vào playlist ▸, Đến nghệ sĩ, Đến album, Sửa thông tin, Xóa.
  - **Kéo-thả** để sắp xếp lại thứ tự trong playlist, hoặc thả bài vào playlist ở sidebar.
- Header bảng dính (sticky) khi cuộn; tên playlist thu nhỏ vào topbar.

### 3.4 Trang Nghệ sĩ
- Banner tên nghệ sĩ (ảnh lấy từ bìa bài đầu tiên), số bài.
- **Phổ biến:** top bài theo số lần nghe.
- **Album** của nghệ sĩ.

### 3.5 Tìm kiếm
- Chưa nhập gì: **Tìm kiếm gần đây** (có nút xóa từng mục) + lưới thẻ màu "Duyệt" theo album/nghệ sĩ.
- Đang nhập: kết quả tức thì (debounce 150ms), có chip **Tất cả / Bài hát / Nghệ sĩ / Album / Playlist**.
  - **Kết quả hàng đầu** (card lớn) + 4 bài hát khớp nhất bên cạnh.
  - Các hàng: Nghệ sĩ, Album, Playlist.
- Tìm không dấu: "son tung" khớp "Sơn Tùng".

### 3.6 Import từ YouTube
- Nút **+ Thêm nhạc** trên topbar → modal:
  - Dán link → **xem trước** (bìa, tên, kênh, thời lượng) trước khi lưu.
  - Sửa sẵn tên bài/ca sĩ/album, chọn playlist đích.
  - Hỗ trợ **link playlist YouTube** → chọn nhiều bài rồi tải hàng loạt.
- **Hàng đợi tải** ở góc màn hình: tiến độ % (realtime qua SSE), trạng thái Đang tải / Đang upload / Xong / Lỗi (có nút thử lại).
- Toast "Đã thêm vào thư viện" kèm nút **Phát**.

### 3.7 Player bar (dưới cùng)
- **Trái:** bìa (click để mở Now Playing), tên bài, ca sĩ (link), ♥.
- **Giữa:** ⇄ ⏮ ▶/⏸ ⏭ 🔁 (đang bật thì icon xanh có chấm nhỏ bên dưới); thanh tua: hover thì thanh xanh và hiện núm tròn, kéo thì hiện thời gian.
- **Phải:** Now Playing, Lời bài hát, Hàng đợi, Hẹn giờ, Âm lượng (cuộn chuột để chỉnh, click để tắt tiếng), Toàn màn hình.

### 3.8 Panel Now Playing (phải)
- Ảnh bìa lớn, tên bài, ca sĩ, ♥.
- "Tiếp theo trong hàng đợi" (1 bài) + nút mở toàn bộ hàng đợi.
- Thông tin nghệ sĩ: số bài trong thư viện.

### 3.9 Hàng đợi (Queue)
- **Đang phát** / **Tiếp theo** (do người dùng thêm qua "Thêm vào hàng đợi") / **Tiếp theo từ: <playlist>**.
- Kéo-thả sắp xếp, xóa khỏi hàng đợi, xóa hết.

### 3.10 Lời bài hát (giai đoạn sau)
- Lấy lời có timestamp (LRCLIB, miễn phí) → tô sáng dòng đang hát, tự cuộn, click vào dòng để tua tới đó.

### 3.11 Chế độ toàn màn hình
- Ảnh bìa lớn ở giữa, nền mờ (blur) từ ảnh bìa, điều khiển tối giản. Phím `Esc` để thoát.

---

## 4. Trải nghiệm và hiệu ứng

- **Chuyển trang** fade/slide 150ms; ảnh có skeleton loading.
- **Phím tắt:** `Space` phát/dừng, `←/→` tua 5s, `Shift+←/→` bài trước/sau, `↑/↓` âm lượng, `M` tắt tiếng, `L` thích, `S` shuffle, `R` repeat, `/` hoặc `Ctrl+K` tìm kiếm.
- **Ghi nhớ trạng thái** (localStorage): bài đang nghe, vị trí phát, hàng đợi, âm lượng, shuffle/repeat, độ rộng sidebar. Mở lại app thì tiếp tục đúng chỗ cũ.
- **Crossfade** 0–12 giây giữa hai bài (tùy chọn trong Cài đặt), dùng Web Audio API.
- **Chuẩn hóa âm lượng** để các bài to/nhỏ khác nhau nghe đều tai.
- **Hẹn giờ tắt:** 5/15/30/45/60 phút hoặc "Hết bài này"; giảm âm lượng dần trong 10 giây trước khi dừng.
- **Toast** cho các thao tác (đã thích, đã thêm vào playlist, có nút Hoàn tác khi xóa).
- **PWA:** cài lên màn hình chính điện thoại/desktop, phát nền, điều khiển trên màn hình khóa (Media Session).

---

## 5. Thay đổi dữ liệu / API cần thêm

```js
// Track – thêm
{ album, liked, playCount, lastPlayedAt, color /* màu chủ đạo bìa */, lyrics? }

// Playlist – thêm
{ description, coverUrl /* tự ghép nếu trống */, pinned }
```

| API mới | Mục đích |
|---|---|
| `GET /api/youtube/preview?url=` | Lấy metadata trước khi tải (`yt-dlp -J`) |
| `POST /api/import` → trả `jobId`; `GET /api/import/:id/events` (SSE) | Tiến độ tải realtime, nhập hàng loạt |
| `POST /api/tracks/:id/play` | Tăng `playCount`, cập nhật `lastPlayedAt` (cho Nghe gần đây / Phổ biến) |
| `POST /api/tracks/:id/cover` | Upload ảnh bìa tùy chỉnh lên Cloudinary |
| `GET /api/artists`, `GET /api/albums` | Gom nhóm theo `artist` / `album` |
| `GET /api/lyrics/:id` | Proxy sang LRCLIB và lưu cache |
| Auth đơn giản (mật khẩu + JWT) | Bắt buộc trước khi deploy public |

Ảnh bìa dùng transform của Cloudinary để có đúng kích thước cần (`w_300,h_300,c_fill,f_auto,q_auto`), giúp nhẹ băng thông.

---

## 6. Cấu trúc frontend mới

```
web/  (Vite + Vue 3)
├─ src/
│  ├─ main.js, App.vue, router.js
│  ├─ stores/      player.js (audio, queue, shuffle, repeat, sleep) · library.js · ui.js
│  ├─ views/       Home · Search · Playlist · Liked · Artist · Album
│  ├─ components/
│  │  ├─ layout/   Sidebar · Topbar · PlayerBar · NowPlayingPanel · MobileNav · MiniPlayer · FullPlayer
│  │  ├─ media/    Card · TrackTable · TrackRow · CoverMosaic · PlayButton
│  │  └─ ui/       Icon · Slider · ContextMenu · Modal · Toast · Skeleton
│  ├─ composables/ useShortcuts · useDominantColor · useDragSort
│  └─ styles/      tokens.css · base.css
└─ public/         manifest.webmanifest · icons · sw.js
```

---

## 7. Lộ trình

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 0 | MVP: import YouTube, thư viện, playlist, player, Mongo + Cloudinary | ✅ Xong |
| 1 | Chuyển sang Vite + Router + Pinia; layout 3 cột, Sidebar, Player bar, design tokens, icon SVG | ✅ Xong |
| 2 | Trang Home, Playlist (header gradient, bảng bài hát, context menu), Bài hát đã thích, Tìm kiếm | ✅ Xong |
| 3 | Panel Now Playing, Hàng đợi, kéo-thả, phím tắt, ghi nhớ trạng thái, toast | ✅ Xong |
| 4 | Modal import (xem trước, playlist YouTube, tiến độ realtime), upload ảnh bìa, Nghệ sĩ/Album | ✅ Xong |
| 5 | Mobile: bottom nav, mini/full player, cử chỉ vuốt; PWA | ✅ Xong |
| 6 | Lời bài hát, crossfade, chuẩn hóa âm lượng, chế độ toàn màn hình | ✅ Xong |
| 7 | Đăng nhập (`APP_PASSWORD`) + `Dockerfile` | ✅ Code xong · ⏳ Chưa deploy |
| 8 | Giao diện v2 "Studio" (mục 8) | ✅ Xong (mục 1–2 của bảng thiết kế cũ ở trên là v1) |

### Ghi chú triển khai
- **Chuẩn hóa âm lượng** làm lúc import (ffmpeg `loudnorm`, -14 LUFS), không tốn CPU lúc phát. Bài import trước đó chưa được chuẩn hóa.
- **Tiêu đề YouTube** được tự làm sạch khi import (bỏ ♪, `(Official MV)`, `| Lyrics [Vietsub]`…). Bài cũ có thể sửa bằng ⋯ → *Sửa thông tin*.
- **Lời bài hát** lấy từ LRCLIB (miễn phí); kho lời nhạc Việt còn ít, không có thì hiện "Không tìm thấy lời".
- **Artist/Album** được gom ở client từ trường `artist`/`album` của bài hát (không cần API riêng).
- **Deploy:** `docker build -t my-music .` → Render/Koyeb (Docker), đặt biến môi trường như `server/.env`, nhớ đặt `APP_PASSWORD`.

---

## 8. Giao diện v2 – "Studio" (đã triển khai)

**Mục tiêu:** giữ đủ 100% chức năng của v1, nhưng bỏ bố cục kiểu Spotify (3 cột, sidebar thư viện, player bar ngang). Thay bằng một giao diện **lấy bài đang nghe làm trung tâm**: ít cột hơn, ít phải bấm hơn, mọi thao tác nằm gần tay.

### 8.1 Ý tưởng chính

| Spotify (v1) | Studio (v2) |
|---|---|
| Sidebar thư viện cố định bên trái | **Không có sidebar.** Thanh điều hướng mảnh phía trên + **Command bar** (`Ctrl+K`) làm mọi việc |
| Player bar ngang kín đáy màn hình | **Dock nổi** dạng viên thuốc ở giữa đáy, kéo lên thành **Stage** |
| Nền đen, chỉ một màu xanh nhấn | **Toàn app đổi màu theo ảnh bìa** (dynamic theme), có cả Sáng và Tối |
| Thanh tua mỏng | **Thanh tua dạng sóng âm (waveform)** của chính bài hát |
| Hàng đợi là danh sách dọc ở panel phải | **Băng chuyền** ngang trong Stage: bài trước ← đang phát → tiếp theo |
| Thêm nhạc qua modal | **Dán link ở bất cứ đâu** (`Ctrl+V`) → hiện thẻ xem trước ngay |
| Card vuông xếp hàng | **"Kệ"**: bìa xếp chồng, playlist có gáy màu như đĩa than |

### 8.2 Bố cục

**Desktop**
```
┌────────────────────────────────────────────────────────────┐
│ ◉ Studio   Nghe · Kệ · Khám phá     [ Ctrl+K  Tìm / dán link ] ⚙ │  ← Topbar 56px, kính mờ
├────────────────────────────────────────────────────────────┤
│                                                            │
│        Nội dung 1 cột, rộng tối đa 1200px, căn giữa          │
│                                                            │
│        ╭──────────────────────────────────────────╮        │
│        │ ▣ Tên bài · Ca sĩ  ⏮ ▶ ⏭  ∿∿∿∿∿∿∿∿  ♡  ⌃ │        │  ← Dock nổi
│        ╰──────────────────────────────────────────╯        │
└────────────────────────────────────────────────────────────┘
```
- Nội dung chiếm toàn bộ chiều ngang, không bị chia cột, dễ đọc hơn.
- Dock rộng khoảng 640px, bo tròn 28px, nền kính mờ màu theo ảnh bìa. Nhấn `⌃` hoặc kéo Dock lên để mở **Stage**.

**Stage** (phủ khoảng 85% màn hình, trượt từ dưới lên)
```
┌───────────────────────────────────────────────┐
│  ⌄                     Đang phát từ: Chill tối │
│   ┌─────────┐   Tên bài rất lớn               │
│   │  BÌA    │   Ca sĩ · Album                 │
│   │  LỚN    │   ♡  ＋Playlist  ⋯              │
│   └─────────┘                                 │
│   ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿  1:12 / 3:20        │  ← waveform, click/kéo để tua
│        ⇄    ⏮    ( ▶ )    ⏭    🔁    ⏾ 30'     │
│ ─────────────────────────────────────────────  │
│  [ Lời ]  [ Hàng đợi ]  [ Thông tin ]           │  ← tab
│  ◂ ▢ ▢ [▣ đang phát] ▢ ▢ ▢ ▢ ▸   (băng chuyền)   │
└───────────────────────────────────────────────┘
```

**Mobile**: Dock nằm trên thanh điều hướng 3 mục (Nghe · Kệ · Tìm). Stage mở toàn màn hình; vuốt Dock sang trái/phải để đổi bài, vuốt lên để mở Stage. Mọi nút chính nằm ở **1/3 dưới màn hình** để dễ bấm bằng ngón cái.

### 8.3 Các màn hình

1. **Nghe** (trang chủ):
   - **Hero "Tiếp tục nghe"**: một thẻ lớn ngang gồm bìa, tên bài và vị trí đang dừng, bấm là phát tiếp đúng chỗ cũ.
   - **Dải "Lối tắt"**: viên tròn nhỏ cho Đã thích và 6 playlist/album hay nghe nhất.
   - **Kệ** cuộn ngang: Mới thêm · Nghe nhiều · Nghệ sĩ · Album.
   - Lời chào theo giờ, đặt nhỏ bên cạnh hero chứ không chiếm cả dòng.
2. **Kệ** (thư viện, thay cho sidebar):
   - Segmented control: **Tất cả · Playlist · Album · Nghệ sĩ · Bài hát**.
   - Hai kiểu xem: **Lưới** (bìa lớn) hoặc **Danh sách** (gọn), lưu lại lựa chọn.
   - Ghim lên đầu: thẻ "Đã thích" và các playlist đã ghim.
   - **Chọn nhiều** (giữ `Shift`/`Ctrl` hoặc nhấn giữ trên mobile) rồi dùng thanh thao tác nổi: Phát · Thêm vào hàng đợi · Thêm vào playlist · Thích · Xóa.
3. **Chi tiết Playlist/Album/Nghệ sĩ**:
   - Header gọn, cao khoảng 240px: bìa bên trái, tên, số bài, nút ▶ và ⇄ to.
   - Nền dùng màu bìa nhạt dần xuống, không phải gradient tối như Spotify.
   - Danh sách bài dạng **dòng có khoảng thở**: bìa nhỏ, tên, ca sĩ, thời lượng. Album và ngày thêm chỉ hiện khi rê chuột, hoặc bật trong ⚙.
   - Kéo tay cầm `⋮⋮` để sắp xếp; vuốt trái trên mobile để lộ nút Xóa/Hàng đợi.
4. **Command bar** (`Ctrl+K` hoặc bấm ô trên topbar), một ô làm được tất cả:
   - Gõ chữ: kết quả tức thì nhóm theo Bài hát / Nghệ sĩ / Album / Playlist, dùng phím ↑↓ và Enter để phát.
   - Dán link YouTube: hiện ngay thẻ xem trước và nút **Tải về** (có chọn playlist đích).
   - Gõ lệnh: `>hẹn giờ 30`, `>trộn bài`, `>playlist mới Chill`, `>crossfade 5`…
   - Lịch sử tìm kiếm gần đây hiện sẵn khi ô còn trống.
   - Trang **Khám phá** là phiên bản toàn trang của Command bar, dành cho việc duyệt lâu.
5. **Stage** (thay cho Now Playing, Hàng đợi, Lời bài hát và Toàn màn hình):
   - Tab **Lời**: chạy theo thời gian bài hát, click dòng để tua.
   - Tab **Hàng đợi**: băng chuyền ngang cùng danh sách bên dưới, kéo-thả sắp xếp. Có 2 nhóm "Tiếp theo (bạn thêm)" và "Từ: <ngữ cảnh>".
   - Tab **Thông tin**: nghệ sĩ, lượt nghe, ngày thêm, nguồn YouTube, nút Sửa.
   - Phím `F` chuyển Stage sang **chế độ trình chiếu**: ẩn mọi thứ, chỉ còn bìa và lời, hợp khi bật lên TV.
6. **Tải nhạc**:
   - Không còn modal riêng: mọi thứ đi qua Command bar hoặc kéo-thả link vào cửa sổ.
   - Tiến độ hiện thành **vòng tròn nhỏ quanh icon ⬇ trên topbar**, bấm vào thì mở danh sách job.
   - Bài vừa tải xong "bay" vào Kệ bằng hiệu ứng nhẹ, kèm toast **Phát ngay**.

### 8.4 Ngôn ngữ thiết kế

- **Màu:** lấy 2 màu từ ảnh bìa (chủ đạo và nhấn) rồi sinh bảng màu theo kiểu Material You (`--tone-10 … --tone-95`). Toàn app chuyển màu mượt (0.6s) khi đổi bài.
  - Màu chữ luôn đạt độ tương phản ≥ 4.5:1: tự kiểm tra và điều chỉnh sáng/tối.
  - Có chế độ **Sáng / Tối / Theo hệ thống**, tùy chọn **"Màu cố định"** cho ai không thích đổi màu, và tôn trọng `prefers-reduced-motion`.
- **Hình khối:** bo góc lớn (thẻ 20px, Dock 28px, nút tròn), viền mảnh 1px trong suốt, nền kính mờ (`backdrop-filter`) cho Topbar/Dock/Stage. Không dùng đổ bóng nặng.
- **Chữ:** tiêu đề dùng `Unbounded` (cá tính, khác Spotify), nội dung dùng `Be Vietnam Pro`. Tiêu đề trang 40–56px, không dùng chữ khổng lồ 96px như v1.
- **Icon:** giữ bộ SVG hiện có, nét 1.75px, có bản đặc khi ở trạng thái bật.
- **Chuyển động:** dùng View Transitions API khi chuyển trang, để bìa "bay" từ thẻ sang header hoặc từ Dock lên Stage. Lò xo nhẹ (spring) cho Dock và Stage.

### 8.5 Đối chiếu chức năng (để không thiếu gì)

| Chức năng v1 | Vị trí trong v2 |
|---|---|
| Trang chủ, Nghe gần đây, Mới thêm, Nghệ sĩ, Album, Nghe nhiều | Trang **Nghe** (hero + kệ) |
| Sidebar thư viện, lọc, sắp xếp, ghim, thu gọn | Trang **Kệ** (segmented + sắp xếp + ghim) |
| Tạo/đổi tên/xóa playlist, mô tả | Kệ → `＋`, menu ⋯, lệnh `>playlist mới` |
| Thêm/bỏ/sắp xếp bài trong playlist, kéo vào playlist | Chi tiết playlist + chọn nhiều + kéo vào thẻ playlist trên Kệ |
| Gợi ý thêm bài vào playlist | Cuối trang playlist (giữ nguyên) |
| Thích / Bài hát đã thích | ♡ ở Dock, Stage, từng dòng; thẻ ghim trên Kệ |
| Tìm kiếm không dấu, kết quả hàng đầu, lịch sử | **Command bar** + trang **Khám phá** |
| Import YouTube (xem trước, playlist YT, sửa info, playlist đích) | Command bar / dán link / kéo-thả link |
| Tiến độ tải realtime, thử lại | Vòng tiến độ trên topbar → danh sách job |
| Sửa thông tin, đổi ảnh bìa, xóa có Hoàn tác | Menu ⋯ → sheet Sửa; toast Hoàn tác (giữ) |
| Player: play/pause/next/prev/tua/âm lượng | Dock (gọn) + Stage (đầy đủ, thanh tua waveform) |
| Shuffle, Repeat, Hẹn giờ tắt, Crossfade | Stage + lệnh trong Command bar; Crossfade ở ⚙ |
| Hàng đợi (phát tiếp theo, thêm, xóa, kéo-thả) | Stage → tab Hàng đợi |
| Lời bài hát đồng bộ | Stage → tab Lời; chế độ trình chiếu |
| Now Playing (thông tin nghệ sĩ) | Stage → tab Thông tin |
| Toàn màn hình | Chế độ trình chiếu của Stage (`F`) |
| Context menu chuột phải | Giữ nguyên, thêm mục "Chọn nhiều" |
| Phím tắt | Giữ nguyên, thêm `Ctrl+K`, `>` (lệnh), `Shift+click` (chọn nhiều) |
| Mobile mini/full player, cử chỉ vuốt, PWA | Dock + Stage toàn màn, vuốt trên Dock; PWA giữ |
| Đăng nhập, Cài đặt | Giữ; Cài đặt thêm Giao diện (Sáng/Tối, Màu cố định, cột hiển thị) |

### 8.6 Điểm mới cần thêm vào dữ liệu

- `track.peaks: number[]` (khoảng 200 giá trị 0–1) để vẽ waveform. Sinh lúc import bằng ffmpeg hoặc tính ở trình duyệt bằng Web Audio API rồi gửi lên lưu. Thêm script để tạo cho các bài cũ.
- `track.palette: { main, accent }`: màu tính sẵn từ ảnh bìa, khỏi phải tính lại mỗi lần mở.
- Không đổi API hiện có; chỉ cho `PATCH /api/tracks/:id` nhận thêm `peaks`, `palette`.

### 8.7 Kế hoạch triển khai

Giữ nguyên **stores** (`player`, `library`, `ui`), **composables** và **backend**. Chỉ thay lớp layout và views. Làm trên nhánh mới, có công tắc `?ui=v1` để so sánh hai bản trong lúc chuyển.

| Bước | Nội dung | File chính |
|---|---|---|
| 1 | Design tokens v2: thang màu động, theme Sáng/Tối, font Unbounded, bo góc, kính mờ | `styles/tokens-v2.css`, `composables/useTheme.js` |
| 2 | Khung mới: Topbar + vùng nội dung 1 cột + Dock nổi; bỏ Sidebar/RightPanel/PlayerBar | `layout/TopNav.vue`, `layout/Dock.vue`, `App.vue` |
| 3 | Stage: bìa lớn, waveform, điều khiển, 3 tab (Lời/Hàng đợi/Thông tin), chế độ trình chiếu | `layout/Stage.vue`, `media/Waveform.vue`, `media/QueueCarousel.vue` |
| 4 | Command bar: tìm kiếm, nhận link YouTube, lệnh `>`; trang Khám phá | `ui/CommandBar.vue`, `views/ExploreView.vue` |
| 5 | Trang Nghe (hero + lối tắt + kệ) và Kệ (segmented, lưới/danh sách, chọn nhiều) | `views/ListenView.vue`, `views/ShelfView.vue`, `media/SelectionBar.vue` |
| 6 | Chi tiết Playlist/Album/Nghệ sĩ kiểu mới, dòng bài hát mới, vuốt trên mobile | `views/DetailView.vue`, `media/TrackList.vue` |
| 7 | Waveform + palette: backend sinh `peaks`, script tạo cho bài cũ | `server/src/youtube.js`, `server/scripts/backfill.js` |
| 8 | Chuyển động (View Transitions, spring), reduced-motion, kiểm tra tương phản, test mobile | toàn bộ |
| 9 | Kiểm thử đối chiếu bảng 8.5, bỏ code v1 không dùng | — |

**Tiêu chí hoàn thành:**
- Mọi dòng ở bảng 8.5 thao tác được.
- Phát một bài từ trang chủ tốn ≤ 1 cú bấm, thêm nhạc từ link tốn ≤ 2 thao tác.
- Không có lỗi console, chạy tốt ở cả 390px và 1440px.

### 8.8 Ghi chú triển khai v2
- **Khung:** `App.vue` = `TopNav` + nội dung 1 cột + `Dock` + `Stage` (+ `MobileNav` trên mobile). Trang: `ListenView` (Nghe), `ShelfView` (Kệ), `ExploreView` (Khám phá), `CollectionView`, `ArtistView`. Link cũ `/search`, `/library` tự chuyển hướng.
- **Theme động:** `composables/useTheme.js` lấy màu bìa → bảng màu HSL cho Sáng/Tối, tự chỉnh màu nhấn đạt tương phản ≥ 4.5:1; token khai báo `@property` trong `styles/tokens.css` nên chuyển màu mượt 0.6s.
- **Waveform:** `composables/usePeaks.js` giải mã file trong trình duyệt khi bài được phát lần đầu, lưu `track.peaks` (200 giá trị) qua `PATCH /api/tracks/:id`; lần sau dùng luôn. Không cần script backfill: bài cũ tự có waveform khi được nghe.
- **Command bar** (`components/ui/CommandBar.vue`): tìm kiếm, nhận link YouTube (Enter = tải, "Tùy chỉnh…" mở `ImportModal` để chọn bài/sửa info), lệnh `>`. Dán `Ctrl+V` hoặc kéo-thả link vào cửa sổ cũng mở nó.
- **Chọn nhiều:** `TrackList` (Ctrl/Shift + bấm, nhấn giữ trên mobile) + `SelectionBar`.
- Không làm công tắc `?ui=v1` (tránh duy trì 2 bộ giao diện).

