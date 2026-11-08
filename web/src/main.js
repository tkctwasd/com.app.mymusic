import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
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

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js');
