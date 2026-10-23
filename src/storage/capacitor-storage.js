// Хранилище для Android (Capacitor): те же функции, что в electron-storage.js.
// Данные лежат во внутренней папке приложения: collection.json и images/.
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { IMAGE_NAME, extFromMime, mimeFromName, isUrl } from '../core/images.js';

const DATA_FILE = 'collection.json';
const IMAGES_DIR = 'images';

let imagesBaseUrl = '';

async function exists(path) {
  try {
    await Filesystem.stat({ path, directory: Directory.Data });
    return true;
  } catch {
    return false;
  }
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Адрес папки images для <img> — узнаём один раз при запуске
export async function init() {
  const { uri } = await Filesystem.getUri({ path: IMAGES_DIR, directory: Directory.Data });
  imagesBaseUrl = Capacitor.convertFileSrc(uri) + '/';
}

// Коллекция: { kind: 'v2', data } или null, если данных ещё нет (старого формата на телефоне не бывает)
export async function loadData() {
  if (!(await exists(DATA_FILE))) return null;
  const { data } = await Filesystem.readFile({ path: DATA_FILE, directory: Directory.Data, encoding: Encoding.UTF8 });
  return { kind: 'v2', data: JSON.parse(data) };
}

// Запись через временный файл: при сбое старый файл остаётся целым
export async function saveData(data) {
  const tmp = DATA_FILE + '.tmp';
  await Filesystem.writeFile({ path: tmp, directory: Directory.Data, encoding: Encoding.UTF8, data: JSON.stringify(data, null, 2) });
  const move = () => Filesystem.rename({ from: tmp, to: DATA_FILE, directory: Directory.Data, toDirectory: Directory.Data });
  try {
    await move();
  } catch {
    await Filesystem.deleteFile({ path: DATA_FILE, directory: Directory.Data });
    await move();
  }
}

// Сохраняет фото из data URL в images, возвращает имя файла или null.
// Ссылки из интернета на телефоне не скачиваем — они остаются как есть.
export async function storeImage(src) {
  if (IMAGE_NAME.test(src)) return src;
  const m = src.match(/^data:([^;,]+);base64,(.*)$/s);
  if (!m) return null;

  try {
    const bytes = Uint8Array.from(atob(m[2]), ch => ch.charCodeAt(0));
    const name = `${toHex(await crypto.subtle.digest('SHA-256', bytes)).slice(0, 32)}.${extFromMime(m[1])}`;
    const path = `${IMAGES_DIR}/${name}`;
    if (!(await exists(path))) {
      await Filesystem.writeFile({ path, directory: Directory.Data, data: m[2], recursive: true });
    }
    return name;
  } catch (err) {
    console.error('Не удалось сохранить фото:', err);
    return null;
  }
}

export function getImageUrl(ref) {
  return isUrl(ref) ? ref : imagesBaseUrl + ref;
}

// Фото в виде data URL — для экспорта
export async function readImageAsDataUrl(ref) {
  if (!IMAGE_NAME.test(ref)) return ref;
  const { data } = await Filesystem.readFile({ path: `${IMAGES_DIR}/${ref}`, directory: Directory.Data });
  return `data:${mimeFromName(ref)};base64,${data}`;
}

// Выгрузка: файл во временную папку и системное меню «Поделиться» (Диск, Telegram, Файлы...)
export async function exportFile(fileName, text) {
  await Filesystem.writeFile({ path: fileName, directory: Directory.Cache, encoding: Encoding.UTF8, data: text });
  const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });
  await Share.share({ title: 'Коллекция Hot Wheels', files: [uri], dialogTitle: 'Сохранить коллекцию' });
}

// Миграции со старого формата на телефоне нет
export async function backupLegacyData() {
  return null;
}

export async function moveUnusedImagesToBackup() {
  return 0;
}
