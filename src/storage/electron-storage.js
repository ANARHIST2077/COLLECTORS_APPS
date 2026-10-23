// Хранилище для Electron: сама работа с диском — в main-процессе (main-storage.js),
// сюда она приходит через preload.js. На Android будет свой модуль с теми же функциями.
const bridge = window.hwStorage;

// Сырые данные коллекции или null, если файла ещё нет
export function loadCars() {
  return bridge.loadCars();
}

export function saveCars(cars) {
  return bridge.saveCars(cars);
}

// Фото в виде data URL — для экспорта
export function readImageAsDataUrl(src) {
  return bridge.readImageAsDataUrl(src);
}

// Сохраняет фото из data URL в папку images, возвращает ссылку на файл или null
export function saveImageFromDataUrl(dataUrl) {
  return bridge.saveImageFromDataUrl(dataUrl);
}
