FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build
RUN pnpm run bundle:server


FROM caddy:2-alpine
WORKDIR /app

# Copy built frontend
COPY --from=builder /app/dist /srv

# Copy Caddyfile
COPY Caddyfile /etc/caddy/Caddyfile

# Copy server files and install Node.js for the game server
RUN apk add --no-cache nodejs npm
COPY --from=builder /app/server-bundle /app/server-bundle
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/package.json /app/package.json

# Install pnpm for running server
RUN npm install -g pnpm

# Create startup script
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'node /app/server-bundle/server.js &' >> /app/start.sh && \
    echo 'caddy run --config /etc/caddy/Caddyfile --adapter caddyfile' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose ports: 80 for HTTP, 443 for HTTPS
EXPOSE 80 443

# Run both Caddy and game server
CMD ["/app/start.sh"]
