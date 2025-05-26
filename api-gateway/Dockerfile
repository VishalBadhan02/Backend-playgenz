FROM node:23-slim

WORKDIR /app
RUN corepack enable

COPY api-gateway/package.json ./  
COPY api-gateway/pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY api-gateway/. .

EXPOSE 5000
CMD [ "pnpm", "start" ]


