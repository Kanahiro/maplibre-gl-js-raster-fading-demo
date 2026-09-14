# Raster fade fix comparison

[Open the demo](https://kanahiro.github.io/maplibre-gl-js-raster-fading-demo/)

Two MapLibre GL JS builds display the same OpenStreetMap raster tiles. Click **Reproduce issue** to freeze the clock during a zoom from 4 to 5, then advance 400 ms. The old build stays on coarse parent tiles; the fixed build displays detailed tiles. Both maps support synchronized navigation afterward.

## Run locally

```sh
npm start
```

Open http://127.0.0.1:4173/. No dependency installation is required to serve the demo. OSM tiles require an internet connection.

## Deployment

Push to `codex/github-pages` to deploy through GitHub Actions. The workflow uploads only the HTML, JavaScript, and `vendor/` files to GitHub Pages. It can also be run manually from the Actions tab.

The verified GL JS bundles and their licenses are committed in `vendor/`, so deployment uses the exact versions tested locally and does not rebuild from a moving branch.

## Compared versions

- Before: `80a6f38119b20b400567d0a02e1636645ad67f18`
- After: `700b1ae4be4c3aaa19da1d6e4075ffba4eeeeeaa`

`vendor/builds.json` records the source commits. Each iframe loads its own modules, worker, and CSS.

To rebuild, install the dependencies in a neighboring `../maplibre-gl-js` checkout, then run:

```sh
npm run build:maps
```

Override `MAPLIBRE_REPO`, `BEFORE_REF`, or `AFTER_REF` as needed. The default before version is `004a7a7f5^`; the default after version is the checkout's HEAD. Uncommitted source changes are excluded. Code generation downloads Unicode data. Commit the updated `vendor/` files to publish new comparison builds.

## Verification

With the local server running and Puppeteer installed in the neighboring MapLibre checkout:

```sh
npm run verify
```

The check uses actual OSM tiles and compares rendered pixels. It verifies that the old build stalls while the fixed build changes, then checks both against a fresh zoom-5 map with fading disabled. The fixed output matched that reference in the original verification. A screenshot is saved to `/tmp/raster-fading-demo-verification.png`.

Clock freezing creates the zero-opacity boundary condition deterministically; it does not measure how often the issue occurs during ordinary navigation. Tile images and internal tile opacity are not modified. Normal browser caching is used.
