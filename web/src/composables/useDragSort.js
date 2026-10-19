// Kéo-thả sắp xếp danh sách bằng HTML5 DnD. Dữ liệu kéo mang theo track id để thả vào playlist ở sidebar.
import { ref } from 'vue';

export const DRAG_MIME = 'application/x-track-ids';

export function useDragSort(onMove, { enabled = () => true } = {}) {
  const dragFrom = ref(-1);
  const overIndex = ref(-1);

  return {
    dragFrom, overIndex,
    bind(i, ids) {
      return {
        draggable: true,
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
  };
}
