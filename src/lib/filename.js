// Формирование имени PDF-файла из домена страницы и даты.

/**
 * Чистит hostname: убирает ведущее www. и небезопасные символы.
 * @param {string} hostname например "www.example.com"
 * @returns {string} например "example.com"
 */
function cleanHost(hostname) {
  return (hostname || 'page')
    .replace(/^www\./, '')
    .replace(/[^a-zA-Z0-9.-]/g, '_');
}

/**
 * Имя файла вида images-<сайт>-<дата>.pdf
 * @param {string} hostname домен страницы
 * @param {string} isoDate дата в формате YYYY-MM-DD
 * @returns {string}
 */
export function pdfFilename(hostname, isoDate) {
  return `images-${cleanHost(hostname)}-${isoDate}.pdf`;
}
