FROM oven/bun:slim
# FROM oven/bun
WORKDIR /app
# RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.tuna.tsinghua.edu.cn/g' /etc/apk/repositories
# RUN apk add curl

COPY package.json bun.lockb bunfig.toml tsconfig.json bunpkg.sh ./
COPY src src

RUN bun install --production

# case by DOCKER ENV
RUN rm -rf .env

ENV NODE_ENV production
ENV NPM_REGISTRY_URL=https://registry.npmmirror.com/
ENV NPM_AUTH_TOKEN=
ENV CORS_ORIGIN=*
ENV CACHE_DIR=/cache

VOLUME [ "/cache" ]

# CMD ["bun", "src/index.ts"] 
# case by , this can be ctrl +c stop
ENTRYPOINT ["./bunpkg.sh"] 

EXPOSE 4567