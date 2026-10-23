# VibeShift AI

An audience-focused communication rewriting workspace with real Groq generation and optional Gemini fallback. Rewrite, regenerate, refine, copy, and restore original drafts in the Studio. Drafts, settings, and AI results stay in React memory across navigation; reloading or closing the tab clears them. History is stored only when you explicitly save an accepted rewrite; anonymous browser access is described below. The intelligence workflow adds separate semantic evaluation, exact-value and commitment checks, persona contracts, an actual word diff, and selective phrase restoration. Findings are review signals rather than guarantees.
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

Start a local MongoDB instance or set `MONGODB_URI` in `server/.env` to your MongoDB connection string. The server continues serving the API if MongoDB is unavailable and reports `degraded` health with the actual database status. The app starts without AI credentials, but rewriting requires a configured provider. MongoDB is not required for rewriting. Cloudinary is optional for explicitly stored private text exemplars.

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

`client/src` contains React pages and reusable interface components. `server/src` separates environment/database configuration, routes, and error handling. Failed initial database connections require a server restart after configuration is fixed. AI adapters, prompts, validation, and the rewrite controller are separate modules. No account authentication or team management is implemented; saved history uses scoped anonymous access tokens. Drafts and raw provider errors are not logged by the application.

## Intelligence checks

`INTELLIGENCE_TIMEOUT_MS` bounds the entire generation/evaluation/repair workflow (default 90 seconds, maximum 180 seconds). `INTELLIGENCE_MAX_REPAIRS` is 0 or 1; one shared targeted attempt covers preservation and contract findings and is shown in the UI. SDK malformed-JSON repair remains separately bounded to one attempt per structured task. If a repair fails, the previous candidate and warnings remain available. The same AI adapters serve rewriting and a separate evaluation prompt; using the same underlying model can correlate mistakes, so a successful evaluation is never a guarantee.

The evaluator must provide exact source/output quotes, real changed-span IDs, bounded tone dimensions and all applicable contract checks. Malformed or unverifiable evidence makes semantic/tone evaluation unavailable while deterministic checks still run. `FIDELITY_MIN_COVERAGE` (0–1, default 0.9) is a conservative threshold for the fraction of model-identified propositions marked preserved. It is a heuristic, not a probability of truth; the evaluator may miss important propositions. No embedding provider is configured or required.

[jsdiff](https://github.com/kpdecker/jsdiff) computes bounded word/whitespace diffs. Both original and rewritten strings reconstruct exactly from the spans. Adjacent removed/added runs are displayed as modifications, without claiming semantic equivalence. Ratio/counts use Unicode word runs; modified tokens pair by count within replacements. Large textual changes do not establish meaning drift. Diff budget exhaustion produces an explicit coarse comparison with restoration disabled. No universal readability formula is applied to Hindi, Hinglish or other languages.

Exact-value checks count occurrences of numbers, date candidates, names, identifiers and marked technical terms. English regexes flag consequential clauses conservatively; model-assisted extraction also checks context, ownership and conditions. Name candidates and unmatched wording can produce false positives. Matching numbers does not prove safety. Severity is consistently `critical`, `high`, `medium`, or `low`; ledger status is `added`, `removed`, `modified`, or `preserved`. Important warnings remain visible after the user chooses to keep a rewrite.

Persona contracts come from the backend registry and drive generation and validation. Word limits and banned wording are deterministic; main-point placement and source-supported requirements are model-assisted. Missing information is never invented to satisfy a contract. Tone values are model estimates on 0–1 scales: casual→formal, tentative→direct, detached→supportive, and unhurried→immediate. Register ranges are advisory and selected tone takes precedence.

Restoring a phrase uses exact offsets and a hash of the complete source/output revision, never a global text replacement. Only the rewrite changes. Checks run again before the new revision is displayed. Manual rewrite edits support reanalysis and up to ten undo steps; full-source restore to the editor remains available. Independent analysis has no database dependency.

Focused verification: `node --test server/src/services/ai/aiService.test.js server/src/services/fidelity/intelligence.test.js server/src/services/copilot/copilot.test.js`.

## Communication copilot

The Studio’s secondary panel offers three distinct variants, simulated audience interpretations, and writing-style matching. Variants use one structured batch plus at most three evaluations (two concurrently); candidates that are too similar are rejected rather than presented as distinct. Ranking prioritizes critical/high findings, semantic concerns, unavailable evaluation and contract concerns before a lexical-variety tiebreaker. Use This Version updates the active rewrite with that candidate’s actual checks. Generation and analysis remain bounded by the existing intelligence time budget.

Misread results analyze the selected rewrite and are explicitly simulated, not predictions or legal advice. Evidence phrases must occur in that exact version. Mitigation produces a candidate through the existing intelligence workflow; it never replaces the active result until accepted. Style extraction separates numeric/categorical patterns from exemplar content. Applying style sends only the profile and original draft, so exemplar passages are not reused in generation. English hedging/greeting detection is limited and qualitative classification may be unavailable.

New routes: `POST /api/copilot/variants`, `/misread`, `/mitigate`, `/style`, and `/style/file`. The file endpoint parses UTF-8 `.txt` only (16 KB, 4,000 characters), without sending it to AI or storage. Extract Style is a separate explicit action.

## Anonymous history and optional private storage

MongoDB must be connected for `/api/session`, `/api/history`, and `/api/exemplars`. The server issues a random 256-bit bearer token; only its SHA-256 hash is stored. The browser retains the capability in local storage. No client-supplied user ID controls authorization. Every record query and mutation includes the server-resolved session owner. Treat the browser token like a password; losing browser storage loses access but does not delete records. This is a single-browser anonymous MVP, not an account or a recovery mechanism. Delete confidential history/private assets before clearing browser storage. Anonymous sessions do not automatically expire in this MVP.

History supports explicit save, recent search (30 records), open, rename, delete and up to ten retained accepted versions per draft. PATCH requires the latest record revision to avoid lost updates. Up to 100 drafts per anonymous session are supported. Saved records whitelist original text, settings, accepted output, provider/model labels and compact deterministic findings; API credentials and full intermediate analyses are excluded. Opening a saved version marks semantic/tone evaluation unavailable until Recheck is explicitly run.

`POST /api/session` creates the anonymous capability. `POST/GET /api/history`, `GET/PATCH/DELETE /api/history/:id` implement owner-scoped history. `GET /api/history/:id?version=N` opens a retained version. No intermediate AI request is auto-saved.

Cloudinary is optional. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` in the backend environment to enable explicit private exemplar storage. The official SDK uploads only validated text as raw assets with `type: authenticated`, never public delivery. Asset identifiers are generated server-side, ownership metadata stays in MongoDB, and no delivery URL is exposed. `/api/exemplars` supports list/upload and `DELETE /api/exemplars/:id` destroys the owner’s Cloudinary asset. The feature does not need image uploads. No storage credentials are required for normal rewriting, style extraction or history. See [Cloudinary uploads](https://cloudinary.com/documentation/node_image_and_video_upload) and [authenticated media access](https://cloudinary.com/documentation/control_access_to_media).

MongoDB and Cloudinary failures produce unavailable/error responses; nothing is presented as saved or uploaded unless the service confirms success. Private assets remain until explicitly deleted; no background cleanup or deployment changes are introduced in this phase.

## Repository governance

See [AI prompt governance](docs/AI_GOVERNANCE.md) and `AGENTS.md`. The supplied kit is installed at its documented paths; original uploaded files are retained. Prompt logs are append-only and checked by the local pre-commit hook and GitHub workflow.
