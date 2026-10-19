<script setup>
// Context menu dùng chung (có submenu), tự giữ trong khung màn hình.
import { ref, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import Icon from './Icon.vue';
import { useUi } from '../../stores/ui.js';

const ui = useUi();
const el = ref(null);
const pos = ref({ left: 0, top: 0 });
const sub = ref(null); // { items, left, top }

watch(() => ui.menu, async (m) => {
  sub.value = null;
  if (!m) return;
  pos.value = { left: m.x, top: m.y };
  await nextTick();
  const r = el.value.getBoundingClientRect();
  pos.value = {
    left: Math.max(8, Math.min(m.x, innerWidth - r.width - 8)),
    top: Math.max(8, m.y + r.height > innerHeight - 8 ? m.y - r.height : m.y),
  };
});

function openSub(e, it) {
  if (!it.children) { sub.value = null; return; }
  const r = e.currentTarget.getBoundingClientRect();
  const w = 220, h = Math.min(it.children.length * 40 + 8, 360);
  sub.value = {
    items: it.children,
    left: r.right + w > innerWidth ? r.left - w : r.right,
    top: Math.max(8, Math.min(r.top - 4, innerHeight - h - 8)),
  };
}
function run(it) { if (it.children) return; ui.menu = null; it.fn?.(); }

const close = () => { ui.menu = null; };
onMounted(() => { addEventListener('pointerdown', onDown); addEventListener('resize', close); addEventListener('wheel', close, { passive: true }); });
onBeforeUnmount(() => { removeEventListener('pointerdown', onDown); removeEventListener('resize', close); removeEventListener('wheel', close); });
function onDown(e) { if (ui.menu && !e.target.closest('.ctx')) close(); }
</script>

<template>
  <template v-if="ui.menu">
    <ul ref="el" class="ctx" :style="{ left: pos.left + 'px', top: pos.top + 'px' }" role="menu" @contextmenu.prevent>
      <template v-for="(it, i) in ui.menu.items" :key="i">
        <li v-if="it.sep" class="sep" />
        <li v-else role="menuitem" :class="{ danger: it.danger }" @mouseenter="openSub($event, it)" @click="it.children ? openSub($event, it) : run(it)">
          <Icon v-if="it.icon" :name="it.icon" size="16" /><span class="ellipsis">{{ it.label }}</span>
          <Icon v-if="it.children" name="chevronRight" size="16" class="arrow" />
        </li>
      </template>
    </ul>
    <ul v-if="sub" class="ctx scroll sub" :style="{ left: sub.left + 'px', top: sub.top + 'px' }" role="menu">
      <template v-for="(it, i) in sub.items" :key="i">
        <li v-if="it.sep" class="sep" />
        <li v-else role="menuitem" @click="run(it)"><Icon v-if="it.icon" :name="it.icon" size="16" /><span class="ellipsis">{{ it.label }}</span></li>
      </template>
    </ul>
  </template>
</template>

<style scoped>
.ctx { position: fixed; z-index: 1000; min-width: 200px; max-width: 280px; margin: 0; padding: 6px; list-style: none; background: var(--glass-strong); backdrop-filter: blur(20px) saturate(1.4); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow-lg); animation: pop .18s var(--ease); }
@keyframes pop { from { opacity: 0; transform: scale(.97); } }
.sub { width: 220px; max-height: 360px; }
li { display: flex; align-items: center; gap: 12px; height: 38px; padding: 0 12px; border-radius: 10px; cursor: pointer; color: var(--text-2); font-size: 14px; }
li:hover { background: var(--hover); color: var(--text); }
li.danger:hover { color: var(--danger); }
li .arrow { margin-left: auto; }
li.sep { height: 1px; padding: 0; margin: 4px 6px; background: var(--line); pointer-events: none; }
</style>
