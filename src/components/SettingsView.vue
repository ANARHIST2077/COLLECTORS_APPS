<script setup>
// Настройки: синхронизация через GitHub, перенос файлом и сведения о приложении
import { ref, reactive, computed, onMounted } from 'vue';
import { Capacitor } from '@capacitor/core';
import { Upload, Download, CloudUpload, CloudDownload, KeyRound, ExternalLink } from 'lucide-vue-next';
import { activeCars, exportCollection, importCollection } from '../collection.js';
import { loadSyncSettings, saveSyncSettings, remoteInfo, pushCollection, pullCollection, SyncError } from '../sync.js';
import { toast } from '../composables/toast.js';
import { carsCount, formatDateTime } from '../composables/format.js';

// ====== Синхронизация через GitHub ======
const sync = reactive({
  repo: '',
  token: '',
  configured: false,
  editing: false,
  busy: '',          // 'push' | 'pull' | ''
  progress: '',
  remoteState: '',   // 'loading' | 'empty' | 'ok' | 'error'
  remote: null,
  remoteError: ''
});

const errorText = err => err instanceof SyncError ? err.message : 'Что-то пошло не так — попробуйте ещё раз';

async function refreshRemote() {
  sync.remoteState = 'loading';
  try {
    sync.remote = await remoteInfo();
    sync.remoteState = sync.remote ? 'ok' : 'empty';
  } catch (err) {
    console.error(err);
    sync.remoteError = errorText(err);
    sync.remoteState = 'error';
  }
}

onMounted(async () => {
  const s = await loadSyncSettings();
  Object.assign(sync, s, { configured: !!(s.repo && s.token) });
  sync.editing = !sync.configured;
  if (sync.configured) refreshRemote();
});

const formError = ref('');

async function onSaveSync() {
  // можно вставить и полную ссылку: https://github.com/владелец/название
  sync.repo = sync.repo.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$|\/+$/g, '');
  sync.token = sync.token.trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(sync.repo)) { formError.value = 'Укажите репозиторий в виде владелец/название, например ANARHIST2077/hotwheels-data'; return; }
  if (!sync.token) { formError.value = 'Вставьте токен доступа'; return; }
  formError.value = '';
  await saveSyncSettings(sync);
  sync.configured = true;
  sync.editing = false;
  toast('Доступ сохранён');
  refreshRemote();
}

const RELEASES_URL = 'https://github.com/ANARHIST2077/COLLECTORS_APPS/releases';

async function runSync(kind, action, done) {
  sync.busy = kind;
  try {
    const result = await action(text => { sync.progress = text; });
    toast(done(result));
    await refreshRemote();
  } catch (err) {
    console.error(err);
    toast(errorText(err), 'error');
  } finally {
    sync.busy = '';
    sync.progress = '';
  }
}

function onPush() {
  const local = carsCount(activeCars().length);
  const question = sync.remote
    ? `Заменить коллекцию на сервере (${carsCount(sync.remote.count)}, ${sync.remote.device}, ${formatDateTime(sync.remote.syncedAt)}) коллекцией с этого устройства (${local})?`
    : `Отправить коллекцию (${local}) на сервер?`;
  if (!confirm(question)) return;
  runSync('push', pushCollection, r => `Отправлено: ${carsCount(r.count)}, новых фото — ${r.photos}`);
}

function onPull() {
  const question = `Коллекция на этом устройстве (${carsCount(activeCars().length)}) будет заменена версией с сервера`
    + (sync.remote ? ` (${carsCount(sync.remote.count)}, ${formatDateTime(sync.remote.syncedAt)})` : '')
    + '. Текущая сохранится в резервной копии. Продолжить?';
  if (!confirm(question)) return;
  runSync('pull', pullCollection, r => `Коллекция обновлена: ${carsCount(r.count)}`);
}

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
      <h2>Синхронизация через GitHub</h2>
      <p>
        Коллекция с фото хранится в вашем приватном репозитории: отправьте её с одного устройства
        и обновите на другом.
      </p>

      <template v-if="sync.configured && !sync.editing">
        <div class="remote" :class="sync.remoteState">
          <span v-if="sync.remoteState === 'loading'">Проверяю сервер…</span>
          <span v-else-if="sync.remoteState === 'empty'">На сервере пока пусто</span>
          <span v-else-if="sync.remoteState === 'ok'">
            На сервере: <strong>{{ carsCount(sync.remote.count) }}</strong>
            · {{ sync.remote.device }} · {{ formatDateTime(sync.remote.syncedAt) }}
          </span>
          <span v-else-if="sync.remoteState === 'error'">{{ sync.remoteError }}</span>
        </div>

        <div class="buttons">
          <button class="btn btn-primary" :disabled="!!sync.busy" @click="onPush">
            <span v-if="sync.busy === 'push'" class="spinner"></span><CloudUpload v-else />
            Отправить на сервер
          </button>
          <button class="btn" :disabled="!!sync.busy || sync.remoteState === 'empty'" @click="onPull">
            <span v-if="sync.busy === 'pull'" class="spinner"></span><CloudDownload v-else />
            Обновить с сервера
          </button>
        </div>
        <p v-if="sync.progress" class="progress">{{ sync.progress }}</p>
      </template>

      <form v-if="sync.editing" class="sync-form" @submit.prevent="onSaveSync">
        <label class="field">
          <span>Репозиторий (владелец/название)</span>
          <input v-model="sync.repo" class="input" placeholder="ANARHIST2077/hotwheels-data" autocomplete="off" autocapitalize="off" spellcheck="false" />
        </label>
        <label class="field">
          <span>Токен доступа</span>
          <input v-model="sync.token" class="input" type="password" placeholder="github_pat_…" autocomplete="off" />
        </label>
        <p v-if="formError" class="form-error">{{ formError }}</p>
        <p class="hint">
          Токен создаётся на GitHub: Settings → Developer settings → Fine-grained tokens.
          Доступ только к этому репозиторию, право «Contents: Read and write».
          Токен хранится только на этом устройстве.
        </p>
        <div class="buttons">
          <button type="submit" class="btn btn-primary"><KeyRound />Сохранить доступ</button>
          <button v-if="sync.configured" type="button" class="btn btn-ghost" @click="sync.editing = false">Отмена</button>
        </div>
      </form>
      <button v-else class="link-btn" @click="sync.editing = true">Изменить доступ</button>
    </section>

    <section class="panel">
      <h2>Перенос файлом</h2>
      <p>
        Без интернета: выгрузите коллекцию в файл (вместе с фото) и загрузите его на другом устройстве.
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
      <a class="btn btn-block releases" :href="RELEASES_URL" target="_blank" rel="noopener">
        <ExternalLink />Скачать новые версии на GitHub
      </a>
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

.remote {
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--surface-2);
  font-size: 13.5px;
  color: var(--muted);
}
.remote strong { color: var(--text); }
.remote.error { color: var(--danger); background: rgba(255, 59, 78, .1); }
.progress { margin: 12px 0 0; font-size: 13px; }
.sync-form { display: grid; gap: 12px; }
.hint { margin: 0; font-size: 12.5px; }
.form-error { margin: 0; color: var(--danger); font-size: 13px; }
.releases { margin-top: 14px; text-decoration: none; }
.link-btn {
  margin-top: 12px;
  padding: 0;
  border: none;
  background: none;
  color: var(--muted);
  font-size: 13px;
  text-decoration: underline;
}
</style>
