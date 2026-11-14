import http from 'node:http';
const port = Number(process.env.PORT || 3001);
http.createServer((req,res)=>{
  res.setHeader('Content-Type','application/json');
  if(req.url==='/api/health' && req.method==='GET'){
    res.end(JSON.stringify({ok:true,service:'thrive-api',integrations:'not-connected'}));return;
  }
  if(req.url==='/api/analyze' && req.method==='POST'){
    res.writeHead(503);res.end(JSON.stringify({error:{code:'NOT_IMPLEMENTED',message:'AI analysis is not connected yet.'}}));return;
  }
  res.writeHead(404);res.end(JSON.stringify({error:{code:'NOT_FOUND',message:'Route not found'}}));
}).listen(port,'127.0.0.1',()=>console.log(`Thrive API listening on http://127.0.0.1:${port}`));
