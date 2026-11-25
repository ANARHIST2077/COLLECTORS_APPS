<script setup>
// Гараж: заголовок, вкладки, сортировка, фильтр по году, поиск и сетка карточек
import { ref, computed, watch } from 'vue';
import { Search, X, ArrowDownUp, CalendarDays, ChevronDown, PackageOpen } from 'lucide-vue-next';
import AppLogo from './AppLogo.vue';
import CarCard from './CarCard.vue';
import { collection, activeCars } from '../collection.js';
import { carsCount, formatPrice } from '../composables/format.js';

const SORTS = {
  new: 'Сначала новые',
  old: 'Сначала старые',
  name: 'По названию',
  priceDesc: 'Дороже',
  priceAsc: 'Дешевле',
  yearDesc: 'Год модели ↓',
  yearAsc: 'Год модели ↑',
  favFirst: 'Сначала избранные'
};

const MODES = [
  { id: 'all', label: 'Машинки' },
  { id: 'years', label: 'По годам' },
  { id: 'favorites', label: 'Избранное' }
];

// выбранная сортировка запоминается на этом устройстве
function loadSort() {
  try { return SORTS[localStorage.getItem('garage.sort')] ? localStorage.getItem('garage.sort') : 'new'; } catch { return 'new'; }
}

const mode = ref('all'); // 'all' | 'years' | 'favorites'
const modeIndex = computed(() => MODES.findIndex(m => m.id === mode.value));
const sort = ref(loadSort());
const year = ref('');
const query = ref('');

watch(sort, v => { try { localStorage.setItem('garage.sort', v); } catch { /* не важно */ } });

const allCars = computed(() => activeCars());

const years = computed(() =>
  [...new Set(allCars.value.map(c => c.modelYear).filter(y => y !== null))].sort((a, b) => b - a)
);
watch(years, ys => { if (year.value && !ys.includes(Number(year.value))) year.value = ''; });

// порядок добавления: даты могут совпадать (перенос из старой версии), тогда — по месту в коллекции
const order = computed(() => new Map(collection.cars.map((c, i) => [c.id, i])));
const byNumber = (a, b, dir) => (a ?? -Infinity) === (b ?? -Infinity) ? 0 : ((a ?? -Infinity) - (b ?? -Infinity)) * dir;

const visible = computed(() => {
  const q = query.value.trim().toLowerCase();
  let list = allCars.value.filter(c =>
    (!q || (c.name || '').toLowerCase().includes(q)) &&
    (!year.value || String(c.modelYear) === year.value) &&
    (mode.value !== 'favorites' || c.favorite)
  );

  const added = (a, b) => (a.createdAt.localeCompare(b.createdAt)) || (order.value.get(a.id) - order.value.get(b.id));
  const compare = {
    new: (a, b) => added(b, a),
    old: added,
    name: (a, b) => (a.name || '').localeCompare(b.name || '', 'ru'),
    priceDesc: (a, b) => byNumber(a.price, b.price, -1) || added(b, a),
    priceAsc: (a, b) => byNumber(a.price ?? Infinity, b.price ?? Infinity, 1) || added(b, a),
    yearDesc: (a, b) => byNumber(a.modelYear, b.modelYear, -1) || added(b, a),
    yearAsc: (a, b) => byNumber(a.modelYear ?? Infinity, b.modelYear ?? Infinity, 1) || added(b, a),
    favFirst: (a, b) => (b.favorite - a.favorite) || added(b, a)
  }[sort.value];

  return [...list].sort(compare);
});

const total = computed(() => visible.value.reduce((sum, c) => sum + (c.price ?? 0), 0));
const isFiltered = computed(() => !!query.value.trim() || !!year.value || mode.value === 'favorites');

// вкладка «По годам»: группы по году модели, новые сверху
const groups = computed(() => {
  const map = new Map();
  for (const car of visible.value) {
    const key = car.modelYear ?? 'none';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(car);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a === 'none') - (b === 'none') || b - a)
    .map(([key, cars]) => ({ key, title: key === 'none' ? 'Без года' : key, cars }));
});
</script>

<template>
  <div class="garage">
    <header class="garage-head">
      <h1>Мой гараж</h1>
      <AppLogo />
    </header>

    <div class="segmented" role="tablist">
      <span class="segmented-pill" :style="{ transform: `translateX(${modeIndex * 100}%)` }"></span>
      <button
        v-for="m in MODES"
        :key="m.id"
        role="tab"
        :aria-selected="mode === m.id"
        :class="{ active: mode === m.id }"
        @click="mode = m.id"
      >{{ m.label }}</button>
    </div>

    <div class="chips">
      <label class="chip">
        <ArrowDownUp />
        <select v-model="sort" aria-label="Сортировка">
          <option v-for="(label, key) in SORTS" :key="key" :value="key">{{ label }}</option>
        </select>
        <ChevronDown class="chip-caret" />
      </label>
      <label class="chip" :class="{ active: year }">
        <CalendarDays />
        <select v-model="year" aria-label="Год модели">
          <option value="">Все годы</option>
          <option v-for="y in years" :key="y" :value="String(y)">{{ y }}</option>
        </select>
        <ChevronDown class="chip-caret" />
      </label>
    </div>

    <div class="search">
      <Search />
      <input v-model="query" type="search" placeholder="Поиск по названию" aria-label="Поиск по названию" />
      <Transition name="pop">
        <button v-if="query" class="search-clear" aria-label="Очистить поиск" @click="query = ''"><X /></button>
      </Transition>
    </div>

    <p class="summary">
      <strong>{{ carsCount(visible.length) }}</strong>
      <template v-if="isFiltered"> из {{ allCars.length }}</template>
      · {{ formatPrice(total) }}
    </p>

    <Transition name="screen" mode="out-in">
      <div v-if="!visible.length" key="empty" class="empty">
        <PackageOpen />
        <p v-if="mode === 'favorites' && !query.trim() && !year">Избранных пока нет — нажмите ★ на карточке</p>
        <p v-else-if="isFiltered">Ничего не найдено</p>
        <p v-else>В гараже пусто — нажмите «+», чтобы добавить первую машинку</p>
      </div>

      <TransitionGroup v-else-if="mode !== 'years'" key="all" name="grid" tag="div" class="grid">
        <CarCard v-for="car in visible" :key="car.id" :car="car" />
      </TransitionGroup>

      <div v-else key="years" class="year-groups">
        <section v-for="g in groups" :key="g.key">
          <h2 class="year-title">{{ g.title }} <span>{{ carsCount(g.cars.length) }}</span></h2>
          <TransitionGroup name="grid" tag="div" class="grid">
            <CarCard v-for="car in g.cars" :key="car.id" :car="car" />
          </TransitionGroup>
        </section>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
/* заголовок в одну строку, логотип справа — как у Hot Wheels */
.garage-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 6px 0 18px;
}
.garage-head h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(24px, 7vw, 40px);
  line-height: 1;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: .01em;
}

/* ====== Вкладки с плавающей подложкой ====== */
.segmented {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  max-width: 520px;
  padding: 4px;
  margin-bottom: 12px;
  border-radius: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
}
.segmented-pill {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc((100% - 8px) / 3);
  border-radius: 11px;
  background: linear-gradient(135deg, var(--accent), var(--accent-hot));
  transition: transform .3s var(--ease);
}
.segmented button {
  position: relative;
  min-height: 38px;
  border: none;
  background: transparent;
  color: var(--muted);
  font-weight: 700;
  font-size: 14px;
  transition: color .25s;
}
.segmented button.active { color: #fff; }

/* ====== Чипсы ====== */
.chips { display: flex; gap: 8px; margin-bottom: 12px; overflow-x: auto; scrollbar-width: none; }
.chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex: none;
  height: 38px;
  padding: 0 10px 0 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  font-size: 13.5px;
  font-weight: 600;
  transition: border-color .2s, background .2s;
}
.chip.active { border-color: var(--accent); background: rgba(242, 84, 27, .12); }
.chip svg { width: 16px; height: 16px; color: var(--muted); flex: none; }
.chip select {
  appearance: none;
  border: none;
  background: transparent;
  padding-right: 18px;
  margin-right: -18px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
}
.chip select option { background: var(--surface-2); }
.chip-caret { pointer-events: none; }

/* ====== Поиск ====== */
.search {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 6px 0 14px;
  margin-bottom: 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--surface);
  transition: border-color .2s;
}
.search:focus-within { border-color: var(--accent); }
.search > svg { width: 20px; height: 20px; color: var(--muted); flex: none; }
.search input { flex: 1; min-width: 0; border: none; background: transparent; outline: none; }
.search input::-webkit-search-cancel-button { display: none; }
.search-clear { display: grid; place-items: center; width: 36px; height: 36px; border: none; border-radius: 10px; background: var(--surface-2); }
.search-clear svg { width: 18px; height: 18px; }
.pop-enter-active, .pop-leave-active { transition: transform .2s var(--ease), opacity .2s; }
.pop-enter-from, .pop-leave-to { transform: scale(.6); opacity: 0; }

.summary { margin: 4px 2px 14px; color: var(--muted); font-size: 13.5px; }
.summary strong { color: var(--text); }

/* ====== Сетка ====== */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 12px;
}
@media (min-width: 720px) { .grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; } }

.grid-move { transition: transform .4s var(--ease); }
.grid-enter-active { transition: opacity .35s var(--ease), transform .35s var(--ease); }
.grid-enter-from { opacity: 0; transform: scale(.9); }
.grid-leave-active { display: none; }

.year-groups { display: grid; gap: 26px; }
.year-title {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 12px;
  font-family: var(--font-display);
  font-size: 26px;
}
.year-title span { font-family: var(--font); font-size: 13px; font-weight: 600; color: var(--muted); }

.empty { display: grid; justify-items: center; gap: 10px; padding: 48px 16px; color: var(--muted); text-align: center; }
.empty svg { width: 48px; height: 48px; color: var(--faint); }
.empty p { margin: 0; max-width: 280px; }
</style>
