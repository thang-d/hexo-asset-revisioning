'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveRef, revisionPath, revisionRef, rewriteSrcset } = require('../lib/url');

const ctx = { root: '/', siteUrl: 'https://example.com' };

test('resolveRef: absolute, relative and site URLs', () => {
  assert.equal(resolveRef('/css/a.css', 'index.html', ctx), 'css/a.css');
  assert.equal(resolveRef('images/a.png', 'css/style.css', ctx), 'css/images/a.png');
  assert.equal(resolveRef('../fonts/a.woff2?v=1#x', 'css/style.css', ctx), 'fonts/a.woff2');
  assert.equal(resolveRef('./a.png', 'posts/hello/index.html', ctx), 'posts/hello/a.png');
  assert.equal(resolveRef('https://example.com/js/a.js', 'index.html', ctx), 'js/a.js');
  assert.equal(resolveRef('/images/my%20photo.jpg', 'index.html', ctx), 'images/my photo.jpg');
});

test('resolveRef: ignores anything that is not a local file', () => {
  for (const ref of ['', '#top', '//cdn.example.com/a.js', 'https://other.com/a.js', 'data:image/png;base64,AAAA', 'mailto:a@b.c', '../../a.png']) {
    assert.equal(resolveRef(ref, 'css/style.css', ctx), null, ref);
  }
});

test('resolveRef: honours the site root', () => {
  const blog = { root: '/blog/', siteUrl: 'https://example.com/blog' };
  assert.equal(resolveRef('/blog/css/a.css', 'index.html', blog), 'css/a.css');
  assert.equal(resolveRef('/css/a.css', 'index.html', blog), null);
  assert.equal(resolveRef('https://example.com/blog/css/a.css', 'index.html', blog), 'css/a.css');
});

test('revisionRef keeps the reference as written', () => {
  assert.equal(revisionRef('images/a.png', 'abc'), 'images/a-abc.png');
  assert.equal(revisionRef('/js/app.min.js?v=1#x', 'abc'), '/js/app.min-abc.js?v=1#x');
  assert.equal(revisionRef('https://example.com/a.css', 'abc'), 'https://example.com/a-abc.css');
  assert.equal(revisionRef(' a.png ', 'abc'), ' a-abc.png ');
  assert.equal(revisionPath('css/style.css', 'abc'), 'css/style-abc.css');
  assert.equal(revisionPath('LICENSE', 'abc'), 'LICENSE-abc');
});

test('rewriteSrcset rewrites every candidate', () => {
  const hashes = new Map([['a.png', '1'], ['b.png', '2']]);
  assert.equal(rewriteSrcset('/a.png 1x, /b.png 2x, /c.png 3x', 'index.html', hashes, ctx), '/a-1.png 1x, /b-2.png 2x, /c.png 3x');
});
