# web/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package.json and (if present) package-lock.json
COPY package*.json ./

# Install exactly what's in the lockfile if present, or generate a fresh one
RUN if [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# Copy the rest of your sources
COPY . .

# (Optional) build step, e.g. npm run build
# RUN npm run build

# …then either serve with a simple static server, or hand off to nginx, etc.
