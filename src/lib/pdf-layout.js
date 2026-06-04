// Вписывание картинки в прямоугольную область с сохранением пропорций.
// Чистая функция — тестируется в Node.

/**
 * Масштабирует картинку, чтобы она целиком влезла в область area,
 * сохраняя пропорции. Единицы area и результата одинаковы (у нас мм);
 * у картинки важно лишь соотношение сторон.
 * @param {number} imgW ширина картинки
 * @param {number} imgH высота картинки
 * @param {number} areaW ширина доступной области
 * @param {number} areaH высота доступной области
 * @returns {{w:number, h:number}} размеры картинки в единицах области
 */
export function fitRect(imgW, imgH, areaW, areaH) {
  const scale = Math.min(areaW / imgW, areaH / imgH);
  return { w: imgW * scale, h: imgH * scale };
}
