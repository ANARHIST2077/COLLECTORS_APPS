<script setup>
// Каркас приложения: экраны, нижняя навигация, кнопка «+», панели и всплывающие сообщения
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { CarFront, ChartColumn, Settings, Plus } from 'lucide-vue-next';

import GarageView from './components/GarageView.vue';
import StatsView from './components/StatsView.vue';
import SettingsView from './components/SettingsView.vue';
import BottomSheet from './components/BottomSheet.vue';
import CarDetails from './components/CarDetails.vue';
import CarForm from './components/CarForm.vue';
import DeleteConfirm from './components/DeleteConfirm.vue';
import ToastHost from './components/ToastHost.vue';
import { sheets, openSheet, closeSheet } from './composables/sheets.js';

const tabs = [
  { id: 'garage', label: 'Гараж', icon: CarFront, view: GarageView },
  { id: 'stats', label: 'Статистика', icon: ChartColumn, view: StatsView },
  { id: 'settings', label: 'Настройки', icon: Settings, view: SettingsView }
];
const sheetViews = { car: CarDetails, form: CarForm, delete: DeleteConfirm };

const tab = ref('garage');
const currentView = () => tabs.find(t => t.id === tab.value).view;

// «Назад»: закрыть панель → вернуться в гараж → свернуть приложение
function goBack() {
  if (sheets.length) closeSheet();
  else if (tab.value !== 'garage') tab.value = 'garage';
  else return false;
  return true;
}

function onKeydown(e) {
  if (e.key === 'Escape') goBack();
}

let backListener = null;
onMounted(async () => {
  window.addEventListener('keydown', onKeydown);
  if (Capacitor.isNativePlatform()) {
    backListener = await NativeApp.addListener('backButton', () => {
      if (!goBack()) NativeApp.minimizeApp();
    });
  }
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  backListener?.remove();
});
</script>

<template>
  <!-- общий радужный градиент для звезды избранного (используется в style.css) -->
  <svg width="0" height="0" style="position: absolute" aria-hidden="true">
    <defs>
      <linearGradient id="holo-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ff9a9e" />
        <stop offset=".25" stop-color="#fbd786" />
        <stop offset=".5" stop-color="#9be7ff" />
        <stop offset=".75" stop-color="#c3b5ff" />
        <stop offset="1" stop-color="#f2f2f7" />
      </linearGradient>
    </defs>
  </svg>

  <main class="screen">
    <Transition name="screen" mode="out-in">
      <KeepAlive>
        <component :is="currentView()" :key="tab" />
      </KeepAlive>
    </Transition>
  </main>

  <Transition name="fab">
    <button v-if="tab === 'garage'" class="fab" aria-label="Добавить машинку" @click="openSheet('form')">
      <Plus />
    </button>
  </Transition>

  <nav class="bottom-nav">
    <button
      v-for="t in tabs"
      :key="t.id"
      class="nav-item"
      :class="{ active: tab === t.id }"
      :aria-current="tab === t.id ? 'page' : undefined"
      @click="tab = t.id"
    >
      <component :is="t.icon" />
      <span>{{ t.label }}</span>
    </button>
  </nav>

  <TransitionGroup name="sheet">
    <BottomSheet v-for="(s, i) in sheets" :key="s.id" :level="i" @close="closeSheet">
      <component :is="sheetViews[s.type]" v-bind="s.props" />
    </BottomSheet>
  </TransitionGroup>

  <ToastHost />
</template>

<style>
.screen {
  max-width: 1200px;
  margin: 0 auto;
  padding: calc(var(--safe-top) + 16px) 16px calc(var(--nav-height) + var(--safe-bottom) + 96px);
  min-height: 100vh;
}

/* смена экранов */
.screen-enter-active, .screen-leave-active { transition: opacity .18s, transform .18s var(--ease); }
.screen-enter-from { opacity: 0; transform: translateY(8px); }
.screen-leave-to { opacity: 0; }

/* ====== Нижняя навигация ====== */
.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  justify-content: center;
  gap: 8px;
  height: calc(var(--nav-height) + var(--safe-bottom));
  padding: 6px 12px var(--safe-bottom);
  background: rgba(14, 14, 18, .88);
  backdrop-filter: blur(16px);
  border-top: 1px solid var(--border);
}
.nav-item {
  flex: 1;
  max-width: 140px;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 3px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: var(--faint);
  font-size: 11px;
  font-weight: 650;
  transition: color .2s;
}
.nav-item svg { width: 24px; height: 24px; transition: transform .25s var(--ease); }
.nav-item.active { color: var(--accent-hot); }
.nav-item.active svg { transform: translateY(-2px) scale(1.08); }

/* ====== Кнопка «+» ====== */
.fab {
  position: fixed;
  right: max(20px, calc((100vw - 1200px) / 2 + 20px));
  bottom: calc(var(--nav-height) + var(--safe-bottom) + 18px);
  z-index: 60;
  display: grid;
  place-items: center;
  width: 60px;
  height: 60px;
  border: none;
  border-radius: 50%;
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--flame));
  box-shadow: 0 8px 24px rgba(242, 84, 27, .45);
  transition: transform .2s var(--ease);
}
.fab:hover { transform: scale(1.06) rotate(90deg); }
.fab:active { transform: scale(.94); }
.fab svg { width: 30px; height: 30px; }
.fab-enter-active, .fab-leave-active { transition: transform .25s var(--ease), opacity .2s; }
.fab-enter-from, .fab-leave-to { transform: scale(0); opacity: 0; }

/* ====== Панели: выезжают снизу (на ПК — окно по центру) ====== */
.sheet-enter-active, .sheet-leave-active { transition: opacity .3s var(--ease); }
.sheet-enter-active .sheet-panel, .sheet-leave-active .sheet-panel { transition: transform .3s var(--ease); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet-panel, .sheet-leave-to .sheet-panel { transform: translateY(100%); }
@media (min-width: 720px) {
  .sheet-enter-from .sheet-panel, .sheet-leave-to .sheet-panel { transform: translateY(24px) scale(.96); }
}
</style>
