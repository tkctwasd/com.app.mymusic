import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { IS_IOS } from './platform.js';
import router from './router.js';
// Font tự host (đi kèm bản build, không tải từ Google Fonts): có đủ tiếng Việt
import '@fontsource/be-vietnam-pro/vietnamese-400.css';
import '@fontsource/be-vietnam-pro/latin-400.css';
import '@fontsource/be-vietnam-pro/vietnamese-500.css';
import '@fontsource/be-vietnam-pro/latin-500.css';
import '@fontsource/be-vietnam-pro/vietnamese-600.css';
import '@fontsource/be-vietnam-pro/latin-600.css';
import '@fontsource/be-vietnam-pro/vietnamese-700.css';
import '@fontsource/be-vietnam-pro/latin-700.css';
import '@fontsource/be-vietnam-pro/vietnamese-800.css';
import '@fontsource/be-vietnam-pro/latin-800.css';
import '@fontsource/unbounded/vietnamese-400.css';
import '@fontsource/unbounded/latin-400.css';
import '@fontsource/unbounded/vietnamese-500.css';
import '@fontsource/unbounded/latin-500.css';
import '@fontsource/unbounded/vietnamese-600.css';
import '@fontsource/unbounded/latin-600.css';
import '@fontsource/unbounded/vietnamese-700.css';
import '@fontsource/unbounded/latin-700.css';
import './styles/tokens.css';
import './styles/base.css';

createApp(App).use(createPinia()).use(router).mount('#app');
// Trên iPhone ẩn thanh âm lượng trong app (Safari không cho chỉnh âm lượng bằng code)
document.documentElement.classList.toggle('ios', IS_IOS);

// iOS: khi bàn phím mở (ô tìm kiếm...) Safari cuộn cả trang lên dù đã overflow:hidden, đóng bàn phím xong
// trang không tự về lại -> đầu trang chui vào tai thỏ, đáy hở một khoảng. Ép cuộn về 0 sau các sự kiện đó.
if (IS_IOS) {
  const reset = () => { if (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop) window.scrollTo(0, 0); };
  window.addEventListener('focusout', () => setTimeout(reset, 60));
  window.addEventListener('orientationchange', () => setTimeout(reset, 300));
  window.addEventListener('pageshow', reset);
  window.visualViewport?.addEventListener('resize', () => { if (!document.activeElement?.matches('input, textarea, select')) reset(); });
}

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js');
