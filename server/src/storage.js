// Storage adapter: có CLOUDINARY_URL -> Cloudinary, không có -> thư mục /media local.
// put(localFile, key) trả về public URL; remove(url) xóa file tương ứng.
import fs from 'node:fs';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';

const ROOT = path.resolve('media');

const local = {
  root: ROOT,
  async put(localFile, key) {
    const dest = path.join(ROOT, key);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(localFile, dest); // copy vì temp có thể khác ổ đĩa
    return `/media/${key}`;
  },
  async remove(url) {
    if (!url?.startsWith('/media/')) return;
    fs.rmSync(path.join(ROOT, url.slice(7)), { force: true });
  },
};

function cloud() {
  // SDK tự đọc CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
  cloudinary.config({ secure: true });
  const folder = process.env.CLOUDINARY_FOLDER || 'music-app';
  // Cloudinary xếp audio vào resource_type "video"
  const typeOf = (key) => (key.endsWith('.mp3') ? 'video' : 'image');
  console.log('Storage: Cloudinary');
  return {
    root: ROOT, // vẫn serve /media cho file cũ (nếu có)
    async put(localFile, key) {
      const r = await cloudinary.uploader.upload(localFile, {
        resource_type: typeOf(key),
        public_id: `${folder}/${key.replace(/\.[^.]+$/, '')}`,
        overwrite: true,
      });
      return r.secure_url;
    },
    async remove(url) {
      if (url?.startsWith('/media/')) return local.remove(url);
      // https://res.cloudinary.com/<cloud>/<type>/upload/v123/<public_id>.<ext>
      const m = url?.match(/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
      if (m) await cloudinary.uploader.destroy(m[2], { resource_type: m[1], invalidate: true });
    },
  };
}

export const storage = process.env.CLOUDINARY_URL ? cloud() : (console.log('Storage: local'), local);
