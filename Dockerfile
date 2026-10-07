FROM node:24-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./
RUN npm install -g pnpm && pnpm install
COPY . .
CMD ["pnpm", "start"]
