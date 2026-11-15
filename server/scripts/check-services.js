import {configuration} from '../src/app.js';
import {createServices, providerFetch} from '../src/services.js';
const env=process.env;
const config=configuration(env);
for(const [service, state] of Object.entries(config)) console.log(`${service}: ${state.configured ? 'CONFIGURED (not live verified)' : 'MISSING SETTINGS'}`);
if(!process.argv.includes('--live')) {
  console.log('Configuration check only. --live performs network checks; Exa search may consume credits.');
} else {
  const services=createServices(env);
  const checks={
    ssojet:async()=>{
      const data=await (await providerFetch(fetch,'SSOJet',`${env.SSOJET_ISSUER.replace(/\/$/,'')}/.well-known/openid-configuration`)).json();
      if(data.issuer!==env.SSOJET_ISSUER || !data.authorization_endpoint || !data.token_endpoint) throw Error();
    },
    openai:()=>providerFetch(fetch,'OpenAI',`https://api.openai.com/v1/models/${encodeURIComponent(env.OPENAI_MODEL)}`,{headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`}}),
    exa:()=>services.search('sports technique coaching fundamentals'),
    elevenlabs:()=>providerFetch(fetch,'ElevenLabs','https://api.elevenlabs.io/v1/voices',{headers:{'xi-api-key':env.ELEVENLABS_API_KEY}}).then(async r=>{const data=await r.json();if(!data.voices?.some(v=>v.voice_id===env.ELEVENLABS_VOICE_ID)) throw Error();}),
    mongodb:()=>services.ping()
  };
  try {
    for(const [name,run] of Object.entries(checks)) {
      if(!config[name].configured){console.log(`${name}: SKIPPED (missing settings)`);process.exitCode=1;continue;}
      try {await run();console.log(`${name}: PASS (${name==='ssojet'?'discovery only; browser login not tested':name==='openai'?'model access only; generation not tested':name==='elevenlabs'?'voice access only; speech generation not tested':'live request'})`);}
      catch {console.log(`${name}: FAIL (check provider dashboard, permissions, billing/network and local settings)`);process.exitCode=1;}
    }
  } finally {await services.close();}
}
