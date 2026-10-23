// Хранилище для Electron: сама работа с диском — в main-процессе (main-storage.js),
// сюда она приходит через preload.js. На Android будет свой модуль с теми же функциями.
const bridge = window.hwStorage;

// Коллекция: { kind: 'v2' | 'legacy', data } или null, если данных ещё нет
export function loadData() {
  return bridge.loadData();
}

export function saveData(data) {
  return bridge.saveData(data);
}

// Сохраняет фото (data URL, file:// или ссылка) в папку images, возвращает имя файла или null
export function storeImage(src) {
  return bridge.storeImage(src);
}

// Адрес для <img>: имя файла превращается в путь к папке images, ссылки остаются как есть
export function getImageUrl(ref) {
  return /^(data:|https?:|file:)/.test(ref) ? ref : bridge.imagesBaseUrl + ref;
}

// Фото в виде data URL — для экспорта
export function readImageAsDataUrl(ref) {
  return bridge.readImageAsDataUrl(ref);
}

// Копия старых данных перед миграцией, возвращает имя папки бэкапа
export function backupLegacyData() {
  return bridge.backupLegacyData();
}

// Переносит неиспользуемые фото в папку бэкапа, возвращает их количество
export function moveUnusedImagesToBackup(usedNames, backupName) {
  return bridge.moveUnusedImagesToBackup(usedNames, backupName);
}
