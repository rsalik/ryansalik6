import type { PageServerLoad } from './$types';
import { getPhotographyHome } from '$lib/server/photography';
import { shuffled } from '$lib/photography/sequence';

export const load: PageServerLoad = async () => {
  const photography = await getPhotographyHome();
  return { photography: { ...photography, photos: shuffled(photography.photos) } };
};
