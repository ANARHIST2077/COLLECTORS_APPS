// Выбор хранилища: window.hwStorage есть только в Electron (его даёт preload.js), иначе — Android
import * as electronStorage from './electron-storage.js';
import * as capacitorStorage from './capacitor-storage.js';

export const storage = window.hwStorage ? electronStorage : capacitorStorage;
