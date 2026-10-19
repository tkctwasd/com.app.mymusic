// Lớp DB: có MONGODB_URI -> MongoDB (Atlas), không có -> file JSON local. Cả hai cùng interface async.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { MongoClient } from 'mongodb';

function jsonRepos() {
  const FILE = path.resolve('data/db.json');
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const state = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { tracks: [], playlists: [] };
  const save = () => fs.writeFileSync(FILE, JSON.stringify(state, null, 2));

  const repo = (name) => {
    const list = () => state[name];
    return {
      async all() { return [...list()].sort((a, b) => b.createdAt - a.createdAt); },
      async get(id) { return list().find((x) => x.id === id) || null; },
      async create(data) {
        const doc = { id: crypto.randomUUID(), createdAt: Date.now(), ...data };
        list().push(doc); save(); return doc;
      },
      async update(id, patch) {
        const doc = list().find((x) => x.id === id);
        if (!doc) return null;
        Object.assign(doc, patch, { id }); save(); return doc;
      },
      async remove(id) {
        const i = list().findIndex((x) => x.id === id);
        if (i < 0) return null;
        const [doc] = list().splice(i, 1); save(); return doc;
      },
      async pullFromAll(field, value) {
        for (const d of list()) if (d[field]?.includes(value)) d[field] = d[field].filter((x) => x !== value);
        save();
      },
    };
  };
  return { tracks: repo('tracks'), playlists: repo('playlists') };
}

async function mongoRepos(uri) {
  const client = new MongoClient(uri);
  try { await client.connect(); } catch (e) {
    // Lỗi SSL "alert number 80" thường là do Atlas chưa cho phép IP của server (Network Access)
    console.error('Không kết nối được MongoDB:', e.message,
      '\n-> Kiểm tra MongoDB Atlas > Network Access đã thêm 0.0.0.0/0 (hoặc IP của server) và MONGODB_URI đúng.');
    throw e;
  }
  const db = client.db(process.env.MONGODB_DB || 'music');
  // Dùng field `id` (UUID string) thay _id để API giống hệt bản JSON
  const strip = (d) => { if (d) delete d._id; return d; };

  const repo = (name) => {
    const col = db.collection(name);
    col.createIndex({ id: 1 }, { unique: true });
    return {
      async all() { return (await col.find().sort({ createdAt: -1 }).toArray()).map(strip); },
      async get(id) { return strip(await col.findOne({ id })); },
      async create(data) {
        const doc = { id: crypto.randomUUID(), createdAt: Date.now(), ...data };
        await col.insertOne(doc); return strip(doc);
      },
      async update(id, patch) {
        return strip(await col.findOneAndUpdate({ id }, { $set: patch }, { returnDocument: 'after' }));
      },
      async remove(id) { return strip(await col.findOneAndDelete({ id })); },
      async pullFromAll(field, value) { await col.updateMany({ [field]: value }, { $pull: { [field]: value } }); },
    };
  };
  console.log('DB: MongoDB');
  return { tracks: repo('tracks'), playlists: repo('playlists') };
}

const repos = process.env.MONGODB_URI ? await mongoRepos(process.env.MONGODB_URI) : (console.log('DB: JSON local'), jsonRepos());
export const Tracks = repos.tracks;
export const Playlists = repos.playlists;
