FROM node:24-alpine AS build

ARG WEB_GOOGLE_CLIENT_ID=""
ARG WEB_GOOGLE_API_KEY=""
ARG SERVER_GOOGLE_CLIENT_ID=""
ARG SERVER_GOOGLE_CLIENT_SECRET=""

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true" \
    WEB_GOOGLE_CLIENT_ID=${WEB_GOOGLE_CLIENT_ID} \
    WEB_GOOGLE_API_KEY=${WEB_GOOGLE_API_KEY} \
    SERVER_GOOGLE_CLIENT_ID=${SERVER_GOOGLE_CLIENT_ID} \
    SERVER_GOOGLE_CLIENT_SECRET=${SERVER_GOOGLE_CLIENT_SECRET}
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --production

FROM node:24-alpine
ENV RUNNING_IN_DOCKER="true" \
    NODE_ENV="production"
WORKDIR /app
RUN apk add --no-cache nss udev ttf-freefont chromium
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/web/public ./web/public
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "dist/server/index.js"]
