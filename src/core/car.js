// Модель машинки — чистый JS, без Node и DOM

// Версия формата collection.json
export const SCHEMA_VERSION = 2;

export function safeParseInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

// Приводит машинку из старого формата (V1, файлы экспорта) к простому виду
export function normalizeCar(raw) {
  if (!raw || typeof raw !== 'object') raw = {};
  const name = raw.name ?? raw.title ?? null;
  let images = raw.images ?? (raw.image ? [raw.image] : []);
  images = Array.isArray(images) ? images.map(i => i) : [];
  const realYear = safeParseInt(raw.realYear ?? raw.real_year ?? raw.real ?? null);
  const modelYear = safeParseInt(raw.modelYear ?? raw.model_year ?? raw.model ?? raw.year ?? null);
  const price = safeParseInt(raw.price ?? raw.cost ?? raw.Price ?? null);
  const id = (typeof raw.id === 'number' || typeof raw.id === 'string') ? Number(raw.id) : null;
  return { id, name, images, realYear, modelYear, price };
}

function nowIso() {
  return new Date().toISOString();
}

// Новая машинка: свой UUID и даты — чтобы при синхронизации устройств не было конфликтов id
export function createCar({ name = null, realYear = null, modelYear = null, price = null } = {}, now = nowIso()) {
  return {
    id: crypto.randomUUID(),
    name,
    realYear,
    modelYear,
    price,
    images: [], // имена файлов в папке images (или ссылки, которые не удалось сохранить)
    createdAt: now,
    updatedAt: now,
    deleted: false // удаление — пометка, а не стирание (нужно для синхронизации)
  };
}

// Машинка из collection.json
export function fromStored(raw) {
  const car = createCar({
    name: raw.name ?? null,
    realYear: safeParseInt(raw.realYear),
    modelYear: safeParseInt(raw.modelYear),
    price: safeParseInt(raw.price)
  });
  if (typeof raw.id === 'string' && raw.id) car.id = raw.id;
  car.images = Array.isArray(raw.images) ? raw.images.filter(i => typeof i === 'string') : [];
  if (raw.createdAt) car.createdAt = raw.createdAt;
  car.updatedAt = raw.updatedAt ?? car.createdAt;
  car.deleted = raw.deleted === true;
  return car;
}

// Отметить изменение
export function touch(car) {
  car.updatedAt = nowIso();
}
