# Thrive backend
Hack The Nest 2026. Shared Base44 frontend plus custom Node.js backend.

## Run
Use Node.js 22.12+ or a newer supported LTS. `npm ci`, copy server/.env.example to server/.env only if absent, then configure locally. `npm test` runs offline tests; `npm run dev` starts the server. No secrets should be posted in chat or committed.

Read [Service setup](docs/SERVICE-SETUP.md) for Windows configuration and SSOJet login, then [API contract](docs/API-CONTRACT.md) for Jayden's frontend wiring.

Implemented: SSOJet server-side OIDC session flow, authenticated service routes, OpenAI Responses frame analysis, Exa search, ElevenLabs speech, MongoDB profiles/food logs/analysis persistence. No live provider credentials were available during development; end-to-end login, generation, persistence and hosted Base44 access still need verification.

`npm run check:services` checks configuration without requests. `npm run verify:services` performs limited live checks, including an Exa search that may consume credits; it never prints credentials.

Video input is selected still frames, not full-video upload. TTS is implemented; speech-to-text is not. Base44 cross-site session cookies must be tested in the actual deployment/browser.

Joshua owns backend. Jayden owns Base44 dashboard/analysis screens, Lakyndra owns Profile/Food Log and demo testing, K Muhammad is captain/CTF. Work on feature branches and open PRs; do not overwrite main or connect Base44 Git sync to this backend repo.
