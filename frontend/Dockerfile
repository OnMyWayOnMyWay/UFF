### Stage 1: build
FROM node:18-alpine AS builder
WORKDIR /app
ENV CI=true

# Install deps
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --legacy-peer-deps --no-progress

COPY frontend/ ./
RUN npm run build

### Stage 2: serve with nginx
FROM nginx:stable-alpine
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
