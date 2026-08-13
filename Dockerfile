# Stage 1: Build
FROM node:22-alpine AS build

# Install openssl needed for Prisma client
RUN apk add --no-cache openssl

WORKDIR /app

# Copy dependency definition files
COPY package*.json tsconfig*.json ./
COPY prisma ./prisma/
COPY prisma.config.js ./

# Provide dummy DATABASE_URL environment variable for prisma client generation
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy

# Install dependencies (both dev and prod dependencies)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code files
COPY src ./src/

# Build the compiled javascript code
RUN npm run build

# Prune devDependencies to keep the size small
RUN npm prune --production

# Stage 2: Runtime
FROM node:22-alpine AS runtime

# Install openssl needed for Prisma client
RUN apk add --no-cache openssl

WORKDIR /app

# Set production environment flags
ENV NODE_ENV=production

# Copy built artifacts and database definitions from build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma.config.js ./prisma.config.js

# Use the non-root node user for runtime safety
USER node

# Expose NestJS service port
EXPOSE 3000

# Run migrations and launch application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
