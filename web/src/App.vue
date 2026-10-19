<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import Sidebar from './components/layout/Sidebar.vue';
import Topbar from './components/layout/Topbar.vue';
import PlayerBar from './components/layout/PlayerBar.vue';
import RightPanel from './components/layout/RightPanel.vue';
import JobsPanel from './components/layout/JobsPanel.vue';
import FullscreenView from './components/layout/FullscreenView.vue';
import MobileNav from './components/layout/MobileNav.vue';
import MiniPlayer from './components/layout/MiniPlayer.vue';
import FullPlayer from './components/layout/FullPlayer.vue';
import ContextMenu from './components/ui/ContextMenu.vue';
import Toasts from './components/ui/Toasts.vue';
import ImportModal from './components/modals/ImportModal.vue';
import EditTrackModal from './components/modals/EditTrackModal.vue';
import EditPlaylistModal from './components/modals/EditPlaylistModal.vue';
import SettingsModal from './components/modals/SettingsModal.vue';
import LoginView from './views/LoginView.vue';
import { api, auth } from './api.js';
import { useLibrary } from './stores/library.js';
import { usePlayer } from './stores/player.js';
import { useUi } from './stores/ui.js';
import { useShortcuts } from './composables/useShortcuts.js';

const lib = useLibrary(), player = usePlayer(), ui = useUi(), route = useRoute();
const state = ref('loading'); // loading | login | ready | error
const error = ref('');
const main = ref(null);
const modals = { import: ImportModal, editTrack: EditTrackModal, editPlaylist: EditPlaylistModal, settings: SettingsModal };
let es;

useShortcuts();

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

const onUnauthorized = () => { auth.token = ''; state.value = 'login'; };
const mq = window.matchMedia('(max-width: 767px)');
const onMq = () => { ui.isMobile = mq.matches; };
onMounted(() => { boot(); addEventListener('unauthorized', onUnauthorized); mq.addEventListener('change', onMq); });
onBeforeUnmount(() => { es?.close(); removeEventListener('unauthorized', onUnauthorized); mq.removeEventListener('change', onMq); });

watch(() => route.fullPath, () => { ui.scrollY = 0; main.value?.scrollTo(0, 0); });
</script>

<template>
  <LoginView v-if="state === 'login'" @done="boot" />
  <div v-else-if="state === 'loading'" class="splash"><div class="logo-spin" /></div>
  <div v-else-if="state === 'error'" class="splash">
    <p>Không kết nối được server: {{ error }}</p>
    <button class="btn btn-light" @click="boot">Thử lại</button>
  </div>

  <div v-else class="app" :class="{ 'has-right': ui.rightPanel && !ui.isMobile, mobile: ui.isMobile }" :style="{ '--sidebar-w': ui.sidebarWidth + 'px' }">
    <Sidebar v-if="!ui.isMobile" class="area-side" />
    <main ref="main" class="main scroll" @scroll="ui.scrollY = $event.target.scrollTop">
      <Topbar />
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in"><component :is="Component" :key="route.fullPath" /></Transition>
      </RouterView>
    </main>
    <RightPanel v-if="ui.rightPanel && !ui.isMobile" />
    <PlayerBar v-if="!ui.isMobile" />
    <div v-else class="mobile-bottom">
      <MiniPlayer />
      <MobileNav />
    </div>
    <FullPlayer v-if="ui.isMobile" />
  </div>

  <template v-if="state === 'ready'">
    <FullscreenView v-if="ui.fullscreen" />
    <component :is="modals[ui.modal.name]" v-if="ui.modal" v-bind="ui.modal.props" />
    <JobsPanel />
    <ContextMenu />
    <Toasts />
  </template>
</template>

<style>
.app { height: 100%; display: grid; gap: var(--gap); padding: var(--gap); padding-bottom: 0;
  grid-template-columns: var(--sidebar-w) 1fr;
  grid-template-rows: 1fr var(--player-h);
  grid-template-areas: 'side main' 'player player'; }
.app.has-right { grid-template-columns: var(--sidebar-w) 1fr clamp(280px, 22vw, 420px); grid-template-areas: 'side main right' 'player player player'; }
.area-side { grid-area: side; }
.main { grid-area: main; position: relative; container: main / inline-size; background: var(--surface); border-radius: var(--radius); min-height: 0; }
.app.mobile { padding: 0; gap: 0; grid-template-columns: 1fr; grid-template-rows: 1fr; grid-template-areas: 'main'; }
.app.mobile .main { border-radius: 0; padding-bottom: 140px; }
.mobile-bottom { position: fixed; left: 0; right: 0; bottom: 0; z-index: 100; }
.splash { height: 100%; display: flex; flex-direction: column; gap: 16px; align-items: center; justify-content: center; background: var(--surface); }
.logo-spin { width: 40px; height: 40px; border: 3px solid var(--surface-4); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
