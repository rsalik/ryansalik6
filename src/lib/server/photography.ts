import { env } from '$env/dynamic/private';
import { createNeonExecutor } from '@ryansalik/photo-api/neon';
import { createPhotoClient, normalizeFilters, presentPhoto } from '@ryansalik/photo-api';
import { createPhotoRepository } from '@ryansalik/photo-api/server';
import type {
  PhotoFilters,
  PhotoOptions,
  PhotoCollection,
  PhotographyHome
} from '$lib/types/photography';
import snapshot from './photo-snapshot.json';

const FRESH_FOR = 5 * 60 * 1000;
const RETRY_AFTER = 30 * 1000;
const MAX_CACHED_COLLECTIONS = 32;
const cached = new Map<string, { collection: PhotoCollection; expiresAt: number }>();
const pending = new Map<string, Promise<PhotoCollection>>();

function snapshotCollection(filters: PhotoFilters): PhotoCollection {
  const normalized = normalizeFilters(filters);
  const matches = (items: string[] | null, value: string) =>
    items?.some((item) => item.toLowerCase() === value.toLowerCase()) ?? false;
  const rows = snapshot.photos
    .filter(
      (photo) =>
        (!normalized.album || matches(photo.albums, normalized.album)) &&
        (!normalized.tag || matches(photo.tags, normalized.tag)) &&
        (!normalized.favorite || matches(photo.tags, 'favorite'))
    )
    .slice(normalized.offset, normalized.offset + normalized.limit);
  const options: PhotoOptions = {
    albums: [...new Set(snapshot.photos.flatMap((photo) => photo.albums ?? []))].sort(),
    tags: [...new Set(snapshot.photos.flatMap((photo) => photo.tags ?? []))]
      .filter((tag) => tag.toLowerCase() !== 'favorite')
      .sort()
  };
  return {
    photos: rows.map((photo) => presentPhoto(photo, { imageBaseUrl: snapshot.imageBaseUrl })),
    options,
    source: 'cached'
  };
}

async function readLiveCollection(filters: PhotoFilters): Promise<PhotoCollection> {
  if (env.PHOTO_API_URL) {
    const result = await createPhotoClient({ baseUrl: env.PHOTO_API_URL }).collection(filters);
    return { photos: result.photos, options: result.options, source: 'live' };
  }
  if (!env.PHOTO_DATABASE_URL) return snapshotCollection(filters);
  const repository = createPhotoRepository(createNeonExecutor(env.PHOTO_DATABASE_URL), {
    imageBaseUrl: env.PHOTO_IMAGE_BASE_URL || snapshot.imageBaseUrl,
    siteUrl: 'https://photos.ryansalik.com'
  });
  const result = await repository.collection(filters);
  return { photos: result.photos, options: result.options, source: 'live' };
}

/** Read a live filtered collection; retain real public photos during a temporary upstream outage. */
export async function getPhotoCollection(
  filters: PhotoFilters = { tag: 'Landscape' }
): Promise<PhotoCollection> {
  const normalized = normalizeFilters(filters);
  const key = JSON.stringify(normalized);
  const previous = cached.get(key);
  if (previous && previous.expiresAt > Date.now()) return previous.collection;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = (async () => {
    let collection: PhotoCollection;
    let expiresAt = Date.now() + FRESH_FOR;
    try {
      collection = await readLiveCollection(normalized);
    } catch {
      // Connection errors can include credentials. Never log or return the raw error.
      collection = previous
        ? { ...previous.collection, source: 'cached' }
        : snapshotCollection(normalized);
      expiresAt = Date.now() + RETRY_AFTER;
    }
    if (cached.size >= MAX_CACHED_COLLECTIONS) cached.delete(cached.keys().next().value!);
    cached.set(key, { collection, expiresAt });
    return collection;
  })();
  pending.set(key, request);
  try {
    return await request;
  } finally {
    pending.delete(key);
  }
}

/** Load independent hero and favorite collections without exposing server configuration. */
export async function getPhotographyHome(): Promise<PhotographyHome> {
  const [landscapes, favorites] = await Promise.all([
    getPhotoCollection({ tag: 'Landscape', limit: 48 }),
    getPhotoCollection({ favorite: true, limit: 12 })
  ]);
  return { ...landscapes, favorites: favorites.photos };
}
