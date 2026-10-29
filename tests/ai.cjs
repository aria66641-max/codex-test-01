const {test}=require('node:test');const assert=require('node:assert/strict');const core=require('../ai-core');const {generate}=require('../server/openai.cjs');const {createServer}=require('../server/index.cjs');
const options={keyword:'보조금24 신청방법',platform:'tistory',length:'1800-2000',tone:'친근한 안내'};
test('데모: 모든 글 길이·플랫폼·톤·키워드 경계 및 안전한 복사',()=>{
 for(const length of ['1800-2000','1800-1900','1900-2000'])for(const platform of ['tistory','naver','wordpress'])for(const tone of ['친근한 안내','차분한 설명','간결한 실무'])for(const keyword of ['가','가'.repeat(60),'자료정리','<img src=x onerror=x>']){
  const o={...options,length,platform,tone,keyword};const d=core.demo(o);core.validate(d,o);assert.equal(d.tags.length,8);assert.equal(new Set(d.tags).size,8);assert.match(core.plain(d),/확인 필요/);assert.doesNotMatch(core.html(d),/<img/);
 }
 assert.throws(()=>core.demo({...options,keyword:' '}));assert.throws(()=>core.demo({...options,length:'9999'}));
});
test('Responses API 요청/출력 계약: 네트워크 없이 모의 fetch만 사용',async()=>{
 let calls=0;const env={ENABLE_LIVE_AI:'true',OPENAI_API_KEY:'test-placeholder',OPENAI_MODEL:'test-model'};
 const response=d=>({ok:true,json:async()=>d});
 const d=core.demo(options);
 const result=await generate(options,{env,fetchImpl:async(url,req)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(req.body);assert.equal(body.store,false);assert.equal(body.text.format.type,'json_schema');assert.equal(body.text.format.strict,true);assert.equal(body.model,'test-model');assert.equal(JSON.parse(body.input).tone,options.tone);return response({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(d)}]}]});}});
 assert.deepEqual(result,d);assert.equal(calls,1);
 await assert.rejects(generate(options,{env:{},fetchImpl:()=>{throw Error('must not run');}}),/비활성화/);
 for(const payload of [{status:'incomplete'},{status:'completed',output:[{content:[{type:'refusal'}]}]},{status:'completed',output:[{content:[{type:'output_text',text:'bad'}]}]},{status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({...d,sections:[{heading:'짧음',body:'짧음'}]})}]}]}])await assert.rejects(generate(options,{env,fetchImpl:async()=>response(payload)}));
 await assert.rejects(generate(options,{env,fetchImpl:async()=>({ok:false})}),/실패/);
 await assert.rejects(generate(options,{env:{ENABLE_LIVE_AI:'true'}}),/키와 모델/);
});
test('로컬 HTTP: 기본 API 차단, 비공개 파일 차단, 입력/출처 검증, 모의 성공',async()=>{
 let calls=0;const server=createServer({env:{},generate:async()=>{calls++;return core.demo(options);}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.equal((await fetch(url+'/')).status,200);
  for(const path of ['/.env','/server/openai.cjs','/README.md','/.git/config'])assert.equal((await fetch(url+path)).status,404);
  assert.equal((await fetch(url+'/api/write',{method:'POST',headers:{'Content-Type':'application/json',Origin:url},body:JSON.stringify(options)})).status,503);
  assert.equal(calls,0);
  assert.equal((await fetch(url+'/api/write',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://bad.test'},body:'{}'})).status,403);
  assert.equal((await fetch(url+'/api/write',{method:'POST',headers:{'Content-Type':'application/json',Origin:url},body:'{}'})).status,400);
 }finally{await new Promise(r=>server.close(r));}
 const live=createServer({env:{ENABLE_LIVE_AI:'true'},generate:async v=>core.demo(v)});await new Promise(r=>live.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${live.address().port}`;
 try{const r=await fetch(base+'/api/write',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(options)});assert.equal(r.status,200);assert.equal((await r.json()).mode,'live');}finally{await new Promise(r=>live.close(r));}
});
