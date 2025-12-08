const { app, BrowserWindow } = require('electron');
const path = require('path');



function createWindow() {
  const userDataPath = app.getPath('userData'); // безопасная папка для хранения данных

  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,        // для простоты прототипа — позволяет require() в рендере
      contextIsolation: false,      // выключаем изоляцию (тоже для простоты)
      additionalArguments: [`--userDataPath=${userDataPath}`]
    }
  });

  // Для отладки можно временно открыть DevTools:
  // win.webContents.openDevTools();

  win.loadFile('index.html');
  //win.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
