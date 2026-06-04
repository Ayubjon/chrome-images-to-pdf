// Encoding binary data (ArrayBuffer) to base64.
// Used in the service worker after fetching an image.
// btoa is available both in the browser and in Node 16+, so this is testable in Node.

/**
 * Converts an ArrayBuffer to a base64 string. Processes the data in chunks to
 * avoid a stack overflow on large images: String.fromCharCode(...arr) with a
 * huge argument list throws.
 * @param {ArrayBuffer} buffer
 * @returns {string} base64 without the "data:" prefix
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32768 — safe size for apply
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}
