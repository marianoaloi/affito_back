# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install all dependencies (dev included for TypeScript build)
COPY package*.json ./
RUN npm ci

# Copy source and TypeScript config
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to lib/
RUN npx tsc --sourceMap false

# Copy X509 cert into lib/ (mirrors what the build script does via copyfiles)
RUN cp src/X509-cert-*.pem lib/

# ============================================
# Stage 2: Production runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output (includes cert)
COPY --from=builder /app/lib ./lib

EXPOSE 5078

ENV NODE_ENV=production

CMD ["node", "lib/index.js"]