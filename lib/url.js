'use strict';

const { posix } = require('path');

/**
 * @typedef {object} UrlContext
 * @property {string} root  Site root, always starting and ending with `/` (e.g. `/` or `/blog/`).
 * @property {string} [siteUrl]  Absolute site URL without trailing slash (e.g. `https://example.com/blog`).
 */

/**
 * Split a URL reference into its path part and its `?query#hash` suffix.
 *
 * @param {string} ref
 * @returns {{ pathname: string, suffix: string }}
 */
function splitSuffix(ref) {
  const index = ref.search(/[?#]/);
  if (index === -1) return { pathname: ref, suffix: '' };
  return { pathname: ref.slice(0, index), suffix: ref.slice(index) };
}

/**
 * @param {string} value
 * @returns {string}
 */
function safeDecode(value) {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

/**
 * Resolve a URL reference found in the route `from` to a Hexo route path
 * (relative to the public folder, no leading slash).
 * Returns `null` for anything that does not point to a local file.
 *
 * @param {string} ref  Raw reference as written in the file.
 * @param {string} from  Route path of the file containing the reference.
 * @param {UrlContext} ctx
 * @returns {string | null}
 */
function resolveRef(ref, from, ctx) {
  const trimmed = ref.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  let { pathname } = splitSuffix(trimmed);
  if (!pathname) return null;

  if (ctx.siteUrl && pathname.startsWith(ctx.siteUrl + '/')) {
    // Absolute URL on this site: https://example.com/blog/css/a.css
    pathname = posix.join(ctx.root, pathname.slice(ctx.siteUrl.length + 1));
  } else if (pathname.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(pathname)) {
    // Protocol-relative or any scheme (http:, data:, mailto:, ...).
    return null;
  }

  let resolved;
  if (pathname.startsWith('/')) {
    if (!pathname.startsWith(ctx.root)) return null;
    resolved = posix.normalize(pathname.slice(ctx.root.length));
  } else {
    resolved = posix.join(posix.dirname(from), pathname);
  }

  if (resolved.startsWith('../') || resolved === '..') return null;
  return safeDecode(resolved.replace(/^\.?\//, ''));
}

/**
 * Insert `-<hash>` before the extension of the last path segment of `ref`,
 * keeping everything else (host, directories, query, hash, encoding) as written.
 *
 * @param {string} ref
 * @param {string} hash
 * @returns {string}
 */
function revisionRef(ref, hash) {
  const leading = ref.slice(0, ref.length - ref.trimStart().length);
  const trailing = ref.slice(ref.trimEnd().length);
  const { pathname, suffix } = splitSuffix(ref.trim());
  const slash = pathname.lastIndexOf('/');
  const dir = pathname.slice(0, slash + 1);
  const name = pathname.slice(slash + 1);
  const ext = posix.extname(name);
  const base = ext ? name.slice(0, -ext.length) : name;
  return `${leading}${dir}${base}-${hash}${ext}${suffix}${trailing}`;
}

/**
 * Insert `-<hash>` before the extension of a route path.
 *
 * @param {string} routePath
 * @param {string} hash
 * @returns {string}
 */
function revisionPath(routePath, hash) {
  const ext = posix.extname(routePath);
  return `${routePath.slice(0, routePath.length - ext.length)}-${hash}${ext}`;
}

/**
 * Rewrite a single reference if it points to a revisioned route.
 *
 * @param {string} ref
 * @param {string} from
 * @param {Map<string, string>} hashes  Route path -> content hash.
 * @param {UrlContext} ctx
 * @returns {string}
 */
function rewriteRef(ref, from, hashes, ctx) {
  const target = resolveRef(ref, from, ctx);
  if (target === null) return ref;
  const hash = hashes.get(target);
  return hash ? revisionRef(ref, hash) : ref;
}

/**
 * Rewrite every URL of a `srcset` attribute value.
 *
 * @param {string} value
 * @param {string} from
 * @param {Map<string, string>} hashes
 * @param {UrlContext} ctx
 * @returns {string}
 */
function rewriteSrcset(value, from, hashes, ctx) {
  return value.replace(/(^|,)(\s*)([^\s,]+)/g, (match, comma, space, url) => {
    return comma + space + rewriteRef(url, from, hashes, ctx);
  });
}

module.exports = {
  resolveRef,
  revisionPath,
  revisionRef,
  rewriteRef,
  rewriteSrcset,
};
