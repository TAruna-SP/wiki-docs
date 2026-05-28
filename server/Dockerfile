# Express API container.
FROM node:20-alpine

WORKDIR /app

# Install workspace deps (root manifest + server manifest) with a clean,
# reproducible install.
COPY package.json package-lock.json* ./
COPY server/package.json ./server/package.json
RUN npm install --omit=dev --workspace server || npm install --workspace server

COPY server ./server
COPY eslint.config.js ./

WORKDIR /app/server
EXPOSE 5000
CMD ["node", "server.js"]
