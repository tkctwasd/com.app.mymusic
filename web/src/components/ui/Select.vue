<script setup>
// Ô chọn tùy biến (thay <select> gốc): nút + danh sách nổi kính mờ, có icon, dấu ✓, điều khiển bằng phím ↑↓ Enter Esc.
// Danh sách gắn vào body (không bị khung modal cắt), tự mở lên trên nếu phía dưới không đủ chỗ.
import { ref, computed, nextTick, onBeforeUnmount } from 'vue';
import Icon from './Icon.vue';

const props = defineProps({ modelValue: [String, Number], options: Array, placeholder: String }); // options: [{ value, label, icon?, sub? }]
const emit = defineEmits(['update:modelValue']);
const open = ref(false);
const up = ref(false);
const pos = ref({});
const hi = ref(0);
const root = ref(null), list = ref(null);
const cur = computed(() => props.options.find((o) => o.value === props.modelValue));

async function toggle() {
  if (open.value) return close();
  const r = root.value.getBoundingClientRect();
  up.value = innerHeight - r.bottom < 280 && r.top > innerHeight - r.bottom;
  pos.value = { left: r.left + 'px', width: r.width + 'px', ...(up.value ? { bottom: innerHeight - r.top + 8 + 'px' } : { top: r.bottom + 8 + 'px' }) };
  hi.value = Math.max(0, props.options.findIndex((o) => o.value === props.modelValue));
  open.value = true;
  addEventListener('pointerdown', outside, true);
  await nextTick();
  list.value?.children[hi.value]?.scrollIntoView({ block: 'nearest' });
}
function close() { open.value = false; removeEventListener('pointerdown', outside, true); }
function outside(e) { if (!root.value?.contains(e.target) && !list.value?.contains(e.target)) close(); }
function pick(o) { emit('update:modelValue', o.value); close(); }
function key(e) {
  if (!open.value) { if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopPropagation(); toggle(); } return; }
  e.stopPropagation();
  const n = props.options.length;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    hi.value = (hi.value + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
    list.value?.children[hi.value]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(props.options[hi.value]); }
  else if (e.key === 'Escape' || e.key === 'Tab') { if (e.key === 'Escape') e.preventDefault(); close(); }
}
onBeforeUnmount(close);
</script>

<template>
  <div ref="root" class="sel" :class="{ open }">
    <button type="button" class="trigger" :aria-expanded="open" aria-haspopup="listbox" @click="toggle" @keydown="key">
      <Icon v-if="cur?.icon" :name="cur.icon" size="17" class="ti" />
      <span class="ellipsis val" :class="{ ph: !cur }">{{ cur?.label || placeholder }}</span>
      <Icon name="chevronDown" size="18" class="chev" />
    </button>
    <Teleport to="body"><Transition name="drop">
      <ul v-if="open" ref="list" class="sel-menu scroll" :class="{ up }" :style="pos" role="listbox">
        <li v-for="(o, i) in options" :key="o.value" role="option" :aria-selected="o.value === modelValue"
          :class="{ hi: i === hi, on: o.value === modelValue }" @mousemove="hi = i" @click="pick(o)">
          <span class="ic"><Icon :name="o.icon || 'music'" size="16" /></span>
          <span class="tx"><span class="ellipsis">{{ o.label }}</span><small v-if="o.sub" class="ellipsis">{{ o.sub }}</small></span>
          <Icon v-if="o.value === modelValue" name="check" size="16" class="ok" />
        </li>
      </ul>
    </Transition></Teleport>
  </div>
</template>

<style scoped>
.sel { position: relative; }
.trigger { display: flex; align-items: center; gap: 10px; width: 100%; height: 46px; padding: 0 12px 0 14px; border-radius: 14px; border: 1px solid var(--line); background: var(--hover); text-align: left; transition: border-color .2s, background .2s, box-shadow .2s; }
.trigger:hover { border-color: var(--line-2); }
.open .trigger, .trigger:focus-visible { outline: none; border-color: var(--accent); background: var(--surface); box-shadow: 0 0 0 4px var(--accent-soft); }
.ti { color: var(--accent); }
.val { flex: 1; font-weight: 500; }
.val.ph { color: var(--text-3); font-weight: 400; }
.chev { color: var(--text-3); transition: transform .25s var(--spring); }
.open .chev { transform: rotate(180deg); color: var(--accent); }
.sel-menu { position: fixed; z-index: 1100; max-height: 264px; margin: 0; padding: 6px; list-style: none;
  border-radius: 18px; background: var(--glass-strong); backdrop-filter: blur(24px) saturate(1.5); border: 1px solid var(--line-2); box-shadow: var(--shadow-lg); transform-origin: top center; }
.sel-menu.up { transform-origin: bottom center; }
li { display: flex; align-items: center; gap: 12px; padding: 8px 10px; border-radius: 12px; cursor: pointer; color: var(--text-2); }
li.hi { background: var(--hover); color: var(--text); }
li.on { color: var(--text); }
.ic { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 10px; background: var(--hover); color: var(--text-3); flex-shrink: 0; transition: all .2s; }
li.on .ic, li.hi .ic { background: var(--accent-soft); color: var(--accent); }
.tx { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.tx small { font-size: 12px; color: var(--text-3); }
.ok { color: var(--accent); }
.drop-enter-active, .drop-leave-active { transition: opacity .18s, transform .25s var(--spring); }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: scale(.96) translateY(-4px); }
.up.drop-enter-from, .up.drop-leave-to { transform: scale(.96) translateY(4px); }
</style>
