<script setup>
// Khung v2 "Studio": thanh trên kính mờ + nội dung 1 cột + Dock nổi + Stage; không sidebar.
// Dán (Ctrl+V) hoặc kéo-thả link YouTube vào bất kỳ đâu -> Command bar xem trước.
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import TopNav from './components/layout/TopNav.vue';
import Dock from './components/layout/Dock.vue';
import Stage from './components/layout/Stage.vue';
import JobsPanel from './components/layout/JobsPanel.vue';
import MobileNav from './components/layout/MobileNav.vue';
import SelectionBar from './components/media/SelectionBar.vue';
import CommandBar from './components/ui/CommandBar.vue';
import ContextMenu from './components/ui/ContextMenu.vue';
import Toasts from './components/ui/Toasts.vue';
import ImportModal from './components/modals/ImportModal.vue';
import EditTrackModal from './components/modals/EditTrackModal.vue';
import EditPlaylistModal from './components/modals/EditPlaylistModal.vue';
import SettingsModal from './components/modals/SettingsModal.vue';
import LoginView from './views/LoginView.vue';
import Icon from './components/ui/Icon.vue';
import AppLogo from './components/ui/AppLogo.vue';
import { api, auth } from './api.js';
import { useLibrary } from './stores/library.js';
import { usePlayer } from './stores/player.js';
import { useUi } from './stores/ui.js';
import { useShortcuts } from './composables/useShortcuts.js';
import { useTheme } from './composables/useTheme.js';
import { useFavicon } from './composables/useFavicon.js';
import { useAutoUpdate } from './composables/useAutoUpdate.js';

const lib = useLibrary(), player = usePlayer(), ui = useUi(), route = useRoute();
const state = ref('loading'); // loading | login | ready | error
const error = ref('');
const main = ref(null);
const modals = { import: ImportModal, editTrack: EditTrackModal, editPlaylist: EditPlaylistModal, settings: SettingsModal };
const YT = /https?:\/\/(www\.|m\.|music\.)?(youtube\.com|youtu\.be)\/\S+/;
const dropping = ref(false);
let es;

useShortcuts();
useTheme();
useFavicon();
useAutoUpdate();

async function boot() {
  state.value = 'loading';
  try {
    const { required } = await api('/api/auth');
    if (!required) auth.token = 'open';
    else if (!auth.token || auth.token === 'open') { state.value = 'login'; return; }
    await lib.load();
    player.init();
    es?.close();
    es = lib.listenJobs(auth.token);
    state.value = 'ready';
  } catch (e) {
    if (state.value !== 'login') { error.value = e.message; state.value = 'error'; }
  }
}

// Dán link YouTube ở bất cứ đâu (khi không gõ trong ô nhập)
function onPaste(e) {
  if (state.value !== 'ready' || ui.cmd || ui.modal) return;
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
  const m = (e.clipboardData?.getData('text') || '').match(YT);
  if (m) { e.preventDefault(); ui.openCmd(m[0]); }
}
// Kéo-thả link vào cửa sổ
let innerDrag = false; // kéo bắt đầu trong trang (thẻ, bài hát) thì bỏ qua
const onDragStart = () => { innerDrag = true; };
const onDragEnd = () => { innerDrag = false; };
const isLinkDrag = (e) => !innerDrag && [...(e.dataTransfer?.types || [])].includes('text/uri-list');
function onDragOver(e) { if (state.value === 'ready' && isLinkDrag(e)) { e.preventDefault(); dropping.value = true; } }
function onDrop(e) {
  innerDrag = false;
  if (!dropping.value) return;
  dropping.value = false;
  const m = (e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text') || '').match(YT);
  if (m) { e.preventDefault(); ui.openCmd(m[0]); } else ui.toast('Chỉ nhận link YouTube');
}

const onUnauthorized = () => { auth.token = ''; state.value = 'login'; };
const mq = window.matchMedia('(max-width: 767px)');
const onMq = () => { ui.isMobile = mq.matches; };
onMounted(() => {
  boot();
  addEventListener('unauthorized', onUnauthorized); addEventListener('paste', onPaste);
  addEventListener('dragover', onDragOver); addEventListener('drop', onDrop);
  addEventListener('dragstart', onDragStart); addEventListener('dragend', onDragEnd);
  mq.addEventListener('change', onMq);
});
onBeforeUnmount(() => {
  es?.close();
  removeEventListener('unauthorized', onUnauthorized); removeEventListener('paste', onPaste);
  removeEventListener('dragover', onDragOver); removeEventListener('drop', onDrop);
  removeEventListener('dragstart', onDragStart); removeEventListener('dragend', onDragEnd);
  mq.removeEventListener('change', onMq);
});

watch(() => route.fullPath, () => { ui.scrollY = 0; main.value?.scrollTo(0, 0); ui.clearSelection(); });
</script>

<template>
  <LoginView v-if="state === 'login'" @done="boot" />
  <div v-else-if="state === 'loading'" class="splash"><AppLogo :size="72" animated /></div>
  <div v-else-if="state === 'error'" class="splash">
    <p>Không kết nối được server: {{ error }}</p>
    <button class="btn btn-primary" @click="boot">Thử lại</button>
  </div>

  <div v-else class="app" :class="{ mobile: ui.isMobile, staged: ui.stage }">
    <div class="ambient" />
    <TopNav />
    <main ref="main" class="main scroll" @scroll="ui.scrollY = $event.target.scrollTop">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in"><component :is="Component" :key="route.fullPath" /></Transition>
      </RouterView>
    </main>
    <Dock />
    <MobileNav v-if="ui.isMobile" />
    <Stage />
  </div>

  <template v-if="state === 'ready'">
    <SelectionBar />
    <CommandBar v-if="ui.cmd" :key="ui.cmd.q" />
    <component :is="modals[ui.modal.name]" v-if="ui.modal" v-bind="ui.modal.props" />
    <JobsPanel />
    <ContextMenu />
    <Toasts />
    <div v-if="dropping" class="drop-hint" @dragleave.self="dropping = false"><div><Icon name="youtube" size="40" /><b>Thả link YouTube để tải về</b></div></div>
  </template>
</template>

<style>
.app { position: relative; height: 100%; isolation: isolate; }
/* Ánh màu dịu phía trên theo màu bìa bài đang phát */
.ambient { position: fixed; inset: 0; z-index: -1; pointer-events: none;
  background:
    radial-gradient(60% 50% at 15% -5%, color-mix(in oklab, var(--tint) 30%, transparent), transparent 70%),
    radial-gradient(50% 40% at 95% 0%, color-mix(in oklab, var(--accent) 12%, transparent), transparent 70%); }
.main { height: 100%; padding: var(--nav-h) 0 calc(var(--dock-h) + 56px); }
.app.mobile .main { padding: calc(56px + env(safe-area-inset-top)) 0 calc(var(--mnav-h) + 64px + 32px + env(safe-area-inset-bottom)); }
.app.staged .main { overflow: hidden; }
.splash { height: 100%; display: flex; flex-direction: column; gap: 16px; align-items: center; justify-content: center; background: var(--bg); }
.logo-spin { width: 40px; height: 40px; border: 3px solid var(--surface-3); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
.drop-hint { position: fixed; inset: 0; z-index: 950; display: grid; place-items: center; background: color-mix(in oklab, var(--bg) 70%, transparent); backdrop-filter: blur(8px); }
.drop-hint > div { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px 56px; border-radius: 28px; border: 2px dashed var(--accent); color: var(--accent); pointer-events: none; }
</style>
