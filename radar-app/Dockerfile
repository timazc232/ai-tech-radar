# Stage 1: deps (better-sqlite3 prebuild)
FROM node:20-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci

# Stage 2: build
FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run worker:build && npm run build

# Stage 3: runner
FROM node:20-slim AS runner
WORKDIR /app
ENV TZ=Asia/Shanghai
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y --no-install-recommends sqlite3 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/db/migrations ./db/migrations
COPY --from=builder /app/config ./config
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/package.json ./package.json
# better-sqlite3 native binding
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

EXPOSE 3000
# Web role
CMD ["node", "server.js"]
