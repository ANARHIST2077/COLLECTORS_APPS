// Модель машинки — чистый JS, без Node и DOM

export function safeParseInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

// Приводит машинку из любого старого формата к текущему
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
