# 1️⃣ Use official Node.js image
FROM node:23-slim

# 2️⃣ Set working directory
WORKDIR /app

# 3️⃣ Copy package.json and pnpm-lock.yaml
COPY notification-service/package.json notification-service/pnpm-lock.yaml ./

# 4️⃣ Install dependencies
RUN npm install -g pnpm && pnpm install

# 5️⃣ Copy all source code
COPY protos ./protos
COPY notification-service/. .

# 6️⃣ Expose service port (change if needed)
EXPOSE 5002

# 7️⃣ Start the service
CMD ["pnpm", "start"]


# if proto errors, try changing the path ../../../ to ../../ in grpc-client