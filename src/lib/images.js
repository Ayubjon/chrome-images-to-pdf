// Preparing the image list: dedupe by src and filter by minimum size.
// Pure functions, no DOM / chrome.* — so they can be unit-tested in Node.

/**
 * Removes images with a duplicate src, keeping the first. Order is preserved.
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
 * Dedupe + filter by minimum size (unless showAll).
 * An image passes only if both sides are >= minSize.
 * @param {Array} images raw list from the page
 * @param {{minSize:number, showAll:boolean}} opts
 * @returns {Array}
 */
export function prepareImages(images, { minSize, showAll }) {
  const unique = dedupeImages(images);
  if (showAll) return unique;
  return unique.filter((img) => img.width >= minSize && img.height >= minSize);
}
