'use strict';
const http=require('node:http');
const fs=require('node:fs/promises');
const path=require('node:path');
const core=require('../ai-core');
const openai=require('./openai.cjs');
const root=path.resolve(__dirname,'..');
const publicFiles={'/':'index.html','/index.html':'index.html','/styles.css':'styles.css','/app.js':'app.js','/ai-core.js':'ai-core.js','/ai-ui.js':'ai-ui.js'};
function createServer({env=process.env,generate=openai.generate}={}){
 let busy=false;
 return http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
  const json=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&publicFiles[url.pathname]){
   const filename=publicFiles[url.pathname];const mime=filename.endsWith('.css')?'text/css':filename.endsWith('.js')?'application/javascript':'text/html';
   try{res.writeHead(200,{'Content-Type':mime+'; charset=utf-8'});res.end(await fs.readFile(path.join(root,filename)));}catch{res.end();}return;
  }
  if(url.pathname!=='/api/write')return json(404,{error:'찾을 수 없습니다.'});
  if(req.method!=='POST')return json(405,{error:'POST 요청만 지원합니다.'});
  // Loopback-only server plus strict same-origin JSON requests. No CORS allowance.
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))return json(415,{error:'JSON 요청이 필요합니다.'});
  if(req.headers.origin!==`http://${req.headers.host}`||!/^((localhost|127\.0\.0\.1)(:\d+)?)$/.test(req.headers.host||''))return json(403,{error:'로컬 동일 출처 요청만 허용합니다.'});
  let raw='';try{for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>8192)return json(413,{error:'입력이 너무 큽니다.'});}}catch{return json(400,{error:'요청을 읽지 못했습니다.'});}
  let values;try{values=core.input(JSON.parse(raw));}catch(e){return json(400,{error:e.message});}
  if(env.ENABLE_LIVE_AI!=='true')return json(503,{error:'실제 AI 요청은 비활성화되어 있습니다. 데모 모드를 사용하세요.'});
  if(busy)return json(429,{error:'진행 중인 요청이 있습니다. 완료 후 시도하세요.'});
  busy=true;
  try{const draft=await generate(values,{env});json(200,{mode:'live',draft:core.validate(draft,values)});}catch(e){json(502,{error:e instanceof core.ValidationError||e instanceof openai.AIResponseError?e.message:e.name==='TimeoutError'?'AI 요청 시간이 초과되었습니다.': 'AI 요청 또는 응답 처리에 실패했습니다. 서버 설정과 응답 상태를 확인하세요. 자동 재요청은 하지 않습니다.', ...(e instanceof core.ValidationError?{code:e.code,issues:e.issues}:{})});}finally{busy=false;}
 });
}
if(require.main===module){const port=Number(process.env.PORT||3000);createServer().listen(port,'127.0.0.1',()=>console.log(`SEO 개발 서버: http://127.0.0.1:${port} (기본: 데모 모드)`));}
module.exports={createServer};
