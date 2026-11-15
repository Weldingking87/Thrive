# Thrive API contract v2
All /api routes except health require a backend SSOJet session. No Base44 login token is implicitly accepted.
GET / : public service information.
GET /api/health : public {ok:true,service:"thrive-api",integrations:"not-live-verified"}.
GET /login : browser navigation initiating SSOJet sign-in; callback /callback.
GET /logout : clear local backend session, return to configured frontend.
GET /api/me : {id,name} from verified identity.
GET /api/integrations : configured and liveVerified:false for each provider. Configuration is not verification.
POST /api/search : {query:string (1-300 chars)} -> {sources:[{title,url}]}.
POST /api/analyze : {sport:string (1-80),question:string (1-1000),frames:string[1-4]}.
Frames are base64 JPEG/PNG data URLs <=1 MiB each, not remote URLs or video files. 6 MB request cap. Response: {analysisId,observations:[{text,timestampSeconds:null}],sources:[{title,url}],audioUrl:null,warnings:string[],persisted:boolean}.
Exa failure permits feedback with a warning; OpenAI failure fails request. Mongo save failure returns persisted:false. No raw frames are stored. Sources are supporting reading, not asserted citation proof for each observation.
POST /api/speech : {text:string (1-1500)} -> audio/mpeg bytes; frontend creates Blob object URL.
GET /api/profile : {profile:object|null}.
PUT /api/profile : {displayName:string,sports:string[],dietaryPreferences:string[],allergies:string[]} -> {profile}. Arrays <=20, items <=100 chars. Owned by authenticated subject; supplied owner fields ignored.
GET /api/food-logs : {entries:array}, newest 50.
POST /api/food-logs : {name:string,meal:string,calories:number|null} -> 201 {entry}. Calories 0-20000; user-supplied, no prescribed targets. Delete is not yet implemented.
All JSON writes require an allowed Origin header and Content-Type application/json. Browser requests use credentials:'include'. Errors {error:{code,message}}; common statuses 400 validation, 401 login, 403 origin, 413 size, 429 rate, 502 provider, 503 config.
Rate limit: 20 authenticated API requests per 10 minutes per IP, single-process memory. For multiple replicas add a shared rate-limit store before scaling. No authentication bypass environment flag exists.
See SERVICE-SETUP.md for Base44 cookie/deployment requirements and exact limitations.
