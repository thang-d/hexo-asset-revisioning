'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { rewriteHtml } = require('../lib/html');

const ctx = { root: '/' };
/** @type {Record<string, string | false>} */
const selectors = {
  'img[src]': 'src',
  'img[srcset]': 'srcset',
  'link[rel~="stylesheet"]': 'href',
  'script[src]': 'src',
  '[style]': 'style',
  'img[data-src]': false,
};
const hashes = new Map([['css/a.css', '1'], ['img/b.png', '2'], ['posts/hi/c.jpg', '3']]);

test('rewriteHtml only touches matched URLs and keeps the rest byte for byte', () => {
  const html = `<!DOCTYPE html>
<html><head>
  <LINK REL="preload stylesheet" HREF='/css/a.css?v=1'>
  <script src=/js/unknown.js></script>
  <style>.x{background:url(/img/b.png)}</style>
</head><body>
  <img src="/img/b.png" srcset="/img/b.png 1x, c.jpg 2x" data-src="/img/b.png" alt="a &amp; b">
  <div style="background: url('../../img/b.png')"></div>
  <p>/img/b.png stays as text</p>
</body></html>`;
  const expected = html
    .replace("HREF='/css/a.css?v=1'", "HREF='/css/a-1.css?v=1'")
    .replace('.x{background:url(/img/b.png)}', '.x{background:url(/img/b-2.png)}')
    .replace('src="/img/b.png" srcset="/img/b.png 1x, c.jpg 2x"', 'src="/img/b-2.png" srcset="/img/b-2.png 1x, c-3.jpg 2x"')
    .replace("url('../../img/b.png')", "url('../../img/b-2.png')");
  assert.equal(rewriteHtml(html, 'posts/hi/index.html', selectors, hashes, ctx), expected);
});

test('rewriteHtml returns the input unchanged when nothing matches', () => {
  const html = '<p>hello <img src="/other.png"></p>';
  assert.equal(rewriteHtml(html, 'index.html', selectors, hashes, ctx), html);
});
