# NixOS-based Dockerfile for TradeWar3
#
# This Dockerfile uses nixos/nix as the base image for reproducible builds.
# The nix-shell approach provides consistent tooling across development and production.
#
# Build: docker build -t tradewar3 .
# Run:   docker run -p 8080:8080 -p 12346:12346 tradewar3
#
# Alternative: Use `nix build .#dockerImage` if a flake-based image is added to flake.nix

FROM nixos/nix:latest AS builder

# Configure Nix
# Note: sandbox = false is required for Docker builds due to nested sandboxing limitations
RUN mkdir -p /etc/nix && \
    echo "experimental-features = nix-command flakes" >> /etc/nix/nix.conf && \
    echo "sandbox = false" >> /etc/nix/nix.conf

WORKDIR /app

# Copy dependency files first for better caching
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN nix-shell -p nodejs nodePackages.pnpm --run "pnpm install --frozen-lockfile"

# Copy source files
COPY . .

# Build the application
RUN nix-shell -p nodejs nodePackages.pnpm nodePackages.typescript --run "pnpm run build"

# Pre-fetch runtime dependencies into Nix store for production stage
RUN nix-build '<nixpkgs>' -A nodejs -A nodePackages.pnpm -A nodePackages.http-server --no-out-link

# Production stage
FROM nixos/nix:latest

# Configure Nix
# Note: sandbox = false is required for Docker builds due to nested sandboxing limitations
RUN mkdir -p /etc/nix && \
    echo "experimental-features = nix-command flakes" >> /etc/nix/nix.conf && \
    echo "sandbox = false" >> /etc/nix/nix.conf

# Pre-fetch runtime dependencies into Nix store
RUN nix-build '<nixpkgs>' -A nodejs -A nodePackages.pnpm -A nodePackages.http-server --no-out-link

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 8080 12346

# Run frontend and server concurrently using nix-shell
CMD ["nix-shell", "-p", "nodejs", "nodePackages.pnpm", "nodePackages.http-server", "--run", "npx concurrently 'http-server dist -p 8080' 'pnpm run server'"]
