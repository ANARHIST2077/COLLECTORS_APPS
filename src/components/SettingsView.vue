<script setup>
// Настройки: перенос коллекции между устройствами и сведения о приложении
import { ref, computed } from 'vue';
import { Capacitor } from '@capacitor/core';
import { Upload, Download } from 'lucide-vue-next';
import { activeCars, exportCollection, importCollection } from '../collection.js';
import { toast } from '../composables/toast.js';
import { carsCount } from '../composables/format.js';

const exporting = ref(false);
const importing = ref(false);
const isAndroid = Capacitor.getPlatform() === 'android';
const version = __APP_VERSION__;
const count = computed(() => activeCars().length);

async function onExport() {
  exporting.value = true;
  try {
    await exportCollection();
    if (!isAndroid) toast('Коллекция выгружена');
  } catch (err) {
    // на телефоне закрытие меню «Поделиться» без выбора — не ошибка
    if (!/cancel/i.test(String(err?.message))) {
      console.error(err);
      toast('Не удалось выгрузить коллекцию', 'error');
    }
  } finally {
    exporting.value = false;
  }
}

async function onImport(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  importing.value = true;
  try {
    const n = await importCollection(file);
    toast(`Добавлено: ${carsCount(n)}`);
  } catch (err) {
    console.error(err);
    toast('Файл повреждён или это не файл коллекции', 'error');
  } finally {
    importing.value = false;
  }
}
</script>

<template>
  <div class="settings">
    <h1>Настройки</h1>

    <section class="panel">
      <h2>Перенос коллекции</h2>
      <p>
        Выгрузите коллекцию в файл (вместе с фото) и загрузите его на другом устройстве.
        Машинки из файла добавляются к текущим.
      </p>
      <div class="buttons">
        <button class="btn btn-primary" :disabled="exporting" @click="onExport">
          <span v-if="exporting" class="spinner"></span><Upload v-else />
          Выгрузить коллекцию
        </button>
        <label class="btn" :class="{ disabled: importing }">
          <span v-if="importing" class="spinner"></span><Download v-else />
          Загрузить коллекцию
          <input type="file" accept=".json,application/json" hidden :disabled="importing" @change="onImport" />
        </label>
      </div>
    </section>

    <section class="panel">
      <h2>О приложении</h2>
      <dl class="about">
        <div><dt>Версия</dt><dd>{{ version }}</dd></div>
        <div><dt>Устройство</dt><dd>{{ isAndroid ? 'Android' : 'Windows' }}</dd></div>
        <div><dt>В гараже</dt><dd>{{ carsCount(count) }}</dd></div>
      </dl>
      <p v-if="isAndroid" class="note">
        Коллекция хранится внутри приложения и удаляется вместе с ним — перед удалением выгрузите её.
      </p>
    </section>
  </div>
</template>

<style scoped>
.settings { display: grid; gap: 16px; }
h1 { margin: 8px 0 4px; font-family: var(--font-display); font-size: clamp(32px, 8vw, 44px); text-transform: uppercase; }
h2 { margin: 0 0 8px; font-size: 16px; }
p { margin: 0 0 14px; color: var(--muted); line-height: 1.5; }
.panel { padding: 18px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); }
.buttons { display: grid; gap: 10px; }
@media (min-width: 560px) { .buttons { grid-template-columns: 1fr 1fr; } }
label.btn { cursor: pointer; }
label.btn.disabled { opacity: .5; pointer-events: none; }
.about { display: grid; gap: 2px; margin: 0; }
.about div { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
.about div:last-child { border-bottom: none; }
.about dt { color: var(--muted); }
.about dd { margin: 0; font-weight: 650; }
.note { margin: 12px 0 0; font-size: 13px; }
</style>
