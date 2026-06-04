# Chrome Web Store — listing materials

## Name
Images to PDF

## Short description (≤132 chars)
Collect images from any web page and save the ones you pick into a single clean PDF — one image per page.

## Category
Productivity

## Detailed description
Images to PDF lets you turn the pictures on any web page into a single PDF in
two clicks.

Open the extension on a page, and it shows a grid of all the images it found.
Tick the ones you want, press Export, and you get a clean PDF with one image per
A4 page, scaled to fit and centered.

Features:
• Thumbnail grid with one-click select all / deselect all
• Small icons (under 64×64) hidden by default — toggle "show all" to see them
• Everything runs locally in your browser — your images never go to any server
• Asks for access only to the sites hosting the images you actually export

Great for saving photo galleries, product images, comics, or reference shots as
a single shareable PDF.

## Single purpose (for the dashboard)
The extension has one purpose: collect images from the current web page and
export the user-selected ones into a single PDF file.

## Permission justifications (for the dashboard)
- **activeTab** — read the current page only when the user opens the popup, to
  list its images.
- **scripting** — inject the small content script that gathers the page's
  `<img>` elements on demand.
- **optional host permissions (`<all_urls>`, requested at export time)** —
  needed to download the bytes of the images the user selected so they can be
  embedded in the PDF; requested only for the specific domains of those images.

## Screenshots checklist (1280×800 PNG, at least 1, ideally 3–5)
1. Popup open over a page — grid of image thumbnails.
2. A few images selected (blue borders) and the count shown on the button.
3. The resulting PDF open in a viewer.

How to capture (macOS): open the extension on a page with images, take a window
screenshot (`Shift+Cmd+4`, then space, then click the popup window); resize to
1280×800 if needed.

## Privacy policy URL
Published as a public GitHub Gist:

**https://gist.github.com/Ayubjon/9318f0fdf69f3f951d1d3662ac417b2e**

Paste this URL into the "Privacy policy" field in the dashboard. If you edit
`PRIVACY.md`, update the Gist too:
`gh gist edit 9318f0fdf69f3f951d1d3662ac417b2e PRIVACY.md`.
