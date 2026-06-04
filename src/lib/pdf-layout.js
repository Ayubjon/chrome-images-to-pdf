// Fitting an image into a rectangular PDF area, preserving aspect ratio.
// Pure function — unit-tested in Node.

/**
 * Scales an image so it fully fits inside the given area, preserving aspect
 * ratio. The area and the result share the same units (mm here); only the
 * image's aspect ratio matters.
 * @param {number} imgW image width
 * @param {number} imgH image height
 * @param {number} areaW available area width
 * @param {number} areaH available area height
 * @returns {{w:number, h:number}} image size in the area's units
 */
export function fitRect(imgW, imgH, areaW, areaH) {
  const scale = Math.min(areaW / imgW, areaH / imgH);
  return { w: imgW * scale, h: imgH * scale };
}
