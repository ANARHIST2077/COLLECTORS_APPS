// renderer.js — исправленный и рабочий с несколькими фото
const fs = require('fs-extra');
const path = require('path');
const { pathToFileURL } = require('url');

// ====== Путь к userData ======
function getUserDataPathFromArgs() {
  const arg = process.argv.find(a => a && a.startsWith('--userDataPath='));
  return arg ? arg.split('=')[1] : __dirname;
}
const userDataPath = getUserDataPathFromArgs();
const dataFile = path.join(userDataPath, 'hotwheels_data.json');

// ====== DOM элементы ======
const container = document.getElementById('cardsContainer');
const addCarBtn = document.getElementById('addCarBtn');
const modal = document.getElementById('addCarModal');
const closeModal = document.getElementById('closeModal');
const saveCarBtn = document.getElementById('saveCarBtn');
const carNameInput = document.getElementById('carName');
const carImageFileInput = document.getElementById('carImageFiles');
const realYearInput = document.getElementById('realYear');
const modelYearInput = document.getElementById('modelYear');
const priceInput = document.getElementById('price');

// ====== Модалки редактирования и просмотра ======
const viewCarModal = document.getElementById("viewCarModal");
const closeViewModal = document.getElementById("closeViewModal");
const editCarBtn = document.getElementById("editCarBtn");
const editCarModal = document.getElementById("editCarModal");
const closeEditModal = document.getElementById("closeEditModal");
const editNameInput = document.getElementById("editCarName");
const editRealYearInput = document.getElementById("editRealYear");
const editModelYearInput = document.getElementById("editModelYear");
const editPriceInput = document.getElementById("editPrice");
const editCarImageFile = document.getElementById("editCarImageFile");
const saveEditCarBtn = document.getElementById("saveEditCarBtn");

// Модалка удаления
const deleteModal = document.getElementById('deleteConfirmModal');
const deleteSlider = document.getElementById('deleteSlider');
const deleteFeedback = document.getElementById('deleteFeedback');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

// ====== Переменные ======
let cars = [];
let carId = 0;
let carBeingEdited = null;
let carIdToDelete = null;

// ====== Утилиты ======
function safeParseInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function normalizeCar(raw) {
  if (!raw || typeof raw !== 'object') raw = {};
  const name = raw.name ?? raw.title ?? null;
  let images = raw.images ?? (raw.image ? [raw.image] : []);
  images = Array.isArray(images) ? images.map(i => i) : [];
  const realYear = safeParseInt(raw.realYear ?? raw.real_year ?? raw.real ?? null);
  const modelYear = safeParseInt(raw.modelYear ?? raw.model_year ?? raw.model ?? raw.year ?? null);
  const price = safeParseInt(raw.price ?? raw.cost ?? raw.Price ?? null);
  const id = (typeof raw.id === 'number' || typeof raw.id === 'string') ? Number(raw.id) : null;
  return { id, name, images, realYear, modelYear, price };
}

// ====== Рендер карточки ======
function renderCard(car) {
  if (car.id === null || car.id === undefined) car.id = carId++;
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = car.id;

  // Удалить
  const delBtn = document.createElement('button');
  delBtn.className = 'delete-btn';
  delBtn.textContent = '×';
  card.appendChild(delBtn);
  delBtn.addEventListener('click', e => { e.stopPropagation(); openDeleteModal(car.id); });

  // Изображение
  const imgEl = document.createElement('img');
  imgEl.className = 'car-thumb';
  imgEl.src = (car.images && car.images.length > 0) ? car.images[0] : 'picture_work/zagluh_card.jpg';
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
  card.addEventListener('click', () => openViewModal(car));

  container.appendChild(card);
}

// ====== Работа с файлами ======
async function processFiles(files) {
  const images = [];
  for (const file of files) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    images.push(base64);
  }
  return images;
}

// ====== Добавление новой карточки ======
if (saveCarBtn) {
  saveCarBtn.addEventListener('click', async () => {
    const name = carNameInput.value.trim();
    if (!name) { alert("Name is required"); return; }
    const realYear = safeParseInt(realYearInput.value);
    const modelYear = safeParseInt(modelYearInput.value);
    const price = safeParseInt(priceInput.value);

    const files = carImageFileInput.files;
    const images = await processFiles(files);

    const newCar = {
      id: carId++,
      name,
      images,
      realYear,
      modelYear,
      price
    };

    cars.push(newCar);
    renderCard(newCar);
    saveData();

    // очистка формы
    carNameInput.value = '';
    realYearInput.value = '';
    modelYearInput.value = '';
    priceInput.value = '';
    carImageFileInput.value = '';
    modal.style.display = 'none';
  });
}

// ====== Редактирование карточки ======
if (editCarBtn) {
  editCarBtn.addEventListener("click", () => {
    if (!carBeingEdited) return;

    // открыть редактирование
    editNameInput.value = carBeingEdited.name || "";
    editRealYearInput.value = carBeingEdited.realYear ?? "";
    editModelYearInput.value = carBeingEdited.modelYear ?? "";
    editPriceInput.value = carBeingEdited.price ?? "";
    editCarImageFile.value = "";

    viewCarModal.style.display = "none";
    editCarModal.style.display = "flex";
    editCarModal.classList.remove("hidden");
  });
}

if (saveEditCarBtn) {
  saveEditCarBtn.addEventListener('click', async () => {
    if (!carBeingEdited) return;

    carBeingEdited.name = editNameInput.value.trim();
    carBeingEdited.realYear = safeParseInt(editRealYearInput.value);
    carBeingEdited.modelYear = safeParseInt(editModelYearInput.value);
    carBeingEdited.price = safeParseInt(editPriceInput.value);

    const files = editCarImageFile.files;
    if (files.length > 0) {
      const newImages = await processFiles(files);
      carBeingEdited.images = carBeingEdited.images || [];
      carBeingEdited.images.push(...newImages);
    }

    saveData();
    container.innerHTML = '';
    cars.forEach(c => renderCard(c));

    editCarModal.style.display = "none";
    editCarModal.classList.add("hidden");
  });
}

// ====== Модалки ======
if (addCarBtn && modal) addCarBtn.addEventListener('click', () => modal.style.display = 'block');
if (closeModal && modal) closeModal.addEventListener('click', () => modal.style.display = 'none');
if (closeViewModal && viewCarModal) closeViewModal.addEventListener("click", () => { viewCarModal.style.display = 'none'; viewCarModal.classList.add('hidden'); });
if (closeEditModal && editCarModal) closeEditModal.addEventListener("click", () => { editCarModal.style.display = 'none'; editCarModal.classList.add('hidden'); });

// Закрытие модалки при клике вне
window.addEventListener('click', e => {
  if (e.target === modal) modal.style.display = 'none';
  if (e.target === deleteModal) closeDeleteModal();
});

// ====== Просмотр карточки ======
function openViewModal(car) {
  carBeingEdited = car;

  const nameEl = document.getElementById("viewCarName");
  const imageEl = document.getElementById("viewCarImage");
  const realEl = document.getElementById("viewRealYear");
  const modelEl = document.getElementById("viewModelYear");
  const priceEl = document.getElementById("viewPrice");
  const prevBtn = document.getElementById("prevImageBtn");
  const nextBtn = document.getElementById("nextImageBtn");

  if (nameEl) nameEl.textContent = car.name || "Без названия";
  if (realEl) realEl.textContent = car.realYear ?? '-';
  if (modelEl) modelEl.textContent = car.modelYear ?? '-';
  if (priceEl) priceEl.textContent = car.price ? car.price + " ₽" : "-";

  let current = 0;
  const imgs = car.images ?? [];
  if (imageEl) imageEl.src = imgs.length ? imgs[0] : 'picture_work/zagluh_card.jpg';

  if (prevBtn && nextBtn) {
    prevBtn.onclick = () => {
      if (!imgs.length) return;
      current = (current - 1 + imgs.length) % imgs.length;
      imageEl.src = imgs[current];
    };
    nextBtn.onclick = () => {
      if (!imgs.length) return;
      current = (current + 1) % imgs.length;
      imageEl.src = imgs[current];
    };
  }

  viewCarModal.style.display = 'flex';
  viewCarModal.classList.remove('hidden');
}

// ====== Удаление карточки ======
function openDeleteModal(id) {
  carIdToDelete = id;
  if (deleteSlider) deleteSlider.value = 0;
  if (deleteFeedback) { deleteFeedback.textContent = ''; deleteFeedback.classList.remove('success'); }
  deleteModal.style.display = 'block';
}
function closeDeleteModal() { deleteModal.style.display = 'none'; carIdToDelete = null; }

if (deleteSlider) {
  deleteSlider.addEventListener('input', () => {
    if (Number(deleteSlider.value) >= 100 && carIdToDelete !== null) {
      const card = document.querySelector(`.card[data-id="${carIdToDelete}"]`);
      if (card) { card.style.opacity = 0; setTimeout(() => card.remove(), 500); }
      cars = cars.filter(c => Number(c.id) !== Number(carIdToDelete));
      saveData();
      if (deleteFeedback) { deleteFeedback.textContent = "✓ Удалено!"; deleteFeedback.classList.add("success"); }
      setTimeout(closeDeleteModal, 1000);
    }
  });
}
if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);

// ====== Сохранение / Загрузка ======
function saveData() {
  try { fs.ensureDirSync(userDataPath); fs.writeJsonSync(dataFile, cars, { spaces: 2 }); } 
  catch (err) { console.error('Ошибка сохранения данных:', err); }
}

function loadData() {
  try {
    if (fs.existsSync(dataFile)) {
      const raw = fs.readJsonSync(dataFile);
      cars = Array.isArray(raw) ? raw.map(normalizeCar) : [];
      let maxId = -1;
      cars.forEach(c => { if (c.id !== null && c.id !== undefined) maxId = Math.max(maxId, Number(c.id)); });
      carId = maxId + 1;
    } else {
      cars = [
        { id: carId++, name: "Lamborghini Countach", images: [], realYear: 1974, modelYear: 2021, price: null },
        { id: carId++, name: "DeLorean DMC-12", images: [], realYear: 1981, modelYear: 2023, price: null }
      ];
    }
    container.innerHTML = '';
    cars.forEach(c => renderCard(c));
    saveData();
  } catch (err) { console.error('Ошибка загрузки данных:', err); }
}

// ====== INIT ======
loadData();
