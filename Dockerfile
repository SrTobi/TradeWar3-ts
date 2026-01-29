FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build


# Install http-server and concurrently globally
RUN npm install -g http-server concurrently

EXPOSE 8080 12346

# Run both frontend and server concurrently
CMD ["concurrently", "http-server dist -p 8080", "pnpm run server" ]
