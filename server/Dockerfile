FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server ./server
RUN npm ci
RUN npm run db:generate && npm run build -w server

FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Keep migration/seed tools in this demo image for explicit one-off commands.
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/client/package.json ./client/package.json
COPY --from=build --chown=node:node /app/server ./server
RUN mkdir -p /app/server/storage/publications && chown -R node:node /app/server/storage
WORKDIR /app/server
USER node
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/src/index.js"]
