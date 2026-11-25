<script setup>
// Карточка в гараже: нажатие — просмотр; снизу кнопки «в избранное» и «изменить».
// Избранная карточка — с радужной рамкой и бликом по фото.
import { computed } from 'vue';
import { Images, Star, Pencil } from 'lucide-vue-next';
import { imageUrl, toggleFavorite } from '../collection.js';
import { openSheet } from '../composables/sheets.js';
import { toast } from '../composables/toast.js';
import { formatPrice, PLACEHOLDER_IMAGE } from '../composables/format.js';

const props = defineProps({ car: { type: Object, required: true } });

const cover = computed(() => props.car.images.length ? imageUrl(props.car.images[0]) : PLACEHOLDER_IMAGE);

function onFavorite() {
  toggleFavorite(props.car);
  toast(props.car.favorite ? 'Добавлена в избранное' : 'Убрана из избранного');
}
</script>

<template>
  <article class="card" :class="{ holo: car.favorite }" :data-id="car.id">
    <button class="card-main" @click="openSheet('car', { carId: car.id })">
      <div class="card-photo" :class="{ 'holo-sheen': car.favorite }">
        <img :src="cover" :alt="car.name || 'Машинка'" loading="lazy" />
        <span v-if="car.images.length > 1" class="card-count"><Images />{{ car.images.length }}</span>
      </div>
      <div class="card-body">
        <h3>{{ car.name || 'Без названия' }}</h3>
        <div class="card-tags">
          <span v-if="car.modelYear" class="tag tag-blue">{{ car.modelYear }}</span>
          <span v-if="car.price" class="tag">{{ formatPrice(car.price) }}</span>
        </div>
      </div>
    </button>

    <div class="card-actions">
      <button
        class="card-action"
        :class="{ 'star-on': car.favorite }"
        :aria-pressed="car.favorite"
        :aria-label="car.favorite ? 'Убрать из избранного' : 'В избранное'"
        @click="onFavorite"
      >
        <Star />
      </button>
      <button class="card-action" aria-label="Изменить" @click="openSheet('form', { carId: car.id })">
        <Pencil />
      </button>
    </div>
  </article>
</template>

<style scoped>
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  transition: transform .2s var(--ease), border-color .2s, box-shadow .2s;
}
.card.holo { border-color: transparent; }
.card.holo::before { inset: -1px; }
@media (hover: hover) {
  .card:hover { transform: translateY(-3px); box-shadow: 0 10px 24px rgba(0, 0, 0, .35); }
  .card:not(.holo):hover { border-color: var(--accent); }
}

.card-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  border-radius: var(--radius) var(--radius) 0 0;
  overflow: hidden;
  transition: transform .2s var(--ease);
}
.card-main:active { transform: scale(.98); }

.card-photo {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--surface-2);
  overflow: hidden;
}
.card-photo img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.card-count {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 7px;
  border-radius: 8px;
  background: rgba(0, 0, 0, .65);
  font-size: 11px;
  font-weight: 700;
}
.card-count svg { width: 13px; height: 13px; }

.card-body { display: grid; gap: 8px; padding: 10px 12px 10px; }
.card-body h3 {
  margin: 0;
  font-size: 13.5px;
  font-weight: 800;
  line-height: 1.25;
  text-transform: uppercase;
  letter-spacing: .02em;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.5em;
}
.card-tags { display: flex; gap: 6px; flex-wrap: wrap; min-height: 22px; }

/* полоска кнопок, как у Hot Wheels: сегменты в скруглённой рамке */
.card-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  margin: 0 12px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  overflow: hidden;
}
.card-action {
  display: grid;
  place-items: center;
  height: 34px;
  border: none;
  background: transparent;
  color: var(--muted);
  transition: background .2s, color .2s;
}
.card-action + .card-action { border-left: 1px solid var(--border); }
.card-action:hover { background: var(--surface-2); color: var(--text); }
.card-action:active svg { transform: scale(.85); }
.card-action svg { width: 17px; height: 17px; transition: transform .2s var(--ease); }
.card-action.star-on svg { animation: star-pop .35s var(--ease); }
@keyframes star-pop { 50% { transform: scale(1.35) rotate(-12deg); } }
</style>
