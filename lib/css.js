'use strict';

const { resolveRef, rewriteRef } = require('./url');

/** `url(...)` with an optional quote, and `@import "..."` without `url()`. */
const CSS_REF = /(url\(\s*)(['"]?)([^'")]*)(\2\s*\))|(@import\s+)(['"])([^'"]*)(\6)/gi;

/**
 * Call `fn` for each URL referenced by a stylesheet and replace it with the result.
 *
 * @param {string} css
 * @param {(ref: string) => string} fn
 * @returns {string}
 */
function mapCssRefs(css, fn) {
  return css.replace(CSS_REF, (match, urlOpen, urlQuote, urlRef, urlClose, importOpen, importQuote, importRef, importClose) => {
    if (urlOpen !== undefined) return urlOpen + urlQuote + fn(urlRef) + urlClose;
    return importOpen + importQuote + fn(importRef) + importClose;
  });
}

/**
 * List the route paths referenced by a stylesheet.
 *
 * @param {string} css
 * @param {string} from
 * @param {import('./url').UrlContext} ctx
 * @returns {string[]}
 */
function cssDependencies(css, from, ctx) {
  /** @type {string[]} */
  const deps = [];
  mapCssRefs(css, ref => {
    const target = resolveRef(ref, from, ctx);
    if (target !== null) deps.push(target);
    return ref;
  });
  return deps;
}

/**
 * Point every revisioned URL of a stylesheet to its new name.
 *
 * @param {string} css
 * @param {string} from
 * @param {Map<string, string>} hashes
 * @param {import('./url').UrlContext} ctx
 * @returns {string}
 */
function rewriteCss(css, from, hashes, ctx) {
  return mapCssRefs(css, ref => rewriteRef(ref, from, hashes, ctx));
}

module.exports = { cssDependencies, rewriteCss };
