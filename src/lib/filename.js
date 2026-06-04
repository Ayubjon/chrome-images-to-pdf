// Building the PDF file name from the page domain and the date.

/**
 * Cleans a hostname: drops a leading www. and unsafe filename characters.
 * @param {string} hostname e.g. "www.example.com"
 * @returns {string} e.g. "example.com"
 */
function cleanHost(hostname) {
  return (hostname || 'page')
    .replace(/^www\./, '')
    .replace(/[^a-zA-Z0-9.-]/g, '_');
}

/**
 * File name in the form images-<site>-<date>.pdf
 * @param {string} hostname page domain
 * @param {string} isoDate date as YYYY-MM-DD
 * @returns {string}
 */
export function pdfFilename(hostname, isoDate) {
  return `images-${cleanHost(hostname)}-${isoDate}.pdf`;
}
