// Unique origins (match patterns) from a list of image URLs.
// Used to request host permissions scoped only to the domains of the selected
// images. Pure function — unit-tested in Node.

/**
 * @param {string[]} urls list of image URLs
 * @returns {string[]} unique match patterns like "https://host/*" (no port).
 *   data: URLs and unparseable URLs are skipped.
 */
export function distinctOrigins(urls) {
  const patterns = new Set();
  for (const u of urls) {
    if (typeof u !== 'string' || u.startsWith('data:')) continue;
    try {
      const url = new URL(u);
      // hostname without port: ports are not allowed in match patterns
      patterns.add(`${url.protocol}//${url.hostname}/*`);
    } catch (e) {
      // malformed URL — skip
    }
  }
  return Array.from(patterns);
}
