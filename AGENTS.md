# Repository Guidelines

## Project Structure & Module Organization
Keep all Angular features under `src/app`. Use `core` for singletons (auth interceptors, config loaders), `shared` for reusable UI/services, and `feature-groups/*` for routed areas with their own assets. Bootstrapping happens in `src/main.ts` plus `src/app/app.config.ts`. Global styles live in `src/styles.css`, environments in `src/environments`, and static assets under `public/`. Local tooling lives beside its concern: the Express proxy in `proxy-server/` and JSON Server fixtures in `db.json`.

## Build, Test & Development Commands
`npm start` or `npm run dev` starts Angular dev server on port 4200. Ship-ready builds come from `npm run build` (production), `npm run build:netlify` (Netlify deployment), and `npm run build:gh-pages` (GitHub Pages). Run `npm test` for Karma/Jasmine and `npm run lint`, `npm run lint:docs`, `npm run lint:styles` before pushing. The project is optimized for static hosting on Netlify or GitHub Pages.

## Coding Style & Naming Conventions
Follow `.editorconfig`: two-space indentation, LF endings, UTF-8, single quotes in TypeScript, and no trailing whitespace. Components, directives, and pipes use kebab-case filenames with PascalCase classes; observables end with `$`. Each feature keeps its own SCSS. Let ESLint/Stylelint enforce formatting; auto-fix via `npm run lint:fix` and `npm run lint:styles:fix`. Align visual tokens with the theme definitions in `src/styles.css`.

## Testing Guidelines
Place specs beside implementation (`*.spec.ts`) and cover smart components, guards, and validators. Favor Angular TestBed plus `HttpTestingController` for HTTP flows, and build common fixtures under a feature `testing/` folder when reuse appears. Document gaps in the PR checklist and keep `npm test` green before merging.

## Commit & Pull Request Guidelines
Write commits in Chris Beams style: imperative subject ≤50 chars, optional body for context, and one logical change per commit. Open PRs as Draft, tick every checklist item (lint, build, tests, static analysis, accessibility), and add “Cómo probar” steps plus screenshots or GIFs for UI changes. Link issues, flag impacted scope (frontend, proxy, CI/CD), and record risk plus rollback notes prior to requesting review.

## Security & Configuration Tips
Never commit secrets or API keys. Configure backend URLs in `src/environments/environment.production.ts` for production deployments. Ensure CORS is properly configured on your backend API. All sensitive authentication tokens should be handled securely and never exposed in frontend code.
