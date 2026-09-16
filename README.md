# AI Script Writer

An AI-powered scripting workspace for content creators.

> **Turn your idea into a script that fits your platform, audience, purpose, and voice.**

It is not a chat box. The difference is four things combined that a chat interface
does not have: **creator context**, **retrieved content knowledge**, **structured
generation**, and **iterative refinement**. The creator remains the author
throughout — the system produces drafts, never publications.

---

## Architecture

Three tiers, and one rule that decides where code goes:

> *If a decision changes when a prompt changes, it belongs in Python. If it changes
> when the product changes, it belongs in Node.*

| Tier | Stack | Owns |
| --- | --- | --- |
| `client/` | React · Tailwind · Axios | Brief capture, workspace state machine, section-level editor, library, dashboard |
| `server/` | Node · Express · Mongoose | Auth, all persistence, validation, dashboard aggregation, orchestrating the AI service |
| `ai-service/` | Python · FastAPI | Chunking, embedding, retrieval, prompt construction, LLM calls, output validation |

The browser talks only to `server/`. The AI service is never publicly reachable,
so the LLM key, the prompt templates and the retrieval logic never touch the
public edge. MongoDB is the single source of truth; the vector index is derived
and rebuildable.

---

## Running it locally

```bash
cp .env.example .env      # then fill in JWT_SECRET and AI_SERVICE_TOKEN
```

Everything runs against a **stubbed provider** by default (`LLM_PROVIDER=stub`),
so day-to-day development makes no API calls and costs nothing.

**With Docker:**

```bash
docker compose up --build
```

**Without Docker** — a MongoDB on `localhost:27017`, then:

```bash
cd server && npm install && npm run db:setup     # creates indexes; safe to re-run
```

`db:setup` also reports whether this MongoDB supports Atlas Vector Search and
tells you which `VECTOR_STORE` to use. Then three terminals:

```bash
cd server     && npm run dev                     # http://localhost:4000
cd ai-service && pip install -r requirements.txt && uvicorn app.main:app --reload
cd client     && npm install && npm run dev      # http://localhost:5173
```

Check the chain is alive:

```bash
curl http://localhost:4000/api/v1/health/ready
```

It reports MongoDB, the AI service, and the vector store together — if the app
can't generate, this says which hop is down.

### Vector search on a local MongoDB

`$vectorSearch` is an **Atlas-only** aggregation stage. A local `mongod` answers
it with `SearchNotEnabled` regardless of version, so there are three stores and
`VECTOR_STORE` picks one:

| Value | Where chunks live | How similarity is computed |
| --- | --- | --- |
| `memory` | nowhere | in process, exact. Tests only |
| `mongo-local` | local MongoDB | in the AI service, exact (numpy) |
| `atlas` | Atlas | `$vectorSearch`, approximate |

All three return scores on the **same normalised scale** — `(1 + cosine) / 2`,
where `0.5` means unrelated — so `RETRIEVAL_MIN_SCORE` means the same thing
whichever is in use, and moving between them is a config change. `mongo-local`
does exact brute force, which is correct and fast to roughly 20k chunks; past
that, the per-query transfer is the bottleneck and it should move to Atlas.

### Tests

```bash
cd server && npm test        # integration, real MongoDB in memory
pytest                       # retrieval; Mongo-backed tests skip if none is running
```

No test calls a provider. The suite is offline and free by construction.

---

## Non-negotiables

These are invariants, not preferences. Breaking one is a bug even if tests pass.

- **Tenant isolation lives at the data layer.** Every repository method takes
  `userId` as its first argument. Cross-tenant access returns **404, not 403** —
  the API never confirms another creator's resource exists.
- **Retrieval never gates generation.** If nothing clears the relevance
  threshold, we generate with an empty context set rather than padding the prompt
  with weak matches.
- **Raw model output never reaches the creator.** Every response is validated
  against the structured script schema; on failure, one bounded repair retry,
  then a typed `MALFORMED_LLM_OUTPUT`.
- **A failed generation never corrupts a saved script.** It writes a `FAILED`
  generation record, leaves the saved script untouched, and offers retry.
- **The objective is an invariant.** The brief captured at `CONTEXT_READY` is
  re-sent verbatim on every regenerate, improve and variation. Only the creator,
  through the brief form, may change it.
- **Prompts never leave the AI service** — not in responses, errors, health
  output, or logs.
- **Cost is a design constraint.** Tokens and cost are recorded per generation.
  CI never calls an LLM.

---

## Layout

```
client/      React workspace
server/      Node + Express application service
ai-service/  Python + FastAPI AI service
tests/       unit · integration · output-contract · adversarial
docs/        architecture.md · api-reference.md · model-card.md · knowledge-base/
scripts/     seed-knowledge.js — build and embed the curated knowledge base
```

## Deploying

MongoDB Atlas (free M0) · Render for both services (`render.yaml` blueprint at
the repo root) · Cloudflare Pages for the client. All free tiers, no card.

Full walkthrough with every environment variable: **[`docs/deploy.md`](docs/deploy.md)**.

## Status

**W2 — Identity, done.** Register, login, `/auth/me`, creator profile CRUD, and
a repository layer that makes `userId` a mandatory first argument on every query.
The LLM, embedding and vector-store providers are all behind swappable
interfaces with stub and real implementations. No generation yet; that is W4.
