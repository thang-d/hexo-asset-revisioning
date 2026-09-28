'use strict';

/* global hexo */

const DEFAULTS = {
  enable: false,
  keep: false,
  include: ['*.{css,js,mjs,png,jpg,jpeg,gif,webp,avif,svg,ico,bmp,woff,woff2,ttf,otf,eot,mp4,webm,ogg,mp3,wav}'],
  exclude: [],
  root: '',
  selectors: {
    'img[src]': 'src',
    'img[srcset]': 'srcset',
    'img[data-src]': 'data-src',
    'img[data-srcset]': 'data-srcset',
    'source[src]': 'src',
    'source[srcset]': 'srcset',
    'video[src]': 'src',
    'video[poster]': 'poster',
    'audio[src]': 'src',
    'script[src]': 'src',
    'link[rel~="stylesheet"]': 'href',
    'link[rel~="icon"]': 'href',
    'link[rel="apple-touch-icon"]': 'href',
    'link[rel="preload"]': 'href',
    'link[rel="modulepreload"]': 'href',
    '[style]': 'style',
  },
  match: {
    matchBase: true,
    nocase: true,
  },
};

const config = hexo.config.revisioning;

if (config && config.enable) {
  hexo.config.revisioning = {
    ...DEFAULTS,
    ...config,
    selectors: { ...DEFAULTS.selectors, ...config.selectors },
    match: { ...DEFAULTS.match, ...config.match },
  };

  hexo.extend.filter.register('after_generate', require('./lib/revision'));
}
