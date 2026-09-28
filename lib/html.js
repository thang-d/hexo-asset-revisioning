'use strict';

const parse5 = require('parse5');
const { adapter } = require('parse5-htmlparser2-tree-adapter');
const { selectAll } = require('css-select');
const { rewriteCss } = require('./css');
const { rewriteRef, rewriteSrcset } = require('./url');

/** `name = "value"`, `name='value'` or `name=value`, as written in the source. */
const ATTRIBUTE = /^([^\s=]+\s*=\s*)(?:"([^"]*)"|'([^']*)'|(\S*))$/s;

/**
 * @typedef {{ start: number, end: number, text: string }} Edit
 * @typedef {import('domhandler').Element & { sourceCodeLocation?: import('parse5').Token.ElementLocation }} LocatedElement
 */

/**
 * Point every revisioned URL of an HTML document to its new name.
 * Only the matched attribute values (and `<style>` contents) are touched;
 * the rest of the document is kept byte for byte.
 *
 * @param {string} html
 * @param {string} from  Route path of the document.
 * @param {Record<string, string | false | null>} selectors  CSS selector -> attribute holding the URL.
 * @param {Map<string, string>} hashes
 * @param {import('./url').UrlContext} ctx
 * @returns {string}
 */
function rewriteHtml(html, from, selectors, hashes, ctx) {
  const document = parse5.parse(html, { treeAdapter: adapter, sourceCodeLocationInfo: true });
  /** @type {Edit[]} */
  const edits = [];
  /** @type {Set<string>} */
  const seen = new Set();

  /**
   * @param {number} start
   * @param {number} end
   * @param {string} original
   * @param {string} text
   */
  const edit = (start, end, original, text) => {
    const key = `${start}:${end}`;
    if (text === original || seen.has(key)) return;
    seen.add(key);
    edits.push({ start, end, text });
  };

  for (const [selector, attr] of Object.entries(selectors)) {
    if (!attr) continue;
    const name = attr.toLowerCase();

    for (const node of selectAll(selector, document)) {
      const el = /** @type {LocatedElement} */ (/** @type {unknown} */ (node));
      const loc = el.sourceCodeLocation && el.sourceCodeLocation.attrs && el.sourceCodeLocation.attrs[name];
      if (!loc) continue;

      const match = html.slice(loc.startOffset, loc.endOffset).match(ATTRIBUTE);
      if (!match) continue;
      const value = match[2] ?? match[3] ?? match[4];
      const start = loc.startOffset + match[1].length + (match[4] === undefined ? 1 : 0);

      let rewritten;
      if (name === 'srcset') rewritten = rewriteSrcset(value, from, hashes, ctx);
      else if (name === 'style') rewritten = rewriteCss(value, from, hashes, ctx);
      else rewritten = rewriteRef(value, from, hashes, ctx);

      edit(start, start + value.length, value, rewritten);
    }
  }

  for (const node of selectAll('style', document)) {
    const loc = /** @type {LocatedElement} */ (/** @type {unknown} */ (node)).sourceCodeLocation;
    if (!loc || !loc.startTag || !loc.endTag) continue;
    const start = loc.startTag.endOffset;
    const end = loc.endTag.startOffset;
    const css = html.slice(start, end);
    edit(start, end, css, rewriteCss(css, from, hashes, ctx));
  }

  edits.sort((a, b) => b.start - a.start);
  let output = html;
  for (const { start, end, text } of edits) {
    output = output.slice(0, start) + text + output.slice(end);
  }
  return output;
}

module.exports = { rewriteHtml };
