# Build Stage
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build 2>/dev/null || echo "No build script, using ts-node"

# Production Stage
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

# Expose port
EXPOSE 3000

# Start command
CMD ["npx", "ts-node", "src/server.ts"]
