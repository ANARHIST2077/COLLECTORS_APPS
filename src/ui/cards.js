// Карточка машинки в гараже
import { getImageUrl } from '../storage/electron-storage.js';

export function renderCard(car, container, { onOpen, onDelete } = {}) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = car.id;

  // Удалить
  const delBtn = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.textContent = '×';
  card.appendChild(delBtn);
  delBtn.addEventListener('click', e => { e.stopPropagation(); onDelete?.(car.id); });

  // Изображение
  const imgEl = document.createElement('img');
  imgEl.className = 'car-thumb';
  imgEl.src = (car.images && car.images.length > 0) ? getImageUrl(car.images[0]) :'picture_work/zagluh_card.jpg';
  imgEl.alt = car.name || 'car';
  card.appendChild(imgEl);

  // Название
  const titleEl = document.createElement('h2');
  titleEl.textContent = car.name || 'Unnamed';
  card.appendChild(titleEl);

  // Детали
  const realP = document.createElement('p');
  realP.textContent = `Real Year: ${car.realYear ?? '-'}`;
  card.appendChild(realP);

  const modelP = document.createElement('p');
  modelP.textContent = `Model Year: ${car.modelYear ?? '-'}`;
  card.appendChild(modelP);

  const priceP = document.createElement('p');
  priceP.textContent = car.price ? `${car.price} ₽` : '-';
  card.appendChild(priceP);

  // Открытие просмотра
  card.addEventListener('click', () => onOpen?.(car));

  container.appendChild(card);
}
