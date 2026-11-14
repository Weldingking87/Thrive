import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/app.js';
import {createServices} from '../src/services.js';
const origin='https://thrive.example';
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZlSIAAAAASUVORK5CYII=';
async function withApp(options, run) {
  const server=createApp({env:{FRONTEND_ORIGIN:origin},...options}).listen(0,'127.0.0.1');
  await new Promise(resolve=>server.once('listening',resolve));
  try {await run(`http://127.0.0.1:${server.address().port}`);} finally {await new Promise(resolve=>server.close(resolve));}
}
const auth=(req,res,next)=>{req.userId='test-user';next();};
const headers={Origin:origin,'Content-Type':'application/json'};
test('health works without secrets; API fails closed when auth not configured',async()=>{
 await withApp({},async base=>{
  assert.equal((await fetch(`${base}/api/health`)).status,200);
  assert.equal((await fetch(`${base}/api/me`)).status,503);
  assert.equal((await fetch(`${base}/login`)).status,503);
 });
});
test('rejects cross-origin calls, missing origin and remote frame URLs before provider calls',async()=>{
 await withApp({authenticate:auth,services:{}},async base=>{
  assert.equal((await fetch(`${base}/api/me`,{headers:{Origin:'https://evil.example'}})).status,403);
  assert.equal((await fetch(`${base}/api/analyze`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
  assert.equal((await fetch(`${base}/api/analyze`,{method:'POST',headers,body:JSON.stringify({sport:'basketball',question:'Form?',frames:['http://127.0.0.1/private']})})).status,400);
 });
});
test('analysis scopes storage to signed-in user; no images stored; missing optional providers are visible',async()=>{
 let saved;
 const services={search:async()=>{throw Error('down');},analyze:async()=>({observations:[{text:'Frame observation',timestampSeconds:null}]}),saveAnalysis:async(owner,data)=>{saved={owner,data};}};
 await withApp({authenticate:auth,services},async base=>{
  const response=await fetch(`${base}/api/analyze`,{method:'POST',headers,body:JSON.stringify({sport:'basketball',question:'Form?',frames:[png],owner:'someone-else'})});
  assert.equal(response.status,200);
  const data=await response.json();
  assert.equal(data.persisted,true);assert.equal(data.warnings.length,1);
  assert.equal(saved.owner,'test-user');assert.equal(saved.data.frames,undefined);
 });
});
test('profile ignores supplied owner; food logs reject negative calories',async()=>{
 let owner;
 await withApp({authenticate:auth,services:{saveProfile:async(o,p)=>{owner=o;return p;}}},async base=>{
  const response=await fetch(`${base}/api/profile`,{method:'PUT',headers,body:JSON.stringify({displayName:'Athlete',sports:['basketball'],dietaryPreferences:[],allergies:[],owner:'other'})});
  assert.equal(response.status,200);assert.equal(owner,'test-user');
  assert.equal((await fetch(`${base}/api/food-logs`,{method:'POST',headers,body:JSON.stringify({name:'Snack',meal:'Lunch',calories:-1})})).status,400);
 });
});
test('OpenAI adapter sends image input with store:false; speech uses provider auth server-side',async()=>{
 const calls=[];
 const svc=createServices({OPENAI_API_KEY:'secret-test',OPENAI_MODEL:'test-model',ELEVENLABS_API_KEY:'voice-test',ELEVENLABS_VOICE_ID:'voice'},async(url,options)=>{
  calls.push({url,options});
  if(url.includes('openai'))return new Response(JSON.stringify({output:[{content:[{type:'output_text',text:JSON.stringify({observations:[{text:'Observation',timestampSeconds:null}]})}]}]}));
  return new Response(new Uint8Array([1,2,3]));
 });
 await svc.analyze({sport:'basketball',question:'Form?',frames:[png],sources:[]});
 const body=JSON.parse(calls[0].options.body);assert.equal(body.store,false);assert.equal(body.input[0].content[1].type,'input_image');
 assert.equal((await svc.speech('Hello')).length,3);assert.equal(calls[1].options.headers['xi-api-key'],'voice-test');
});
test('provider errors do not expose upstream bodies or keys',async()=>{
 const svc=createServices({EXA_API_KEY:'private'},async()=>new Response('private secret upstream dump',{status:401}));
 await assert.rejects(svc.search('basketball'),err=>err.code==='PROVIDER_ERROR'&&!err.message.includes('private'));
});
test('production refuses incomplete auth or insecure backend URL',()=>{
 assert.throws(()=>createApp({env:{NODE_ENV:'production'},services:{}}));
});
test('configured OIDC app rejects requests without a session',async()=>{
 await withApp({env:{FRONTEND_ORIGIN:origin,BACKEND_URL:'http://127.0.0.1:3001',SSOJET_ISSUER:'https://issuer.example',SSOJET_CLIENT_ID:'test',SSOJET_CLIENT_SECRET:'test-secret',SESSION_SECRET:'s'.repeat(48)},services:{}},async base=>{
  const response=await fetch(`${base}/api/me`);
  assert.equal(response.status,401);
 });
});
