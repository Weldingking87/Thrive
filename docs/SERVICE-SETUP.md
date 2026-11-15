# Connect Thrive services on Windows

Implementation is ready for local configuration; no live provider credentials were available during development. A PASS on unit tests is not proof of a provider connection.

## Update and configure
From the existing Thrive clone, stop npm run dev with Ctrl+C and preserve any local changes before switching branches.

```powershell
git status
git fetch origin
git switch --track origin/feature/service-connections
npm.cmd ci
npm.cmd test
# Preserve the ignored existing .env; add only missing names from .env.example.
notepad server/.env.example
notepad server/.env
```
If branch is already local use `git switch feature/service-connections`. Do not overwrite existing secrets with the example file. Never paste .env into chat or send screenshots of it.

Generate a session secret and write it directly into .env without printing it:

```powershell
$EnvPath = Join-Path (Get-Location) 'server\.env'
$Current = [IO.File]::ReadAllText($EnvPath)
if ($Current -notmatch '(?m)^SESSION_SECRET=.+$') {
    $Bytes = New-Object byte[] 48
    $Rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $Rng.GetBytes($Bytes) } finally { $Rng.Dispose() }
    $SecretLine = 'SESSION_SECRET=' + [Convert]::ToBase64String($Bytes)
    if ($Current -match '(?m)^SESSION_SECRET=.*$') {
        $Current = [regex]::Replace($Current, '(?m)^SESSION_SECRET=.*$', $SecretLine)
    } else { $Current += "`r`n$SecretLine`r`n" }
    [IO.File]::WriteAllText($EnvPath, $Current)
}
```

## SSOJet first
Use a regular web application / confidential OIDC client in the correct SSOJet project. Copy the issuer, client ID and client secret into the matching variables. Do not use a dashboard login URL as the issuer.
- BACKEND_URL=http://127.0.0.1:3001 for local testing.
- FRONTEND_ORIGIN=the exact published Base44 origin, no path/trailing slash. For a same-origin local login smoke test only, set http://127.0.0.1:3001.
- Register http://127.0.0.1:3001/callback as the local callback in SSOJet (not localhost unless you change all matching URLs).
- SESSION_SECRET must be random and at least 32 characters.
- Run npm run dev. Open http://127.0.0.1:3001/login in the system browser. After signing in, open /api/me on the same host to verify the session. Test /logout locally clears the app session; provider-wide logout is not requested.
No unauthenticated demo bypass is included. APIs fail closed while SSOJet is missing.

## Other provider settings
- OpenAI: OPENAI_API_KEY and OPENAI_MODEL. Select an available model supporting image input and structured outputs. OpenAI API billing is separate from a ChatGPT subscription.
- Exa: EXA_API_KEY. Search uses a sport-only query; user images/questions are not sent to Exa.
- ElevenLabs: ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID from your accessible voices. ELEVENLABS_MODEL defaults to eleven_multilingual_v2.
- MongoDB Atlas: create a deployment and database user, allow your actual server egress IP, then set MONGODB_URI and MONGODB_DATABASE=thrive. URL-encode special characters in URI credentials. Do not use broad IP access as a shortcut.
- npm run check:services: names/configured status only, no network requests and no secret output.
- npm run verify:services: live discovery/model/voice access, one Exa search (may consume credits), and MongoDB ping. It does not generate AI feedback/audio or prove browser login.
- Restart npm run dev after .env changes; env-file changes alone may not restart watch mode.

## Base44 integration after HTTPS deployment
The hosted frontend cannot call your local server. Deploy behind HTTPS, set BACKEND_URL to the public URL, register its /callback in SSOJet, set FRONTEND_ORIGIN to the actual Base44 origin, NODE_ENV=production and TRUST_PROXY=1 only behind exactly one trusted reverse proxy. Default HOST remains loopback for a same-machine reverse proxy; container deployments may require HOST=0.0.0.0 with appropriate ingress.

Base44 login button: navigate the TOP-LEVEL browser to `${API_BASE}/login` (not fetch). After return, call /api/me using fetch with credentials:'include'. All API requests need credentials:'include'; JSON writes need Content-Type:'application/json'. Speech returns an audio/mpeg Blob; create an object URL for playback and revoke it when done.

Cross-site cookie caveat: HTTPS uses Secure, HttpOnly, SameSite=None cookies. Browser third-party-cookie restrictions can still block sessions between Base44 and an unrelated backend domain. Test on the actual browser early. If blocked, use frontend/backend subdomains of one controlled parent domain with a compatible deployment/plan, or implement a reviewed token-based SPA flow. Do not disable auth, expose secrets, or treat this as tested by localhost checks. This custom backend login is separate from Base44's built-in external-SSO setting; avoid a duplicate Base44 login wall.

## Actual media boundary
POST /api/analyze accepts 1-4 base64 JPEG/PNG still frames, each at most 1 MiB; JSON body limit 6 MB. Jayden must implement browser-side frame extraction/selection with clear user action before submitting. Video uploads, object storage, full-video motion analysis, and speech-to-text are not implemented. Result timestamps are null. Raw frames are sent to OpenAI for analysis but not stored in MongoDB. The app does not provide medical advice.

## Meaning of verification
/api/health confirms the server is up. /api/integrations reports configuration only and always liveVerified:false (no persistent verification evidence is stored). OpenAI and speech generation must be exercised from the authenticated frontend to establish end-to-end success. Mongo save failures are surfaced as persisted:false with warnings, not silently claimed as saved.

Source documentation used: https://ssojet.com/docs/en/getting-started/regular-web-app/express ; https://platform.openai.com/docs/api-reference/responses/create ; https://exa.ai/docs/reference/search ; https://elevenlabs.io/docs/api-reference/text-to-speech/convert ; https://www.mongodb.com/docs/drivers/node/current/get-started/
