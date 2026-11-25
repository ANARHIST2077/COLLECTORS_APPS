const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { registerStorageHandlers } = require('./main-storage');



function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'), // доступ к диску только через preload
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Ссылки наружу (например, на страницу с новыми версиями) открываются в обычном браузере,
  // а не внутри окна приложения
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Для отладки можно временно открыть DevTools:
  // win.webContents.openDevTools();

  win.loadFile('www/index.html'); // собирается командой vite build
  //win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  registerStorageHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
