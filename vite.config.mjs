// Сборка интерфейса в www/ — оттуда его берут и Electron, и Android (Capacitor)
import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // относительные пути: Electron открывает www/index.html как файл
  build: {
    outDir: 'www',
    emptyOutDir: true,
    target: 'es2022'
  }
});
