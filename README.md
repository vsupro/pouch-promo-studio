# VSUPRO — Pouch promo Studio

A browser-based campaign designer built with React and Vite. The canvas looks like a glossy zip pouch: a dimensional discount sits beneath the plastic, while the headline and orange coupon are printed on top. Customize the artwork and download a full-resolution PNG.

The app is a static website, ready for GitHub Pages. It requires no backend, account, database, or API keys.

## Features

- Three editable layers: headline, discount, and coupon code, with 2026 defaults.
- Drag elements or change their position, rotation, font size, and letter spacing in Properties.
- Proportional lettering; the coupon sticker grows with its code text.
- Five locally bundled Google Fonts: Anton, Archivo Black, Barlow Condensed, Montserrat, and Space Grotesk, plus system Arial. The interface uses locally bundled DM Sans.
- One canvas material color shared by the pouch and discount. The headline turns white when switching to a black or dark charcoal canvas.
- Horizontal **1920 × 1080** and vertical **1080 × 1920** layouts, with artwork adapted when switching orientation.
- PNG downloads at the selected resolution, without editor controls or selection outlines.
- Worker-based rendering, cached pouch folds and lighting, and batched drag updates to keep controls responsive.

Design changes stay in memory for the current page. Reloading resets the artwork; download your PNG before leaving. Artwork that extends beyond the canvas is cropped in the export.

## Run locally

Use **Node.js 24 LTS** and npm. The `.nvmrc` file selects Node 24 when using nvm.

```sh
nvm use
npm ci
npm run dev
```

If you do not use nvm, install Node 24 and run the last two commands. Open the local URL printed by Vite. The initial dependency installation requires internet access; the built application serves all fonts and rendering assets locally.

## Build and preview

```sh
npm run check
npm run preview
```

`check` runs the tests, builds the production site into `dist/`, and verifies the emitted asset paths, worker, fonts, and font licenses. `preview` serves that production build locally; use the URL printed in the terminal.

Serve the site over HTTP or HTTPS. Opening `index.html` directly from the filesystem does not provide the module and worker environment the editor needs.

## Editing the design

Select a layer on the canvas or in the Layers panel, then edit it in Properties. Focus a canvas element and use arrow keys to move it in 10 px increments. Use the canvas toolbar to choose the orientation and the canvas color control to recolor the pouch. **Reset design** restores the default artwork in the selected orientation.

The font selector applies to each layer independently. Anton and Archivo Black are naturally bold display faces; Barlow Condensed, Montserrat, and Space Grotesk use their bold weight. Font loading finishes in the page and rendering worker before the artwork is drawn or exported.

## Commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the exact dependency versions in the lockfile |
| `npm run dev` | Start the development server |
| `npm test` | Run font loading and rendering queue tests |
| `npm run build` | Build the static site into `dist/` |
| `npm run verify:build` | Validate an existing production build |
| `npm run check` | Run tests, build, and production checks |
| `npm run preview` | Preview the production build |

## Project structure

```text
.github/workflows/       GitHub Pages build and deployment
public/                  Favicon, .nojekyll, and published font licenses
src/App.jsx              Editor controls, interactions, and PNG composition
src/packetRenderer.js    Pouch surface, discount geometry, and lighting
src/packetClient.js      Worker queue, frame caching, and export snapshots
src/packet.worker.js     Background rendering entry point
src/fonts.js             Font catalog and page/worker font loading
src/assets/fonts/        Local font files and original license notices
src/styles.css           Responsive editor styles
scripts/                 Build validation and ZIP packaging
tests/                   Automated tests
```

The pouch is rendered using a lit height field and Canvas 2D, rather than a pre-rendered image. Module workers and OffscreenCanvas handle the expensive calculations where supported. Other browsers fall back to the same renderer on the main thread. Recent desktop Chrome or Edge is recommended for editing large designs.

Preview requests are coalesced so outdated pending frames are skipped. Export requests retain their exact artwork snapshot and wait for its full-resolution render. Geometry, lighting, and font caches are reused where possible.

## Create a distribution ZIP

With npm dependencies installed and Python 3 available:

```sh
python3 scripts/package_project.py
```

The script runs all project checks, then creates `black-friday-studio.zip` and a SHA-256 checksum file in the parent directory. The archive contains the source, deployment workflow, lockfile, tests, local fonts and licenses, documentation, and a verified `dist/` build. It excludes `node_modules`, Git history, local environment files, caches, and old preview screenshots.

Unzip the archive, then upload the extracted project's contents to your repository root. The prebuilt `dist/` directory can also be served by a static web host; the GitHub Pages workflow will produce its own fresh build.

## License

Application source is distributed under the included [MIT license](LICENSE). Bundled Google Fonts use the SIL Open Font License; notices are in `src/assets/fonts/` and are also published under `licenses/` in the production build.
