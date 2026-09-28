'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { cssDependencies, rewriteCss } = require('../lib/css');

const ctx = { root: '/' };

test('rewriteCss handles url() with any quoting and @import', () => {
  const hashes = new Map([['css/images/a.png', '1'], ['fonts/b.woff2', '2'], ['css/base.css', '3']]);
  const css = [
    '@import "base.css";',
    '.a{background:url(images/a.png)}',
    ".b{background:url('/css/images/a.png')}",
    '@font-face{src:url("../fonts/b.woff2?v=4") format("woff2")}',
    '.c{background:url(data:image/png;base64,AAAA)}',
    '.d{background:url(images/missing.png)}',
  ].join('\n');
  assert.equal(rewriteCss(css, 'css/style.css', hashes, ctx), [
    '@import "base-3.css";',
    '.a{background:url(images/a-1.png)}',
    ".b{background:url('/css/images/a-1.png')}",
    '@font-face{src:url("../fonts/b-2.woff2?v=4") format("woff2")}',
    '.c{background:url(data:image/png;base64,AAAA)}',
    '.d{background:url(images/missing.png)}',
  ].join('\n'));
});

test('cssDependencies lists local references', () => {
  const css = '@import url(reset.css); .a{background:url(https://x.com/a.png)} .b{background:url(/img/b.png)}';
  assert.deepEqual(cssDependencies(css, 'css/style.css', ctx), ['css/reset.css', 'img/b.png']);
});
