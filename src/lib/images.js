// Подготовка списка картинок: дедуп по src и фильтр по минимальному размеру.
// Чистые функции без DOM/chrome.* — чтобы покрыть юнит-тестами в Node.

/**
 * Убирает картинки с повторяющимся src, оставляя первую. Порядок сохраняется.
 * @param {Array<{src:string,width:number,height:number,alt?:string}>} images
 * @returns {Array}
 */
export function dedupeImages(images) {
  const seen = new Set();
  const result = [];
  for (const img of images) {
    if (seen.has(img.src)) continue;
    seen.add(img.src);
    result.push(img);
  }
  return result;
}

/**
 * Дедуп + фильтр по минимальному размеру (если не showAll).
 * Картинка проходит, только если обе стороны >= minSize.
 * @param {Array} images сырой список со страницы
 * @param {{minSize:number, showAll:boolean}} opts
 * @returns {Array}
 */
export function prepareImages(images, { minSize, showAll }) {
  const unique = dedupeImages(images);
  if (showAll) return unique;
  return unique.filter((img) => img.width >= minSize && img.height >= minSize);
}
