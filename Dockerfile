FROM oven/bun
WORKDIR /app

COPY package.json .
COPY bun.lockb .

RUN bun install --production

COPY src src
COPY tsconfig.json .
COPY bunpkg.sh ./
# case by DOCKER ENV
RUN rm -rf .env
# COPY public public

ENV NODE_ENV production
ENV NPM_REGISTRY_URL=https://registry.npmmirror.com/
ENV NPM_AUTH_TOKEN=
ENV CORS_ORIGIN=*

VOLUME [ "/cache" ]

# CMD ["bun", "src/index.ts"] 
# case by , this can be ctrl +c stop
ENTRYPOINT ["./bunpkg.sh"] 

EXPOSE 4567