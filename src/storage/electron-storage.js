// Хранилище для Electron — единственный модуль, который работает с диском через Node.
// Остальной код вызывает только эти функции. На Android будет свой модуль с теми же функциями.
const fs = window.require('fs-extra');
const path = window.require('path');
const { pathToFileURL, fileURLToPath } = window.require('url');

// ====== Путь к userData ======
function getUserDataPathFromArgs() {
  const arg = process.argv.find(a => a && a.startsWith('--userDataPath='));
  return arg ? arg.split('=')[1] : path.dirname(fileURLToPath(location.href));
}
const userDataPath = getUserDataPathFromArgs();
const dataFile = path.join(userDataPath, 'hotwheels_data.json');
const imagesDir = path.join(userDataPath, 'images');

// Сырые данные коллекции или null, если файла ещё нет
export async function loadCars() {
  if (!fs.existsSync(dataFile)) return null;
  return fs.readJsonSync(dataFile);
}

export async function saveCars(cars) {
  fs.ensureDirSync(userDataPath);
  fs.writeJsonSync(dataFile, cars, { spaces: 2 });
}

// Фото в виде data URL — для экспорта
export async function readImageAsDataUrl(src) {
  if (!src.startsWith('file://')) return src; // уже base64
  const imgPath = fileURLToPath(src);
  const buffer = fs.readFileSync(imgPath);
  return `data:image/${path.extname(imgPath).slice(1)};base64,${buffer.toString('base64')}`;
}

// Сохраняет фото из data URL в папку images, возвращает ссылку на файл или null
export async function saveImageFromDataUrl(dataUrl) {
  const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) return null;

  const ext = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = path.join(imagesDir, fileName);
  fs.ensureDirSync(imagesDir);
  fs.writeFileSync(filePath, buffer);
  return pathToFileURL(filePath).href;
}
