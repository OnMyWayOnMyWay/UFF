# Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# Build backend
FROM python:3.12-slim
WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN python3 -m pip install --upgrade pip && \
    python3 -m pip install --no-cache-dir -r /app/requirements.txt

# Copy backend code
COPY backend/ /app/

# Copy frontend build files - copy contents of build dir to avoid nested static
COPY --from=frontend-build /app/build/index.html /app/index.html
COPY --from=frontend-build /app/build/static /app/static
COPY --from=frontend-build /app/build/asset-manifest.json /app/asset-manifest.json

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
