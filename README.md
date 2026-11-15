# Thrive

**Move. Fuel. Grow. Built to be better.**

Thrive is an AI-powered training companion created for Hack The Nest 2026. It helps recreational athletes review movement, select a focused practice goal, track consistency, and record everyday nutrition information.

## Live project

- **Application:** https://thrive.select
- **Published Base44 application:** https://thrive-sport-sync.base44.app
- **Backend API:** https://api.thrive.select
- **Health endpoint:** https://api.thrive.select/api/health
- **Repository:** https://github.com/Weldingking87/Thrive
- **youtube Video:** https://youtu.be/wpbmezi85f0

## How Thrive works

1. The athlete chooses a sport.
2. The athlete asks one focused movement question.
3. The athlete selects a short video clip.
4. The browser extracts exactly three still frames at 25%, 50%, and 75%.
5. The complete video stays on the athlete's device.
6. The backend returns educational observations and supporting reading.
7. The athlete can listen to the review and save an observation as a practice focus.
8. Practice timers, weekly tracking, milestones, Profile, and Food Log support continued progress.

Thrive provides educational feedback. It does not diagnose injuries, provide medical advice, or guarantee performance improvement.

## Technology

- **Frontend:** Base44, React, JavaScript
- **Backend:** Node.js and Express
- **Authentication:** Base44 access plus a separate SSOJet OIDC backend session
- **Movement analysis:** OpenAI vision-capable model
- **Supporting sources:** Exa
- **Narration:** ElevenLabs
- **Persistence:** MongoDB Atlas
- **Deployment:** Vultr
- **HTTPS reverse proxy:** Caddy
- **Domain:** thrive.select
- **Backend domain:** api.thrive.select
- **Registration and DNS:** Porkbun using the event-provided GoDaddy Registry domain

## Privacy and safety

- The complete movement video is not uploaded to the Thrive backend.
- Exactly three compressed still frames are transmitted only after the athlete selects **Run analysis**.
- Each frame is limited to 1 MiB, and the complete request is limited to 6 MB.
- Raw frames are not stored in MongoDB.
- Provider credentials remain server-side.
- Demo feedback remains clearly separated from live feedback.

## Verified production workflow

The following workflow was verified from the published desktop application:

- API health returned HTTP 200.
- SSOJet backend login completed successfully.
- `/api/me` returned an authenticated user ID.
- A live three-frame analysis completed successfully.
- OpenAI returned educational movement observations.
- Exa returned supporting sources.
- MongoDB Atlas persisted the analysis.
- ElevenLabs generated and played the spoken review.
- `thrive.select` opened the published Thrive application.
- `api.thrive.select` continued serving the backend independently.

See [Production verification](docs/PRODUCTION-VERIFICATION.md) for the final verification record.

## Known limitation

Desktop Chrome is the verified judging path. Some iOS embedded browsers and Safari configurations can block the backend's cross-site session cookie because the Base44 frontend and API use different parent domains. Thrive displays guidance for affected mobile users. A future frontend deployment at `app.thrive.select` would provide a same-site authentication path.

## Team CyberChasers

| Team member | School | Primary contribution |
|---|---|---|
| **K Muhammad** | Cass Technical High School | Team captain, CTF leadership, testing, and project coordination |
| **Jayden Stewart** | Cass Technical High School | Base44 frontend, analysis interface, frontend integration, and publishing |
| **Lakyndra “Kyndra” Dalton** | Eastern Michigan University | Profile, Food Log, user experience, and demo testing |
| **Joshua McAllister** | Eastern Michigan University | Backend integration, authentication, APIs, cloud deployment, domain configuration, and submission |

## API routes

### Public

- `GET /`
- `GET /api/health`
- `GET /login`
- `GET /callback`
- `GET /logout`

### Authenticated

- `GET /api/me`
- `GET /api/integrations`
- `POST /api/search`
- `POST /api/analyze`
- `POST /api/speech`
- `GET /api/profile`
- `PUT /api/profile`
- `GET /api/food-logs`
- `POST /api/food-logs`

See [API contract](docs/API-CONTRACT.md) for request limits and response formats.

## Local development

Requirements:

- Node.js 22.12 or a newer supported LTS
- npm
- Provider credentials stored only in `server/.env`

```powershell
npm.cmd ci
npm.cmd test
npm.cmd run check:services
npm.cmd run dev
```

Never commit `server/.env`, provider keys, database credentials, session secrets, authentication cookies, or raw user video.

## AI disclosure

The team used AI-assisted development tools to help design, implement, test, document, and debug Thrive. The team reviewed the generated work, tested the production behavior, and retained responsibility for the final implementation and submission.
