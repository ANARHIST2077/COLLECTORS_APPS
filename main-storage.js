// Хранилище на диске (main-процесс). Интерфейс обращается сюда через preload.js и IPC.
const { app, ipcMain } = require('electron');
const fs = require('fs-extra');
const path = require('path');
const { pathToFileURL, fileURLToPath } = require('url');

// --userDataPath=... подменяет папку данных (для проверок на копии коллекции)
function getUserDataPath() {
  const arg = process.argv.find(a => a && a.startsWith('--userDataPath='));
  return arg ? arg.slice('--userDataPath='.length) : app.getPath('userData');
}

function registerStorageHandlers() {
  const userDataPath = getUserDataPath();
  const dataFile = path.join(userDataPath, 'hotwheels_data.json');
  const imagesDir = path.join(userDataPath, 'images');

  // Сырые данные коллекции или null, если файла ещё нет
  ipcMain.handle('storage:loadCars', () => {
    if (!fs.existsSync(dataFile)) return null;
    return fs.readJsonSync(dataFile);
  });

  ipcMain.handle('storage:saveCars', (e, cars) => {
    fs.ensureDirSync(userDataPath);
    fs.writeJsonSync(dataFile, cars, { spaces: 2 });
  });

  // Фото в виде data URL — для экспорта
  ipcMain.handle('storage:readImageAsDataUrl', (e, src) => {
    if (!src.startsWith('file://')) return src; // уже base64
    const imgPath = fileURLToPath(src);
    const buffer = fs.readFileSync(imgPath);
    return `data:image/${path.extname(imgPath).slice(1)};base64,${buffer.toString('base64')}`;
  });

  // Сохраняет фото из data URL в папку images, возвращает ссылку на файл или null
  ipcMain.handle('storage:saveImageFromDataUrl', (e, dataUrl) => {
    const matches = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return null;

    const ext = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = path.join(imagesDir, fileName);
    fs.ensureDirSync(imagesDir);
    fs.writeFileSync(filePath, buffer);
    return pathToFileURL(filePath).href;
  });
}

module.exports = { registerStorageHandlers };
