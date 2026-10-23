# Hot Wheels Collection

Приложение для учёта коллекции машинок Hot Wheels для Windows (Electron) и Android (Capacitor) — один код интерфейса, один формат данных.

## Возможности

- Добавление, просмотр, редактирование и удаление карточек
- Поля: название, год реальной машины, год модельки, стоимость (₽)
- Несколько фото на карточку, листание и смена порядка перетаскиванием
- Поиск по названию, фильтр по году модельки
- Счётчик машин и общая стоимость коллекции
- Выгрузка и загрузка коллекции в JSON (вместе с фото)

## Скачать

В [Releases](https://github.com/ANARHIST2077/COLLECTORS_APPS/releases):

- `HotWheels-Collection-<версия>-portable.exe` — Windows, без установки
- `HotWheels-Collection-<версия>.apk` — Android (установка из файла: разрешить «Установку неизвестных приложений»)

Перенос коллекции между устройствами: «Выгрузить коллекцию» на одном → передать файл → «Загрузить коллекцию» на другом.

## Запуск из исходников

Нужен [Node.js](https://nodejs.org/).

```
npm install
npm start
```

Сборка exe: `npm run dist` → `dist\HotWheels-Collection-<версия>-portable.exe`.

## Устройство

```
vite.config.mjs      сборка интерфейса в www/ (общий для ПК и Android)
main.js              окно Electron
main-storage.js      работа с диском (main-процесс)
preload.js           мост: интерфейсу доступны только функции хранилища
index.html, style.css
renderer.js          точка входа интерфейса
src/core/            модель машинки, миграция форматов (чистый JS)
src/storage/         хранилище: electron-storage.js (ПК), capacitor-storage.js (Android)
android/             проект Android (Capacitor)
src/ui/              интерфейс
```

## Где хранятся данные

На ПК коллекция сохраняется не в папке проекта, а в профиле пользователя:

```
%APPDATA%\hotwheels-app\collection.json
%APPDATA%\hotwheels-app\images\
```

С версии 2.0 формат данных новый (`collection.json`). При первом запуске старый `hotwheels_data.json` автоматически переводится в новый формат; перед этим он и папка `images` копируются в `backup-<дата>`. Сам старый файл не изменяется.

На Android коллекция хранится во внутренней папке приложения и удаляется вместе с ним — перед удалением приложения выгрузите коллекцию.
