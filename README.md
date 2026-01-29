# TradeWar Galaxy

A space trading game built with React, Three.js, and TypeScript.

## Screenshots

![Title Screen](screenshots/title-screen.png)
*Game lobby - Create or join a game as a galactic commander*

![Galactic Exchange](screenshots/galactic-exchange.png)
*Galactic Exchange - Trade stocks and conquer the galaxy*

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

## License

MIT
