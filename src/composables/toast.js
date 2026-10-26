// Короткие всплывающие сообщения внизу экрана (вместо alert)
import { reactive } from 'vue';

export const toasts = reactive([]);

// kind: 'ok' | 'error'
export function toast(text, kind = 'ok') {
  const id = crypto.randomUUID();
  toasts.push({ id, text, kind });
  setTimeout(() => {
    const i = toasts.findIndex(t => t.id === id);
    if (i !== -1) toasts.splice(i, 1);
  }, 2600);
}
