// Перевод коллекции из формата V1 (hotwheels_data.json) в формат V2 (collection.json)
import { SCHEMA_VERSION, normalizeCar, createCar } from './car.js';

// storeImage(src) сохраняет фото и возвращает имя файла или null.
// Если фото сохранить не удалось — остаётся исходная ссылка, чтобы ничего не потерять.
export async function migrateV1(rawCars, storeImage) {
  const now = new Date().toISOString();
  const cars = [];

  for (const raw of Array.isArray(rawCars) ? rawCars : []) {
    const old = normalizeCar(raw);
    const car = createCar(old, now);
    for (const src of old.images) {
      const name = await storeImage(src);
      car.images.push(name ?? src);
    }
    cars.push(car);
  }

  return { schemaVersion: SCHEMA_VERSION, cars };
}
