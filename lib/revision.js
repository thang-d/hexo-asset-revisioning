'use strict';

const { createHash } = require('crypto');
const { minimatch } = require('minimatch');
const { cssDependencies, rewriteCss } = require('./css');
const { rewriteHtml } = require('./html');
const { revisionPath } = require('./url');

/**
 * @typedef {object} RevisioningOptions
 * @property {boolean} enable
 * @property {boolean} keep  Keep the original, un-revisioned files as well.
 * @property {string[]} include  Globs of files to revision.
 * @property {string[]} exclude  Globs of files never to revision or rewrite.
 * @property {string} root  URL prefix of the assets; defaults to Hexo's `root`.
 * @property {Record<string, string | false | null>} selectors  CSS selector -> attribute holding the URL.
 * @property {import('minimatch').MinimatchOptions} match  Options passed to minimatch.
 */

const HTML = /\.html?$/i;
const CSS = /\.css$/i;

/**
 * @param {string | string[] | null | undefined} value
 * @returns {string[]}
 */
function toArray(value) {
  if (value === null || value === undefined || value === '') return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * @param {string} root
 * @returns {string}
 */
function normalizeRoot(root) {
  let result = root || '/';
  if (!result.startsWith('/')) result = '/' + result;
  if (!result.endsWith('/')) result += '/';
  return result;
}

/**
 * @param {import('stream').Readable} stream
 * @returns {Promise<Buffer>}
 */
async function readStream(stream) {
  /** @type {Buffer[]} */
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * @param {Buffer | string} content
 * @returns {string}
 */
function md5(content) {
  return createHash('md5').update(content).digest('hex');
}

/**
 * `after_generate` filter: rename assets to `name-<md5>.ext` and update every
 * reference to them in HTML and CSS.
 *
 * Assets are processed first (their hash only depends on their content), then
 * stylesheets in dependency order (so a stylesheet's hash covers the new names
 * of the images, fonts and stylesheets it references), then HTML pages, which
 * are rewritten but never renamed.
 *
 * @this {import('hexo')}
 * @returns {Promise<void>}
 */
async function revision() {
  const hexo = this;
  const route = hexo.route;
  /** @type {RevisioningOptions} */
  const options = hexo.config.revisioning;
  const include = toArray(options.include);
  const exclude = toArray(options.exclude);
  /** @type {import('./url').UrlContext} */
  const ctx = {
    root: normalizeRoot(options.root || hexo.config.root),
    siteUrl: typeof hexo.config.url === 'string' ? hexo.config.url.replace(/\/+$/, '') : undefined,
  };

  /** @param {string} path @param {string[]} patterns */
  const matches = (path, patterns) => patterns.some(pattern => minimatch(path, pattern, options.match));

  /** @type {string[]} */
  const assets = [];
  /** @type {string[]} */
  const stylesheets = [];
  /** @type {string[]} */
  const pages = [];

  for (const path of route.list()) {
    if (matches(path, exclude)) continue;
    if (HTML.test(path)) pages.push(path);
    else if (!matches(path, include)) continue;
    else if (CSS.test(path)) stylesheets.push(path);
    else assets.push(path);
  }

  /** @type {Map<string, Buffer>} */
  const contents = new Map();
  for (const path of [...assets, ...stylesheets]) {
    contents.set(path, await readStream(route.get(path)));
  }

  /** @type {Map<string, string>} */
  const hashes = new Map();

  for (const path of assets) {
    hashes.set(path, md5(/** @type {Buffer} */ (contents.get(path))));
  }

  // A stylesheet can only be hashed once the stylesheets it imports have their final names.
  const pending = new Set(stylesheets);
  while (pending.size) {
    let ready = [...pending].filter(path => {
      const css = /** @type {Buffer} */ (contents.get(path)).toString();
      return cssDependencies(css, path, ctx).every(dep => dep === path || !pending.has(dep));
    });
    // Import cycle: nothing can be ordered, so break it at the first remaining stylesheet.
    if (!ready.length) ready = [/** @type {string} */ (pending.values().next().value)];

    for (const path of ready) {
      const css = /** @type {Buffer} */ (contents.get(path)).toString();
      const rewritten = Buffer.from(rewriteCss(css, path, hashes, ctx));
      contents.set(path, rewritten);
      hashes.set(path, md5(rewritten));
      pending.delete(path);
    }
  }

  if (!hashes.size) return;

  for (const path of pages) {
    const html = (await readStream(route.get(path))).toString();
    const rewritten = rewriteHtml(html, path, options.selectors, hashes, ctx);
    if (rewritten !== html) route.set(path, rewritten);
  }

  for (const [path, hash] of hashes) {
    const content = /** @type {Buffer} */ (contents.get(path));
    if (options.keep) route.set(path, content);
    else route.remove(path);
    route.set(revisionPath(path, hash), content);
  }
}

module.exports = revision;
