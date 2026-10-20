// Kéo-thả sắp xếp danh sách: chuột dùng HTML5 DnD (dữ liệu kéo mang track id để thả vào playlist ở sidebar),
// điện thoại dùng handle(i) gắn vào nút "grip". Trong lúc kéo các dòng khác dạt ra liên tục (styleOf), dòng đang kéo đi theo ngón tay.
import { ref } from 'vue';

export const DRAG_MIME = 'application/x-track-ids';
let gidSeq = 0;

export function useDragSort(onMove, { enabled = () => true } = {}) {
  const dragFrom = ref(-1);
  const overIndex = ref(-1);
  const dy = ref(0); // độ lệch dọc của dòng đang kéo (chỉ cảm ứng; chuột đã có ảnh kéo của trình duyệt)
  const touching = ref(false);
  const gid = String(++gidSeq);
  let startY = 0, rowH = 60, count = 0, scroller = null, startScroll = 0;

  const scrollParent = (el) => {
    for (; el && el !== document.body; el = el.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight) return el;
    }
    return document.scrollingElement;
  };
  // Đo chiều cao 1 dòng (kể cả khoảng cách) và số dòng của danh sách
  function measure(el) {
    const rows = [...document.querySelectorAll(`[data-sort-g="${gid}"]`)];
    count = rows.length;
    const a = rows[0]?.getBoundingClientRect(), b = rows[1]?.getBoundingClientRect();
    rowH = a && b ? b.top - a.top : el.getBoundingClientRect().height;
    scroller = scrollParent(el); startScroll = scroller?.scrollTop || 0;
  }
  // Vị trí đích tính theo quãng kéo -> không bị nhảy qua lại khi các dòng đang dạt ra
  function track(clientY) {
    const d = clientY - startY + ((scroller?.scrollTop || 0) - startScroll);
    dy.value = d;
    overIndex.value = Math.max(0, Math.min(count - 1, dragFrom.value + Math.round(d / rowH)));
  }
  function finish() {
    const [a, b] = [dragFrom.value, overIndex.value];
    dragFrom.value = overIndex.value = -1; dy.value = 0; touching.value = false;
    if (a >= 0 && b >= 0 && a !== b) onMove(a, b);
  }
  const reset = () => { dragFrom.value = overIndex.value = -1; dy.value = 0; touching.value = false; };

  return {
    dragFrom, overIndex, gid,
    // Style cho từng dòng trong lúc kéo
    styleOf(i) {
      const f = dragFrom.value, o = overIndex.value;
      if (f < 0 || o < 0) return {};
      if (i === f) {
        return touching.value
          ? { transform: `translateY(${dy.value}px) scale(1.02)`, zIndex: 5, position: 'relative', transition: 'none', boxShadow: '0 10px 28px rgb(0 0 0 / .3)', background: 'var(--surface-3)' }
          : { opacity: 0.35 };
      }
      const shift = f < o && i > f && i <= o ? -rowH : f > o && i >= o && i < f ? rowH : 0;
      return { transform: shift ? `translateY(${shift}px)` : '', transition: 'transform .22s cubic-bezier(.2, .8, .2, 1)' };
    },
    bind(i, ids) {
      return {
        draggable: true,
        'data-sort-g': gid, 'data-sort-i': i,
        onDragstart(e) {
          dragFrom.value = overIndex.value = i;
          startY = e.clientY; measure(e.currentTarget);
          e.dataTransfer.effectAllowed = 'copyMove';
          e.dataTransfer.setData(DRAG_MIME, JSON.stringify(ids));
          e.dataTransfer.setData('text/plain', String(i));
        },
        onDragover(e) {
          if (!enabled() || dragFrom.value < 0) return;
          e.preventDefault();
          track(e.clientY);
        },
        onDrop(e) {
          if (!enabled() || dragFrom.value < 0) return;
          e.preventDefault();
          finish();
        },
        onDragend: reset,
      };
    },
    // Kéo bằng cảm ứng qua tay nắm (cần CSS touch-action: none trên phần tử)
    handle(i) {
      return {
        onTouchstart(e) {
          if (!enabled()) return;
          e.stopPropagation();
          dragFrom.value = overIndex.value = i; touching.value = true;
          startY = e.touches[0].clientY; measure(e.currentTarget.closest(`[data-sort-g="${gid}"]`) || e.currentTarget);
          navigator.vibrate?.(10);
        },
        onTouchmove(e) {
          if (dragFrom.value < 0) return;
          e.preventDefault(); e.stopPropagation();
          const y = e.touches[0].clientY;
          // Tự cuộn khi kéo sát mép màn hình
          const edge = 72, h = window.innerHeight;
          const sy = y < edge ? -8 : y > h - edge ? 8 : 0;
          if (sy) scroller?.scrollBy(0, sy);
          track(y);
        },
        onTouchend(e) {
          if (dragFrom.value < 0) return;
          e.stopPropagation();
          finish();
        },
        onTouchcancel: reset,
      };
    },
  };
}
