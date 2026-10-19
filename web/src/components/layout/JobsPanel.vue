<script setup>
// Bảng tiến độ tải nhạc (góc dưới phải), cập nhật realtime qua SSE
import Icon from '../ui/Icon.vue';
import { useLibrary } from '../../stores/library.js';
import { useUi } from '../../stores/ui.js';

const lib = useLibrary(), ui = useUi();
const label = { queued: 'Đang chờ', downloading: 'Đang tải', uploading: 'Đang upload', done: 'Xong', error: 'Lỗi' };
</script>

<template>
  <div v-if="lib.jobs.length" class="jobs" :class="{ min: !ui.jobsOpen }">
    <header @click="ui.jobsOpen = !ui.jobsOpen">
      <b v-if="lib.activeJobs.length">Đang tải {{ lib.activeJobs.length }} bài…</b>
      <b v-else>Đã tải xong</b>
      <button v-if="!lib.activeJobs.length" class="icon-btn" title="Xóa danh sách" @click.stop="lib.clearJobs()"><Icon name="x" size="16" /></button>
      <Icon name="chevronDown" size="18" class="chev" />
    </header>
    <ul v-if="ui.jobsOpen" class="scroll">
      <li v-for="j in lib.jobs" :key="j.id" :class="j.status">
        <div class="info">
          <div class="ellipsis">{{ j.title }}</div>
          <small :title="j.error">{{ label[j.status] }}<template v-if="j.status === 'downloading'"> · {{ Math.round(j.progress) }}%</template><template v-if="j.error"> · {{ j.error }}</template></small>
          <div v-if="j.status === 'downloading' || j.status === 'uploading'" class="bar"><div :style="{ width: j.progress + '%' }" /></div>
        </div>
        <Icon v-if="j.status === 'done'" name="checkCircle" class="ok" />
        <button v-else-if="j.status === 'error'" class="icon-btn" title="Thử lại" @click="lib.retryJob(j)"><Icon name="refresh" size="18" /></button>
        <span v-else class="spin" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.jobs { position: fixed; right: 16px; bottom: calc(var(--player-h) + 16px); z-index: 700; width: 340px; background: #282828; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.5); overflow: hidden; }
header { display: flex; align-items: center; gap: 8px; padding: 12px 16px; cursor: pointer; }
header b { flex: 1; }
.chev { transition: transform .2s; }
.min .chev { transform: rotate(180deg); }
ul { list-style: none; margin: 0; padding: 0 8px 8px; max-height: 300px; }
li { display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 4px; }
li:hover { background: #333; }
.info { flex: 1; min-width: 0; }
small { color: var(--text-2); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
li.error small { color: var(--danger); }
.bar { height: 3px; background: #444; border-radius: 2px; margin-top: 6px; overflow: hidden; }
.bar div { height: 100%; background: var(--accent); transition: width .3s; }
.ok { color: var(--accent); }
.spin { width: 18px; height: 18px; border: 2px solid #555; border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 767px) { .jobs { left: 8px; right: 8px; width: auto; bottom: 140px; } }
</style>
