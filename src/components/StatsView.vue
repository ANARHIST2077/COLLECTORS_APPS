<script setup>
// Статистика коллекции: главные числа, распределение по годам модели, самые дорогие
import { computed } from 'vue';
import { activeCars, imageUrl } from '../collection.js';
import { openSheet } from '../composables/sheets.js';
import { carsCount, formatPrice, PLACEHOLDER_IMAGE } from '../composables/format.js';

const cars = computed(() => activeCars());
const priced = computed(() => cars.value.filter(c => c.price !== null));
const total = computed(() => priced.value.reduce((s, c) => s + c.price, 0));
const average = computed(() => priced.value.length ? Math.round(total.value / priced.value.length) : null);
const withoutPhoto = computed(() => cars.value.filter(c => !c.images.length).length);

const tiles = computed(() => [
  { label: 'Машинок', value: cars.value.length },
  { label: 'Общая стоимость', value: formatPrice(total.value) },
  { label: 'Средняя цена', value: formatPrice(average.value) },
  { label: 'Избранных', value: cars.value.filter(c => c.favorite).length },
  { label: 'Без фото', value: withoutPhoto.value }
]);

// по году модели: одна серия → один цвет, подписи значений у концов столбцов
const byYear = computed(() => {
  const map = new Map();
  for (const c of cars.value) {
    const key = c.modelYear ?? 'Без года';
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const rows = [...map.entries()].sort(([a], [b]) => (a === 'Без года') - (b === 'Без года') || b - a);
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return rows.map(([year, count]) => ({ year, count, share: count / max }));
});

const topPriced = computed(() => [...priced.value].sort((a, b) => b.price - a.price).slice(0, 5));
</script>

<template>
  <div class="stats">
    <h1>Статистика</h1>

    <div class="tiles">
      <div v-for="t in tiles" :key="t.label" class="tile">
        <span>{{ t.label }}</span>
        <strong>{{ t.value }}</strong>
      </div>
    </div>

    <section v-if="byYear.length" class="panel">
      <h2>По году модели</h2>
      <ul class="bars" role="table" aria-label="Количество машинок по году модели">
        <li v-for="row in byYear" :key="row.year" role="row" :title="`${row.year}: ${carsCount(row.count)}`">
          <span class="bar-label" role="cell">{{ row.year }}</span>
          <span class="bar-track" role="cell">
            <span class="bar" :style="{ width: `${row.share * 100}%` }"></span>
            <span class="bar-value">{{ row.count }}</span>
          </span>
        </li>
      </ul>
    </section>

    <section v-if="topPriced.length" class="panel">
      <h2>Самые дорогие</h2>
      <ol class="top">
        <li v-for="(car, i) in topPriced" :key="car.id">
          <button @click="openSheet('car', { carId: car.id })">
            <span class="top-rank">{{ i + 1 }}</span>
            <img :src="car.images.length ? imageUrl(car.images[0]) : PLACEHOLDER_IMAGE" alt="" loading="lazy" />
            <span class="top-name">{{ car.name || 'Без названия' }}</span>
            <strong>{{ formatPrice(car.price) }}</strong>
          </button>
        </li>
      </ol>
    </section>
  </div>
</template>

<style scoped>
.stats { display: grid; gap: 16px; }
h1 { margin: 8px 0 4px; font-family: var(--font-display); font-size: clamp(32px, 8vw, 44px); text-transform: uppercase; }
h2 { margin: 0 0 14px; font-size: 16px; }

.tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
.tile { display: grid; gap: 6px; padding: 16px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); }
.tile span { font-size: 12.5px; color: var(--muted); }
.tile strong { font-size: 24px; font-weight: 800; letter-spacing: -.01em; }

.panel { padding: 18px; border-radius: var(--radius); background: var(--surface); border: 1px solid var(--border); }

.bars { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.bars li { display: grid; grid-template-columns: 72px 1fr; align-items: center; gap: 10px; }
.bar-label { font-size: 13px; color: var(--muted); font-variant-numeric: tabular-nums; }
.bar-track { display: flex; align-items: center; gap: 8px; min-width: 0; }
.bar {
  height: 18px;
  min-width: 6px;
  max-width: calc(100% - 32px);
  border-radius: 0 4px 4px 0;
  background: var(--chart);
  transition: width .5s var(--ease), filter .2s;
}
.bars li:hover .bar { filter: brightness(1.15); }
.bar-value { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }

.top { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.top button {
  display: grid;
  grid-template-columns: 22px 44px 1fr auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px;
  border: none;
  border-radius: 12px;
  background: transparent;
  text-align: left;
  transition: background .2s;
}
.top button:hover { background: var(--surface-2); }
.top-rank { color: var(--muted); font-weight: 800; text-align: center; }
.top img { width: 44px; height: 44px; border-radius: 10px; object-fit: cover; }
.top-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
</style>
