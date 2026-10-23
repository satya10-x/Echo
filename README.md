# VibeShift AI

An audience-focused communication rewriting workspace with real Groq generation and optional Gemini fallback. Rewrite, regenerate, refine, copy, and restore original drafts in the Studio. Drafts, settings, and AI results stay in React memory across navigation; reloading or closing the tab clears them. No saved history is created. The intelligence workflow adds separate semantic evaluation, exact-value and commitment checks, persona contracts, an actual word diff, and selective phrase restoration. Findings are review signals rather than guarantees.
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

`AI_REQUEST_TIMEOUT_MS` is a per-provider budget covering generation and repair, default 30 seconds and capped at 60 seconds. With fallback, a request can use up to two provider budgets for each structured task, subject to the total intelligence budget below. Abandoned requests abort provider transport. `AI_RATE_LIMIT_MAX` (10) and `AI_RATE_LIMIT_WINDOW_MS` (60000) control a bounded in-memory/IP limiter. Express does not trust forwarded IP headers by default; use a shared limiter and a deliberately configured trusted proxy before scaling.

Groq defaults to JSON object mode plus strict application validation. For models supporting Groq strict structured outputs, set `GROQ_STRUCTURED_OUTPUT=json_schema`. Gemini uses native JSON Schema output. Both adapters validate the returned text and metadata; structured output does not guarantee factual or semantic fidelity.

SDK references: [Groq JavaScript SDK](https://github.com/groq/groq-typescript), [Groq structured outputs](https://console.groq.com/docs/structured-outputs), [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output). Adapters were implemented against installed `groq-sdk@1.6.0` and `@google/genai@2.31.0`.

## API and structure

- `POST /api/rewrite` — accepts `draft`, `persona`, `tone`, `length`, `purpose`, optional `audience` and `refinement`; returns `rewrittenText`, selected settings, AI explanations/warnings, and actual provider/model metadata. Limits: draft 10,000 characters, audience 160, refinement 500. Errors contain safe `code` and `error` fields.
- `POST /api/rewrite/analyze` — evaluates a source/rewrite pair with the same delivery settings. Optional `segmentId` and `revision` restore an exact current-revision phrase before recomputing checks; stale or unsupported edits return 409.
- `GET /api/personas` — read-only persona contract definitions.
- `GET /api` — application information and available endpoint.
- `GET /api/health` — `status`, ISO `timestamp`, and `database: { status, connected }`. HTTP 200 confirms the API is alive; inspect the body for database readiness.

`client/src` contains React pages and reusable interface components. `server/src` separates environment/database configuration, routes, and error handling. Failed initial database connections require a server restart after configuration is fixed. AI adapters, prompts, validation, and the rewrite controller are separate modules. No authentication or persistence endpoints are implemented yet. Drafts and raw provider errors are not logged by the application.

## Intelligence checks

`INTELLIGENCE_TIMEOUT_MS` bounds the entire generation/evaluation/repair workflow (default 90 seconds, maximum 180 seconds). `INTELLIGENCE_MAX_REPAIRS` is 0 or 1; one shared targeted attempt covers preservation and contract findings and is shown in the UI. SDK malformed-JSON repair remains separately bounded to one attempt per structured task. If a repair fails, the previous candidate and warnings remain available. The same AI adapters serve rewriting and a separate evaluation prompt; using the same underlying model can correlate mistakes, so a successful evaluation is never a guarantee.

The evaluator must provide exact source/output quotes, real changed-span IDs, bounded tone dimensions and all applicable contract checks. Malformed or unverifiable evidence makes semantic/tone evaluation unavailable while deterministic checks still run. `FIDELITY_MIN_COVERAGE` (0–1, default 0.9) is a conservative threshold for the fraction of model-identified propositions marked preserved. It is a heuristic, not a probability of truth; the evaluator may miss important propositions. No embedding provider is configured or required.

[jsdiff](https://github.com/kpdecker/jsdiff) computes bounded word/whitespace diffs. Both original and rewritten strings reconstruct exactly from the spans. Adjacent removed/added runs are displayed as modifications, without claiming semantic equivalence. Ratio/counts use Unicode word runs; modified tokens pair by count within replacements. Large textual changes do not establish meaning drift. Diff budget exhaustion produces an explicit coarse comparison with restoration disabled. No universal readability formula is applied to Hindi, Hinglish or other languages.

Exact-value checks count occurrences of numbers, date candidates, names, identifiers and marked technical terms. English regexes flag consequential clauses conservatively; model-assisted extraction also checks context, ownership and conditions. Name candidates and unmatched wording can produce false positives. Matching numbers does not prove safety. Severity is consistently `critical`, `high`, `medium`, or `low`; ledger status is `added`, `removed`, `modified`, or `preserved`. Important warnings remain visible after the user chooses to keep a rewrite.

Persona contracts come from the backend registry and drive generation and validation. Word limits and banned wording are deterministic; main-point placement and source-supported requirements are model-assisted. Missing information is never invented to satisfy a contract. Tone values are model estimates on 0–1 scales: casual→formal, tentative→direct, detached→supportive, and unhurried→immediate. Register ranges are advisory and selected tone takes precedence.

Restoring a phrase uses exact offsets and a hash of the complete source/output revision, never a global text replacement. Only the rewrite changes. Checks run again before the new revision is displayed. Manual rewrite edits support reanalysis and up to ten undo steps; full-source restore to the editor remains available. Independent analysis has no database dependency.

Focused verification: `node --test server/src/services/ai/aiService.test.js server/src/services/fidelity/intelligence.test.js`.

## Repository governance

See [AI prompt governance](docs/AI_GOVERNANCE.md) and `AGENTS.md`. The supplied kit is installed at its documented paths; original uploaded files are retained. Prompt logs are append-only and checked by the local pre-commit hook and GitHub workflow.
