### Stage 1: build
FROM node:18-alpine AS builder
WORKDIR /app
ENV CI=true

# Install deps
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps --no-progress

COPY . ./
RUN npm run build

### Stage 2: serve with nginx
FROM nginx:stable-alpine
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY start.sh /start.sh
RUN chmod +x /start.sh
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["/start.sh"]
