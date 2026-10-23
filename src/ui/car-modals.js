// Модалки машинки: добавление, просмотр, редактирование, удаление
import { safeParseInt, createCar, touch } from '../core/car.js';
import { collection, saveCollection } from '../collection.js';
import { storage } from '../storage/index.js';
import { refreshGarage, updateYearFilterOptions, updateCarStats, getVisibleCars } from './garage.js';

// ====== DOM элементы ======
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
const editImagesContainer = document.getElementById('editImagesContainer');

// Модалка удаления
const deleteModal = document.getElementById('deleteConfirmModal');
const deleteSlider = document.getElementById('deleteSlider');
const deleteFeedback = document.getElementById('deleteFeedback');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');

let carBeingEdited = null;
let carIdToDelete = null;

// ====== Работа с файлами ======
// Выбранные фото сохраняются в папку images, возвращаются имена файлов
async function processFiles(files) {
  const images = [];
  for (const file of files) {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    images.push(await storage.storeImage(base64) ?? base64);
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

    const newCar = createCar({ name, realYear, modelYear, price });
    newCar.images = images;

    collection.cars.push(newCar);
    saveCollection();
    refreshGarage();

    // очистка формы
    carNameInput.value = '';
    realYearInput.value = '';
    modelYearInput.value = '';
    priceInput.value = '';
    carImageFileInput.value = '';
    modal.style.display = 'none';
  });
}

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
    img.src = storage.getImageUrl(imgSrc);
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

    touch(carBeingEdited);
    saveCollection();
    refreshGarage();

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
export function openViewModal(car) {
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
  const imgs = (car.images ?? []).map(storage.getImageUrl);
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
export function openDeleteModal(id) {
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
      // удаление — пометка, а не стирание: так оно дойдёт до других устройств при синхронизации
      const car = collection.cars.find(c => c.id === carIdToDelete);
      if (car) { car.deleted = true; touch(car); }
      saveCollection();
      updateYearFilterOptions();
      updateCarStats(getVisibleCars());
      if (deleteFeedback) { deleteFeedback.textContent = "✓ Удалено!"; deleteFeedback.classList.add("success"); }
      setTimeout(closeDeleteModal, 1000);
    }
  });
}
if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
