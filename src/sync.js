// Синхронизация через приватный репозиторий GitHub:
//   отправить — фото, которых нет на сервере, и collection.json заменяют версию на сервере;
//   получить  — коллекция на устройстве заменяется версией с сервера (перед этим — копия текущей).
// В репозитории: collection.json и папка images/ (имена фото — хеш содержимого, как на устройстве).
import { Capacitor } from '@capacitor/core';
import { activeCars, snapshot, replaceCollection } from './collection.js';
import { storage } from './storage/index.js';
import { IMAGE_NAME, mimeFromName } from './core/images.js';

const API = 'https://api.github.com';

export class SyncError extends Error {}

function deviceName() {
  return Capacitor.getPlatform() === 'android' ? 'Android' : 'Windows';
}

// ====== Настройки ======
export async function loadSyncSettings() {
  const s = await storage.loadSettings();
  return { repo: s.githubRepo ?? '', token: s.githubToken ?? '' };
}

export async function saveSyncSettings({ repo, token }) {
  const s = await storage.loadSettings();
  await storage.saveSettings({ ...s, githubRepo: repo.trim(), githubToken: token.trim() });
}

// ====== base64 ======
function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
const textToBase64 = text => bytesToBase64(new TextEncoder().encode(text));

// ====== Запросы к GitHub ======
async function client() {
  const { repo, token } = await loadSyncSettings();
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !token) throw new SyncError('Укажите репозиторий и токен в настройках синхронизации');

  async function call(url, { method = 'GET', body, raw = false } = {}) {
    let res;
    try {
      res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        body: body ? JSON.stringify(body) : undefined
      });
    } catch {
      throw new SyncError('Нет связи с GitHub — проверьте интернет');
    }
    if (res.status === 404) return null;
    if (res.status === 401) throw new SyncError('GitHub не принял токен — проверьте его в настройках');
    if (res.status === 403) throw new SyncError('Нет доступа: у токена должно быть право Contents: Read and write на этот репозиторий');
    if (!res.ok) throw new SyncError(`GitHub ответил ошибкой ${res.status}`);
    return res;
  }

  const contents = path => `${API}/repos/${repo}/contents/${path}`;

  return {
    // репозиторий должен существовать и быть приватным — иначе коллекция видна всем
    async checkRepo() {
      const res = await call(`${API}/repos/${repo}`);
      if (!res) throw new SyncError(`Репозиторий ${repo} не найден (или у токена нет к нему доступа)`);
      const info = await res.json();
      if (!info.private) throw new SyncError('Репозиторий публичный — коллекция будет видна всем. Нужен приватный');
    },
    async fileSha(path) {
      const res = await call(contents(path));
      return res ? (await res.json()).sha : null;
    },
    async raw(path) {
      return call(contents(path), { raw: true });
    },
    async listNames(dir) {
      const res = await call(contents(dir));
      return res ? (await res.json()).map(f => f.name) : [];
    },
    async put(path, base64, message, sha) {
      await call(contents(path), { method: 'PUT', body: { message, content: base64, ...(sha ? { sha } : {}) } });
    }
  };
}

const imageNames = cars => [...new Set(cars.flatMap(c => c.images).filter(i => IMAGE_NAME.test(i)))];

// ====== Что лежит на сервере ======
// { syncedAt, device, count } или null, если коллекцию ещё не отправляли
export async function remoteInfo() {
  const gh = await client();
  await gh.checkRepo();
  const res = await gh.raw('collection.json');
  if (!res) return null;
  const data = await res.json();
  return { syncedAt: data.syncedAt, device: data.device, count: (data.cars || []).filter(c => !c.deleted).length };
}

// ====== Отправить коллекцию на сервер ======
export async function pushCollection(onProgress = () => {}) {
  const gh = await client();
  await gh.checkRepo();
  const data = snapshot();

  onProgress('Проверка фото на сервере…');
  const remote = new Set(await gh.listNames('images'));
  const missing = imageNames(data.cars).filter(n => !remote.has(n));

  for (const [i, name] of missing.entries()) {
    onProgress(`Отправка фото ${i + 1} из ${missing.length}…`);
    const dataUrl = await storage.readImageAsDataUrl(name);
    await gh.put(`images/${name}`, dataUrl.split(',')[1], `Фото ${name}`);
  }

  onProgress('Отправка коллекции…');
  const count = activeCars().length;
  const payload = { ...data, syncedAt: new Date().toISOString(), device: deviceName() };
  await gh.put('collection.json', textToBase64(JSON.stringify(payload, null, 2)),
    `Коллекция: ${count} машинок (${deviceName()})`, await gh.fileSha('collection.json'));

  return { count, photos: missing.length };
}

// ====== Обновить коллекцию на устройстве ======
export async function pullCollection(onProgress = () => {}) {
  const gh = await client();
  await gh.checkRepo();

  onProgress('Загрузка коллекции…');
  const res = await gh.raw('collection.json');
  if (!res) throw new SyncError('На сервере ещё нет коллекции — сначала отправьте её с другого устройства');
  const remote = await res.json();
  if (!Array.isArray(remote.cars)) throw new SyncError('Файл коллекции на сервере повреждён');

  // недостающие фото скачиваем; имя на устройстве может отличаться (расширение) — запоминаем соответствие
  const names = imageNames(remote.cars);
  const rename = new Map();
  for (const [i, name] of names.entries()) {
    if (await storage.hasImage(name)) continue;
    onProgress(`Загрузка фото ${i + 1} из ${names.length}…`);
    const img = await gh.raw(`images/${name}`);
    if (!img) continue; // фото нет на сервере — останется пустым местом, коллекцию не ломаем
    const bytes = new Uint8Array(await img.arrayBuffer());
    const local = await storage.storeImage(`data:${mimeFromName(name)};base64,${bytesToBase64(bytes)}`);
    if (local && local !== name) rename.set(name, local);
  }

  const cars = remote.cars.map(c => ({ ...c, images: (c.images || []).map(i => rename.get(i) ?? i) }));
  await replaceCollection(cars);
  return { count: cars.filter(c => !c.deleted).length, syncedAt: remote.syncedAt, device: remote.device };
}
