// Форматирование чисел и слов для интерфейса

const money = new Intl.NumberFormat('ru-RU');

export function formatPrice(value) {
  return value === null || value === undefined ? '—' : `${money.format(value)} ₽`;
}

// plural(5, ['машинка', 'машинки', 'машинок']) → 'машинок'
export function plural(n, [one, few, many]) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return one;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
  return many;
}

export function carsCount(n) {
  return `${n} ${plural(n, ['машинка', 'машинки', 'машинок'])}`;
}

export function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
}

export const PLACEHOLDER_IMAGE = 'picture_work/zagluh_card.jpg';
