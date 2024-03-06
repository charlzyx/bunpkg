FROM node:18-alpine as docbuilder
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories
# vocs build needs git
RUN apk add git

WORKDIR /web

COPY package.json tsconfig.json vocs.config.ts ./
COPY docs docs

RUN npm i --registry=https://registry.npmmirror.com && npm run docs:build 

FROM oven/bun:slim
# FROM oven/bun
WORKDIR /app
# RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories
# RUN apk add curl

COPY package.json bun.lockb bunfig.toml tsconfig.json bunpkg.sh ./
COPY src src
COPY --from=docbuilder /web/docs/dist ./docs/dist 

# build server
RUN bun install --production
# case by DOCKER ENV
RUN rm -rf .env

ENV PORT 4567
ENV HOST 0.0.0.0
ENV CORS_ORIGIN *
ENV CACHE_DIR /cache
ENV CACHE_MAX_SIZE 4
ENV NPM_REGISTRY_URL https://registry.npmmirror.com/
ENV NPM_MAX_TGZ_SIZE 100
ENV NPM_AUTH_TOKEN '' 
ENV JWT_SECRET ''

VOLUME [ "/cache" ]

# CMD ["bun", "src/index.ts"] 
# case by , this can be ctrl +c stop
ENTRYPOINT ["./bunpkg.sh"] 

EXPOSE 4567