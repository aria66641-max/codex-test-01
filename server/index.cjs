'use strict';
const http=require('node:http');const fs=require('node:fs/promises');const path=require('node:path');const {randomUUID}=require('node:crypto');
const core=require('../ai-core');const openai=require('./openai.cjs');const {LIMITS,DeadlineError,deadline}=require('./timing.cjs');
const root=path.resolve(__dirname,'..');
const publicFiles={'/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/app.js':'app.js','/ai-core.js':'ai-core.js','/ai-ui.js':'ai-ui.js'};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
function createServer({env=process.env,generate=openai.generate,logger=entry=>console.log(JSON.stringify(entry)),limits={}}={}){
 const timing={...LIMITS,...limits};const jobs=new Map();let active=null;
 const log=(job,event,status)=>{const entry={event,requestId:job.id,stage:job.stage,elapsedMs:Date.now()-job.started};if(Number.isInteger(status))entry.httpStatus=status;try{logger(entry);}catch{}};
 const snapshot=job=>job.state==='running'?{requestId:job.id,state:'running',stage:job.stage,elapsedMs:Date.now()-job.started}:{requestId:job.id,state:job.state,options:job.values,...job.result};
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const json=(code,data)=>{if(res.destroyed||res.writableEnded)return;res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  let url;try{url=new URL(req.url,'http://localhost');}catch{return json(400,{error:'잘못된 주소입니다.'});}
  const local=/^((localhost|127\.0\.0\.1)(:\d+)?)$/.test(req.headers.host||'');
  const same=(!req.headers.origin||req.headers.origin===`http://${req.headers.host}`)&&req.headers['sec-fetch-site']!=='cross-site';
  if(req.method==='GET'&&url.pathname==='/api/status')return json(200,{app:'seo-ai-writing',live:env.ENABLE_LIVE_AI==='true'&&!!env.OPENAI_API_KEY&&!!env.OPENAI_MODEL});
  if(req.method==='GET'&&Object.hasOwn(publicFiles,url.pathname)){
   const filename=publicFiles[url.pathname];const mime=filename.endsWith('.css')?'text/css':filename.endsWith('.js')?'application/javascript':'text/html';
   try{const body=await fs.readFile(path.join(root,filename));res.writeHead(200,{'Content-Type':mime+'; charset=utf-8'});res.end(body);}catch{json(500,{error:'파일을 읽지 못했습니다.'});}return;
  }
  for(const [id,job]of jobs)if(job.state!=='running'&&Date.now()-job.finished>timing.retentionMs)jobs.delete(id);
  if(req.method==='GET'&&url.pathname.startsWith('/api/requests/')){
   if(!local||!same)return json(403,{error:'로컬 동일 출처 요청만 허용합니다.'});
   const id=url.pathname.slice('/api/requests/'.length),job=uuid.test(id)?jobs.get(id):null;
   return job?json(200,snapshot(job)):json(404,{state:'unknown',error:'요청 상태를 찾지 못했습니다. 서버 재시작 또는 보관 기간 만료일 수 있습니다. 새 생성은 추가 비용이 생길 수 있습니다.'});
  }
  if(url.pathname!=='/api/write')return json(404,{error:'찾을 수 없습니다.'});
  if(req.method!=='POST')return json(405,{error:'POST 요청만 지원합니다.'});
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return json(415,{error:'JSON 요청이 필요합니다.'});
  if(!local||!same||req.headers.origin!==`http://${req.headers.host}`)return json(403,{error:'로컬 동일 출처 요청만 허용합니다.'});
  const id=req.headers['x-request-id']||randomUUID();if(!uuid.test(id))return json(400,{error:'요청 ID 형식이 잘못되었습니다.'});
  let raw='';try{for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>8192)return json(413,{error:'입력이 너무 큽니다.'});}}catch{return json(400,{error:'요청을 읽지 못했습니다.'});}
  let values;try{values=core.input(JSON.parse(raw));}catch(e){return json(400,{error:e.message});}
  if(env.ENABLE_LIVE_AI!=='true')return json(503,{error:'실제 AI 요청은 비활성화되어 있습니다. 데모 모드를 사용하세요.'});
  if(jobs.has(id)){
   const job=jobs.get(id);if(JSON.stringify(job.values)!==JSON.stringify(values))return json(409,{error:'같은 요청 ID에 다른 입력을 사용할 수 없습니다.'});
   log(job,'duplicate_blocked');return json(job.state==='running'?202:job.httpStatus,snapshot(job));
  }
  if(active)return json(429,{error:'진행 중인 요청이 있습니다. 상태를 확인한 뒤 기다려 주세요.'});
  if(jobs.size>=100)return json(429,{error:'요청 보관 한도에 도달했습니다. 잠시 후 시도하세요.'});
  const job={id,values,state:'running',stage:'accepted',started:Date.now()};jobs.set(id,job);active=id;log(job,'accepted');
  res.on('close',()=>{if(!res.writableEnded&&job.state==='running')log(job,'browser_disconnected');});
  try{
   const draft=await deadline(signal=>generate(values,{env,signal,timeoutMs:timing.providerMs,onEvent:(event,status)=>{if(job.state==='running'){job.stage=event;log(job,event,status);}}}),{ms:timing.operationMs,stage:'server'});
   job.result={mode:'live',draft:core.validate(draft,values)};job.state='completed';job.httpStatus=200;job.stage='completed';
  }catch(e){
   const uncertain=e instanceof DeadlineError||e.name==='TimeoutError'||e.name==='TypeError'||['ECONNRESET','ETIMEDOUT'].includes(e.code);
   job.state=uncertain?'uncertain':'failed';job.httpStatus=e instanceof DeadlineError?504:502;
   job.result={error:e instanceof DeadlineError?`${e.stage==='provider'?'OpenAI 호출 단계':'로컬 서버 처리 단계'}에서 시간 제한을 초과했습니다. 원격 처리가 계속되어 비용이 발생했을 수 있습니다. 상태 확인은 무료이며 자동 재요청은 없습니다.`:e instanceof core.ValidationError||e instanceof openai.AIResponseError?e.message:e.name==='TypeError'?'OpenAI 통신 중 네트워크 오류가 발생했습니다. 원격 처리 여부를 확정할 수 없습니다. 자동 재요청은 없습니다.':'AI 요청 또는 응답 처리에 실패했습니다. 자동 재요청은 하지 않습니다.',
    ...(e instanceof core.ValidationError?{code:e.code,issues:e.issues,...(e.draft?{draft:e.draft}:{})}:{}),...(uncertain?{code:'OUTCOME_UNCERTAIN'}:{})};
   job.stage=e instanceof DeadlineError?e.stage:job.stage;
  }finally{job.finished=Date.now();active=null;log(job,job.state);setTimeout(()=>jobs.delete(id),timing.retentionMs).unref();}
  json(job.httpStatus,snapshot(job));
 });
 // requestTimeout bounds upload, not model computation; socket timeout bounds a full response.
 server.requestTimeout=timing.uploadMs;server.headersTimeout=Math.min(15000,timing.uploadMs);
 server.setTimeout(timing.socketMs,socket=>socket.destroy());server.keepAliveTimeout=5000;
 return server;
}
if(require.main===module){const port=Number(process.env.PORT||3000);createServer().listen(port,'127.0.0.1',()=>console.log(`SEO 개발 서버: http://127.0.0.1:${port} (기본: 데모 모드)`));}
module.exports={createServer};
