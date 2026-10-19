import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router.js';
import './styles/tokens.css';
import './styles/base.css';

createApp(App).use(createPinia()).use(router).mount('#app');

if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('/sw.js');
