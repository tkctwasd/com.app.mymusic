<script setup>
// Panel phải: Đang phát / Hàng đợi / Lời bài hát
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Icon from '../ui/Icon.vue';
import Cover from '../ui/Cover.vue';
import Lyrics from '../media/Lyrics.vue';
import { usePlayer } from '../../stores/player.js';
import { useLibrary } from '../../stores/library.js';
import { useUi } from '../../stores/ui.js';
import { useDragSort } from '../../composables/useDragSort.js';
import { useTrackMenu } from '../../composables/useTrackMenu.js';
import { useDominantColor } from '../../composables/useDominantColor.js';

const player = usePlayer(), lib = useLibrary(), ui = useUi(), router = useRouter();
const trackMenu = useTrackMenu();
const t = computed(() => player.track);
const artist = computed(() => lib.artists.find((a) => a.name === t.value?.artist));
const color = useDominantColor(() => t.value?.coverUrl, () => t.value?.title);
const manualDnD = useDragSort((a, b) => player.moveManual(a, b));
const ctxDnD = useDragSort((a, b) => player.moveContext(a, b));
const titles = { now: 'Đang phát', queue: 'Hàng đợi', lyrics: 'Lời bài hát' };
</script>

<template>
  <aside class="rp" :style="{ '--c': color }">
    <header>
      <b class="ellipsis">{{ ui.rightPanel === 'now' ? (player.context?.name || titles.now) : titles[ui.rightPanel] }}</b>
      <button class="icon-btn" aria-label="Đóng" @click="ui.togglePanel(ui.rightPanel)"><Icon name="x" size="18" /></button>
    </header>

    <!-- Đang phát -->
    <div v-if="ui.rightPanel === 'now'" class="body scroll">
      <template v-if="t">
        <Cover :src="t.coverUrl" :size="640" class="big-cv" />
        <div class="np">
          <div class="meta">
            <h2 class="ellipsis"><RouterLink :to="player.context?.path || '/songs'" class="link">{{ t.title }}</RouterLink></h2>
            <RouterLink :to="`/artist/${encodeURIComponent(t.artist)}`" class="muted link ellipsis">{{ t.artist }}</RouterLink>
          </div>
          <button class="icon-btn" :class="{ liked: t.liked }" @click="lib.toggleLike(t)"><Icon :name="t.liked ? 'heartFill' : 'heart'" /></button>
          <button class="icon-btn" @click="trackMenu($event, t)"><Icon name="more" /></button>
        </div>

        <div class="card artist-card" @click="router.push(`/artist/${encodeURIComponent(t.artist)}`)">
          <div class="art-bg"><Cover :src="artist?.coverUrl" :size="400" /><span>Giới thiệu về nghệ sĩ</span></div>
          <div class="pad"><b>{{ t.artist }}</b><p class="muted">{{ artist?.tracks.length || 1 }} bài trong thư viện · {{ artist?.plays || 0 }} lượt nghe</p></div>
        </div>

        <div class="card pad">
          <div class="row-head"><b>Tiếp theo trong hàng đợi</b><button class="link small" @click="ui.togglePanel('queue')">Mở hàng đợi</button></div>
          <div v-if="player.nextTrack" class="q-item" @click="player.next()">
            <Cover :src="player.nextTrack.coverUrl" :size="96" class="sm-cv" />
            <div class="meta"><div class="ellipsis">{{ player.nextTrack.title }}</div><small class="muted ellipsis">{{ player.nextTrack.artist }}</small></div>
          </div>
          <p v-else class="muted">Không còn bài nào tiếp theo</p>
        </div>
      </template>
      <p v-else class="muted empty">Chưa phát bài nào. Chọn một bài để bắt đầu.</p>
    </div>

    <!-- Hàng đợi -->
    <div v-else-if="ui.rightPanel === 'queue'" class="body scroll">
      <template v-if="t">
        <h3>Đang phát</h3>
        <div class="q-item current">
          <Cover :src="t.coverUrl" :size="96" class="sm-cv" />
          <div class="meta"><div class="ellipsis green">{{ t.title }}</div><small class="muted ellipsis">{{ t.artist }}</small></div>
        </div>
      </template>
      <template v-if="player.upcoming.manual.length">
        <div class="row-head"><h3>Tiếp theo trong hàng đợi</h3><button class="link small" @click="player.upNext = []">Xóa hàng đợi</button></div>
        <div v-for="(q, i) in player.upcoming.manual" :key="'m' + i + q.id" class="q-item" :style="manualDnD.styleOf(i)"
          v-bind="manualDnD.bind(i, [q.id])" @dblclick="player.jumpManual(i)" @contextmenu="trackMenu($event, q)">
          <Cover :src="q.coverUrl" :size="96" class="sm-cv" />
          <div class="meta"><div class="ellipsis">{{ q.title }}</div><small class="muted ellipsis">{{ q.artist }}</small></div>
          <button class="icon-btn hov" title="Xóa khỏi hàng đợi" @click="player.removeManual(i)"><Icon name="minus" size="16" /></button>
        </div>
      </template>
      <template v-if="player.upcoming.context.length">
        <div class="row-head"><h3>Tiếp theo từ: {{ player.context?.name || 'Danh sách' }}</h3><button class="link small" @click="player.clearQueue()">Xóa</button></div>
        <div v-for="(q, i) in player.upcoming.context.slice(0, 100)" :key="'c' + i + q.id" class="q-item" :style="ctxDnD.styleOf(i)"
          v-bind="ctxDnD.bind(i, [q.id])" @dblclick="player.jumpContext(i)" @contextmenu="trackMenu($event, q)">
          <Cover :src="q.coverUrl" :size="96" class="sm-cv" />
          <div class="meta"><div class="ellipsis">{{ q.title }}</div><small class="muted ellipsis">{{ q.artist }}</small></div>
          <button class="icon-btn hov" title="Xóa khỏi hàng đợi" @click="player.removeContext(i)"><Icon name="minus" size="16" /></button>
        </div>
      </template>
      <p v-if="!t" class="muted empty">Hàng đợi trống.</p>
    </div>

    <!-- Lời bài hát -->
    <div v-else class="body lyr">
      <Lyrics v-if="t" />
      <p v-else class="muted empty">Chưa phát bài nào.</p>
    </div>
  </aside>
</template>

<style scoped>
.rp { grid-area: right; background: var(--surface); border-radius: var(--radius); display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
header { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 16px 16px 8px; }
.body { flex: 1; padding: 8px 16px 16px; }
.lyr { background: linear-gradient(var(--c), color-mix(in srgb, var(--c) 40%, #121212)); margin: 0 8px 8px; border-radius: 8px; overflow: hidden; }
.big-cv { width: 100%; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.5); }
.np { display: flex; align-items: center; gap: 4px; margin: 16px 0; }
.np .meta { flex: 1; }
.np h2 { font-size: 22px; font-weight: 800; }
.meta { min-width: 0; display: flex; flex-direction: column; flex: 1; }
.liked { color: var(--accent); }
.card { background: var(--surface-2); border-radius: 8px; margin-bottom: 16px; overflow: hidden; }
.pad, .card .pad { padding: 16px; }
.artist-card { cursor: pointer; }
.artist-card:hover { background: var(--surface-3); }
.art-bg { position: relative; }
.art-bg .cover { border-radius: 0; aspect-ratio: 16/10; }
.art-bg span { position: absolute; top: 12px; left: 16px; font-weight: 700; text-shadow: 0 1px 6px rgba(0,0,0,.6); }
.pad p { margin: 6px 0 0; font-size: 13px; }
.row-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
.small { font-size: 13px; font-weight: 700; color: var(--text-2); white-space: nowrap; }
.small:hover { color: #fff; }
h3 { font-size: 16px; margin: 16px 0 8px; }
.row-head h3 { margin: 16px 0 0; }
.q-item { display: flex; align-items: center; gap: 12px; padding: 6px 8px; margin: 0 -8px; border-radius: 6px; cursor: pointer; }
.q-item:hover { background: var(--surface-3); }
.q-item.over { box-shadow: inset 0 2px 0 var(--accent); }
.sm-cv { width: 48px; }
.green { color: var(--accent); }
.hov { opacity: 0; }
.q-item:hover .hov { opacity: 1; }
.empty { padding: 24px 0; }
</style>
