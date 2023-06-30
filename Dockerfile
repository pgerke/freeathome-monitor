FROM node:18-alpine as deps
LABEL org.opencontainers.image.source https://github.com/pgerke/freeathome-monitor

WORKDIR /cache
COPY package.json package-lock.json ./
RUN npm ci

FROM node:18-alpine
RUN apk update && apk upgrade
WORKDIR /app
COPY --from=deps /cache/ .
COPY . .
