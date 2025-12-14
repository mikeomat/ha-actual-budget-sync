ARG BUILD_FROM=ghcr.io/hassio-addons/base:18.2.1

FROM ${BUILD_FROM} as nodebuild
RUN apk add --update --no-cache nodejs npm python3 make g++
WORKDIR /app
ADD package.json package-lock.json ./
RUN npm ci
ADD src ./src
ADD tsconfig.json ./
RUN npm run build

FROM ${BUILD_FROM}
WORKDIR /
RUN apk add --update --no-cache nodejs npm sqlite
COPY --from=nodebuild /app/node_modules /node_modules
COPY --from=nodebuild /app/dist /dist
COPY .env.production .env
RUN rm -rf /app
RUN mkdir /cache

CMD ["node", "dist/main.js"]