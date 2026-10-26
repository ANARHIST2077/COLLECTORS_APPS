<script setup>
import { CircleCheck, CircleAlert } from 'lucide-vue-next';
import { toasts } from '../composables/toast.js';
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.kind">
        <CircleAlert v-if="t.kind === 'error'" />
        <CircleCheck v-else />
        <span>{{ t.text }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  left: 50%;
  bottom: calc(var(--nav-height) + var(--safe-bottom) + 90px);
  z-index: 500;
  display: grid;
  gap: 8px;
  transform: translateX(-50%);
  pointer-events: none;
  width: max-content;
  max-width: calc(100vw - 32px);
}
.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 14px;
  background: var(--surface-3);
  box-shadow: var(--shadow);
  font-weight: 600;
}
.toast svg { width: 20px; height: 20px; flex: none; color: #4ade80; }
.toast.error svg { color: var(--danger); }
.toast-enter-active, .toast-leave-active { transition: all .3s var(--ease); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(16px) scale(.95); }
</style>
