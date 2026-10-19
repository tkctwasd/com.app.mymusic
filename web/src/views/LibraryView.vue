<script setup>
// Thư viện (mobile): playlist, album, nghệ sĩ dạng danh sách
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../components/ui/Icon.vue';
import Cover from '../components/ui/Cover.vue';
import { useLibrary } from '../stores/library.js';
import { useUi } from '../stores/ui.js';
import { usePage } from '../composables/usePage.js';

const lib = useLibrary(), ui = useUi(), router = useRouter();
usePage(() => ({ color: '#121212' }));
const filter = ref('');
const items = computed(() => [
  ...(!filter.value || filter.value === 'playlist' ? lib.playlists.map((p) => ({ key: p.id, to: `/playlist/${p.id}`, name: p.name, sub: `Playlist • ${p.trackIds.length} bài`, mosaic: lib.playlistTracks(p).map((t) => t.coverUrl).filter(Boolean) })) : []),
  ...(!filter.value || filter.value === 'album' ? lib.albums.map((a) => ({ key: a.artist + a.name, to: `/album/${encodeURIComponent(a.artist)}/${encodeURIComponent(a.name)}`, name: a.name, sub: `Album • ${a.artist}`, cover: a.coverUrl })) : []),
  ...(!filter.value || filter.value === 'artist' ? lib.artists.map((a) => ({ key: a.name, to: `/artist/${encodeURIComponent(a.name)}`, name: a.name, sub: 'Nghệ sĩ', cover: a.coverUrl, round: true })) : []),
]);
async function newPlaylist() { const p = await lib.createPlaylist(); router.push(`/playlist/${p.id}`); }
</script>

<template>
  <div class="page lib">
    <header>
      <h1>Thư viện</h1>
      <button class="icon-btn" aria-label="Thêm nhạc" @click="ui.open('import')"><Icon name="download" size="22" /></button>
      <button class="icon-btn" aria-label="Tạo playlist" @click="newPlaylist"><Icon name="plus" size="24" /></button>
    </header>
    <div class="chips">
      <button v-for="(l, k) in { playlist: 'Playlist', album: 'Album', artist: 'Nghệ sĩ' }" :key="k" class="chip" :class="{ on: filter === k }" @click="filter = filter === k ? '' : k">{{ l }}</button>
    </div>
    <RouterLink to="/liked" class="item"><Cover liked class="cv" /><div class="meta"><b>Bài hát đã thích</b><small class="muted"><Icon name="pin" size="12" class="pin" /> {{ lib.liked.length }} bài</small></div></RouterLink>
    <RouterLink to="/songs" class="item"><Cover icon="music" class="cv" /><div class="meta"><b>Tất cả bài hát</b><small class="muted"><Icon name="pin" size="12" class="pin" /> {{ lib.tracks.length }} bài</small></div></RouterLink>
    <RouterLink v-for="it in items" :key="it.key" :to="it.to" class="item">
      <Cover :src="it.cover" :mosaic="it.mosaic" :round="it.round" :size="128" class="cv" />
      <div class="meta"><b class="ellipsis">{{ it.name }}</b><small class="muted ellipsis">{{ it.sub }}</small></div>
    </RouterLink>
  </div>
</template>

<style scoped>
.lib { padding-top: 64px; }
header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
h1 { flex: 1; font-size: 24px; font-weight: 800; }
.chips { display: flex; gap: 8px; margin-bottom: 12px; }
.item { display: flex; align-items: center; gap: 12px; padding: 8px 0; }
.cv { width: 64px; }
.meta { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
.meta small { display: flex; align-items: center; gap: 4px; }
.pin { color: var(--accent); }
</style>
