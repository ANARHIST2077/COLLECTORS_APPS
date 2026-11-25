// Мост между интерфейсом и main-процессом: интерфейсу доступны только эти функции
const { contextBridge, ipcRenderer } = require('electron');

const imagesBaseUrl = ipcRenderer.sendSync('storage:imagesBaseUrl');

contextBridge.exposeInMainWorld('hwStorage', {
  imagesBaseUrl,
  loadData: () => ipcRenderer.invoke('storage:loadData'),
  saveData: (data) => ipcRenderer.invoke('storage:saveData', data),
  loadSettings: () => ipcRenderer.invoke('storage:loadSettings'),
  saveSettings: (settings) => ipcRenderer.invoke('storage:saveSettings', settings),
  saveCollectionBackup: (data) => ipcRenderer.invoke('storage:saveCollectionBackup', data),
  hasImage: (name) => ipcRenderer.invoke('storage:hasImage', name),
  storeImage: (src) => ipcRenderer.invoke('storage:storeImage', src),
  readImageAsDataUrl: (ref) => ipcRenderer.invoke('storage:readImageAsDataUrl', ref),
  backupLegacyData: () => ipcRenderer.invoke('storage:backupLegacyData'),
  moveUnusedImagesToBackup: (usedNames, backupName) => ipcRenderer.invoke('storage:moveUnusedImagesToBackup', usedNames, backupName)
});
