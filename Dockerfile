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

# Set build-time environment variables
# JWT_SECRET is required for production builds but can use a dummy value during build
# The real JWT_SECRET will be provided at runtime via environment variables
ARG JWT_SECRET=build-time-dummy-secret-replace-at-runtime
ARG FINNHUB_API_KEY
ARG COINGECKO_API_KEY

ENV JWT_SECRET=${JWT_SECRET}
ENV FINNHUB_API_KEY=${FINNHUB_API_KEY}
ENV COINGECKO_API_KEY=${COINGECKO_API_KEY}
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
