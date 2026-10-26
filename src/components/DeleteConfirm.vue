<script setup>
// Удаление машинки: нужно протянуть ползунок до конца, чтобы не удалить случайно
import { ref, computed } from 'vue';
import { ChevronsRight, Trash2 } from 'lucide-vue-next';
import { collection, deleteCar } from '../collection.js';
import { closeSheet, closeAllSheets } from '../composables/sheets.js';
import { toast } from '../composables/toast.js';

const props = defineProps({ carId: { type: String, required: true } });
const car = computed(() => collection.cars.find(c => c.id === props.carId));

const trackEl = ref(null);
const knobEl = ref(null);
const x = ref(0);
const dragging = ref(false);
const done = ref(false);
let startX = 0;

const maxX = () => trackEl.value.clientWidth - knobEl.value.offsetWidth - 8;
const progress = computed(() => trackEl.value ? Math.min(1, x.value / Math.max(1, maxX())) : 0);

function onDown(e) {
  if (done.value) return;
  dragging.value = true;
  startX = e.clientX - x.value;
  try { knobEl.value.setPointerCapture(e.pointerId); } catch { /* без захвата тоже работает, пока палец на ползунке */ }
}
function onMove(e) {
  if (!dragging.value) return;
  x.value = Math.max(0, Math.min(maxX(), e.clientX - startX));
}
function onUp() {
  if (!dragging.value) return;
  dragging.value = false;
  if (x.value >= maxX() * 0.9) {
    x.value = maxX();
    done.value = true;
    setTimeout(() => {
      deleteCar(car.value);
      closeAllSheets();
      toast('Машинка удалена');
    }, 250);
  } else {
    x.value = 0;
  }
}
</script>

<template>
  <div v-if="car" class="confirm">
    <div class="confirm-icon"><Trash2 /></div>
    <h2>Удалить машинку?</h2>
    <p>«{{ car.name || 'Без названия' }}» исчезнет из гаража.</p>

    <div ref="trackEl" class="slide" :class="{ done }">
      <div class="slide-fill" :style="{ width: `calc(${x}px + 52px)` }"></div>
      <span class="slide-label" :style="{ opacity: 1 - progress }">Проведите, чтобы удалить</span>
      <button
        ref="knobEl"
        type="button"
        class="slide-knob"
        :class="{ dragging }"
        :style="{ transform: `translateX(${x}px)` }"
        aria-label="Проведите вправо, чтобы удалить"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      >
        <ChevronsRight />
      </button>
    </div>

    <button class="btn btn-ghost btn-block" @click="closeSheet">Отмена</button>
  </div>
</template>

<style scoped>
.confirm { display: grid; justify-items: center; gap: 10px; text-align: center; }
.confirm-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(255, 59, 78, .14);
  color: var(--danger);
}
.confirm-icon svg { width: 26px; height: 26px; }
h2 { margin: 4px 0 0; font-size: 21px; }
p { margin: 0 0 8px; color: var(--muted); }

.slide {
  position: relative;
  width: 100%;
  height: 60px;
  border-radius: 30px;
  background: var(--surface-2);
  overflow: hidden;
  user-select: none;
}
.slide-fill {
  position: absolute;
  inset: 0 auto 0 0;
  background: linear-gradient(90deg, rgba(255, 59, 78, .25), rgba(255, 59, 78, .55));
  border-radius: 30px;
}
.slide-label {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding-left: 40px;
  color: var(--muted);
  font-weight: 600;
  pointer-events: none;
}
.slide-knob {
  position: absolute;
  top: 4px;
  left: 4px;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: var(--danger);
  color: #fff;
  touch-action: none;
  cursor: grab;
  transition: transform .35s var(--ease);
}
.slide-knob.dragging { transition: none; cursor: grabbing; }
.slide-fill { transition: width .35s var(--ease); }
.slide:has(.dragging) .slide-fill { transition: none; }
.slide-knob svg { width: 26px; height: 26px; }
.slide.done .slide-knob { background: #22c55e; }
</style>
