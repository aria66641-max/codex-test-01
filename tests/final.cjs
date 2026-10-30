const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {loadConfig}=require('../launcher.cjs');const core=require('../ai-core');const adapter=require('../server/openai.cjs');const {createServer}=require('../server/index.cjs');
const base={keyword:'보조금24 신청방법',platform:'tistory',length:'1800-2000',tone:'친근한 안내'};
test('실행기: 설정 없음·데모·실제 필수값·잘못된 설정·포트 검사',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'seo-launch-'));const filename=path.join(dir,'.env');try{
  const c=loadConfig({filename,env:{}});assert.equal(c.ENABLE_LIVE_AI,'false');assert.ok(fs.existsSync(filename));
  fs.writeFileSync(filename,'ENABLE_LIVE_AI=true\n');assert.throws(()=>loadConfig({filename,env:{}}),/키|OPENAI_API_KEY/);
  fs.writeFileSync(filename,'ENABLE_LIVE_AI=true\nOPENAI_API_KEY=test-placeholder\nOPENAI_MODEL=test-model\nPORT=3000');assert.equal(loadConfig({filename,env:{}}).OPENAI_MODEL,'test-model');
  fs.appendFileSync(filename,'\nPORT=9000');assert.throws(()=>loadConfig({filename,env:{}}),/3000/);
  fs.writeFileSync(filename,'not valid');assert.throws(()=>loadConfig({filename,env:{}}),/형식/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('3개 주제의 HTTP→Responses 모의→검증 통합, 분량 미달 초안 보존, 개인정보 차단',async()=>{
 let count=0,kind='valid';const env={ENABLE_LIVE_AI:'true',OPENAI_API_KEY:'test-placeholder',OPENAI_MODEL:'test-model'};
 const server=createServer({env,generate:(options)=>adapter.generate(options,{env,fetchImpl:async(_url,request)=>{
  count++;const body=JSON.parse(request.body);const v=JSON.parse(body.input);let d=core.demo(v);
  if(kind==='short'){d.intro='가'.repeat(124);d.sections=[{heading:'준비',body:'가'.repeat(1142)},{heading:'절차',body:'나'},{heading:'주의',body:'다'}];}
  if(kind==='bad')d={invalid:'private content'};
  return kind==='api-error'?{ok:false,status:429}:{ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(d)}]}]})};
 }})});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;
 const post=values=>fetch(url+'/api/write',{method:'POST',headers:{'Content-Type':'application/json',Origin:url},body:JSON.stringify(values)});
 try{
  for(const keyword of ['보조금24 신청방법','생활정보 정리','자동차 관리']){const v={...base,keyword};const r=await post(v);assert.equal(r.status,200);const {draft}=await r.json();core.validate(draft,v);assert.equal(core.quality(draft,v).length,7);}
  assert.doesNotMatch(adapter.buildInstructions({...base,keyword:'자동차 관리'}),/주제별 독자 질문 흐름: 독자의 목적과 조회/);
  kind='short';const r=await post(base);assert.equal(r.status,502);const j=await r.json();assert.ok(j.draft);assert.match(j.error,/124자/);assert.match(j.error,/1148자/);assert.throws(()=>core.validate(j.draft,base));assert.doesNotThrow(()=>core.validate(j.draft,base,{allowLengthMismatch:true}));
  kind='bad';const bad=await (await post(base)).json();assert.equal(bad.draft,undefined);assert.doesNotMatch(JSON.stringify(bad),/private content/);
  kind='api-error';assert.match((await (await post(base)).json()).error,/한도/);assert.equal(count,6);
  assert.equal((await fetch(url+'/toString')).status,404);assert.equal((await fetch(url+'/.env')).status,404);
  assert.equal((await (await fetch(url+'/api/status')).json()).app,'seo-ai-writing');
 }finally{await new Promise(r=>server.close(r));}
});
