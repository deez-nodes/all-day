# Deployment

This monorepo contains four deployable apps ("artifacts"). The notes below
capture how each one runs in development and how it is built and served in
production, preserved from the original deployment configuration.

## Platform / runtime

- Runtimes required: Node.js 24, Python 3.11.
- Target platform: Linux x86_64 (the package overrides intentionally exclude all
  other esbuild / rollup / lightningcss / tailwind-oxide / ngrok platform
  binaries).
- All apps read their port and base path from environment variables
  (`PORT`, `BASE_PATH`); the Vite apps fail fast if these are unset.

## Deployment shape (from the original `.replit`)

- Router: `application` (single application router fronting all services).
- Deployment target: autoscale.
- Post-build step: `pnpm store prune` (run with `CI=true`).
- Post-merge hook: `scripts/post-merge.sh` (timeout 20s).
- External port map (localPort -> externalPort):
  - 8080 -> 8080
  - 8081 -> 80
  - 8082 -> 3001
  - 8083 -> 4200
  - 8084 -> 3002
  - 20307 -> 3000
  - 20308 -> 3003
  - 23262 -> 5000

---

## API Server (`artifacts/api-server`)

- Kind: API (Express backend).
- Title: "API Server".
- Service port: 8080 (`PORT=8080`), mounted at path `/api`.
- Healthcheck (startup): `GET /api/healthz`.
- Dev command:
  `pnpm --filter @workspace/api-server run dev`
- Production build (with `NODE_ENV=production`):
  `pnpm --filter @workspace/api-server run build`
- Production run (runs the bundled output directly, not through pnpm, for faster
  startup), with `PORT=8080 NODE_ENV=production`:
  `node --enable-source-maps artifacts/api-server/dist/index.mjs`

---

## Soul · Line Trainer — Web (`artifacts/soul-line-web`) — PRIMARY

- Kind: web (React + Vite static site).
- Title: "Soul · Line Trainer".
- Router type: path-based; served at `/` (`PORT=23262`, `BASE_PATH=/`).
- Dev command:
  `pnpm --filter @workspace/soul-line-web run dev`
- Production build:
  `pnpm --filter @workspace/soul-line-web run build`
- Production serve: static, from `artifacts/soul-line-web/dist/public`.
- SPA rewrite: `/*` -> `/index.html`.

---

## Soul · Line Trainer — Mobile (`artifacts/soul-line-trainer`)

- Kind: mobile (Expo / React Native, Expo Router).
- Title: "Soul · Line Trainer (Mobile)".
- Service port: 20307 (`PORT=20307`), mounted at `/mobile` (`BASE_PATH=/mobile`).
- Preview reachability check: `/status`.
- Dev command:
  `pnpm --filter @workspace/soul-line-trainer run dev`
- Production build (static Expo Go bundle via `scripts/build.js`):
  `pnpm --filter @workspace/soul-line-trainer run build`
- Production run:
  `pnpm --filter @workspace/soul-line-trainer run serve`

Note: the build/serve flow needs a public domain to rewrite bundle/manifest
URLs. Set `EXPO_PUBLIC_DOMAIN` to the deployment host (see
`artifacts/soul-line-trainer/scripts/build.js`).

---

## Canvas / Component Preview (`artifacts/mockup-sandbox`)

- Kind: design (component preview server).
- Title: "Canvas".
- Service port: 8081 (`PORT=8081`), mounted at `/__mockup` (`BASE_PATH=/__mockup`).
- Dev command:
  `pnpm --filter @workspace/mockup-sandbox run dev`
- No production build/serve was configured (dev-only preview tool).
