// Trình phát: 2 thẻ <audio> luân phiên để crossfade; hàng đợi gồm "Tiếp theo" (người dùng thêm) + thứ tự của ngữ cảnh.
import { defineStore } from 'pinia';
import { useLibrary } from './library.js';
import { load, save, shuffleArr, img } from '../utils.js';
import { IS_IOS } from '../platform.js';
import { srcFor, isOffline, ensureBlob, offline } from '../offline.js';

const decks = [new Audio(), new Audio()];
decks.forEach((a) => { a.preload = 'auto'; });
let active = 0;
const cur = () => decks[active];
const other = () => decks[1 - active];
let fadeTimer = null;
let countedId = null;

const PERSIST = ['context', 'order', 'original', 'pos', 'upNext', 'currentId', 'time', 'volume', 'muted', 'shuffle', 'repeat', 'crossfade', 'sleep'];
// Vị trí cần tua tới khi bắt đầu phát (trình duyệt di động hay bỏ qua currentTime đặt lúc chưa phát)
let pendingSeek = 0;
let preloadedId = null, preloader = null, lastPosSync = 0;

export const usePlayer = defineStore('player', {
  state: () => ({
    context: null, // { name, path }
    order: [], original: [], pos: 0, upNext: [],
    currentId: null, playing: false, buffering: false,
    time: 0, duration: 0, volume: 0.8, muted: false,
    shuffle: false, repeat: 'off', // off | all | one
    crossfade: 0, // giây
    sleep: null, // { mode: 'min', endAt } | { mode: 'end' }
    sleepFade: 1, now: Date.now(),
    ...load('player', {}),
  }),
  getters: {
    track() { return useLibrary().byId[this.currentId] || null; },
    upcoming() {
      const lib = useLibrary();
      return {
        manual: this.upNext.map((id) => lib.byId[id]).filter(Boolean),
        context: this.order.slice(this.pos + 1).map((id) => lib.byId[id]).filter(Boolean),
      };
    },
    nextTrack() { const u = this.upcoming; return u.manual[0] || u.context[0] || (this.repeat === 'all' ? useLibrary().byId[this.order[0]] : null); },
    sleepLeft(s) { return s.sleep?.mode === 'min' ? Math.max(0, (s.sleep.endAt - s.now) / 1000) : 0; },
  },
  actions: {
    init() {
      decks.forEach((a, i) => {
        a.ontimeupdate = () => { if (i === active) { this.time = a.currentTime; this.checkCrossfade(); this.tickSleep(); this.preloadNext(); this.syncPosition(); } };
        a.ondurationchange = () => { if (i === active) this.duration = a.duration || this.track?.duration || 0; };
        a.onplay = () => { if (i === active) { this.playing = true; this.applyPendingSeek(); } };
        a.onpause = () => { if (i === active && !fadeTimer) this.playing = false; };
        a.onwaiting = () => { if (i === active) this.buffering = true; };
        a.onplaying = () => { if (i === active) { this.buffering = false; this.applyPendingSeek(); } };
        a.onended = () => { if (i === active) this.onEnded(); };
        a.onerror = () => { if (i === active && a.src) { this.buffering = false; this.recoverOffline(); } };
      });
      // Hẹn giờ đã hết hạn khi mở lại app thì bỏ
      if (this.sleep?.mode === 'min' && this.sleep.endAt <= Date.now()) this.sleep = null;
      this.applyVolume();
      // Khôi phục bài đang nghe dở (không tự phát)
      if (this.track) this.loadTrack(this.track, { autoplay: false, startAt: this.time });
      this.setupMediaSession();
      setInterval(() => { this.now = Date.now(); this.tickSleep(); }, 500);
      setInterval(() => this.persist(), 3000);
      // Di động thường không bắn beforeunload khi thoát app -> lưu cả khi ẩn trang
      window.addEventListener('beforeunload', () => this.persist());
      window.addEventListener('pagehide', () => this.persist());
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.persist(); else this.tickSleep(); });
      // Có mạng lại: nếu đang phát mà bị kẹt chờ tải (mất mạng giữa bài) thì nạp lại đúng vị trí và phát tiếp
      window.addEventListener('online', () => {
        const t = this.track;
        if (t && this.playing && (this.buffering || cur().error)) this.loadTrack(t, { autoplay: true, startAt: this.time });
      });
    },
    // Còn ~20s thì nạp trước bài kế tiếp (vào cache HTTP của trình duyệt) để chuyển bài không bị khựng chờ tải
    preloadNext() {
      const a = cur();
      if (!a.duration || a.duration - a.currentTime > 20 || this.repeat === 'one') return;
      const n = this.nextTrack;
      if (!n || preloadedId === n.id || offline.blobs[n.id] || isOffline(n.id)) return;
      preloadedId = n.id;
      const p = new Audio(); p.preload = 'auto'; p.muted = true; p.src = n.fileUrl; p.load();
      preloader = p; // giữ tham chiếu để trình duyệt không hủy giữa chừng
    },
    // Thanh tiến độ trên màn hình khóa / Control Center (gọi tối đa ~1 lần/giây)
    syncPosition() {
      const ms = navigator.mediaSession;
      if (!ms?.setPositionState) return;
      const now = Date.now();
      if (now - lastPosSync < 1000) return;
      lastPosSync = now;
      const a = cur(), d = a.duration;
      if (!(d > 0) || !isFinite(d)) return;
      try { ms.setPositionState({ duration: d, position: Math.min(a.currentTime, d), playbackRate: a.playbackRate || 1 }); } catch {}
    },
    persist() { save('player', Object.fromEntries(PERSIST.map((k) => [k, this[k]]))); },

    // ---- Phát ----
    playTracks(tracks, index = 0, context = null) {
      const ids = tracks.map((t) => t.id);
      this.context = context;
      this.original = ids;
      if (this.shuffle) {
        const first = ids[index];
        this.order = [first, ...shuffleArr(ids.filter((_, i) => i !== index))];
        this.pos = 0;
      } else { this.order = ids; this.pos = index; }
      this.playId(this.order[this.pos]);
    },
    playId(id, opts) {
      const t = useLibrary().byId[id];
      if (!t) return;
      this.loadTrack(t, { autoplay: true, ...opts });
    },
    loadTrack(t, { autoplay = true, startAt = 0 } = {}) {
      this.stopFade();
      // Đổi sang bài khác thì bỏ chế độ lặp một bài (lặp chỉ áp dụng cho bài đang nghe)
      if (this.repeat === 'one' && this.currentId && this.currentId !== t.id) this.repeat = 'off';
      this.currentId = t.id;
      const a = cur();
      other().pause();
      this.time = startAt; this.duration = t.duration || 0;
      pendingSeek = startAt;
      const go = () => {
        if (this.currentId !== t.id) return;
        const src = srcFor(t);
        if (a.src !== new URL(src, location.href).href) a.src = src;
        const seek = () => { if (startAt) a.currentTime = startAt; };
        a.readyState >= 1 ? seek() : a.addEventListener('loadedmetadata', seek, { once: true });
        this.applyVolume();
        if (autoplay) { a.play().catch(() => {}); this.countPlay(t); }
      };
      // Đang mất mạng mà bài đã tải nhưng chưa có blob: tạo blob trước rồi mới phát
      if (!navigator.onLine && isOffline(t.id) && !offline.blobs[t.id]) ensureBlob(t).then(go); else go();
      if (preloadedId === t.id) { preloader = null; preloadedId = null; }
      lastPosSync = 0;
      this.updateMediaSession();
    },
    // Phát lỗi (thường do mất mạng) mà bài đã tải offline: phát lại từ bản đã tải, giữ vị trí
    recoverOffline() {
      const t = this.track;
      if (!t || !isOffline(t.id) || offline.blobs[t.id]) return;
      ensureBlob(t).then((u) => { if (u) this.loadTrack(t, { autoplay: true, startAt: this.time }); });
    },
    countPlay(t) { if (countedId !== t.id) { countedId = t.id; useLibrary().markPlayed(t); } },
    toggle() {
      const a = cur();
      if (!this.track) { const lib = useLibrary(); return lib.tracks.length && this.playTracks(lib.tracks, 0, { name: 'Bài hát', path: '/songs' }); }
      if (a.paused) {
        // Phần tử audio bị trình duyệt nạp lại (thoát app/ngủ máy) -> tua về đúng chỗ đang hiển thị
        if (Math.abs(a.currentTime - this.time) > 1.5) pendingSeek = this.time;
        a.play().catch(() => {}); this.countPlay(this.track);
      } else { a.pause(); this.time = a.currentTime; }
    },
    isCurrent(t, path) { return this.currentId === t?.id && (!path || this.context?.path === path); },
    // Phát / dừng cả một ngữ cảnh (playlist, album...)
    toggleContext(tracks, context) {
      if (this.context?.path === context.path && this.track) return this.toggle();
      if (tracks.length) this.playTracks(tracks, 0, context);
    },

    // Xác định bài tiếp theo và tiến con trỏ
    advance() {
      if (this.upNext.length) return this.upNext.shift();
      if (this.pos + 1 < this.order.length) return this.order[++this.pos];
      if (this.repeat === 'all' && this.order.length) {
        if (this.shuffle) this.order = shuffleArr(this.original);
        this.pos = 0; return this.order[0];
      }
      return null;
    },
    next() {
      const id = this.advance();
      if (id) this.playId(id); else if (this.order.length) { this.pos = 0; this.playId(this.order[0], { autoplay: false }); cur().pause(); }
    },
    prev() {
      if (cur().currentTime > 3 || this.pos === 0) { cur().currentTime = 0; return; }
      this.playId(this.order[--this.pos]);
    },
    onEnded() {
      if (this.sleep?.mode === 'end') { this.sleep = null; this.playing = false; return; }
      if (this.repeat === 'one') { cur().currentTime = 0; cur().play(); return; }
      const id = this.advance();
      if (id) this.playId(id); else this.playing = false;
    },
    seek(t) { pendingSeek = 0; cur().currentTime = t; this.time = t; },
    applyPendingSeek() {
      const a = cur(), t = pendingSeek;
      if (!t) return;
      if (a.readyState < 1) return; // chờ loadedmetadata/playing
      pendingSeek = 0;
      if (Math.abs(a.currentTime - t) > 1) { a.currentTime = t; this.time = t; }
    },
    skip(sec) { this.seek(Math.max(0, Math.min(this.duration, cur().currentTime + sec))); },

    // ---- Crossfade ----
    checkCrossfade() {
      const a = cur();
      // Trên iOS không đổi được âm lượng bằng code nên không crossfade (chuyển bài thẳng)
      if (!this.crossfade || IS_IOS || fadeTimer || this.repeat === 'one' || this.sleep?.mode === 'end' || a.paused) return;
      const left = (a.duration || 0) - a.currentTime;
      if (!(left > 0 && left <= this.crossfade)) return;
      const id = this.advance();
      const t = useLibrary().byId[id];
      if (!t) return;
      const from = a, to = other();
      to.src = srcFor(t); to.currentTime = 0; to.volume = 0;
      to.play().catch(() => {});
      active = 1 - active;
      this.currentId = t.id; this.time = 0; this.duration = t.duration;
      this.countPlay(t); this.updateMediaSession();
      const steps = Math.max(1, Math.round((left * 1000) / 50));
      let i = 0;
      fadeTimer = setInterval(() => {
        const k = ++i / steps;
        const base = this.muted ? 0 : this.volume * this.sleepFade;
        to.volume = base * Math.min(1, k); from.volume = base * Math.max(0, 1 - k);
        if (k >= 1) { from.pause(); this.stopFade(); }
      }, 50);
    },
    stopFade() { if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; other().pause(); this.applyVolume(); } },

    // ---- Âm lượng ----
    applyVolume() { cur().volume = this.muted ? 0 : Math.min(1, this.volume * this.sleepFade); },
    setVolume(v) { this.volume = Math.max(0, Math.min(1, v)); this.muted = this.volume === 0; this.applyVolume(); },
    toggleMute() { this.muted = !this.muted; if (!this.muted && !this.volume) this.volume = 0.5; this.applyVolume(); },

    // ---- Chế độ ----
    toggleShuffle() {
      this.shuffle = !this.shuffle;
      if (!this.original.length) return;
      if (this.shuffle) {
        this.order = [this.currentId, ...shuffleArr(this.original.filter((id) => id !== this.currentId))];
        this.pos = 0;
      } else {
        this.order = [...this.original];
        this.pos = Math.max(0, this.order.indexOf(this.currentId));
      }
    },
    cycleRepeat() { this.repeat = { off: 'all', all: 'one', one: 'off' }[this.repeat]; },

    // ---- Hàng đợi ----
    addToQueue(ids) { this.upNext.push(...[].concat(ids)); },
    playNext(ids) { this.upNext.unshift(...[].concat(ids)); },
    removeManual(i) { this.upNext.splice(i, 1); },
    removeContext(i) { this.order.splice(this.pos + 1 + i, 1); },
    moveManual(from, to) { this.upNext.splice(to, 0, this.upNext.splice(from, 1)[0]); },
    moveContext(from, to) { const b = this.pos + 1; this.order.splice(b + to, 0, this.order.splice(b + from, 1)[0]); },
    jumpManual(i) { const id = this.upNext.splice(0, i + 1).pop(); this.playId(id); },
    jumpContext(i) { this.pos += i + 1; this.playId(this.order[this.pos]); },
    clearQueue() { this.upNext = []; this.order = this.order.slice(0, this.pos + 1); },

    // ---- Hẹn giờ tắt (giảm âm 10s cuối) ----
    setSleep(v) {
      this.sleepFade = 1; this.applyVolume();
      this.sleep = v === 'end' ? { mode: 'end' } : v ? { mode: 'min', endAt: Date.now() + v * 60000 } : null;
      this.persist();
    },
    tickSleep() {
      if (this.sleep?.mode !== 'min') return;
      const left = (this.sleep.endAt - Date.now()) / 1000;
      if (left <= 0) { this.stopFade(); cur().pause(); this.sleep = null; this.sleepFade = 1; this.applyVolume(); this.persist(); return; }
      if (left <= 10) { this.sleepFade = left / 10; this.applyVolume(); }
    },

    // ---- Media Session (màn hình khóa, phím media, phát nền) ----
    setupMediaSession() {
      if (!('mediaSession' in navigator)) return;
      const ms = navigator.mediaSession;
      const h = {
        play: () => this.toggle(), pause: () => cur().pause(),
        previoustrack: () => this.prev(), nexttrack: () => this.next(),
        seekbackward: () => this.skip(-10), seekforward: () => this.skip(10),
        seekto: (d) => this.seek(d.seekTime),
        stop: () => { cur().pause(); },
      };
      for (const [k, fn] of Object.entries(h)) { try { ms.setActionHandler(k, fn); } catch {} }
    },
    updateMediaSession() {
      const t = this.track;
      if (!t || !('mediaSession' in navigator)) return;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.title, artist: t.artist, album: t.album || '',
        artwork: t.coverUrl ? [256, 512].map((s) => ({ src: img(t.coverUrl, s), sizes: `${s}x${s}`, type: 'image/jpeg' })) : [],
      });
      document.title = `${t.title} • ${t.artist}`;
    },
  },
});
