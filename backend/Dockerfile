# Build stage — precisa de toolchain pra compilar better-sqlite3 (módulo nativo)
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --omit=dev

# Runtime stage — slim, sem toolchain
FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY package.json tsconfig.json ./
COPY src ./src

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["npx", "tsx", "src/index.ts"]
