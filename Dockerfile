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

# Copy server bundle and only the ws dependency (externalized by esbuild)
RUN apk add --no-cache nodejs
COPY --from=builder /app/server-bundle /app/server-bundle
COPY --from=builder /app/node_modules/ws /app/node_modules/ws

# Create startup script that monitors both processes
RUN printf '#!/bin/sh\n\
# Start game server and monitor it\n\
node /app/server-bundle/server.js &\n\
SERVER_PID=$!\n\
\n\
# Start Caddy\n\
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &\n\
CADDY_PID=$!\n\
\n\
# Monitor both processes - exit if either dies\n\
while true; do\n\
  if ! kill -0 $SERVER_PID 2>/dev/null; then\n\
    echo "Game server died, exiting..."\n\
    kill $CADDY_PID 2>/dev/null || true\n\
    exit 1\n\
  fi\n\
  if ! kill -0 $CADDY_PID 2>/dev/null; then\n\
    echo "Caddy died, exiting..."\n\
    kill $SERVER_PID 2>/dev/null || true\n\
    exit 1\n\
  fi\n\
  sleep 5\n\
done\n' > /app/start.sh && chmod +x /app/start.sh

# Expose ports: 80 for HTTP, 443 for HTTPS
EXPOSE 80 443

# Run both Caddy and game server with monitoring
CMD ["/app/start.sh"]
