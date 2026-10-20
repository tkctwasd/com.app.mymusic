// Kéo-thả sắp xếp danh sách bằng HTML5 DnD. Dữ liệu kéo mang theo track id để thả vào playlist ở sidebar.
// Trên điện thoại HTML5 DnD không chạy: gắn handle(i) vào nút "grip" để kéo bằng cảm ứng.
import { ref } from 'vue';

export const DRAG_MIME = 'application/x-track-ids';
let gidSeq = 0;

export function useDragSort(onMove, { enabled = () => true } = {}) {
  const dragFrom = ref(-1);
  const overIndex = ref(-1);
  const gid = String(++gidSeq);

  // Tìm dòng (cùng danh sách) nằm dưới ngón tay
  const rowAt = (x, y) => document.elementFromPoint(x, y)?.closest(`[data-sort-g="${gid}"]`);

  const scrollParent = (el) => {
    for (; el && el !== document.body; el = el.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(el).overflowY) && el.scrollHeight > el.clientHeight) return el;
    }
    return document.scrollingElement;
  };

  return {
    dragFrom, overIndex, gid,
    bind(i, ids) {
      return {
        draggable: true,
        'data-sort-g': gid, 'data-sort-i': i,
        onDragstart(e) {
          dragFrom.value = i;
          e.dataTransfer.effectAllowed = 'copyMove';
          e.dataTransfer.setData(DRAG_MIME, JSON.stringify(ids));
          e.dataTransfer.setData('text/plain', String(i));
        },
        onDragover(e) {
          if (!enabled() || dragFrom.value < 0) return;
          e.preventDefault();
          overIndex.value = i;
        },
        onDrop(e) {
          if (!enabled() || dragFrom.value < 0) return;
          e.preventDefault();
          if (dragFrom.value !== i) onMove(dragFrom.value, i);
          dragFrom.value = overIndex.value = -1;
        },
        onDragend() { dragFrom.value = overIndex.value = -1; },
      };
    },
    // Kéo bằng cảm ứng qua tay nắm (cần CSS touch-action: none trên phần tử)
    handle(i) {
      return {
        onTouchstart(e) {
          if (!enabled()) return;
          e.stopPropagation();
          dragFrom.value = overIndex.value = i;
          navigator.vibrate?.(10);
        },
        onTouchmove(e) {
          if (dragFrom.value < 0) return;
          e.preventDefault(); e.stopPropagation();
          const t = e.touches[0];
          const row = rowAt(t.clientX, t.clientY);
          if (row) overIndex.value = +row.dataset.sortI;
          // Tự cuộn khi kéo sát mép màn hình
          const edge = 72, h = window.innerHeight;
          const dy = t.clientY < edge ? -8 : t.clientY > h - edge ? 8 : 0;
          if (dy) scrollParent(e.target)?.scrollBy(0, dy);
        },
        onTouchend(e) {
          if (dragFrom.value < 0) return;
          e.stopPropagation();
          const [a, b] = [dragFrom.value, overIndex.value];
          dragFrom.value = overIndex.value = -1;
          if (b >= 0 && a !== b) onMove(a, b);
        },
        onTouchcancel() { dragFrom.value = overIndex.value = -1; },
      };
    },
  };
}
