// Мост между интерфейсом и main-процессом: интерфейсу доступны только эти функции
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('hwStorage', {
  loadCars: () => ipcRenderer.invoke('storage:loadCars'),
  saveCars: (cars) => ipcRenderer.invoke('storage:saveCars', cars),
  readImageAsDataUrl: (src) => ipcRenderer.invoke('storage:readImageAsDataUrl', src),
  saveImageFromDataUrl: (dataUrl) => ipcRenderer.invoke('storage:saveImageFromDataUrl', dataUrl)
});
