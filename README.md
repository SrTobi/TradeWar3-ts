# TradeWar Galaxy

A space trading game built with React, Three.js, and TypeScript.

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

## Deployment

This project is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

The live version is available at: https://srtobi.github.io/TradeWar3-ts/

### GitHub Pages Setup

The deployment is handled by a GitHub Actions workflow (`.github/workflows/deploy.yml`) that:
1. Builds the project using Vite
2. Uploads the build artifacts
3. Deploys to GitHub Pages

To enable GitHub Pages for this repository:
1. Go to repository Settings → Pages
2. Under "Build and deployment", select "GitHub Actions" as the source
3. The site will be automatically deployed on the next push to `main`

### Hetzner VPS Deployment

The project can also be deployed to a Hetzner VPS using the GitHub Actions workflow (`.github/workflows/deploy-hetzner.yml`). This deploys the full application including the WebSocket game server.

#### Prerequisites

1. A Hetzner VPS with Docker installed
2. SSH access to the VPS

#### Setup

1. Create a GitHub environment named `hetzner` in your repository settings (Settings → Environments → New environment)

2. Add the following secrets to the `hetzner` environment:
   - `HETZNER_HOST`: Your VPS IP address or hostname
   - `HETZNER_USERNAME`: SSH username (e.g., `root`)
   - `HETZNER_SSH_KEY`: Private SSH key for authentication
   - `HETZNER_SSH_PORT`: SSH port (optional, defaults to 22)
   - `CR_PAT`: GitHub Personal Access Token with `read:packages` scope for pulling container images

3. Ensure Docker is installed on your Hetzner VPS:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```

4. The workflow will automatically:
   - Build a Docker image
   - Push it to GitHub Container Registry (ghcr.io)
   - SSH into your VPS and deploy the container

#### Ports

The application exposes:
- Port 8080: Frontend web server
- Port 12346: WebSocket game server

Make sure these ports are open in your VPS firewall.

## License

MIT
