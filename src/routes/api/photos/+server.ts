import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { filtersFromSearchParams } from '@ryansalik/photo-api';
import { getPhotoCollection } from '$lib/server/photography';

export const GET: RequestHandler = async ({ url }) => {
  const filters = filtersFromSearchParams(url.searchParams);
  if (!filters.album && !filters.tag && !filters.favorite && !url.searchParams.has('all'))
    filters.tag = 'Landscape';
  const collection = await getPhotoCollection(filters);
  return json(collection, {
    headers: { 'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=3600' }
  });
};
