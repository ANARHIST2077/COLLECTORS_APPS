// Коллекция в памяти + загрузка и сохранение через хранилище
import { normalizeCar } from './core/car.js';
import * as storage from './storage/electron-storage.js';

export const collection = {
  cars: [],
  nextId: 0
};

export function newId() {
  return collection.nextId++;
}

export function ensureId(car) {
  if (car.id === null || car.id === undefined) car.id = newId();
}

export function saveCollection() {
  storage.saveCars(collection.cars).catch(err => console.error('Ошибка сохранения данных:', err));
}

export async function loadCollection() {
  try {
    const raw = await storage.loadCars();
    if (raw !== null) {
      collection.cars = Array.isArray(raw) ? raw.map(normalizeCar) : [];
      let maxId = -1;
      collection.cars.forEach(c => { if (c.id !== null && c.id !== undefined) maxId = Math.max(maxId, Number(c.id)); });
      collection.nextId = maxId + 1;
    } else {
      collection.cars = [
        { id: newId(), name: "Lamborghini Countach", images: [], realYear: 1974, modelYear: 2021, price: null },
        { id: newId(), name: "DeLorean DMC-12", images: [], realYear: 1981, modelYear: 2023, price: null }
      ];
    }
    collection.cars.forEach(ensureId);
    saveCollection();
  } catch (err) { console.error('Ошибка загрузки данных:', err); }
}
