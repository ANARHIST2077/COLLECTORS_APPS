// Открытые панели (карточка, форма, удаление) — стопкой: «Назад» и Esc закрывают верхнюю
import { reactive } from 'vue';

export const sheets = reactive([]);

// type: 'car' | 'form' | 'delete'
export function openSheet(type, props = {}) {
  sheets.push({ id: crypto.randomUUID(), type, props });
}

export function closeSheet() {
  sheets.pop();
}

export function closeAllSheets() {
  sheets.splice(0);
}
