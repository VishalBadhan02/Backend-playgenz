# 1️⃣ Use official Node.js image
FROM node:18

# 2️⃣ Set working directory
WORKDIR /app

# 3️⃣ Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# 4️⃣ Install dependencies
RUN npm install -g pnpm && pnpm install

# 5️⃣ Copy all source code
COPY . .

# 6️⃣ Expose service port (change if needed)
EXPOSE 5003

# 7️⃣ Start the service
CMD ["pnpm", "start"]
