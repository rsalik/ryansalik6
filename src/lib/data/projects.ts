/** Supply project copy, artwork, and links for the homepage and individual project pages. */

/** Describe a portfolio project and its presentation across listing and detail pages. */
export interface Project {
  id: string;
  name: string;
  description: string;
  blurb: string;
  image: string;
  imageAlt: string;
  webLink?: string;
  webLinkLabel?: string;
  repoLink: string;
  category: string;
  stack: string[];
  unavailableOnline: boolean;
}

/** List selected projects in their homepage and adjacent-page navigation order. */
export const projects: Project[] = [
  {
    id: 'exogram',
    name: 'Exogram',
    description:
      "A web application I made for NASA's Planet Patrol project to aid in the search for exoplanets and other objects of interest from the TESS mission. Written in React, the application allows users to search for, comment on, share, and generate light curves for thousands of TESS targets. Written in React and hosted by Firebase and Vercel.",
    image: '/projects/exogram-charts.jpg',
    webLink: 'https://exogram.vercel.app/',
    repoLink: 'https://github.com/rsalik/exogram',
    imageAlt: 'Exogram project screenshot',
    blurb:
      "A web application I made for NASA's Planet Patrol project to aid in the search for exoplanets and other objects of interest from the TESS mission.",
    category: 'Astronomy & research',
    stack: ['React', 'Firebase', 'Vercel'],
    unavailableOnline: false
  },
  {
    id: 'deluca',
    name: 'DeLuca',
    image: '/projects/deluca-pendulum.png',
    description:
      'At Google AI Princeton, I explored the usage of spectral filtering to build lightweight, performant world models for dynamical systems. Spectral filtering is a technique that enables compact representations of long-term dependencies in time series data. We also validated recent theoretical results that spectral filtering can enable a linear model to predict non-linear dynamics effectively.',
    webLinkLabel: 'View contribution',
    repoLink: 'https://github.com/google/deluca',
    imageAlt: 'A pendulum simulation rendered in Brax, captured from my DeLuca notebook.',
    blurb:
      'Leveraging spectral filtering techniques to quickly train lightweight models to predict complex dynamical systems.',
    category: 'World modeling & control',
    stack: ['Python', 'JAX', 'Brax'],
    unavailableOnline: false
  },
  {
    id: 'geoguessr',
    name: 'Geoguessr',
    description:
      'A remake of Geoguessr from scratch. Features a guess-the-country and Battle Royale gamemodes. Written in React and Node.js.',
    image: '/projects/geoguessr.jpg',
    webLink: 'https://geoguessr.herokuapp.com/',
    repoLink: 'https://github.com/rsalik/geoguessr',
    imageAlt: 'Geoguessr project screenshot',
    blurb:
      'A remake of Geoguessr from scratch. Features a guess-the-country and Battle Royale gamemodes.',
    category: 'Multiplayer game',
    stack: ['React', 'Node.js'],
    unavailableOnline: true
  },
    {
    id: 'photos',
    name: 'photos.ryansalik.com',
    image: '/projects/photossite.png',
    description:
      "My photo portfolio website. It features a procedurally generated film-style \"contact sheet\" gallery, and custom progressive image loading engine. Built with SvelteKit, Postgres, and Cloudflare R2.",
    webLink: 'https://photos.ryansalik.com/',
    repoLink: 'https://github.com/rsalik/photo',
    imageAlt: 'photos.ryansalik.com project screenshot',
    blurb: "My photo portfolio website, featuring some of my favorite photos arranged in a contact sheet from ye olde analog times.",
    category: 'Portfolio',
    stack: ['SvelteKit', 'Postgres', 'Cloudflare R2'],
    unavailableOnline: false
  },
  {
    id: 'wtp',
    name: 'Staples WTP',
    image: '/projects/wtp.jpg',
    description:
      'A web application designed for the competitive Staples We the People team. It allows users to view competition materials, view the completion status of their work, and coordinate meetings with the teacher. We the People is a competition in which students demonstrate their understanding of complex political and Constitutional issues in a simulated "Congressional" hearing format. Written in Svelte, its website and database are hosted by Firebase.',
    webLink: 'https://shs-wtp.web.app/',
    repoLink: 'https://github.com/rsalik/Staples-WTP',
    imageAlt: 'Staples WTP project screenshot',
    blurb: 'A web application designed for the competitive Staples We the People team.',
    category: 'Education & collaboration',
    stack: ['Svelte', 'Firebase'],
    unavailableOnline: false
  },
  {
    id: 'typeracer',
    name: 'Typeracer++',
    image: '/projects/typeracer.jpg',
    description:
      'A game where you race a friend to type a randomized sequence of words as fast as possible. UI inspired by monkeytype.com. Written in pure JavaScript and Node.js.',
    webLink: 'http://typeracer-plus-plus.herokuapp.com/',
    repoLink: 'https://github.com/rsalik/typeracer-plus-plus',
    imageAlt: 'Typeracer++ project screenshot',
    blurb:
      'A game where you race a friend to type a randomized sequence of words as fast as possible.',
    category: 'Multiplayer game',
    stack: ['JavaScript', 'Node.js'],
    unavailableOnline: true
  },
  {
    id: 'ryansalikcom',
    name: 'ryansalik.com',
    image: '/projects/ryansalik.png',
    description: "The website you're on right now! Built with SvelteKit and TypeScript. Hosted on Cloudflare Pages.",
    repoLink: 'https://github.com/rsalik/ryansalik.com',
    webLink: 'https://ryansalik.com',
    imageAlt: 'ryansalik.com project screenshot',
    blurb: "The website you're on right now! Built with SvelteKit and TypeScript. Hosted on Cloudflare Pages.",
    category: 'Personal website',
    stack: ['Svelte', 'Cloudflare'],
    unavailableOnline: false
  },
  {
    id: 'smm',
    name: 'Super Mario Maker',
    image: '/projects/smm.jpg',
    description:
      'A (very mediocre) recreation of Super Mario Maker game, where you can build, play, and share platforming levels. Written in pure JavaScript and Node.js.',
    webLink: 'https://smmweb.herokuapp.com/',
    repoLink: 'https://github.com/rsalik/Super-Mario-Maker',
    imageAlt: 'Super Mario Maker project screenshot',
    blurb:
      'A (very mediocre) recreation of Super Mario Maker game, where you can build, play, and share platforming levels.',
    category: 'Game & level editor',
    stack: ['JavaScript', 'Node.js'],
    unavailableOnline: true
  }
];

/** Look up project content by its URL slug. */
export const projectsById: Record<string, Project> = Object.fromEntries(
  projects.map((project) => [project.id, project])
);

/** Explain the archived availability of projects hosted on Heroku's former free tier. */
export const unavailableProjectNote =
  'Heroku has disabled free-tier dynos, so this project is no longer available online.';

/** Provide the public contact destinations displayed in the footer. */
export const contactLinks = [
  { label: 'Email', text: 'ryansalik@princeton.edu', href: 'mailto:ryansalik@princeton.edu' },
  { label: 'GitHub', text: 'rsalik', href: 'https://github.com/rsalik' }
] as const;

/** Link to the full photography portfolio. */
export const photographyUrl = 'https://photos.ryansalik.com';
