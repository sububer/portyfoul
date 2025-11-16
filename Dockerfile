# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Ensure public directory exists (optional for Next.js)
RUN mkdir -p public

# Set build environment
# Note: Secrets are NOT needed at build time - they're provided at runtime via ECS task definition
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS runner

WORKDIR /app

# Set NODE_ENV to production
ENV NODE_ENV=production

# Copy necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/scripts ./scripts

# Install only production dependencies
RUN npm ci --only=production

# Expose the port Next.js runs on
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
