# Setup

## Local development

1. `npm install`
2. `.env` in the repo root:
   ```
   MONGO_URI=mongodb://<user>:<password>@192.168.178.129:27017/rezepteapp?authSource=rezepteapp
   ```
   Until go-live this database is a test environment; test data may be written.
3. `npm run start:dev` → http://localhost:3000

The frontend (`npm run dev`) proxies `/api` to this server.

## CI / deployment

- Workflow `.github/workflows/test-runner.yml` runs on pushes to `main` only, on the self-hosted runner in the app LXC (192.168.178.132).
- It runs `docker compose up -d --build`. The Dockerfile runs `npm ci`, `lint:check`, `npm test` and `build`.
  If any step fails, the running container stays untouched.
- After the deploy, dangling images and build cache older than 7 days are removed.
- Container: `rezepte-backend-backend-1`, port 3000, `restart: unless-stopped`, env from `/opt/rezepte/.env` on the host.
- The runner needs internet access (GitHub, npm, Docker Hub).

## Infrastructure

| Service | Address |
| --- | --- |
| Nginx reverse proxy | 192.168.178.131 (`rezepte.home.arpa`, `/api` → backend) |
| App LXC (frontend :8080, backend :3000) | 192.168.178.132 |
| MongoDB | 192.168.178.129 |
| AdGuard DNS | 192.168.178.36 |
| Smallstep CA | 192.168.178.133 |
