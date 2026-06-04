# Images to PDF — Chrome extension

Collects the images (`<img>`) on the current page, lets you pick the ones you
want in a grid, and saves them into a single PDF — one image per A4 page.
Localized in English (default) and Russian.

## Install

**From the prebuilt release (easiest):**
1. Download `images-to-pdf.zip` from the
   [Releases](https://github.com/Ayubjon/chrome-images-to-pdf/releases/latest)
   page and unzip it into a permanent folder (don't delete it — the extension
   runs from there).
2. Open `chrome://extensions` (or `edge://extensions`) → enable
   **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select the unzipped folder.
4. The icon appears in the toolbar.

> Updating: when a new version ships, download the fresh ZIP and repeat
> (self-distributed builds don't auto-update).

**From source (for development):** clone the repository and select the project
folder in step 3.

## Usage

1. Open any website (http/https).
2. Click the extension icon — a grid of the page's images appears.
3. Small images (< 64×64 px) are hidden by default; toggle "show all" to see them.
4. Tick the images you want (or "Select all").
5. Click **Export PDF**. On the first export Chrome asks for access to the
   domains of the selected images — allow it so they can be downloaded. A file
   named `images-<site>-<date>.pdf` is downloaded.

## How it works

- `src/popup.*` — UI and orchestration; builds the PDF with jsPDF.
- `src/content.js` — injected into the page on demand, collects `<img>` elements.
- `src/background.js` — service worker, downloads image bytes (bypassing CORS).
- `src/lib/*.js` — pure logic (filtering, fit-to-page, filename, base64, origins, donate).
- `_locales/{en,ru}/messages.json` — localized strings.

> Permissions: the extension only requests `activeTab` + `scripting`. Access to
> image domains (`optional_host_permissions`) is requested on demand at export
> time — scoped to the specific sites.

## Development

Unit tests for the pure logic (Node 18+ required):

```bash
node --test tests/*.test.js
```

Regenerate the icons:

```bash
python3 tools/make-icons.py
```

Build the distributable ZIP (output: `dist/images-to-pdf.zip`):

```bash
bash tools/package.sh
```

Donations: set your USDT (Ethereum / ERC-20) address in `DONATE_ADDRESS`
(`src/popup.js`) — a "Support the developer" bar with the address and a "Copy"
button appears at the bottom of the popup. With the placeholder value it stays
hidden.

Store listing copy lives in `STORE-LISTING.md`; the privacy policy in `PRIVACY.md`.

## Manual checklist (browser testing)

1. On install there's no "read your data on all sites" warning.
2. A page with many images — thumbnails render as proper tiles.
3. Export → permission prompt for the image domain → Allow → PDF.
4. Re-export to the same domain — no second prompt.
5. Decline the prompt → friendly message, button stays active.
6. Page with no images → "No images found"; `chrome://extensions` →
   "page isn't supported".
