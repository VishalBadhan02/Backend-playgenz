# 1️⃣ Use official Node.js image
FROM node:23-slim

# 2️⃣ Set working directory
WORKDIR /app

# 3️⃣ Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl

# 4️⃣ Enable corepack first (needed for pnpm)
RUN corepack enable

# 5️⃣ Copy package files
COPY auth-service/package.json auth-service/pnpm-lock.yaml ./

# 6️⃣ Install dependencies
RUN pnpm install --frozen-lockfile

# 7️⃣ Copy prisma schema
COPY auth-service/src/prisma ./src/prisma

# 8️⃣ Generate Prisma Client
RUN pnpm prisma generate

# 9️⃣ Copy remaining source code
COPY protos ./protos
COPY auth-service/. .

# 🔟 Expose port
EXPOSE 5001

# Start with migrations
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm start"]