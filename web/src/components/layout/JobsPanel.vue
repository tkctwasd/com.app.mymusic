<script setup>
// Danh sách job tải nhạc: bật từ vòng tiến độ trên thanh trên, cập nhật realtime qua SSE
import Icon from '../ui/Icon.vue';
import { useLibrary } from '../../stores/library.js';
import { useUi } from '../../stores/ui.js';

const lib = useLibrary(), ui = useUi();
const label = { queued: 'Đang chờ', downloading: 'Đang tải', uploading: 'Đang upload', done: 'Xong', error: 'Lỗi' };
</script>

<template>
  <Transition name="pop"><div v-if="lib.jobs.length && ui.jobsOpen" class="jobs">
    <header>
      <b v-if="lib.activeJobs.length">Đang tải {{ lib.activeJobs.length }} bài…</b>
      <b v-else>Đã tải xong</b>
      <button v-if="!lib.activeJobs.length" class="icon-btn" title="Xóa danh sách" @click.stop="lib.clearJobs()"><Icon name="x" size="16" /></button>
      <button class="icon-btn" title="Đóng" @click="ui.jobsOpen = false"><Icon name="chevronUp" size="18" /></button>
    </header>
    <ul class="scroll">
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
  </div></Transition>
</template>

<style scoped>
.jobs { position: fixed; right: 16px; top: calc(var(--nav-h) + 8px); z-index: 700; width: 360px; background: var(--glass-strong); backdrop-filter: blur(20px) saturate(1.4); border: 1px solid var(--line); border-radius: 20px; box-shadow: var(--shadow-lg); overflow: hidden; }
header { display: flex; align-items: center; gap: 4px; padding: 10px 8px 6px 18px; }
header b { flex: 1; font-weight: 600; }
ul { list-style: none; margin: 0; padding: 0 8px 8px; max-height: 340px; }
li { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 12px; }
li:hover { background: var(--hover); }
.info { flex: 1; min-width: 0; }
small { color: var(--text-2); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
li.error small { color: var(--danger); }
.bar { height: 4px; background: var(--line); border-radius: 2px; margin-top: 6px; overflow: hidden; }
.bar div { height: 100%; background: var(--accent); border-radius: 2px; transition: width .3s; }
.ok { color: var(--accent); }
.spin { width: 18px; height: 18px; border: 2px solid var(--line-2); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
.pop-enter-active, .pop-leave-active { transition: all .25s var(--ease); transform-origin: top right; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: scale(.95) translateY(-6px); }
@media (max-width: 767px) { .jobs { left: 8px; right: 8px; width: auto; top: calc(60px + env(safe-area-inset-top)); } }
</style>
