# Ryan Salik’s portfolio

Personal portfolio at [ryansalik.com](https://ryansalik.com), built with TypeScript, SvelteKit, and Cloudflare Pages. Features project pages and an interactive photography mosaic.

## Development

Requires Node.js 22.15+ and the shared `@ryansalik/photo-api` package in `../photo_api`.

```sh
npm --prefix ../photo_api ci
npm --prefix ../photo_api run build
npm ci
npm run dev
```

Copy `.env.example` to `.env` to configure live photography. Without configuration, the site uses bundled photo metadata and public CDN images.

```sh
npm run check
npm test
npm run format:check
npm run build
```

Project content lives in `src/lib/data/projects.ts`; site styles live in `src/app.css`.
