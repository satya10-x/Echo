# VibeShift AI

Frontend preview of an audience-focused communication rewriting workspace. Includes a responsive Workspace, Rewrite Studio, sample drafts, delivery controls, and reusable output/comparison components. The current draft and settings stay in React memory across navigation; reloading or closing the tab clears them. No saved history is created. AI rewriting and regeneration are not connected. Copy and restore are ready for real output when integration is added. The frontend sends no backend requests in this phase.

## Start on macOS

Requires Node.js **22.12+** and npm. From this directory:

```sh
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run dev
```

Open http://localhost:5173. The API runs at http://localhost:5000.

Start a local MongoDB instance or set `MONGODB_URI` in `server/.env` to your MongoDB connection string. The server continues serving the API if MongoDB is unavailable and reports `degraded` health with the actual database status. No AI or Cloudinary credentials are needed.

## Commands

- `npm run dev` — start Vite and the Express server together.
- `npm run dev:client` / `npm run dev:server` — start either workspace separately.
- `npm run build` — build the frontend to `client/dist`.
- `npm start` — run the backend without watch mode.
- `npm run preview --workspace client` — locally preview the frontend build.

## Configuration

`server/.env.example` contains backend settings and reserved provider placeholders. Use `CLIENT_ORIGINS` for a comma-separated browser origin allowlist; `CLIENT_URL` is the fallback. `MONGODB_URI` is read only by the server. Keep provider secrets there and never prefix them with `VITE_`.

The frontend's optional `VITE_API_BASE_URL` points to an API origin. In development, an empty value uses Vite's `/api` proxy at port 5000. If changing the backend port, also change the proxy target in `client/vite.config.js`. For production, serve `client/dist` with SPA fallback to `index.html` and proxy `/api` to Express, or set `VITE_API_BASE_URL` at build time and allow the deployed frontend origin in `CLIENT_ORIGINS`. Express serves the API only.

## API and structure

- `GET /api` — application information and available endpoint.
- `GET /api/health` — `status`, ISO `timestamp`, and `database: { status, connected }`. HTTP 200 confirms the API is alive; inspect the body for database readiness.

`client/src` contains React pages and reusable interface components. `server/src` separates environment/database configuration, routes, and error handling. Failed initial database connections require a server restart after configuration is fixed. No authentication, persistence endpoints, or AI provider integration is implemented yet.

## Repository governance

See [AI prompt governance](docs/AI_GOVERNANCE.md) and `AGENTS.md`. The supplied kit is installed at its documented paths; original uploaded files are retained. Prompt logs are append-only and checked by the local pre-commit hook and GitHub workflow.
