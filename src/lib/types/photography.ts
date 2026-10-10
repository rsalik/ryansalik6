export type { Photo, PhotoFilters, PhotoOptions } from '@ryansalik/photo-api/types';
import type { Photo, PhotoOptions } from '@ryansalik/photo-api/types';

export interface PhotoCollection {
  photos: Photo[];
  options: PhotoOptions;
  source: 'live' | 'cached' | 'unavailable';
}

export interface PhotographyHome extends PhotoCollection {
  favorites: Photo[];
}
