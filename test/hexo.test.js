'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Hexo = require('hexo');

/**
 * Build a throwaway Hexo site, load the plugin and generate it.
 *
 * @param {Record<string, string>} files  Paths under `source/` -> content.
 * @param {Record<string, unknown>} config  Extra site config.
 */
async function generate(files, config) {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hexo-rev-'));
  for (const [file, content] of Object.entries(files)) {
    const target = path.join(baseDir, 'source', file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }

  const hexo = new Hexo(baseDir, { silent: true });
  await hexo.init();
  Object.assign(hexo.config, { skip_render: ['**/*.html'] }, config);
  await hexo.loadPlugin(require.resolve('..'));
  await hexo.load();

  /** @type {Record<string, string>} */
  const output = {};
  for (const route of hexo.route.list()) {
    const chunks = [];
    for await (const chunk of hexo.route.get(route)) chunks.push(Buffer.from(chunk));
    output[route] = Buffer.concat(chunks).toString();
  }
  fs.rmSync(baseDir, { recursive: true, force: true });
  return output;
}

const md5 = (/** @type {string} */ s) => require('crypto').createHash('md5').update(s).digest('hex');

test('revisions assets, CSS references and HTML references', async () => {
  const output = await generate({
    'index.html': '<link rel="stylesheet" href="/css/style.css"><img src="images/logo.png"><script src="/js/app.js"></script>',
    'css/style.css': '@import "base.css"; body{background:url(images/banner.jpg)}',
    'css/base.css': 'h1{font-family:x;src:url(../fonts/x.woff2)}',
    'css/images/banner.jpg': 'banner',
    'images/logo.png': 'logo',
    'fonts/x.woff2': 'font',
    'js/app.js': 'console.log("app.js")',
    'notes.txt': 'see /images/logo.png',
  }, { revisioning: { enable: true } });

  const banner = `css/images/banner-${md5('banner')}.jpg`;
  const font = `fonts/x-${md5('font')}.woff2`;
  const baseCss = 'h1{font-family:x;src:url(../fonts/x-' + md5('font') + '.woff2)}';
  const base = `css/base-${md5(baseCss)}.css`;
  const styleCss = `@import "base-${md5(baseCss)}.css"; body{background:url(images/banner-${md5('banner')}.jpg)}`;
  const style = `css/style-${md5(styleCss)}.css`;
  const logo = `images/logo-${md5('logo')}.png`;
  const app = `js/app-${md5('console.log("app.js")')}.js`;

  assert.deepEqual(Object.keys(output).sort(), [app, base, banner, style, font, logo, 'index.html', 'notes.txt'].sort());
  assert.equal(output[style], styleCss);
  assert.equal(output[base], baseCss);
  assert.equal(output[app], 'console.log("app.js")');
  assert.equal(output['notes.txt'], 'see /images/logo.png');
  assert.equal(output['index.html'], `<link rel="stylesheet" href="/${style}"><img src="${logo}"><script src="/${app}"></script>`);
});

test('accepts exclude as a string and keeps originals when asked', async () => {
  const output = await generate({
    'index.html': '<img src="/a.png"><img src="/b.png">',
    'a.png': 'a',
    'b.png': 'b',
  }, { revisioning: { enable: true, keep: true, exclude: 'b.png' } });

  assert.deepEqual(Object.keys(output).sort(), [`a-${md5('a')}.png`, 'a.png', 'b.png', 'index.html']);
  assert.equal(output['index.html'], `<img src="/a-${md5('a')}.png"><img src="/b.png">`);
});

test('does nothing unless enabled', async () => {
  const output = await generate({ 'index.html': '<img src="/a.png">', 'a.png': 'a' }, { revisioning: { enable: false } });
  assert.deepEqual(Object.keys(output).sort(), ['a.png', 'index.html']);
});

test('supports a site root', async () => {
  const output = await generate({
    'index.html': '<img src="/blog/a.png"><img src="https://example.com/blog/a.png">',
    'a.png': 'a',
  }, { url: 'https://example.com/blog', root: '/blog/', revisioning: { enable: true } });

  const a = `a-${md5('a')}.png`;
  assert.equal(output['index.html'], `<img src="/blog/${a}"><img src="https://example.com/blog/${a}">`);
});
