// Коллекция в памяти + загрузка и сохранение через хранилище
import { SCHEMA_VERSION, createCar, fromStored } from './core/car.js';
import { migrateV1 } from './core/migrate.js';
import * as storage from './storage/electron-storage.js';

export const collection = {
  cars: [] // вместе с удалёнными (deleted: true)
};

// Если коллекцию не удалось прочитать — не сохраняем, чтобы не затереть файл пустой
let loadFailed = false;

// Машинки без удалённых
export function activeCars() {
  return collection.cars.filter(c => !c.deleted);
}

export function saveCollection() {
  if (loadFailed) return;
  storage.saveData({ schemaVersion: SCHEMA_VERSION, cars: collection.cars })
    .catch(err => console.error('Ошибка сохранения данных:', err));
}

// Имена файлов фото, на которые ссылается коллекция
function usedImageNames() {
  return collection.cars.flatMap(c => c.images).filter(i => !/^(data:|https?:|file:)/.test(i));
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
