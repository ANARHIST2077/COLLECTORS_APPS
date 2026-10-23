// Типы фото и имена файлов — общие для хранилищ (в main-storage.js своя копия, он на CommonJS)

// Имя фото в папке images: начало sha256 содержимого + расширение
export const IMAGE_NAME = /^[a-f0-9]{32}\.[a-z0-9]+$/;

const EXT_BY_MIME = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
  'image/webp': 'webp', 'image/bmp': 'bmp', 'image/avif': 'avif', 'image/svg+xml': 'svg'
};
const MIME_BY_EXT = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', bmp: 'image/bmp', avif: 'image/avif', svg: 'image/svg+xml'
};

export function extFromMime(mime) {
  return EXT_BY_MIME[mime] ?? (mime.split('/')[1] || 'img').replace(/[^a-z0-9]/g, '');
}

export function mimeFromName(name) {
  const ext = name.split('.').pop().toLowerCase();
  return MIME_BY_EXT[ext] ?? `image/${ext}`;
}

// Ссылка, а не имя файла в images
export function isUrl(ref) {
  return /^(data:|https?:|file:)/.test(ref);
}
