FROM node:22-alpine

WORKDIR /app

# Copy shared protocol (needed for build)
COPY shared/ /app/shared/

# Copy server files
COPY server/package.json server/package-lock.json ./
RUN npm ci --production=false

COPY server/tsconfig.json ./
COPY server/src/ ./src/

# Build TypeScript
RUN npx tsc

# Remove dev dependencies
RUN npm prune --production

EXPOSE 3001

CMD ["node", "dist/index.js"]
