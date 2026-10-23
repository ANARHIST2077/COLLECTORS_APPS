// Выгрузка и загрузка коллекции файлом (перенос между устройствами)
import { normalizeCar, createCar } from '../core/car.js';
import { collection, activeCars, saveCollection } from '../collection.js';
import * as storage from '../storage/electron-storage.js';
import { refreshGarage } from './garage.js';

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

//Экспорт коллекции
exportBtn.addEventListener('click', async () => {
  const exportData = [];

  for (const car of activeCars()) {
    const carCopy = { ...car };

    // фото конвертируем в base64
    carCopy.imagesBase64 = [];
    for (const imgRef of car.images || []) {
      carCopy.imagesBase64.push(await storage.readImageAsDataUrl(imgRef));
    }

    exportData.push(carCopy);
  }

  // создаём blob и "скачиваем"
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'hotwheels_collection.json';
  a.click();
  URL.revokeObjectURL(url);
});

//Импорт коллекции
importBtn.addEventListener('click', () => importFile.click());

importFile.addEventListener('change', async () => {
  const file = importFile.files[0];
  if (!file) return;

  const text = await file.text();
  let importedCars;
  try {
    importedCars = JSON.parse(text);
  } catch (err) {
    alert('Ошибка: файл повреждён или неверного формата');
    return;
  }

  // каждая машинка из файла — новая запись со своим id
  for (const rawCar of importedCars) {
    const car = createCar(normalizeCar(rawCar));

    for (const base64 of rawCar.imagesBase64 || []) {
      const name = await storage.storeImage(base64);
      if (name) car.images.push(name);
    }

    collection.cars.push(car);
  }

  saveCollection();
  refreshGarage();
  alert('Коллекция загружена!');

  importFile.value = ''; // очищаем input, чтобы можно было выбрать файл снова
});
