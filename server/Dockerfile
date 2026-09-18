# Multi-stage: the client is built here and served by the Node service, so the
# whole product ships as ONE deployable on ONE origin. No CORS, no second host,
# no VITE_API_BASE_URL to keep in sync.
#
# Build context is the REPO ROOT, not server/, because this needs client/ too.

# ---------------------------------------------------------------- client ----
FROM node:22-alpine AS client

WORKDIR /client
COPY client/package*.json ./
RUN npm ci

COPY client/ ./
# Same origin, so the API is a relative path and needs no host baked in.
ENV VITE_API_BASE_URL=/api/v1
RUN npm run build

# ---------------------------------------------------------------- server ----
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/src ./src
# Shipped so `npm run db:setup` can be run against the deployed database from a
# shell on the host, without rebuilding an image to get at one script.
COPY server/scripts ./scripts

# Where app.js looks for the built client.
COPY --from=client /client/dist ./public

EXPOSE 4000
CMD ["node", "src/index.js"]
