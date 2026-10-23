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
    updateCarCountLabel();
    updateCarStats();

    // очистка формы
    carNameInput.value = '';
    realYearInput.value = '';
    modelYearInput.value = '';
    priceInput.value = '';
    carImageFileInput.value = '';
    modal.style.display = 'none';
  });
}

// ====== Элементы для редактирования фото ======
const editImagesContainer = document.getElementById('editImagesContainer'); // создаем <div id="editImagesContainer"></div> в HTML под полем input

// Функция рендера мини-картинок в модалке редактирования
function renderEditImages() {
  if (!editImagesContainer || !carBeingEdited) return;
  editImagesContainer.innerHTML = '';

  (carBeingEdited.images || []).forEach((imgSrc, idx) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'edit-image-wrapper';
    wrapper.draggable = true;
    wrapper.dataset.index = idx;

    const img = document.createElement('img');
    img.src = imgSrc;
    wrapper.appendChild(img);

    const delBtn = document.createElement('button');
    delBtn.textContent = '×';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      carBeingEdited.images.splice(idx, 1);
      renderEditImages();
    });
    wrapper.appendChild(delBtn);

    // drag & drop
    wrapper.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', idx);
    });
    wrapper.addEventListener('dragover', (e) => e.preventDefault());
    wrapper.addEventListener('drop', (e) => {
      e.preventDefault();
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
      const toIdx = parseInt(wrapper.dataset.index);
      if (fromIdx === toIdx) return;
      const moved = carBeingEdited.images.splice(fromIdx, 1)[0];
      carBeingEdited.images.splice(toIdx, 0, moved);
      renderEditImages();
    });

    editImagesContainer.appendChild(wrapper);
  });
}

// ====== Редактирование карточки ======
if (editCarBtn) {
  editCarBtn.addEventListener("click", () => {
    if (!carBeingEdited) return;

    editNameInput.value = carBeingEdited.name || "";
    editRealYearInput.value = carBeingEdited.realYear ?? "";
    editModelYearInput.value = carBeingEdited.modelYear ?? "";
    editPriceInput.value = carBeingEdited.price ?? "";
    editCarImageFile.value = "";

    renderEditImages(); // показываем все текущие фото

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
    updateCarStats();
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
      updateCarCountLabel();
      updateCarStats();
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




//Поиск
const searchInput = document.getElementById('searchInput');

if (searchInput) {
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    const filtered = cars.filter(c => c.name?.toLowerCase().includes(query));
    filterCards(query);
    updateCarStats(filtered);
  });
}

function filterCards(query) {
  // очистим контейнер
  container.innerHTML = '';

  // фильтруем по названию
  const filtered = cars.filter(car => {
    if (!car.name) return false;
    return car.name.toLowerCase().includes(query);
  });

  filtered.forEach(c => renderCard(c));
  updateCarCountLabel(filtered);
}

const carCountLabel = document.getElementById('carCountLabel');

function updateCarCountLabel(filteredCars = null) {
  // если передан фильтр, считаем его, иначе считаем все cars
  const count = (filteredCars ?? cars).length;
  if (carCountLabel) carCountLabel.textContent = `Машин в гараже: ${count}`;
}

//Экспорт коллекции
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');

exportBtn.addEventListener('click', async () => {
  // создаём копию массива cars
  const exportData = [];

  for (const car of cars) {
    const carCopy = { ...car };

    // фото конвертируем в base64
    carCopy.imagesBase64 = [];

    if (car.images && car.images.length > 0) {
      for (const imgUrl of car.images) {
        if (imgUrl.startsWith('file://')) {
          const imgPath = new URL(imgUrl).pathname;
          const buffer = fs.readFileSync(imgPath);
          const base64 = `data:image/${path.extname(imgPath).slice(1)};base64,${buffer.toString('base64')}`;
          carCopy.imagesBase64.push(base64);
        } else {
          carCopy.imagesBase64.push(imgUrl); // уже base64
        }
      }
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

importFile.addEventListener('change', async (e) => {
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

  // нормализуем и создаём новые id
  for (const rawCar of importedCars) {
    const car = normalizeCar(rawCar);
    car.id = carId++;
    car.images = [];

    if (rawCar.imagesBase64 && rawCar.imagesBase64.length > 0) {
      const imagesDir = path.join(userDataPath, 'images');
      fs.ensureDirSync(imagesDir);

      for (const base64 of rawCar.imagesBase64) {
        const matches = base64.match(/^data:image\/(\w+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1];
          const data = matches[2];
          const buffer = Buffer.from(data, 'base64');
          const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
          const filePath = path.join(imagesDir, fileName);
          fs.writeFileSync(filePath, buffer);
          car.images.push(pathToFileURL(filePath).href);
        }
      }
    }

    cars.push(car);
    renderCard(car);
  }

  saveData();
  updateCarCountLabel();
  updateCarStats();
  alert('Коллекция загружена!');

  // <-- добавляем эту строку -->
  importFile.value = ''; // очищаем input, чтобы можно было выбрать файл снова
});


const totalPriceLabel = document.getElementById('totalPriceLabel');

function updateCarStats(filteredCars = cars) {
  const count = filteredCars.length;
  const totalPrice = filteredCars.reduce((sum, car) => sum + (car.price ?? 0), 0);

  if (carCountLabel) carCountLabel.textContent = `Машин в гараже: ${count}`;
  if (totalPriceLabel) totalPriceLabel.textContent = `Общая стоимость: ${totalPrice} ₽`;
}

const bottomNav = document.getElementById("bottomNav");
const searchBarWrapper = document.getElementById("searchBarWrapper");
const searchInputUI = document.getElementById("searchInputUI");

// Переключение вкладок
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    item.classList.add("active");

    const tab = item.dataset.tab;

    if (tab === "garage") {
      searchBarWrapper.style.display = "none";
      searchInputUI.value = "";
      renderCardsList(cars); // Обновляем список
    }

    if (tab === "search") {
      searchBarWrapper.style.display = "block";
      searchInputUI.focus();
    }
  });
});

// Логика поиска
searchInputUI.addEventListener("input", () => {
  const q = searchInputUI.value.toLowerCase().trim();
  const filtered = cars.filter(c => c.name.toLowerCase().includes(q));
  renderCardsList(filtered);
});



//переключение фильтров в караже
const garageTabs = document.querySelectorAll(".garage-tab");
const filterPanel = document.getElementById("filterPanel");
const yearFilter = document.getElementById("yearFilter");
const searchPanel = document.getElementById("searchPanel");

let currentGarageTab = "all";

// 🔥 функция ВНЕ forEach
function renderAllCards() {
  container.innerHTML = "";

  let filteredCars = [...cars];

  // 🔍 ПОИСК
  if (currentGarageTab === "all" && searchInput) {
    const query = searchInput.value.toLowerCase();

    if (query) {
      filteredCars = filteredCars.filter(c =>
        (c.name || "").toLowerCase().includes(query)
      );
    }
  }

  // 🎯 ФИЛЬТР
  if (currentGarageTab === "filter") {
    const selectedYear = yearFilter.value;

    if (selectedYear) {
      filteredCars = filteredCars.filter(c =>
        String(c.modelYear) === selectedYear
      );
    }
  }

  filteredCars.forEach(c => renderCard(c));
  updateGarageStats(filteredCars);
}

// 🔥 переключение вкладок
garageTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    garageTabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");

    currentGarageTab = tab.dataset.tab;

    if (currentGarageTab === "all") {
      searchPanel.classList.remove("hidden");
      filterPanel.classList.add("hidden");
    }
    else if (currentGarageTab === "filter") {
      filterPanel.classList.remove("hidden");
      searchPanel.classList.add("hidden");
    }
    else {
      searchPanel.classList.add("hidden");
      filterPanel.classList.add("hidden");
    }

    renderAllCards();
  });
});

// 🔥 реакция на выбор года
if (yearFilter) {
  yearFilter.addEventListener("change", renderAllCards);
}
if (searchInput) {
  searchInput.addEventListener("input", () => {
    renderAllCards();
  });
}

// ====== INIT ======
loadData();
updateCarCountLabel();
updateCarStats();
