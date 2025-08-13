import { BASE_URL } from '..';

export const getImageUrl = (src) => {
  if (!src) return '';
  if (typeof src !== 'string') return '';
  if (src.startsWith('http')) return src;
  const prefix = src.startsWith('/') ? '' : '/';
  return `${BASE_URL}${prefix}${src}`;
};


