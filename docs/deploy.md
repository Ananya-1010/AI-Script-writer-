# Deploying

**Two accounts, two services, one URL.** Everything is on a free tier and none
of it needs a card.

| Piece | Where |
| --- | --- |
| Database | **MongoDB Atlas** free M0 |
| The site **and** the API | **Render** — one service; Express serves the built client |
| AI service | **Render** — a second service |

The client is built into the API image and served from the same origin, which
removes CORS, removes a third platform, and removes a build-time API URL that
would have to stay in sync with it.

### Why not Vercel, or one single service?

- **Vercel** is excellent for the client and wrong for this backend. Generation
  runs 6–40 seconds; Hobby serverless caps function duration well below that,
  and Mongoose needs connection-caching gymnastics in a serverless runtime.
  A long-lived container is the right shape for this workload.
- **One service** would mean Node and Python in one container. The split is the
  architecture, not an accident: prompts and retrieval get tuned weekly while
  auth and CRUD do not, so the AI service has to redeploy without touching the
  application a creator is logged into.

---

## 1. Database — MongoDB Atlas

1. Create a free **M0** cluster.
2. **Database Access** → add a user with a password.
3. **Network Access** → allow `0.0.0.0/0`. Render's free tier has no static
   egress IP, so there is nothing narrower to allow; the database user and
   password are what protect the cluster.
4. Copy the connection string and put the database name before the `?`:

   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ai_script_writer?retryWrites=true&w=majority
   ```

Indexes build themselves on first boot. To create them up front, run
`npm run db:setup` from `server/` with `MONGODB_URI` pointing at Atlas.

> **Vector search:** leave `VECTOR_STORE=mongo-local`. That name means
> *similarity is computed in the AI service* rather than by `$vectorSearch`. It
> works against Atlas exactly as against a local mongod, so no Atlas Search
> index is needed until retrieval is switched on in W3.

---

## 2. Both services — Render

`render.yaml` at the repo root defines them. In Render: **New → Blueprint**,
pick the repo. It creates `asw-ai` and `asw`, prompting for anything marked
`sync: false`.

| Variable | Service | Value |
| --- | --- | --- |
| `LLM_API_KEY` | asw-ai | your Google AI Studio key |
| `AI_MONGODB_URI` | asw-ai | the Atlas string |
| `MONGODB_URI` | asw | the same Atlas string |
| `AI_SERVICE_URL` | asw | `https://asw-ai.onrender.com` — fill **after** the AI service exists |
| `AI_SERVICE_TOKEN` | asw | copy the value Render generated on `asw-ai` |

Two things worth understanding rather than copying:

- **`AI_SERVICE_TOKEN` must match on both services.** Render generates it on
  `asw-ai` and cannot copy a generated secret across, so paste it once.
- **The AI service is publicly reachable.** Render's free tier has no private
  networking, so it gets a public URL whether we want one or not. That service
  token is genuinely the only thing between the internet and the generation
  endpoints — it is doing real work, not ceremony. On a paid tier this becomes
  a private service and the token becomes defence in depth.

⚠️ Free services **sleep after 15 minutes idle** and take ~1 minute to wake.
Warm both before any demo.

That is the whole deploy. `https://asw.onrender.com` serves the site, the API,
and every deep link.

---

## 3. Check it

```bash
curl https://asw.onrender.com/api/v1/health/ready
```

Reports MongoDB, the AI service and the vector store together — if generation
fails, this says which hop is down before you go digging.

Then in the browser: register, fill the profile, write one brief, generate.

---

## What is deliberately not here

- **No CI deploy hook.** Render auto-deploys on push to `main`, which is enough
  while the pipeline in `docs/architecture.md` is unbuilt. Wire the quality
  gates first; auto-deploying an unverified commit is worse than deploying by
  hand.
- **No custom domain.** Add one in Render when you want it.
- ⚠️ **No secret rotation.** The Gemini key and the Atlas password live in
  Render's environment. Rotate both if this repo's exposure ever changes.
