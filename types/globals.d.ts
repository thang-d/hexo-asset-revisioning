import type Hexo from 'hexo';

declare global {
  /** Injected by Hexo into every plugin script. */
  const hexo: Hexo;
}

export {};
