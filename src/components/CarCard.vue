<script setup>
import { computed } from 'vue';
import { Images } from 'lucide-vue-next';
import { imageUrl } from '../collection.js';
import { openSheet } from '../composables/sheets.js';
import { formatPrice, PLACEHOLDER_IMAGE } from '../composables/format.js';

const props = defineProps({ car: { type: Object, required: true } });

const cover = computed(() => props.car.images.length ? imageUrl(props.car.images[0]) : PLACEHOLDER_IMAGE);
</script>

<template>
  <button class="card" :data-id="car.id" @click="openSheet('car', { carId: car.id })">
    <div class="card-photo">
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
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  text-align: left;
  overflow: hidden;
  transition: transform .2s var(--ease), border-color .2s, box-shadow .2s;
}
.card:active { transform: scale(.97); }
@media (hover: hover) {
  .card:hover { transform: translateY(-3px); border-color: var(--accent); box-shadow: 0 10px 24px rgba(242, 84, 27, .15); }
}
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
.card-body { display: grid; gap: 8px; padding: 10px 12px 12px; }
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
</style>
