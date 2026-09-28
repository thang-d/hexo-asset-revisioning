# hexo-asset-revisioning

Content-hash revisioning (cache busting) of assets for [Hexo](https://hexo.io).

On `hexo generate` (and `hexo server`), every asset is renamed after the MD5 hash of its content, and every reference to it is updated:

```
css/style.css          -> css/style-240a11c15c3e27cb1cbfd92fd27a093f.css
css/images/banner.jpg  -> css/images/banner-0394d7ba5b310b5037d2a139bef63fa4.jpg
```

You can then serve assets with a long `Cache-Control` lifetime: a changed file always gets a new URL.

- References are rewritten in HTML (configurable selectors, `srcset`, `style` attributes and `<style>` blocks) and in CSS (`url()` and `@import`), whether they are absolute (`/css/a.css`), relative (`../img/a.png`) or full site URLs (`https://example.com/css/a.css`).
- Stylesheets are hashed after the files they reference, so changing an image also changes the name of the stylesheet that uses it.
- HTML pages are never renamed, and only the URLs are touched: the rest of the markup is kept byte for byte.

Originally a fork of [hexo-asset-pipeline](https://github.com/hexojs/hexo-asset-pipeline), keeping only revisioning. For minification, combine it with a minifier such as [hexo-all-minifier](https://github.com/chenzhutian/hexo-all-minifier).

## Requirements

- Hexo 7 or 8
- Node.js 20.19 or newer

## Installation

```bash
npm install hexo-asset-revisioning --save
```

## Configuration

Add to `_config.yml`:

```yaml
revisioning:
  enable: true
```

All options, with their defaults:

```yaml
revisioning:
  enable: false   # Turn revisioning on.
  keep: false     # Also keep the original, un-revisioned files.
  include:        # Files to revision (globs).
    - '*.{css,js,mjs,png,jpg,jpeg,gif,webp,avif,svg,ico,bmp,woff,woff2,ttf,otf,eot,mp4,webm,ogg,mp3,wav}'
  exclude: []     # Files never to revision or rewrite (globs); a single string works too.
  root: ''        # URL prefix of the assets; defaults to Hexo's `root`.
  selectors:      # HTML elements and the attribute holding the asset URL.
    'img[src]': src
    'img[srcset]': srcset
    'img[data-src]': data-src
    'img[data-srcset]': data-srcset
    'source[src]': src
    'source[srcset]': srcset
    'video[src]': src
    'video[poster]': poster
    'audio[src]': src
    'script[src]': src
    'link[rel~="stylesheet"]': href
    'link[rel~="icon"]': href
    'link[rel="apple-touch-icon"]': href
    'link[rel="preload"]': href
    'link[rel="modulepreload"]': href
    '[style]': style
  match:          # Options passed to minimatch for include and exclude.
    matchBase: true
    nocase: true
```

- **selectors** are merged with the defaults. Add your own (for example `'img[data-original]': data-original` for a lazy-load script) or disable a default by setting it to `false`.
- **include** / **exclude** are matched with [minimatch](https://github.com/isaacs/minimatch) against the output path (`css/style.css`). With `matchBase`, a pattern without a slash matches the file name in any folder.
- HTML files are always rewritten (unless excluded) and never renamed. Files outside `include`, such as feeds, sitemaps or `robots.txt`, are left alone.
- JavaScript files are renamed but their content is not rewritten: URLs built inside scripts are not detected.

## Upgrading from 1.x

- Requires Node.js 20.19+ and Hexo 7+.
- Only files matching `include` are revisioned. 1.x renamed every non-HTML file, including `atom.xml`, `sitemap.xml` or `CNAME`.
- `selectors` are now merged with the defaults instead of replacing them.
- JavaScript content is no longer rewritten. 1.x replaced file names inside scripts by plain text search, which could corrupt unrelated code.

## License

MIT
