// Коллекция в памяти + все действия с ней (добавить, изменить, удалить, импорт, экспорт).
// Интерфейс только вызывает эти функции, сам с хранилищем не работает.
import { reactive } from 'vue';
import { SCHEMA_VERSION, createCar, fromStored, normalizeCar, touch } from './core/car.js';
import { migrateV1 } from './core/migrate.js';
import { isUrl } from './core/images.js';
import { storage } from './storage/index.js';

// reactive — чтобы интерфейс сам обновлялся при изменениях
export const collection = reactive({
  cars: [] // вместе с удалёнными (deleted: true)
});

// Если коллекцию не удалось прочитать — не сохраняем, чтобы не затереть файл пустой
let loadFailed = false;

// Машинки без удалённых
export function activeCars() {
  return collection.cars.filter(c => !c.deleted);
}

export function saveCollection() {
  if (loadFailed) return;
  // копия без реактивных обёрток Vue — её можно передать в хранилище
  const cars = JSON.parse(JSON.stringify(collection.cars));
  storage.saveData({ schemaVersion: SCHEMA_VERSION, cars })
    .catch(err => console.error('Ошибка сохранения данных:', err));
}

// Имена файлов фото, на которые ссылается коллекция
function usedImageNames() {
  return collection.cars.flatMap(c => c.images).filter(i => !isUrl(i));
}

// Первый запуск новой версии: бэкап, перевод в формат V2, перенос лишних фото в бэкап
async function migrateLegacy(rawCars) {
  const backupName = await storage.backupLegacyData();
  const data = await migrateV1(rawCars, storage.storeImage);
  collection.cars = data.cars;
  await storage.saveData(data);
  const moved = await storage.moveUnusedImagesToBackup(usedImageNames(), backupName);
  console.log(`Коллекция переведена в формат V${SCHEMA_VERSION}: машинок ${data.cars.length}, бэкап ${backupName}, перенесено неиспользуемых фото ${moved}`);
}

export async function loadCollection() {
  try {
    await storage.init();
    const loaded = await storage.loadData();
    if (loaded === null) {
      collection.cars = [
        createCar({ name: "Lamborghini Countach", realYear: 1974, modelYear: 2021 }),
        createCar({ name: "DeLorean DMC-12", realYear: 1981, modelYear: 2023 })
      ];
      saveCollection();
    } else if (loaded.kind === 'legacy') {
      await migrateLegacy(loaded.data);
    } else {
      collection.cars = (loaded.data.cars || []).map(fromStored);
    }
  } catch (err) {
    loadFailed = true;
    console.error('Ошибка загрузки данных:', err);
    alert('Не удалось загрузить коллекцию. Изменения сохраняться не будут, чтобы не повредить данные.');
  }
}

// ====== Фото ======
function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Выбранные файлы сохраняются в папку images, возвращаются имена файлов
export async function filesToImages(files) {
  const images = [];
  for (const file of files) {
    const dataUrl = await readAsDataUrl(file);
    images.push(await storage.storeImage(dataUrl) ?? dataUrl);
  }
  return images;
}

export function imageUrl(ref) {
  return storage.getImageUrl(ref);
}

// ====== Машинки ======
// fields: { name, realYear, modelYear, price }
export function addCar(fields, images = []) {
  const car = createCar(fields);
  car.images = images;
  collection.cars.push(car);
  saveCollection();
  return collection.cars.at(-1);
}

export function updateCar(car, fields, images) {
  Object.assign(car, fields);
  car.images = images;
  touch(car);
  saveCollection();
}

export function toggleFavorite(car) {
  car.favorite = !car.favorite;
  touch(car);
  saveCollection();
}

// Удаление — пометка, а не стирание: так оно дойдёт до других устройств при синхронизации
export function deleteCar(car) {
  car.deleted = true;
  touch(car);
  saveCollection();
}

// ====== Выгрузка и загрузка файлом (перенос между устройствами) ======
export async function exportCollection() {
  const exportData = [];
  for (const car of activeCars()) {
    const carCopy = JSON.parse(JSON.stringify(car));
    carCopy.imagesBase64 = [];
    for (const imgRef of car.images) {
      carCopy.imagesBase64.push(await storage.readImageAsDataUrl(imgRef));
    }
    exportData.push(carCopy);
  }
  // на ПК — скачивание файла, на телефоне — меню «Поделиться»
  await storage.exportFile('hotwheels_collection.json', JSON.stringify(exportData, null, 2));
}

// Каждая машинка из файла — новая запись со своим id. Возвращает количество добавленных.
export async function importCollection(file) {
  const importedCars = JSON.parse(await file.text());
  if (!Array.isArray(importedCars)) throw new Error('В файле нет списка машинок');

  for (const rawCar of importedCars) {
    const car = createCar(normalizeCar(rawCar));
    car.favorite = rawCar.favorite === true;
    for (const base64 of rawCar.imagesBase64 || []) {
      const name = await storage.storeImage(base64);
      if (name) car.images.push(name);
    }
    collection.cars.push(car);
  }

  saveCollection();
  return importedCars.length;
}
