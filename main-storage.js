// Хранилище на диске (main-процесс). Интерфейс обращается сюда через preload.js и IPC.
const { app, ipcMain } = require('electron');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL, fileURLToPath } = require('url');

// Имя фото в папке images: начало sha256 содержимого + расширение (одно фото не хранится дважды)
const IMAGE_NAME = /^[a-f0-9]{32}\.[a-z0-9]+$/;
const BACKUP_NAME = /^backup-[\d-]+$/;

const EXT_BY_MIME = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/bmp': 'bmp', 'image/avif': 'avif', 'image/svg+xml': 'svg'
};
const MIME_BY_EXT = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', avif: 'image/avif', svg: 'image/svg+xml'
};

// --userDataPath=... подменяет папку данных (для проверок на копии коллекции)
function getUserDataPath() {
  const arg = process.argv.find(a => a && a.startsWith('--userDataPath='));
  return arg ? arg.slice('--userDataPath='.length) : app.getPath('userData');
}

function extFromMime(mime) {
  return EXT_BY_MIME[mime] ?? (mime.split('/')[1] || 'img').replace(/[^a-z0-9]/g, '');
}

function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function registerStorageHandlers() {
  const userDataPath = getUserDataPath();
  const dataFile = path.join(userDataPath, 'collection.json');
  const legacyFile = path.join(userDataPath, 'hotwheels_data.json'); // формат V1, только читаем
  const imagesDir = path.join(userDataPath, 'images');

  // Запись через временный файл: при сбое старый файл остаётся целым
  function writeJsonSafe(file, data) {
    const tmp = file + '.tmp';
    fs.ensureDirSync(path.dirname(file));
    fs.writeJsonSync(tmp, data, { spaces: 2 });
    fs.moveSync(tmp, file, { overwrite: true });
  }

  function saveImageBuffer(buffer, ext) {
    const name = `${crypto.createHash('sha256').update(buffer).digest('hex').slice(0, 32)}.${ext}`;
    const filePath = path.join(imagesDir, name);
    fs.ensureDirSync(imagesDir);
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, buffer);
    return name;
  }

  // Коллекция: { kind: 'v2' | 'legacy', data } или null, если данных ещё нет
  ipcMain.handle('storage:loadData', () => {
    if (fs.existsSync(dataFile)) return { kind: 'v2', data: fs.readJsonSync(dataFile) };
    if (fs.existsSync(legacyFile)) return { kind: 'legacy', data: fs.readJsonSync(legacyFile) };
    return null;
  });

  ipcMain.handle('storage:saveData', (e, data) => {
    writeJsonSafe(dataFile, data);
  });

  // Адрес папки images — чтобы интерфейс мог показать фото по имени файла
  ipcMain.on('storage:imagesBaseUrl', (e) => {
    e.returnValue = pathToFileURL(imagesDir).href + '/';
  });

  // Сохраняет фото (data URL, file:// или ссылка из интернета) в images, возвращает имя файла или null
  ipcMain.handle('storage:storeImage', async (e, src) => {
    try {
      if (IMAGE_NAME.test(src)) return src;

      const dataMatch = src.match(/^data:([^;,]+);base64,(.*)$/s);
      if (dataMatch) return saveImageBuffer(Buffer.from(dataMatch[2], 'base64'), extFromMime(dataMatch[1]));

      if (src.startsWith('file://')) {
        const filePath = fileURLToPath(src);
        return saveImageBuffer(fs.readFileSync(filePath), path.extname(filePath).slice(1).toLowerCase() || 'img');
      }

      if (/^https?:\/\//.test(src)) {
        const res = await fetch(src);
        if (!res.ok) return null;
        const mime = (res.headers.get('content-type') || '').split(';')[0].trim();
        if (!mime.startsWith('image/')) return null;
        return saveImageBuffer(Buffer.from(await res.arrayBuffer()), extFromMime(mime));
      }
    } catch (err) {
      console.error('Не удалось сохранить фото:', err);
    }
    return null;
  });

  // Фото в виде data URL — для экспорта
  ipcMain.handle('storage:readImageAsDataUrl', (e, ref) => {
    let filePath = null;
    if (IMAGE_NAME.test(ref)) filePath = path.join(imagesDir, ref);
    else if (ref.startsWith('file://')) filePath = fileURLToPath(ref);
    if (!filePath) return ref; // уже data URL или ссылка

    const ext = path.extname(filePath).slice(1).toLowerCase();
    const buffer = fs.readFileSync(filePath);
    return `data:${MIME_BY_EXT[ext] ?? 'image/' + ext};base64,${buffer.toString('base64')}`;
  });

  // Перед миграцией: копия hotwheels_data.json и папки images в backup-<дата>
  ipcMain.handle('storage:backupLegacyData', () => {
    let name = `backup-${localDate()}`;
    for (let i = 2; fs.existsSync(path.join(userDataPath, name)); i++) name = `backup-${localDate()}-${i}`;
    const backupDir = path.join(userDataPath, name);

    fs.ensureDirSync(backupDir);
    fs.copySync(legacyFile, path.join(backupDir, 'hotwheels_data.json'));
    if (fs.existsSync(imagesDir)) fs.copySync(imagesDir, path.join(backupDir, 'images'));
    return name;
  });

  // Фото, на которые не ссылается коллекция, переносятся из images в бэкап
  ipcMain.handle('storage:moveUnusedImagesToBackup', (e, usedNames, backupName) => {
    if (!BACKUP_NAME.test(backupName) || !fs.existsSync(imagesDir)) return 0;
    const used = new Set(usedNames);
    const target = path.join(userDataPath, backupName, 'images');
    let moved = 0;

    for (const file of fs.readdirSync(imagesDir)) {
      if (used.has(file)) continue;
      fs.moveSync(path.join(imagesDir, file), path.join(target, file), { overwrite: true });
      moved++;
    }
    return moved;
  });
}

module.exports = { registerStorageHandlers };
