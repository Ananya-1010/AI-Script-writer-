FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
# Shipped so `npm run db:setup` can be run against the deployed database from a
# shell on the host, without rebuilding an image to get at one script.
COPY scripts ./scripts

EXPOSE 4000
CMD ["node", "src/index.js"]
