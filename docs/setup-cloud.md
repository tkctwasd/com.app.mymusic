# Cài đặt MongoDB Atlas + Cloudinary (miễn phí, không cần thẻ)

Server tự chọn backend theo biến môi trường trong `server/.env` (copy từ `.env.example`):
- Không điền gì → JSON local (`data/`) + file local (`media/`).
- Có `MONGODB_URI` → MongoDB. Có `CLOUDINARY_URL` → Cloudinary. Bật riêng từng cái được.

Khi chạy, log sẽ in ra `DB: ...` và `Storage: ...` để biết đang dùng gì.

---

## 1. MongoDB Atlas (gói M0 free, 512MB)

1. Đăng ký tại https://www.mongodb.com/cloud/atlas/register
2. **Create cluster** → chọn **M0 Free**, provider/region gần VN (vd AWS Singapore `ap-southeast-1`).
3. **Database Access** → *Add New Database User* → tạo username + password (chỉ dùng chữ và số cho dễ, tránh `@ : /`).
4. **Network Access** → *Add IP Address*:
   - Chạy ở máy nhà: *Add Current IP Address*.
   - Deploy lên Render/Koyeb (IP thay đổi): thêm `0.0.0.0/0`.
5. **Database → Connect → Drivers** → copy connection string, dạng:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Dán vào `.env`:
   ```
   MONGODB_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB=music
   ```
Collection `tracks` và `playlists` sẽ được tạo tự động lúc ghi dữ liệu lần đầu.

---

## 2. Cloudinary (free 25 credit/tháng, không cần thẻ)

1 credit ≈ 1GB lưu trữ **hoặc** 1GB băng thông **hoặc** 1000 lần biến đổi ảnh. Một bài MP3 320kbps dài 4 phút nặng khoảng 10MB.

1. Đăng ký tại https://cloudinary.com/users/register_free (chọn gói **Free**).
2. Vào **Dashboard** (hoặc *Settings → API Keys*) → copy dòng **API environment variable**, dạng:
   ```
   CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
   ```
   (Nếu `<api_secret>` đang bị che thì bấm vào biểu tượng con mắt để hiện ra rồi mới copy.)
3. Dán vào `.env`:
   ```
   CLOUDINARY_URL=cloudinary://123456789:abcDEF...@ten-cloud
   CLOUDINARY_FOLDER=music-app
   ```

Không cần tạo folder hay chỉnh gì thêm: file upload lên sẽ public sẵn và có CDN. Trên Cloudinary, audio nằm trong nhóm **Video**, ảnh bìa nằm trong nhóm **Image**.

Theo dõi mức đã dùng ở *Dashboard → Usage*.

---

## 3. Kiểm tra

```bash
cd server
npm start
# log mong đợi:
# DB: MongoDB
# Storage: Cloudinary
```
Mở http://localhost:3000, import một link YouTube:
- Trong Atlas → *Browse Collections* → `music.tracks` sẽ có bản ghi mới.
- Trong Cloudinary *Media Library* sẽ có `music-app/audio/<id>` và `music-app/cover/<id>`.
- `fileUrl` của bài hát sẽ có dạng `https://res.cloudinary.com/...`.

## Lưu ý
- Không commit file `.env` (đã có trong `.gitignore`).
- Dữ liệu cũ đang ở JSON/local **không tự chuyển** sang Mongo/Cloudinary. Muốn chuyển thì cần chạy một script migrate.
- yt-dlp thường bị YouTube chặn khi chạy trên IP datacenter. Nên chạy phần import ở máy nhà (đã kết nối Mongo + Cloudinary); bản deploy trên web chỉ dùng để phát nhạc.
