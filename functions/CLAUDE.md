# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (ts-node with nodemon, no build step needed)
npm run dev

# Build (compile TypeScript + copy PEM cert to lib/)
npm run build

# Lint
npm run lint

# Firebase local emulators (builds first)
npm run serve

# Deploy to Firebase
npm run deploy
```

The `build` script runs `tsc --sourceMap false` and then copies the X509 PEM certificate into `lib/`. The certificate copy is required for MongoDB Atlas authentication to work after deployment.

## Architecture

This is a **Firebase Cloud Functions v2** backend serving an Express.js REST API for rental property listings (affiti) scraped from immobiliare.it.

### Entry Points

- **`src/index.ts`** — Express app setup, MongoDB connection, Firebase Admin init, Swagger UI at `/api-docs`, exports `api` as the Cloud Function. CORS allows `localhost:3000` and `https://affiti.aloi.com.br`. Max 10 instances.
- **`src/env.ts`** — All config constants (MongoDB URL, database `udine`, collection `affito`, port 5088). Single source of truth for configuration.

### Source Files

| File | Purpose |
|------|---------|
| `src/api.ts` | Main REST routes: `POST /api/affito` (search/filter), `GET /api/affito/:id`, `POST /api/affito/:id/state` (auth-protected) |
| `src/statistic.ts` | `GET /statistic/affiti` — aggregated stats |
| `src/firebaseAuth.ts` | Express middleware verifying Firebase Bearer tokens; attaches user to `req`; project ID `affitiudine` |
| `src/env.ts` | Config constants |

### Database

MongoDB Atlas (`udine` database, `affito` collection) using **X509 certificate authentication**. The cert file lives at `src/X509-cert-*.pem` and is copied to `lib/` on build. The `MONGO_CERT_PATH` env variable points to the cert (defaults to the `lib/` path in production).

### Authentication

Only `POST /api/affito/:id/state` requires Firebase auth. The middleware in `firebaseAuth.ts` checks for a Bearer token in the `Authorization` header and validates it against Firebase Admin SDK. Only `mariano@aloi.com.br` is authorized to perform state updates.

### API Search (`POST /api/affito`)

Uses a MongoDB aggregation pipeline with `$match`, `$project`, and `$lookup`. Filters: `priceMin`/`priceMax`, `state`, `elevator`, `floor`, `agentName`, `province`, disabled access. Returns paginated results with total count.

### Swagger Docs

All routes in `api.ts` are documented with JSDoc `@swagger` annotations. The UI is served at `/api-docs` in development.

### Environment Files

- `.env.local` — local overrides (gitignored)
- `.env.production` — production values (gitignored); contains `MONGO_URL`, `MONGO_CERT_PATH`, `GCLOUD_PROJECT`

### TypeScript Config

- Target: `es2017`, module: `NodeNext`
- Strict mode enabled, `noUnusedLocals: true`, `noImplicitReturns: true`
- Output: `lib/`
- Max line length: 120 chars (ESLint), double quotes required
