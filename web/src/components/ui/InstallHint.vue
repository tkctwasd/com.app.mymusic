<script setup>
// Hướng dẫn cài app trên iPhone (Safari không có nút "Cài đặt" tự động như Android):
// chỉ hiện khi mở bằng Safari iOS và chưa chạy ở chế độ app; bấm "Để sau" thì ẩn 7 ngày.
import { ref } from 'vue';
import Icon from './Icon.vue';
import AppLogo from './AppLogo.vue';
import { load, save } from '../../utils.js';

const ua = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
const standalone = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
const show = ref(isIOS && !standalone && Date.now() > load('installHintUntil', 0));
function later() { save('installHintUntil', Date.now() + 7 * 86400000); show.value = false; }
</script>

<template>
  <Transition name="ih">
    <div v-if="show" class="ih" role="dialog" aria-label="Cài app lên iPhone">
      <div class="top">
        <AppLogo :size="48" animated class="logo" />
        <div><b>Cài My Music lên iPhone</b><small>Mở toàn màn hình, nghe nền, điều khiển ở màn hình khóa</small></div>
        <button class="icon-btn" aria-label="Đóng" @click="later"><Icon name="x" size="18" /></button>
      </div>
      <ol v-if="isSafari">
        <li><span class="n">1</span> Bấm nút <b>Chia sẻ</b> <svg class="share" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M8 7l4-4 4 4M5 11v9h14v-9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg> ở thanh dưới của Safari</li>
        <li><span class="n">2</span> Chọn <b>Thêm vào MH chính</b> <Icon name="plus" size="16" class="inl" /></li>
        <li><span class="n">3</span> Bấm <b>Thêm</b>, rồi mở app từ màn hình chính</li>
      </ol>
      <p v-else class="muted note">Hãy mở trang này bằng <b>Safari</b> để thêm vào màn hình chính (Chrome trên iPhone không hỗ trợ).</p>
      <button class="btn btn-soft later" @click="later">Để sau</button>
      <span class="arrow" />
    </div>
  </Transition>
</template>

<style scoped>
.ih { position: fixed; z-index: 600; left: 10px; right: 10px; bottom: calc(10px + env(safe-area-inset-bottom)); padding: 16px; border-radius: 24px;
  background: var(--glass-strong); backdrop-filter: blur(24px) saturate(1.5); -webkit-backdrop-filter: blur(24px) saturate(1.5); border: 1px solid var(--line-2); box-shadow: var(--shadow-lg); }
.top { display: flex; align-items: center; gap: 12px; }
.logo { border-radius: 12px; }
.top > div { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.top small { color: var(--text-2); font-size: 12.5px; }
ol { list-style: none; margin: 14px 0 12px; padding: 0; display: flex; flex-direction: column; gap: 10px; }
li { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-2); flex-wrap: wrap; }
li b { color: var(--text); }
.n { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent); font-size: 12px; font-weight: 700; flex-shrink: 0; }
.share { width: 20px; height: 20px; color: #3b8cff; }
.inl { display: inline-block; padding: 1px; border: 1.5px solid currentColor; border-radius: 4px; }
.note { font-size: 13.5px; margin: 12px 0; }
.later { width: 100%; }
/* Mũi tên chỉ xuống nút Chia sẻ ở giữa thanh dưới của Safari */
.arrow { position: absolute; left: 50%; bottom: -8px; width: 16px; height: 16px; transform: translateX(-50%) rotate(45deg); background: inherit; border-right: 1px solid var(--line-2); border-bottom: 1px solid var(--line-2); }
.ih-enter-active, .ih-leave-active { transition: all .45s var(--spring); }
.ih-enter-from, .ih-leave-to { opacity: 0; transform: translateY(40px); }
</style>
