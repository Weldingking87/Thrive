# Thrive backend
Hack The Nest 2026. Base44 is the shared frontend; this Git repository holds the custom backend.
## Local setup
Node.js 22.12+ or newer supported LTS, Git and VS Code.
Run npm ci when a lockfile exists, otherwise npm install. Copy server/.env.example to server/.env only if it does not exist. Fill secrets locally, never in chat or Git.
Run npm run check, then npm run dev. Health: http://127.0.0.1:3001/api/health.
Server is a local starter: /api/analyze intentionally returns 503 NOT_IMPLEMENTED. No cloud providers are connected.
Before deployment: implement authentication and ownership checks, validate requests, add size/rate limits, configure only the actual Base44 origin, deploy with HTTPS, and test provider calls.
The local listener is loopback-only; configure deployment networking explicitly with a reverse proxy when hosting. Base44's hosted frontend cannot reach a developer's localhost.
Jayden owns Base44 dashboard/analysis screens; Lakyndra owns Base44 Profile/Food Log pages. Joshua owns backend integration. Base44 Git sync, if used, should use a separate frontend repo; do not connect it to overwrite this backend.
Submission draft midnight Nov 14 into Nov 15 Eastern; final noon Nov 15 Eastern. Public repo and <=3 minute video; disclose AI tools.
