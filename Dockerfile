# syntax=docker/dockerfile:1

FROM node:24-slim AS dependencies
WORKDIR /app

ENV HUSKY=0 \
    ELECTRON_SKIP_BINARY_DOWNLOAD=1

COPY package.json ./
RUN npm install --no-audit --no-fund

FROM dependencies AS build

ARG VITE_API=/api
ARG VITE_CONTAINER_MUSIC_API=/music
ENV VITE_API=${VITE_API} \
    VITE_CONTAINER_MUSIC_API=${VITE_CONTAINER_MUSIC_API}

COPY . .
RUN node --test docker/server.test.js \
    && npm run build \
    && node docker/prepare-static.js

FROM dependencies AS production-dependencies

COPY docker/sanitize-dependencies.js ./docker/sanitize-dependencies.js
RUN npm prune --omit=dev \
    && node docker/sanitize-dependencies.js \
    && npm cache clean --force

FROM node:24-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4488 \
    NCM_API_PORT=30488 \
    MUSIC_SOURCES=migu,kugou,kuwo,pyncmd

COPY --chown=node:node --from=production-dependencies /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/out/renderer ./public
COPY --chown=node:node package.json ./
COPY --chown=node:node docker/server.js ./docker/server.js

EXPOSE 4488

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "const p=process.env.PORT||4488;fetch('http://127.0.0.1:'+p+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

USER node

CMD ["node", "docker/server.js"]
