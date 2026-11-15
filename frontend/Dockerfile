# Local development image: Vite dev server with hot reload, proxying /api, /media and /ipfs.
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
EXPOSE 8080
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "8080"]
