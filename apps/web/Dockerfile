# Build stage
FROM node:20-alpine AS build

WORKDIR /app

# Copy root monorepo files
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN npm ci --workspace=apps/web

# Copy source code
COPY apps/web ./apps/web

# Build arguments for Vite env variables
ARG VITE_API_BASE_URL=http://localhost:8787/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build frontend
RUN npm run build --workspace=apps/web

# Serve stage (Nginx)
FROM nginx:alpine

# Copy custom nginx configuration for SPA routing
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

# Copy build files
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
