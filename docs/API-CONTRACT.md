# Thrive API contract v1 (agreed starting proposal)
GET /api/health -> 200 {ok:true, service:"thrive-api", integrations:"not-connected"}.
POST /api/analyze -> 503 NOT_IMPLEMENTED until Joshua implements it.
Target request after implementation: JSON {sport:string, question:string, frames:string[]}.
Frames will be bounded image references/data URLs agreed with Joshua; do not send raw video into this JSON endpoint. Decide extraction/upload limits before implementing.
Target success: {analysisId:string, observations:[{text:string, timestampSeconds:number|null}], sources:[{title:string,url:string}], audioUrl:string|null}.
Errors: {error:{code:string,message:string}}. Support loading, empty, error, and success states.
Base44 frontend must use a configurable public HTTPS backend URL. No endpoint URL is provisioned yet. Hosted Base44 cannot call a developer localhost server. Configure allowed origin and authenticated requests before connecting.
Do not invent live results: local fixtures must be visibly marked Demo data.
Authentication, ownership checks, request validation, upload validation, MongoDB persistence and API integrations remain unimplemented.
Before public hosting: add authenticated access, size/rate limits, HTTPS and verify no secrets appear in client assets.
