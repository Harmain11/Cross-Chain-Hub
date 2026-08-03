# ─── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy only the MCP package manifest so Docker can cache the install layer
COPY packages/mcp/package.json ./

# Install ALL deps (typescript is a devDep needed for the build)
RUN npm install

# Copy source and TypeScript config
COPY packages/mcp/src ./src
COPY packages/mcp/tsconfig.json ./

# Compile TypeScript → dist/
RUN npm run build

# ─── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy compiled output and package manifest
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Install production dependencies only
RUN npm install --omit=dev

# MCP servers communicate over stdio; no ports needed
ENV NODE_ENV=production

# Glama (and Claude Desktop / Claude Code) starts this image and pipes
# JSON-RPC 2.0 messages over stdin/stdout.
CMD ["node", "dist/index.js"]
