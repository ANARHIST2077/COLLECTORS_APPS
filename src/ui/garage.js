// Гараж: список карточек, вкладки, поиск, фильтр по году, статистика
import { collection } from '../collection.js';
import { renderCard } from './cards.js';

const container = document.getElementById('cardsContainer');
const carCountLabel = document.getElementById('carCountLabel');
const totalPriceLabel = document.getElementById('totalPriceLabel');
const searchInput = document.getElementById('searchInput');
const searchBarWrapper = document.getElementById("searchBarWrapper");
const searchInputUI = document.getElementById("searchInputUI");
const garageTabs = document.querySelectorAll(".garage-tab");
const filterPanel = document.getElementById("filterPanel");
const yearFilter = document.getElementById("yearFilter");
const searchPanel = document.getElementById("searchPanel");

let currentGarageTab = "all";
let cardHandlers = {};

// Что делать по клику на карточку и на её крестик
export function initGarage(handlers) {
  cardHandlers = handlers;
}

export function updateCarStats(filteredCars = collection.cars) {
  const count = filteredCars.length;
  const totalPrice = filteredCars.reduce((sum, car) => sum + (car.price ?? 0), 0);

  if (carCountLabel) carCountLabel.textContent = `Машин в гараже: ${count}`;
  if (totalPriceLabel) totalPriceLabel.textContent = `Общая стоимость: ${totalPrice} ₽`;
}

function renderCardsList(list) {
  container.innerHTML = "";
  list.forEach(c => renderCard(c, container, cardHandlers));
  updateCarStats(list);
}

// Годы в фильтре берутся из коллекции
export function updateYearFilterOptions() {
  if (!yearFilter) return;
  const selected = yearFilter.value;
  const years = [...new Set(collection.cars.map(c => c.modelYear).filter(y => y !== null && y !== undefined))]
    .sort((a, b) => b - a);

  yearFilter.innerHTML = '<option value="">Все</option>';
  years.forEach(y => {
    const opt = document.createElement("option");
    opt.value = String(y);
    opt.textContent = String(y);
    yearFilter.appendChild(opt);
  });
  yearFilter.value = years.map(String).includes(selected) ? selected : "";
}

// Машинки с учётом текущей вкладки, поиска и фильтра
export function getVisibleCars() {
  let filteredCars = [...collection.cars];

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

  return filteredCars;
}

export function renderAllCards() {
  renderCardsList(getVisibleCars());
}

// После изменения коллекции: обновить годы в фильтре и карточки
export function refreshGarage() {
  updateYearFilterOptions();
  renderAllCards();
}

// ====== Нижняя навигация ======
document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    item.classList.add("active");

    const tab = item.dataset.tab;

    if (tab === "garage") {
      searchBarWrapper.style.display = "none";
      searchInputUI.value = "";
      renderAllCards(); // Обновляем список
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
  const filtered = collection.cars.filter(c => (c.name || "").toLowerCase().includes(q));
  renderCardsList(filtered);
});

// ====== Вкладки гаража ======
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
