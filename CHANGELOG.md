# Changelog

## 2.1.0

- New: the URL helpers are now a public entry point, `require('hexo-asset-revisioning/url')`, exposing `revisionRef`, `revisionPath`, `resolveRef`, `rewriteRef` and `rewriteSrcset`. This lets a site compute a revisioned reference itself, for cases the `after_generate` pass cannot reach, such as an `<img>` inside content a plugin encrypts before it is written to the page.
- Added an `exports` map. `hexo-asset-revisioning` (the plugin) and `hexo-asset-revisioning/url` are the supported entry points; the `lib/` layout is now internal.

## 2.0.0

- Rewritten for Hexo 7 and 8 (Node.js 20.19+).
- Fix: images and fonts referenced from CSS (e.g. `url(images/banner.jpg)`) were renamed but the CSS kept the old URL. Stylesheets are now rewritten, relative URLs included, and hashed after the files they reference.
- Fix: `exclude` given as a single string crashed the build (`TypeError: Assignment to constant variable`).
- Fix: results no longer depend on the order in which Hexo lists routes.
- Only files matching the new `include` option are revisioned (images, fonts, media, CSS and JS by default). 1.x renamed every non-HTML file, feeds and sitemaps included.
- JavaScript content is no longer rewritten; 1.x replaced file names inside scripts by plain text search.
- HTML is rewritten in place: only matched URLs change, the rest of the markup is untouched.
- New: `srcset`, `style` attributes, `<style>` blocks, `@import`, full site URLs, more default selectors.
- `selectors` are merged with the defaults; set one to `false` to disable it.
- Replaced `soup` (unmaintained, with vulnerable dependencies), `bluebird`, `hasha`, `rev-path` and `stream-to-array` with `parse5`, `css-select` and Node built-ins.
- Added tests and type checking (JSDoc + `tsc --checkJs`).

## 1.0.1

- Initial release, forked from hexo-asset-pipeline.
