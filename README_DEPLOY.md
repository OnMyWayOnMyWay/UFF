# Deploying UFF (Docker)

This repository includes Dockerfiles and a `docker-compose.yml` to run the frontend (React + nginx), backend (FastAPI), and a local MongoDB for testing.

Quick start (requires Docker & Docker Compose):

1. Build and start everything:

```bash
docker compose up --build
```

2. Visit the app in your browser:


- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api

Environment variables (you can set these in your environment or a `.env` file):

- `ADMIN_KEY` (defaults to `reset_season_2025`)
- `DISCORD_WEBHOOK_URL` (optional)
-- `REACT_APP_BACKEND_URL` (frontend build-time backend base url)

GitHub Actions (optional):

There is an example workflow to build and push Docker images to Docker Hub. To use it set secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` in your repo settings.

Notes:

- Do not commit secrets into `.env` or the repository.
- For real hosting, use a managed MongoDB (Mongo Atlas), and update `MONGO_URL` for the backend service.

Render (recommended quick public hosting)
---------------------------------------

Render is a simple platform for deploying both containers and static sites. Here's how to deploy this project on Render:

1. Create a MongoDB Atlas cluster and copy the connection string (whitelist your Render IPs or allow access from anywhere while testing).
2. In the Render dashboard, create two services:
	 - **Backend (Docker)**: connect your repo, set the service type to `Web Service`, and set `Docker` to use `backend/Dockerfile`. Add the following environment variables in Render's dashboard or secrets:
		 - `MONGO_URL` (set from your Atlas connection string)
		 - `ADMIN_KEY` (optional, defaults to `reset_season_2025`)
		 - `DISCORD_WEBHOOK_URL` (optional)
	 - **Frontend (Docker)**: create another `Web Service` using `frontend/Dockerfile` (or use Render's static site with a build command `npm ci && npm run build`). Set the environment variable `REACT_APP_BACKEND_URL` to your backend's URL (e.g. `https://uff-backend.onrender.com`).
3. Configure custom domains and TLS within Render (the dashboard walks you through certificate provisioning automatically).
4. Ensure backend `MONGO_URL` points to a reachable MongoDB Atlas cluster.

Using `render.yaml`:
- A sample `render.yaml` manifest is included (`render.yaml`). You can import this in Render or use it as a template for creating services.

Security note:
- Store secrets in Render's encrypted secrets store (do not commit them to git).

