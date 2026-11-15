import {createApp} from './app.js';
import {createServices} from './services.js';
const services = createServices(process.env);
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '127.0.0.1';
const server = createApp({services}).listen(port,host,()=>console.log(`Thrive API listening on http://${host}:${port}; provider connections require live verification.`));
for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>server.close(async()=>{await services.close();process.exit(0);}));
