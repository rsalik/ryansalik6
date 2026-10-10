import { error } from '@sveltejs/kit';
import { projects } from '$lib/data/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
  const index = projects.findIndex((project) => project.id === params.id);
  if (index < 0) error(404, 'This project could not be found.');
  return {
    project: projects[index],
    previous: projects[(index - 1 + projects.length) % projects.length],
    next: projects[(index + 1) % projects.length],
    index
  };
};
