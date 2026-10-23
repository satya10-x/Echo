# VibeShift AI

An audience-focused communication rewriting workspace with real Groq generation and optional Gemini fallback. Rewrite, regenerate, refine, copy, and restore original drafts in the Studio. Drafts, settings, and AI results stay in React memory across navigation; reloading or closing the tab clears them. No saved history is created. Independent semantic fidelity and commitment checks are not implemented yet.
## Start on macOS

Requires Node.js **22.12+** and npm. From this directory:

```sh
npm install
# For a new checkout only; keep any existing .env files.
cp -n server/.env.example server/.env
cp -n client/.env.example client/.env
npm run dev
```

Open http://localhost:5173. The API runs at http://localhost:5000.

Start a local MongoDB instance or set `MONGODB_URI` in `server/.env` to your MongoDB connection string. The server continues serving the API if MongoDB is unavailable and reports `degraded` health with the actual database status. The app starts without AI credentials, but rewriting requires a configured provider. MongoDB is not required for rewriting. Cloudinary is unused.

## Commands

- `npm run dev` — start Vite and the Express server together.
- `npm run dev:client` / `npm run dev:server` — start either workspace separately.
- `npm run build` — build the frontend to `client/dist`.
- `npm start` — run the backend without watch mode.
- `npm run preview --workspace client` — locally preview the frontend build.

## Configuration

`server/.env.example` contains backend settings and provider configuration. Use `CLIENT_ORIGINS` for a comma-separated browser origin allowlist; `CLIENT_URL` is the fallback. `MONGODB_URI` is read only by the server. Keep provider secrets there and never prefix them with `VITE_`.

The frontend's optional `VITE_API_BASE_URL` points to an API origin. In development, an empty value uses Vite's `/api` proxy at port 5000. If changing the backend port, also change the proxy target in `client/vite.config.js`. For production, serve `client/dist` with SPA fallback to `index.html` and proxy `/api` to Express, or set `VITE_API_BASE_URL` at build time and allow the deployed frontend origin in `CLIENT_ORIGINS`. Express serves the API only.

## AI configuration

Set `GROQ_API_KEY` and `GROQ_MODEL` in **server/.env** to use Groq. Set `GEMINI_API_KEY` and `GEMINI_MODEL` to enable Gemini as the secondary provider, or choose `AI_PRIMARY_PROVIDER=gemini` to use it first. Use a model available to your account; there is deliberately no hardcoded model default. Restart the API after environment changes.

`AI_FALLBACK_ENABLED=true` permits one secondary-provider attempt for transient failures (network, timeout, rate limit, or outage), only when that provider has both key and model. Missing primary configuration, authentication/model errors, invalid user input, refusals, and malformed output do not trigger fallback. SDK automatic retries are disabled. Malformed response content receives at most one repair attempt across the request.

`AI_REQUEST_TIMEOUT_MS` is a per-provider budget covering generation and repair, default 30 seconds and capped at 60 seconds. With fallback, a request can use up to two provider budgets. Abandoned requests abort provider transport. `AI_RATE_LIMIT_MAX` (10) and `AI_RATE_LIMIT_WINDOW_MS` (60000) control a bounded in-memory/IP limiter. Express does not trust forwarded IP headers by default; use a shared limiter and a deliberately configured trusted proxy before scaling.

Groq defaults to JSON object mode plus strict application validation. For models supporting Groq strict structured outputs, set `GROQ_STRUCTURED_OUTPUT=json_schema`. Gemini uses native JSON Schema output. Both adapters validate the returned text and metadata; structured output does not guarantee factual or semantic fidelity.

SDK references: [Groq JavaScript SDK](https://github.com/groq/groq-typescript), [Groq structured outputs](https://console.groq.com/docs/structured-outputs), [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output). Adapters were implemented against installed `groq-sdk@1.6.0` and `@google/genai@2.31.0`.

## API and structure

- `POST /api/rewrite` — accepts `draft`, `persona`, `tone`, `length`, `purpose`, optional `audience` and `refinement`; returns `rewrittenText`, selected settings, AI explanations/warnings, and actual provider/model metadata. Limits: draft 10,000 characters, audience 160, refinement 500. Errors contain safe `code` and `error` fields.
- `GET /api` — application information and available endpoint.
- `GET /api/health` — `status`, ISO `timestamp`, and `database: { status, connected }`. HTTP 200 confirms the API is alive; inspect the body for database readiness.

`client/src` contains React pages and reusable interface components. `server/src` separates environment/database configuration, routes, and error handling. Failed initial database connections require a server restart after configuration is fixed. AI adapters, prompts, validation, and the rewrite controller are separate modules. No authentication or persistence endpoints are implemented yet. Drafts and raw provider errors are not logged by the application.

## Repository governance

See [AI prompt governance](docs/AI_GOVERNANCE.md) and `AGENTS.md`. The supplied kit is installed at its documented paths; original uploaded files are retained. Prompt logs are append-only and checked by the local pre-commit hook and GitHub workflow.
