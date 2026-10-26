<script setup>
// Добавление и редактирование машинки. Порядок фото меняется перетаскиванием — мышью и пальцем.
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import Sortable from 'sortablejs';
import { ImagePlus, X } from 'lucide-vue-next';
import { safeParseInt } from '../core/car.js';
import { collection, addCar, updateCar, filesToImages, imageUrl } from '../collection.js';
import { closeSheet } from '../composables/sheets.js';
import { toast } from '../composables/toast.js';

const props = defineProps({ carId: { type: String, default: null } });

const car = computed(() => props.carId ? collection.cars.find(c => c.id === props.carId) : null);

const form = reactive({
  name: car.value?.name ?? '',
  realYear: car.value?.realYear ?? '',
  modelYear: car.value?.modelYear ?? '',
  price: car.value?.price ?? ''
});
const images = ref([...(car.value?.images ?? [])]);
const loadingPhotos = ref(false);
const nameError = ref(false);

async function onFiles(e) {
  const files = [...e.target.files];
  e.target.value = '';
  if (!files.length) return;
  loadingPhotos.value = true;
  try {
    images.value.push(...await filesToImages(files));
  } catch (err) {
    console.error(err);
    toast('Не удалось добавить фото', 'error');
  } finally {
    loadingPhotos.value = false;
  }
}

function removePhoto(i) {
  images.value.splice(i, 1);
}

function save() {
  const name = form.name.trim();
  if (!name) { nameError.value = true; return; }
  const fields = {
    name,
    realYear: safeParseInt(form.realYear),
    modelYear: safeParseInt(form.modelYear),
    price: safeParseInt(form.price)
  };
  if (car.value) updateCar(car.value, fields, [...images.value]);
  else addCar(fields, [...images.value]);
  closeSheet();
  toast(car.value ? 'Изменения сохранены' : 'Машинка добавлена');
}

// ====== Перетаскивание фото ======
const photosEl = ref(null);
let sortable = null;

onMounted(() => {
  sortable = Sortable.create(photosEl.value, {
    animation: 220,
    draggable: '.photo',
    filter: '.photo-remove',
    preventOnFilter: false,
    delay: 150,             // на телефоне — после короткого удержания, чтобы не мешать прокрутке
    delayOnTouchOnly: true,
    ghostClass: 'photo-ghost',
    chosenClass: 'photo-chosen',
    onEnd({ item, from, oldIndex, newIndex, oldDraggableIndex, newDraggableIndex }) {
      if (oldIndex === newIndex) return;
      // возвращаем элемент на место — порядок по массиву перестроит сам Vue
      from.removeChild(item);
      from.insertBefore(item, from.children[oldIndex] ?? null);
      const [moved] = images.value.splice(oldDraggableIndex, 1);
      images.value.splice(newDraggableIndex, 0, moved);
    }
  });
});
onBeforeUnmount(() => sortable?.destroy());
</script>

<template>
  <form class="car-form" @submit.prevent="save">
    <h2>{{ car ? 'Изменить машинку' : 'Новая машинка' }}</h2>

    <label class="field">
      <span>Название *</span>
      <input
        v-model="form.name"
        class="input"
        :class="{ invalid: nameError }"
        placeholder="Например, Nissan Skyline GT-R"
        @input="nameError = false"
      />
      <small v-if="nameError" class="error">Введите название</small>
    </label>

    <div class="row">
      <label class="field">
        <span>Год модели</span>
        <input v-model="form.modelYear" class="input" type="number" inputmode="numeric" placeholder="2024" />
      </label>
      <label class="field">
        <span>Год реальной машины</span>
        <input v-model="form.realYear" class="input" type="number" inputmode="numeric" placeholder="1989" />
      </label>
    </div>

    <label class="field">
      <span>Стоимость, ₽</span>
      <input v-model="form.price" class="input" type="number" inputmode="numeric" placeholder="0" />
    </label>

    <div class="field">
      <span>Фото <em v-if="images.length > 1">— перетащите, чтобы поменять порядок, первое — обложка</em></span>
      <div ref="photosEl" class="photos">
        <div v-for="(img, i) in images" :key="img + i" class="photo">
          <img :src="imageUrl(img)" alt="" draggable="false" />
          <span v-if="i === 0" class="photo-cover">Обложка</span>
          <button type="button" class="photo-remove" aria-label="Убрать фото" @click="removePhoto(i)"><X /></button>
        </div>
        <label class="photo-add" :class="{ busy: loadingPhotos }">
          <span v-if="loadingPhotos" class="spinner"></span>
          <template v-else><ImagePlus /><span>Добавить</span></template>
          <input type="file" accept="image/*" multiple hidden @change="onFiles" />
        </label>
      </div>
    </div>

    <div class="actions">
      <button type="button" class="btn btn-ghost" @click="closeSheet">Отмена</button>
      <button type="submit" class="btn btn-primary" :disabled="loadingPhotos">Сохранить</button>
    </div>
  </form>
</template>

<style scoped>
.car-form { display: grid; gap: 14px; }
h2 { margin: 0 0 4px; font-family: var(--font-display); font-size: 24px; text-transform: uppercase; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.input.invalid { border-color: var(--danger); }
.error { color: var(--danger); font-size: 12.5px; }
em { font-style: normal; color: var(--faint); font-weight: 500; }

.photos { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; }
.photo, .photo-add {
  position: relative;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
}
.photo { background: var(--surface-2); cursor: grab; touch-action: manipulation; }
.photo img { width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
.photo-cover {
  position: absolute;
  left: 6px;
  bottom: 6px;
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--accent);
  font-size: 10.5px;
  font-weight: 700;
}
.photo-remove {
  position: absolute;
  top: 5px;
  right: 5px;
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, .7);
  color: #fff;
}
.photo-remove svg { width: 15px; height: 15px; }
.photo-ghost { opacity: .35; }
.photo-chosen { transform: scale(1.04); box-shadow: 0 8px 20px rgba(0, 0, 0, .5); }
.photo-add {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 4px;
  border: 1.5px dashed var(--surface-3);
  color: var(--muted);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color .2s, color .2s;
}
.photo-add:hover { border-color: var(--accent); color: var(--text); }
.photo-add svg { width: 24px; height: 24px; }

.actions { display: grid; grid-template-columns: 1fr 2fr; gap: 10px; margin-top: 6px; }
</style>
