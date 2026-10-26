<script setup>
// Панель поверх экрана: на телефоне выезжает снизу, на ПК — окно по центру
defineProps({ level: { type: Number, default: 0 } });
defineEmits(['close']);
</script>

<template>
  <div class="sheet" :style="{ zIndex: 100 + level }">
    <div class="sheet-overlay" @click="$emit('close')"></div>
    <section class="sheet-panel" role="dialog" aria-modal="true">
      <div class="sheet-grabber"></div>
      <slot />
    </section>
  </div>
</template>

<style scoped>
.sheet {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.sheet-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, .6);
  backdrop-filter: blur(3px);
}
.sheet-panel {
  position: relative;
  width: 100%;
  max-width: 560px;
  max-height: calc(100% - var(--safe-top) - 24px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 8px 20px calc(24px + var(--safe-bottom));
  border-radius: 26px 26px 0 0;
  background: var(--surface);
  box-shadow: var(--shadow);
}
.sheet-grabber {
  width: 40px;
  height: 4px;
  margin: 0 auto 14px;
  border-radius: 2px;
  background: var(--surface-3);
}
@media (min-width: 720px) {
  .sheet { align-items: center; padding: 24px; }
  .sheet-panel { max-height: 88vh; border-radius: 26px; padding-bottom: 24px; }
  .sheet-grabber { display: none; }
}
</style>
