// renderer.js — надёжный рендер-процесс с миграцией схемы
const fs = require('fs-extra');
const path = require('path');
const { pathToFileURL } = require('url');


// Получим путь userData, который мы передали через additionalArguments в main.js (fallback __dirname)
function getUserDataPathFromArgs() {
  const arg = process.argv.find(a => a && a.startsWith('--userDataPath='));
  return arg ? arg.split('=')[1] : __dirname;
}
const userDataPath = getUserDataPathFromArgs();
const dataFile = path.join(userDataPath, 'hotwheels_data.json');

// DOM элементы (некоторые могут отсутствовать — проверяем)
const container = document.getElementById('cardsContainer');
const addCarBtn = document.getElementById('addCarBtn');
const modal = document.getElementById('addCarModal');
const closeModal = document.getElementById('closeModal');
const saveCarBtn = document.getElementById('saveCarBtn');

// inputs (могут быть null если HTML старый)
const carNameInput = document.getElementById('carName');
//const carImageInput = document.getElementById('carImage');
const realYearInput = document.getElementById('realYear');
const modelYearInput = document.getElementById('modelYear');
const priceInput = document.getElementById('price');

let cars = [];
let carBeingEdited = null;
let carId = 0;

// ==== Утилиты ====
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  str = String(str);
  return str.replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function safeParseInt(v) {
  if (v === null || v === undefined) return null;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

// Normalize old objects to new schema
function normalizeCar(raw) {
  if (!raw || typeof raw !== 'object') raw = {};

  const name = raw.name ?? raw.title ?? raw.carName ?? raw.Name ?? null;

  // возможные ключи для картинки
  let image = raw.image ?? raw.imageUrl ?? raw.imageURL ?? raw.img ?? raw.carImage ?? raw.photo ?? null;

  // если в базе лежит абсолютный путь без file://, преобразуем в file URL
  try {
    if (image && typeof image === 'string' && !image.startsWith('file://') && path.isAbsolute(image)) {
      image = pathToFileURL(image).href;
    }
  } catch (err) {
    // ничего — если path.isAbsolute упадёт, оставим как есть
  }

  const realYear = safeParseInt(raw.realYear ?? raw.real_year ?? raw.real ?? null);
  const modelYear = safeParseInt(raw.modelYear ?? raw.model_year ?? raw.model ?? raw.year ?? null);
  const price = safeParseInt(raw.price ?? raw.cost ?? raw.price_rub ?? raw.Price ?? null);

  const id = (typeof raw.id === 'number' || typeof raw.id === 'string') ? Number(raw.id) : null;

  return {
    id,
    name,
    image,
    realYear,
    modelYear,
    price
  };
}


// ==== Рендер одной карточки (не меняет cars[]) ====

function renderCard(car) {
  // ensure id
  if (car.id === null || car.id === undefined) {
    car.id = carId++;
  }

  const cardId = car.id;
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = cardId;

  // === Удаляем старую разметку через innerHTML для img,
  // создаём элементы программно — это безопаснее для путей ===
  // кнопка удалить
  const delBtn = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.title = 'Удалить';
  delBtn.textContent = '×';
  card.appendChild(delBtn);

  // изображение (в src — либо file:// URL, либо заглушка)
  const imgEl = document.createElement('img');
  imgEl.className = 'car-thumb';
  imgEl.alt = car.name || 'car';
  imgEl.src = car.image || 'picture_work/zagluh_card.jpg';
  card.appendChild(imgEl);

  // название
  const titleEl = document.createElement('h2');
  titleEl.textContent = car.name || 'Unnamed';
  card.appendChild(titleEl);

  /* --- ВРЕМЕННАЯ ОТЛАДКА: показать путь к картинке под названием ---
  const pathEl = document.createElement('p');
  pathEl.className = 'img-path';
  pathEl.textContent = car.image || 'Нет картинки';
  pathEl.style.fontSize = '12px';
  pathEl.style.opacity = '0.8';
  card.appendChild(pathEl);*/

  // детали
  const realP = document.createElement('p');
  realP.textContent = `Real Year: ${car.realYear ?? '-'}`;
  card.appendChild(realP);

  const modelP = document.createElement('p');
  modelP.textContent = `Model Year: ${car.modelYear ?? '-'}`;
  card.appendChild(modelP);

  const priceP = document.createElement('p');
  priceP.textContent = car.price ? `${car.price} ₽` : '-';
  card.appendChild(priceP);

  // обработчики
  delBtn.addEventListener('click', (e) => {
    e.stopPropagation(); // чтобы не открыть модалку просмотра
    openDeleteModal(cardId);
  });

  card.addEventListener('click', () => {
    openViewModal(car);
  });

  // добавляем карточку в контейнер
  container.appendChild(card);
}


// ==== Добавление новой карточки (из формы) ====
function addCarFromForm() {
  const name = carNameInput ? carNameInput.value.trim() : '';
  //const image = carImageInput ? carImageInput.value.trim() : null;
  const realYear = realYearInput ? safeParseInt(realYearInput.value) : null;
  const modelYear = modelYearInput ? safeParseInt(modelYearInput.value) : null;
  const price = priceInput ? safeParseInt(priceInput.value) : null;

  if (!name) {
    alert('Name is required');
    return;
  }

  const newCar = {
    id: carId++,
    name,
    image: image || null,
    realYear,
    modelYear,
    price
  };

  cars.push(newCar);
  saveData();
  renderCard(newCar);

  // очистка формы и закрыть модал
  if (carNameInput) carNameInput.value = '';
  //if (carImageInput) carImageInput.value = '';
  if (realYearInput) realYearInput.value = '';
  if (modelYearInput) modelYearInput.value = '';
  if (priceInput) priceInput.value = '';
  if (modal) modal.style.display = 'none';
}

// ==== Сохранение / Загрузка ====
function saveData() {
  try {
    fs.ensureDirSync(userDataPath);
    // сохраняем нормализованные объекты
    fs.writeJsonSync(dataFile, cars, { spaces: 2 });
    // console.log('Saved', dataFile);
  } catch (err) {
    console.error('Ошибка сохранения данных:', err);
  }
}

function loadData() {
  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readJsonSync(dataFile);
      // нормализуем каждый объект (миграция)
      cars = Array.isArray(raw) ? raw.map(normalizeCar) : [];
      // назначим id если отсутствует
      let maxId = -1;
      cars.forEach(c => { if (c.id !== null && c.id !== undefined) maxId = Math.max(maxId, Number(c.id)); });
      carId = maxId + 1;
      // отрисуем все
      container && (container.innerHTML = '');
      cars.forEach(c => renderCard(c));
      // перезапишем файл уже в новой схеме (миграция)
      saveData();
    } else {
      // нет файла — создаём пару тестовых записей
      cars = [
        { id: carId++, name: "Lamborghini Countach", image: null, realYear: 1974, modelYear: 2021, price: null },
        { id: carId++, name: "DeLorean DMC-12", image: null, realYear: 1981, modelYear: 2023, price: null }
      ];
      saveData();
      container && (container.innerHTML = '');
      cars.forEach(c => renderCard(c));
    }
  } catch (err) {
    console.error('Ошибка загрузки данных:', err);
  }
}

// ==== Слушатели для модалки (если элементы есть) ====
if (addCarBtn && modal) {
  addCarBtn.addEventListener('click', () => {
    modal.style.display = 'block';
  });
}
if (closeModal && modal) {
  closeModal.addEventListener('click', () => modal.style.display = 'none');
}
// защита: только если есть saveCarBtn
const carImageFileInput = document.getElementById('carImageFile');

// защита: только если есть saveCarBtn
if (saveCarBtn) {
  saveCarBtn.addEventListener('click', async () => {
    const name = carNameInput ? carNameInput.value.trim() : '';
    const realYear = realYearInput && realYearInput.value ? realYearInput.value.trim() : '';
    const modelYear = modelYearInput && modelYearInput.value ? modelYearInput.value.trim() : '';
    const price = priceInput && priceInput.value ? priceInput.value.trim() : '';

    if (!name) {
      alert("Name is required!");
      return;
    }

    let imagePath = null;

    if (carImageFileInput && carImageFileInput.files && carImageFileInput.files.length > 0) {
      const file = carImageFileInput.files[0];
      const imagesDir = path.join(userDataPath, 'images');
      fs.ensureDirSync(imagesDir);

      const safeName = `${Date.now()}_${path.basename(file.name)}`;
      const newFilePath = path.join(imagesDir, safeName);

      try {
        if (file.path) {
          // обычный путь в Electron: копируем и делаем file:// URL
          fs.copyFileSync(file.path, newFilePath);

          // проверяем что файл реально скопировался
          if (fs.existsSync(newFilePath)) {
            imagePath = pathToFileURL(newFilePath).href;
            console.log('Image copied to:', newFilePath, '->', imagePath);
          } else {
            console.error('Файл не найден после копирования:', newFilePath);
          }
        } else {
          // fallback: читаем как dataURL (base64) и сохраняем в imagePath
          imagePath = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
          });
          console.log('Использован base64 fallback для изображения (встроено в JSON).');
        }
      } catch (err) {
        console.error('Ошибка при сохранении изображения:', err);
      }
    }

    const newCar = {
      id: carId++,
      name,
      image: imagePath || null,
      realYear: realYear ? parseInt(realYear, 10) : null,
      modelYear: modelYear ? parseInt(modelYear, 10) : null,
      price: price ? parseInt(price, 10) : null
    };

    cars.push(newCar);
    renderCard(newCar);
    saveData();

    // очистка формы
    if (carNameInput) carNameInput.value = '';
    if (carImageFileInput) carImageFileInput.value = '';
    if (realYearInput) realYearInput.value = '';
    if (modelYearInput) modelYearInput.value = '';
    if (priceInput) priceInput.value = '';
    if (modal) modal.style.display = 'none';
  });
}




// Закрытие модалки при клике вне окна
if (modal) {
  window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
}



// ==== Модалка подтверждения удаления ====
const deleteModal = document.getElementById('deleteConfirmModal');
const deleteSlider = document.getElementById('deleteSlider');
const deleteFeedback = document.getElementById('deleteFeedback');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

let carIdToDelete = null;

// открыть модалку удаления
function openDeleteModal(carId) {
  carIdToDelete = carId;
  if (deleteSlider) deleteSlider.value = 0;
  if (deleteFeedback) {
    deleteFeedback.textContent = "";
    deleteFeedback.classList.remove("success");
  }
  deleteModal.style.display = 'block';
}

// закрыть модалку удаления
function closeDeleteModal() {
  deleteModal.style.display = 'none';
  carIdToDelete = null;
}

// обработчик ползунка
if (deleteSlider) {
  deleteSlider.addEventListener('input', () => {
    if (Number(deleteSlider.value) >= 100 && carIdToDelete !== null) {
      // удаляем карточку
      const card = document.querySelector(`.card[data-id="${carIdToDelete}"]`);
      if (card) {
        card.style.transition = "opacity 0.5s";
        card.style.opacity = "0";
        setTimeout(() => {
          card.remove();
        }, 500);
      }

      cars = cars.filter(c => Number(c.id) !== Number(carIdToDelete));
      saveData();

      // анимация успеха
      deleteFeedback.textContent = "✓ Удалено!";
      deleteFeedback.classList.add("success");

      // закрыть модалку через секунду
      setTimeout(() => {
        closeDeleteModal();
      }, 1000);
    }
  });
}

// кнопка отмены
if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener('click', closeDeleteModal);
}

// закрытие по клику вне модалки
if (deleteModal) {
  window.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      closeDeleteModal();
    }
  });
}

// Находим элементы модалки инфо карты
const viewCarModal = document.getElementById("viewCarModal");
const closeViewModal = document.getElementById("closeViewModal");

// Функция открытия модалки инфо карты с данными
function openViewModal(car) {
  carBeingEdited = car;
  // защитные проверки наличия модалки и полей
  if (!viewCarModal) return;
  const nameEl = document.getElementById("viewCarName");
  const imageEl = document.getElementById("viewCarImage");
  const realEl = document.getElementById("viewRealYear");
  const modelEl = document.getElementById("viewModelYear");
  const priceEl = document.getElementById("viewPrice");

  if (nameEl) nameEl.textContent = car.name || "Без названия";

  // используем car.image — это поле, которое мы сохраняем локально
  const imgPath = car.image || ''; // может быть null
  
  if (imageEl) {
  if (car.image) {
    imageEl.src = car.image;
    imageEl.alt = car.name || "Фото машинки";
  } else {  
    imageEl.src = 'picture_work/zagluh_card.jpg';
    imageEl.alt = "Фото машинки";
  }
}



  if (realEl) realEl.textContent = (car.realYear ?? '-') ;
  if (modelEl) modelEl.textContent = (car.modelYear ?? '-');
  if (priceEl) priceEl.textContent = car.price ? car.price + " ₽" : "-";

  // показываем модалку: учитываем, что у тебя .info-modal или .modal
  viewCarModal.classList.remove("hidden");
  viewCarModal.style.display = 'flex'; // на всякий случай
}


// Закрытие модалки инфо карты (проверка существования кнопки)
if (closeViewModal && viewCarModal) {
  closeViewModal.addEventListener("click", () => {
    viewCarModal.classList.add("hidden");
    viewCarModal.style.display = 'none';
  });
}

const editCarBtn = document.getElementById("editCarBtn");
const editCarModal = document.getElementById("editCarModal");
const closeEditModal = document.getElementById("closeEditModal");

const editNameInput = document.getElementById("editCarName");
const editRealYearInput = document.getElementById("editRealYear");
const editModelYearInput = document.getElementById("editModelYear");
const editPriceInput = document.getElementById("editPrice");
const editCarImageFile = document.getElementById("editCarImageFile");

const saveEditCarBtn = document.getElementById("saveEditCarBtn");


if (editCarBtn) {
  editCarBtn.addEventListener("click", () => {
    if (!carBeingEdited) return;

    // Закрываем модал просмотра
    viewCarModal.style.display = 'none';

    editNameInput.value = carBeingEdited.name || "";
    editRealYearInput.value = carBeingEdited.realYear ?? "";
    editModelYearInput.value = carBeingEdited.modelYear ?? "";
    editPriceInput.value = carBeingEdited.price ?? "";
    editCarImageFile.value = ""; // файл нельзя автозаполнить

    // закрываем просмотр
    viewCarModal.style.display = "none";
    viewCarModal.classList.add("hidden");

    // открываем редактирование
    editCarModal.style.display = "flex";
    editCarModal.classList.remove("hidden");
  });
}

if (closeEditModal) {
      closeEditModal.addEventListener("click", () => {
        editCarModal.style.display = "none";
        editCarModal.classList.add("hidden");
      });
    }

if (saveEditCarBtn) {
  saveEditCarBtn.addEventListener("click", async () => {

    if (!carBeingEdited) return;

    // записываем изменения
    carBeingEdited.name = editNameInput.value.trim();
    carBeingEdited.realYear = editRealYearInput.value ? parseInt(editRealYearInput.value) : null;
    carBeingEdited.modelYear = editModelYearInput.value ? parseInt(editModelYearInput.value) : null;
    carBeingEdited.price = editPriceInput.value ? parseInt(editPriceInput.value) : null;

    // обработка новой картинки
    if (editCarImageFile.files && editCarImageFile.files.length > 0) {
      const file = editCarImageFile.files[0];
      const imagesDir = path.join(userDataPath, 'images');
      fs.ensureDirSync(imagesDir);

      const safeName = `${Date.now()}_${path.basename(file.name)}`;
      const newFilePath = path.join(imagesDir, safeName);

      if (file.path) {
        fs.copyFileSync(file.path, newFilePath);
        carBeingEdited.image = pathToFileURL(newFilePath).href;
      } else {
        // fallback base64
        await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => {
            carBeingEdited.image = e.target.result;
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
    }

    saveData();

    // пересобрать список
    container.innerHTML = "";
    cars.forEach(c => renderCard(c));

    editCarModal.style.display = "none";
    editCarModal.classList.add("hidden");
  });
}
















// init
loadData();
