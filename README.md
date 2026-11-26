# VSUPRO — Pouch Promo Studio

[![Launch live demo](https://img.shields.io/badge/LAUNCH_LIVE_DEMO_%E2%86%97-A1EF00?style=for-the-badge)](https://vsupro.github.io/pouch-promo-studio/)

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

## Editing the design

Select a layer on the canvas or in the Layers panel, then edit it in Properties. Focus a canvas element and use arrow keys to move it in 10 px increments. Use the canvas toolbar to choose the orientation and the canvas color control to recolor the pouch. **Reset design** restores the default artwork in the selected orientation.

The font selector applies to each layer independently. Anton and Archivo Black are naturally bold display faces; Barlow Condensed, Montserrat, and Space Grotesk use their bold weight. Font loading finishes in the page and rendering worker before the artwork is drawn or exported.


The pouch is rendered using a lit height field and Canvas 2D, rather than a pre-rendered image. Module workers and OffscreenCanvas handle the expensive calculations where supported. Other browsers fall back to the same renderer on the main thread. Recent desktop Chrome or Edge is recommended for editing large designs.

Preview requests are coalesced so outdated pending frames are skipped. Export requests retain their exact artwork snapshot and wait for its full-resolution render. Geometry, lighting, and font caches are reused where possible.

## License

Application source is distributed under the included [MIT license](LICENSE). Bundled Google Fonts use the SIL Open Font License; notices are in `src/assets/fonts/` and are also published under `licenses/` in the production build.
