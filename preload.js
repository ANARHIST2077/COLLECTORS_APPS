// Мост между интерфейсом и main-процессом: интерфейсу доступны только эти функции
const { contextBridge, ipcRenderer } = require('electron');

const imagesBaseUrl = ipcRenderer.sendSync('storage:imagesBaseUrl');

contextBridge.exposeInMainWorld('hwStorage', {
  imagesBaseUrl,
  loadData: () => ipcRenderer.invoke('storage:loadData'),
  saveData: (data) => ipcRenderer.invoke('storage:saveData', data),
  storeImage: (src) => ipcRenderer.invoke('storage:storeImage', src),
  readImageAsDataUrl: (ref) => ipcRenderer.invoke('storage:readImageAsDataUrl', ref),
  backupLegacyData: () => ipcRenderer.invoke('storage:backupLegacyData'),
  moveUnusedImagesToBackup: (usedNames, backupName) => ipcRenderer.invoke('storage:moveUnusedImagesToBackup', usedNames, backupName)
});
