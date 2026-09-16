# Deploying

Three pieces, all on free tiers, none of which need a card.

| Piece | Where | Why |
| --- | --- | --- |
| Database | **MongoDB Atlas M0** | Free forever, 512 MB, no card. |
| `server/` + `ai-service/` | **Render**, free web services | 750 instance-hours a month shared across services, Docker native. |
| `client/` | **Cloudflare Pages** | Unmetered bandwidth, static build. |

Total cost at this stage: **₹0**. Gemini generation is on the free tier too.

---

## 1. Database — MongoDB Atlas

1. Create a free **M0** cluster.
2. **Database Access** → add a user with a password. Copy it.
3. **Network Access** → allow `0.0.0.0/0`. Render's free tier has no static
   egress IP to allowlist, so there is nothing narrower to allow. The database
   user and password are what protect the cluster.
4. Copy the connection string and append the database name:

   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ai_script_writer?retryWrites=true&w=majority
   ```

Indexes build themselves on first boot. To create them ahead of time, run
`npm run db:setup` from `server/` with `MONGODB_URI` pointing at Atlas.

> **Vector search:** leave `VECTOR_STORE=mongo-local`. That name means
> *similarity is computed in the AI service* rather than by `$vectorSearch`. It
> works against Atlas exactly as against a local mongod, so you do not need an
> Atlas Search index until retrieval is switched on in W3.

---

## 2. Services — Render

`render.yaml` at the repo root defines both. In Render: **New → Blueprint**,
pick the repo, and it creates `asw-ai` and `asw-api` together, prompting for
anything marked `sync: false`.

You will be asked for:

| Variable | Service | Value |
| --- | --- | --- |
| `LLM_API_KEY` | asw-ai | your Google AI Studio key |
| `AI_MONGODB_URI` | asw-ai | the Atlas string |
| `MONGODB_URI` | asw-api | the same Atlas string |
| `AI_SERVICE_URL` | asw-api | `https://asw-ai.onrender.com` — fill in **after** the AI service exists |
| `AI_SERVICE_TOKEN` | asw-api | copy the value Render generated on `asw-ai` |
| `CLIENT_ORIGIN` | asw-api | your Pages URL — fill in after step 3 |

Two things worth understanding rather than just copying:

- **`AI_SERVICE_TOKEN` must match on both services.** Render generates it on
  `asw-ai`; copy that exact value into `asw-api`. Render cannot copy a
  generated secret between services.
- **The AI service is publicly reachable.** Render's free tier has no private
  networking, so it gets a public URL whether we want one or not. The service
  token is therefore the only thing between the open internet and the
  generation endpoints — it is doing real work, not ceremony. On a paid tier
  this becomes a private service and the token becomes defence in depth.

⚠️ Free services **sleep after 15 minutes idle** and take ~1 minute to wake.
The first request after a quiet spell will be slow. Warm both services before
any demo by loading the site once a minute or two beforehand.

---

## 3. Client — Cloudflare Pages

**Workers & Pages → Create → Pages → Connect to Git**, then:

| Setting | Value |
| --- | --- |
| Root directory | `client` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variable | `VITE_API_BASE_URL` = `https://asw-api.onrender.com/api/v1` |

`VITE_` variables are baked in at **build** time, not read at runtime — change
it and you must redeploy, not just restart.

`client/public/_redirects` sends every path to `index.html`, which is what makes
deep links like `/workspace/s_4c19` work. Without it the host looks for a file
at that path and returns 404 on refresh. Netlify uses the same file; Vercel
needs a `vercel.json` rewrite instead.

Finally, set `CLIENT_ORIGIN` on `asw-api` to the Pages URL and redeploy it, or
the browser will block every API call on CORS.

---

## 4. Check it

```bash
curl https://asw-api.onrender.com/api/v1/health/ready
```

Reports MongoDB, the AI service and the vector store together — if generation
fails, this says which hop is down before you go digging.

Then in the browser: register, fill the profile, write one brief, generate. That
is the same path the smoke test covers, and it exercises every service.

---

## What is deliberately not here

- **No CI deploy hook yet.** Render auto-deploys on push to `main`, which is
  enough while the pipeline in `docs/architecture.md` is unbuilt. Wire the
  quality gates first; auto-deploying an unverified commit is worse than
  deploying by hand.
- **No custom domain.** Add one on Pages, then update `CLIENT_ORIGIN`.
- **No secret rotation.** ⚠️ The Gemini key and Atlas password live in Render's
  environment. Rotate both if the repo ever becomes public-facing in a way it
  is not today.
