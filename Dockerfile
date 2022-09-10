FROM node:18-alpine as deps
LABEL org.opencontainers.image.source https://github.com/pgerke/freeathome-monitor

WORKDIR /cache
COPY package.json package-lock.json ./
RUN npm ci

FROM node:18-alpine
WORKDIR /app
COPY --from=deps /cache/ .
COPY . .
CMD [ "node", "index.mjs" ]
