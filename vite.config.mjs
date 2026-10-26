// Сборка интерфейса в www/ — оттуда его берут и Electron, и Android (Capacitor)
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { readFileSync } from 'node:fs';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  plugins: [vue()],
  base: './', // относительные пути: Electron открывает www/index.html как файл
  define: {
    __APP_VERSION__: JSON.stringify(version)
  },
  build: {
    outDir: 'www',
    emptyOutDir: true,
    target: 'es2022'
  }
});
