<script setup>
// Просмотр машинки: фото листаются пальцем (на ПК — стрелками), детали, кнопки «Изменить» и «Удалить»
import { ref, computed } from 'vue';
import { ChevronLeft, ChevronRight, Pencil, Trash2, Star } from 'lucide-vue-next';
import { collection, imageUrl, toggleFavorite } from '../collection.js';
import { openSheet } from '../composables/sheets.js';
import { formatPrice, formatDate, PLACEHOLDER_IMAGE } from '../composables/format.js';

const props = defineProps({ carId: { type: String, required: true } });

const car = computed(() => collection.cars.find(c => c.id === props.carId && !c.deleted));
const photos = computed(() => car.value?.images.length ? car.value.images.map(imageUrl) : [PLACEHOLDER_IMAGE]);

const track = ref(null);
const current = ref(0);

function onScroll() {
  const el = track.value;
  current.value = Math.round(el.scrollLeft / el.clientWidth);
}

function go(i) {
  const el = track.value;
  const n = photos.value.length;
  el.scrollTo({ left: ((i + n) % n) * el.clientWidth, behavior: 'smooth' });
}
</script>

<template>
  <div v-if="car" class="details">
    <div class="gallery" :class="{ holo: car.favorite, 'holo-sheen': car.favorite }">
      <div ref="track" class="gallery-track" @scroll.passive="onScroll">
        <img v-for="(src, i) in photos" :key="i + src" :src="src" :alt="`${car.name || 'Машинка'}, фото ${i + 1}`" />
      </div>
      <template v-if="photos.length > 1">
        <button class="gallery-arrow left" aria-label="Предыдущее фото" @click="go(current - 1)"><ChevronLeft /></button>
        <button class="gallery-arrow right" aria-label="Следующее фото" @click="go(current + 1)"><ChevronRight /></button>
        <div class="gallery-dots">
          <span v-for="(_, i) in photos" :key="i" :class="{ active: i === current }" @click="go(i)"></span>
        </div>
      </template>
    </div>

    <div class="title-row">
      <h2>{{ car.name || 'Без названия' }}</h2>
      <button
        class="icon-btn fav-btn"
        :class="{ 'star-on': car.favorite }"
        :aria-pressed="car.favorite"
        :aria-label="car.favorite ? 'Убрать из избранного' : 'В избранное'"
        @click="toggleFavorite(car)"
      >
        <Star />
      </button>
    </div>

    <dl class="facts">
      <div><dt>Год модели</dt><dd>{{ car.modelYear ?? '—' }}</dd></div>
      <div><dt>Год реальной машины</dt><dd>{{ car.realYear ?? '—' }}</dd></div>
      <div><dt>Стоимость</dt><dd>{{ formatPrice(car.price) }}</dd></div>
      <div><dt>Добавлена</dt><dd>{{ formatDate(car.createdAt) }}</dd></div>
    </dl>

    <div class="actions">
      <button class="btn btn-primary" @click="openSheet('form', { carId: car.id })"><Pencil />Изменить</button>
      <button class="btn btn-danger" @click="openSheet('delete', { carId: car.id })"><Trash2 />Удалить</button>
    </div>
  </div>
</template>

<style scoped>
.details { display: grid; gap: 16px; }

.gallery { position: relative; margin: 0 -8px; border-radius: 18px; }
.gallery-track {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  border-radius: 18px;
  background: var(--surface-2);
}
.gallery-track::-webkit-scrollbar { display: none; }
.gallery-track img {
  flex: 0 0 100%;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: contain;
  scroll-snap-align: center;
}
.gallery-arrow {
  position: absolute;
  top: 50%;
  display: none;
  place-items: center;
  width: 38px;
  height: 38px;
  margin-top: -19px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, .55);
  color: #fff;
}
.gallery-arrow svg { width: 22px; height: 22px; }
.gallery-arrow.left { left: 10px; }
.gallery-arrow.right { right: 10px; }
@media (hover: hover) { .gallery-arrow { display: grid; } }
.gallery-dots { position: absolute; left: 0; right: 0; bottom: 10px; display: flex; justify-content: center; gap: 6px; }
.gallery-dots span {
  width: 7px;
  height: 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, .45);
  cursor: pointer;
  transition: width .25s var(--ease), background .25s;
}
.gallery-dots span.active { width: 20px; background: #fff; }

.title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.fav-btn { flex: none; width: 44px; height: 44px; }
.fav-btn svg { width: 22px; height: 22px; }

h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 26px;
  line-height: 1.1;
  text-transform: uppercase;
}

.facts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 0; }
.facts div { padding: 12px 14px; border-radius: 14px; background: var(--surface-2); }
.facts dt { font-size: 12px; color: var(--muted); margin-bottom: 4px; }
.facts dd { margin: 0; font-weight: 700; font-size: 16px; }

.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
</style>
