// renderer.js — точка входа интерфейса, сама логика лежит в src/
import { loadCollection } from './src/collection.js';
import { initGarage, refreshGarage } from './src/ui/garage.js';
import { openViewModal, openDeleteModal } from './src/ui/car-modals.js';
import './src/ui/collection-io.js';

// ====== INIT ======
initGarage({ onOpen: openViewModal, onDelete: openDeleteModal });
await loadCollection();
refreshGarage();
