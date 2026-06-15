FROM node:20-alpine

# Install openssl for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy root monorepo files
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

# Install dependencies (only api and root dependencies)
RUN npm ci --workspace=apps/api

# Copy source and prisma files
COPY apps/api ./apps/api

# Generate Prisma Client
RUN npx prisma generate --schema=./apps/api/prisma/schema.prisma

# Build the project
RUN npm run build --workspace=apps/api

EXPOSE 8787

# Create uploads folder
RUN mkdir -p /app/apps/api/uploads

# Run migrations and start
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./apps/api/prisma/schema.prisma && node apps/api/dist/server.js"]
