const {test}=require('node:test');const assert=require('node:assert/strict');const core=require('../ai-core');const {generate}=require('../server/openai.cjs');const {createServer}=require('../server/index.cjs');
const options={keyword:'보조금24 신청방법',platform:'tistory',length:'1800-2000',tone:'친근한 안내'};
test('데모: 모든 글 길이·플랫폼·톤·키워드 경계 및 안전한 복사',()=>{
 for(const length of ['1800-2000','1800-1900','1900-2000'])for(const platform of ['tistory','naver','wordpress'])for(const tone of ['친근한 안내','차분한 설명','간결한 실무'])for(const keyword of ['가','가'.repeat(60),'자료정리','<img src=x onerror=x>']){
  const o={...options,length,platform,tone,keyword};const d=core.demo(o);core.validate(d,o);assert.equal(d.tags.length,8);assert.equal(new Set(d.tags).size,8);assert.match(core.plain(d),/확인되지|확인하지/);assert.doesNotMatch(core.html(d),/<img/);
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
test('허용 가능한 공백·CRLF·분해형 한글 정규화, 길이 경계와 항목별 진단',()=>{
 const original=core.demo(options), padded=structuredClone(original);
 padded.intro=' \r\n'+padded.intro.normalize('NFD')+'\r\n ';
 padded.sections=padded.sections.map(s=>({heading:' '+s.heading+' ',body:'\r\n'+s.body.normalize('NFD')+'\r\n'}));
 assert.deepEqual(core.validate(padded,options),original);
 const draft=()=>structuredClone(original);
 for(const n of [130,160]){const d=draft();d.intro='가'.repeat(n);assert.equal(core.len(core.validate(d,options).intro),n);}
 for(const n of [129,161]){const d=draft();d.intro='가'.repeat(n);assert.throws(()=>core.validate(d,options),e=>e instanceof core.ValidationError&&e.message.includes(`현재 ${n}자`));}
 for(const n of [1799,1800,2000,2001]){
  const d=draft();d.sections=[{heading:'하나',body:'가'.repeat(n-6)},{heading:'둘',body:'나'},{heading:'셋',body:'다'}];
  if(n>=1800&&n<=2000)assert.equal(core.len(core.bodyText(core.validate(d,options))),n);
  else assert.throws(()=>core.validate(d,options),new RegExp(`현재 ${n}자`));
 }
 const bad=draft();bad.titles=['중복','중복'];bad.intro='짧음';bad.sections[0].body=' ';bad.faq[1].answer=null;bad.conclusion='';bad.tags=['태그'];
 assert.throws(()=>core.validate(bad,options),e=>['제목 후보: 현재 2개','중복된 제목','서론: 현재 2자','H2 1 본문','FAQ 2 답변','결론','태그: 현재 1개'].every(s=>e.message.includes(s)));
 const tags=draft();tags.tags[1]=' '+tags.tags[0]+' ';assert.throws(()=>core.validate(tags,options),/중복을 제거/);
 for(const value of [null,[],{}, {sections:null}])assert.throws(()=>core.validate(value,options),core.ValidationError);
});
test('모의 응답 분할 텍스트·집계 텍스트, 검증 실패 시 단일 호출과 민감 정보 미노출',async()=>{
 const env={ENABLE_LIVE_AI:'true',OPENAI_API_KEY:'private-key-canary',OPENAI_MODEL:'test-model'};
 const d=core.demo(options), text=JSON.stringify(d);let calls=0;
 const invoke=payload=>generate(options,{env,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>payload};}});
 assert.deepEqual(await invoke({status:'completed',output:[{type:'reasoning'},{content:[{type:'output_text',text:text.slice(0,100)},{type:'output_text',text:text.slice(100)}]}],output_text:'do not concatenate'}),d);
 assert.deepEqual(await invoke({status:'completed',output_text:text}),d);
 const invalid={...d,intro:'민감한 개인정보가 들어 있는 짧은 문장'};const before=calls;
 await assert.rejects(invoke({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(invalid)}]}]}),e=>e.message.includes('서론: 현재')&&!e.message.includes(invalid.intro)&&!e.message.includes(env.OPENAI_API_KEY));
 assert.equal(calls,before+1);
 await assert.rejects(invoke({status:'completed',output:{}}),/JSON 텍스트가 없습니다/);
});
test('서버는 검증 이슈만 반환하고 임의 예외의 개인정보를 숨김',async()=>{
 let fail='validation';let calls=0;
 const server=createServer({env:{ENABLE_LIVE_AI:'true'},generate:async()=>{calls++;if(fail==='unknown')throw Error('private-key-and-personal-info');const d=core.demo(options);d.intro='짧음';return d;}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{for(const mode of ['validation','unknown']){fail=mode;const r=await fetch(base+'/api/write',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(options)});assert.equal(r.status,502);const result=await r.json();if(mode==='validation'){assert.equal(result.code,'INVALID_DRAFT');assert.ok(result.issues.some(i=>i.path==='intro'));assert.match(result.error,/서론: 현재 2자/);}else assert.doesNotMatch(JSON.stringify(result),/private-key-and-personal-info/);}assert.equal(calls,2);}finally{await new Promise(r=>server.close(r));}
});
test('분량 지시·출력 토큰 여유, 124자/1148자 실패 및 정상 분량, 호출 1회',async()=>{
 const adapter=require('../server/openai.cjs');const env={ENABLE_LIVE_AI:'true',OPENAI_API_KEY:'test-placeholder',OPENAI_MODEL:'test-model'};
 for(const length of ['1800-2000','1800-1900','1900-2000']){
  const prompt=adapter.buildInstructions({...options,length});const [min,max]=length.split('-');
  assert.ok(prompt.includes(`공백 포함 ${min}~${max}자`));assert.match(prompt,/서론 130~160자/);assert.match(prompt,/NFC/);assert.match(prompt,/LF 두 개/);assert.match(prompt,/중복 금지/);assert.match(prompt,/확인 필요/);
 }
 let calls=0;const run=async(d,status='completed')=>generate(options,{env,fetchImpl:async(url,request)=>{
  calls++;const b=JSON.parse(request.body);assert.equal(b.max_output_tokens,12000);assert.equal(b.text.format.strict,true);assert.match(b.instructions,/목표 1900자/);assert.match(b.instructions,/379, 379, 378, 378, 378/);
  return {ok:true,json:async()=>({status,incomplete_details:status==='incomplete'?{reason:'max_output_tokens'}:undefined,output:[{content:[{type:'output_text',text:JSON.stringify(d)}]}]})};
 }});
 const valid=core.demo(options);assert.deepEqual(await run(valid),valid);assert.equal(calls,1);
 const short=structuredClone(valid);short.intro='가'.repeat(124);short.sections=[{heading:'준비',body:'가'.repeat(1142)},{heading:'절차',body:'나'},{heading:'주의',body:'다'}];
 await assert.rejects(run(short),e=>e.message.includes('서론: 현재 124자')&&e.message.includes('본문: 현재 1148자'));assert.equal(calls,2);
 await assert.rejects(run(valid,'incomplete'),/토큰 한도에 도달/);assert.equal(calls,3);
});
