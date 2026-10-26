// renderer.js — точка входа интерфейса (Vue), сам интерфейс — в src/App.vue и src/components/
import { createApp } from 'vue';
import '@fontsource-variable/inter';
import '@fontsource-variable/unbounded';
import './style.css';
import App from './src/App.vue';
import { loadCollection } from './src/collection.js';

await loadCollection();
createApp(App).mount('#app');
