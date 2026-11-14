import express from 'express';
import oidc from 'express-openid-connect';
import {rateLimit} from 'express-rate-limit';
import {randomUUID} from 'node:crypto';
import {AppError, createServices} from './services.js';

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const bad = message => {throw new AppError(400, 'INVALID_INPUT', message);};
function text(value, name, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) bad(`${name} must be 1-${max} characters.`);
  return value.trim();
}
function list(value, name) {
  if (!Array.isArray(value) || value.length > 20) bad(`${name} must be an array of up to 20 items.`);
  return value.map(v => text(v, name, 100));
}
export function parseAnalysis(body) {
  if (!body || typeof body !== 'object') bad('JSON body required.');
  const sport = text(body.sport, 'sport', 80);
  const question = text(body.question, 'question', 1000);
  if (!Array.isArray(body.frames) || body.frames.length < 1 || body.frames.length > 4) bad('Provide 1-4 JPEG or PNG frames, not a video file.');
  for (const frame of body.frames) {
    if (typeof frame !== 'string' || frame.length > 1400000 || !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(frame)) bad('Each frame must be a base64 JPEG/PNG data URL of at most 1 MB.');
    const bytes = Buffer.from(frame.split(',')[1], 'base64');
    const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (bytes.length > 1048576 || !(frame.startsWith('data:image/png') ? png : jpeg)) bad('Frame type or size is invalid.');
  }
  return {sport, question, frames: body.frames};
}
export function configuration(env) {
  const groups = {ssojet: ['SSOJET_ISSUER','SSOJET_CLIENT_ID','SSOJET_CLIENT_SECRET','SESSION_SECRET','BACKEND_URL','FRONTEND_ORIGIN'], openai: ['OPENAI_API_KEY','OPENAI_MODEL'], exa: ['EXA_API_KEY'], elevenlabs: ['ELEVENLABS_API_KEY','ELEVENLABS_VOICE_ID'], mongodb: ['MONGODB_URI']};
  return Object.fromEntries(Object.entries(groups).map(([k, keys]) => [k, {configured: keys.every(key => Boolean(env[key])), liveVerified: false}]));
}
export function createApp({env = process.env, services = createServices(env), authenticate} = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  const status = configuration(env);
  const origin = env.FRONTEND_ORIGIN || '';
  const backend = env.BACKEND_URL || 'http://127.0.0.1:3001';
  const secure = backend.startsWith('https://');
  if (env.NODE_ENV === 'production' && (!secure || !status.ssojet.configured)) throw Error('Production requires HTTPS BACKEND_URL and complete SSOJet configuration.');
  for (const url of [origin, backend, env.SSOJET_ISSUER].filter(Boolean)) {
    const parsed = new URL(url);
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw Error('Invalid configured URL.');
    if (parsed.protocol !== 'https:' && !['localhost','127.0.0.1'].includes(parsed.hostname)) throw Error('Remote configured URLs require HTTPS.');
  }
  if (origin && new URL(origin).origin !== origin) throw Error('FRONTEND_ORIGIN must contain only scheme and host, no path or trailing slash.');
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store'); res.set('X-Content-Type-Options','nosniff');
    if (req.path.startsWith('/api/') && req.headers.origin) {
      if (req.headers.origin !== origin && req.headers.origin !== new URL(backend).origin) return res.status(403).json({error:{code:'ORIGIN_DENIED',message:'Origin is not allowed.'}});
      res.set('Access-Control-Allow-Origin', req.headers.origin); res.vary('Origin');
      res.set('Access-Control-Allow-Credentials', 'true');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
    }
    if (req.method === 'OPTIONS' && req.path.startsWith('/api/')) return res.sendStatus(204);
    next();
  });
  app.get('/', (req, res) => res.json({service:'thrive-api',health:'/api/health',login:'/login'}));
  app.get('/api/health', (req, res) => res.json({ok:true, service:'thrive-api',integrations:'not-live-verified'}));
  if (status.ssojet.configured) {
    if (env.SESSION_SECRET.length < 32) throw Error('SESSION_SECRET must contain at least 32 characters.');
    app.use(oidc.auth({authRequired:false, auth0Logout:false, issuerBaseURL:env.SSOJET_ISSUER,
      baseURL:backend, clientID:env.SSOJET_CLIENT_ID, clientSecret:env.SSOJET_CLIENT_SECRET, secret:env.SESSION_SECRET,
      authorizationParams:{response_type:'code',scope:'openid profile email'},
      routes:{login:false, logout:false, callback:'/callback'},
      session:{cookie:{secure, httpOnly:true, sameSite:secure ? 'None' : 'Lax'}},
      afterCallback: async (req, res, session) => session
    }));
    app.get('/login', (req,res) => res.oidc.login({returnTo: origin || backend}));
    app.get('/logout', (req,res) => res.oidc.logout({returnTo: origin || backend}));
  } else {
    app.get(['/login','/callback','/logout'], (req,res) => res.status(503).json({error:{code:'NOT_CONFIGURED',message:'Complete SSOJet configuration first.'}}));
  }
  app.use('/api', authenticate || ((req,res,next) => {
    if (!status.ssojet.configured) return next(new AppError(503,'AUTH_NOT_CONFIGURED','SSOJet is not configured.'));
    if (!req.oidc?.isAuthenticated() || !req.oidc.user?.sub) return next(new AppError(401,'LOGIN_REQUIRED','Sign in using /login first.'));
    req.userId = req.oidc.user.sub; next();
  }));
  app.use('/api', rateLimit({windowMs:600000, limit:20, standardHeaders:'draft-8', legacyHeaders:false,
    message:{error:{code:'RATE_LIMITED',message:'Too many requests; retry in 10 minutes.'}}}));
  app.use('/api', (req,res,next) => {
    if (!['GET','HEAD','OPTIONS'].includes(req.method) && ![origin,new URL(backend).origin].filter(Boolean).includes(req.headers.origin)) return next(new AppError(403,'ORIGIN_REQUIRED','State-changing requests require an allowed Origin header.'));
    next();
  });
  app.use('/api', express.json({limit:'6mb', type:'application/json'}));
  app.get('/api/me',(req,res) => res.json({id:req.userId,name:req.oidc?.user?.name || null}));
  app.get('/api/integrations',(req,res) => res.json(status));
  app.post('/api/search',asyncRoute(async(req,res) => res.json({sources:await services.search(text(req.body?.query,'query',300))})));
  app.post('/api/analyze',asyncRoute(async(req,res) => {
    const input = parseAnalysis(req.body);
    const warnings = [];
    let sources = [];
    // Query contains sport only: do not send personal questions or frames to the search provider.
    try { sources = await services.search(`${input.sport} sports technique fundamentals coaching`); }
    catch { warnings.push('Supporting web research is unavailable.'); }
    const feedback = await services.analyze({...input,sources});
    const result = {analysisId:randomUUID(),observations:feedback.observations,sources,audioUrl:null,warnings,persisted:false};
    // Raw images and user question are never stored in MongoDB by this route.
    try { await services.saveAnalysis(req.userId,{...result,persisted:true}); result.persisted = true; }
    catch { warnings.push('Feedback was not saved to the database.'); }
    res.json(result);
  }));
  app.post('/api/speech',asyncRoute(async(req,res) => {
    const audio = await services.speech(text(req.body?.text,'text',1500));
    res.type('audio/mpeg').send(audio);
  }));
  app.get('/api/profile',asyncRoute(async(req,res) => res.json({profile:await services.getProfile(req.userId)})));
  app.put('/api/profile',asyncRoute(async(req,res) => {
    const b=req.body || {};
    const profile={displayName:text(b.displayName,'displayName',80),sports:list(b.sports,'sports'),dietaryPreferences:list(b.dietaryPreferences,'dietaryPreferences'),allergies:list(b.allergies,'allergies')};
    res.json({profile:await services.saveProfile(req.userId,profile)});
  }));
  app.get('/api/food-logs',asyncRoute(async(req,res) => res.json({entries:await services.foodLogs(req.userId)})));
  app.post('/api/food-logs',asyncRoute(async(req,res) => {
    const b=req.body || {};
    const entry={id:randomUUID(),name:text(b.name,'name',150),meal:text(b.meal,'meal',40),calories:b.calories ?? null};
    if (entry.calories !== null && (typeof entry.calories !== 'number' || !Number.isFinite(entry.calories) || entry.calories < 0 || entry.calories > 20000)) bad('Calories must be a number from 0 to 20000, or null.');
    res.status(201).json({entry:await services.saveFood(req.userId,entry)});
  }));
  app.use((req,res) => res.status(404).json({error:{code:'NOT_FOUND',message:'Route not found'}}));
  app.use((err,req,res,next) => {
    if(res.headersSent) return next(err);
    const known = err instanceof AppError;
    const tooLarge = err.type === 'entity.too.large';
    const malformed = err.type === 'entity.parse.failed';
    res.status(known ? err.status : tooLarge ? 413 : malformed ? 400 : 500).json({error:{code:known ? err.code : tooLarge ? 'PAYLOAD_TOO_LARGE' : malformed ? 'INVALID_JSON' : 'INTERNAL_ERROR',message:known ? err.message : tooLarge ? 'Request exceeds 6 MB.' : malformed ? 'Invalid JSON body.' : 'Request failed. Check server configuration.'}});
  });
  return app;
}
