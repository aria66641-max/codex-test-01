const {test}=require('node:test');const assert=require('node:assert/strict');const {randomUUID}=require('node:crypto');const core=require('../ai-core');const api=require('../server/openai.cjs');const {createServer}=require('../server/index.cjs');const {LIMITS,DeadlineError}=require('../server/timing.cjs');
const values={keyword:'보조금24 신청방법',platform:'tistory',length:'1800-2000',tone:'친근한 안내'},env={ENABLE_LIVE_AI:'true',OPENAI_API_KEY:'private-key-canary',OPENAI_MODEL:'test-model'};
const good=()=>({ok:true,status:200,json:async()=>({status:'completed',output_text:JSON.stringify(core.demo(values))})});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
test('계층별 제한 시간 순서, 정상·지연 응답, 헤더/본문 대기 시간 초과, 네트워크 실패',async()=>{
 assert.ok(LIMITS.providerMs<LIMITS.operationMs&&LIMITS.operationMs<LIMITS.browserMs&&LIMITS.browserMs<LIMITS.socketMs);
 for(const ms of [0,15]){let calls=0;const events=[];await api.generate(values,{env,timeoutMs:200,fetchImpl:async()=>{calls++;await delay(ms);return good();},onEvent:e=>events.push(e)});assert.equal(calls,1);assert.deepEqual(events,['provider_start','provider_headers','provider_body','validation','validated']);}
 for(const phase of ['headers','body']){let calls=0;const events=[];await assert.rejects(api.generate(values,{env,timeoutMs:30,fetchImpl:async()=>{calls++;return phase==='headers'?new Promise(()=>{}):{ok:true,status:200,json:()=>new Promise(()=>{})};},onEvent:e=>events.push(e)}),e=>e instanceof DeadlineError&&e.stage==='provider');assert.equal(calls,1);assert.equal(events.includes('provider_headers'),phase==='body');}
 await assert.rejects(api.generate(values,{env,timeoutMs:100,fetchImpl:async()=>{throw new TypeError('private-response-canary');}}),TypeError);
});
async function fixture(generate,limits={}){const logs=[];const server=createServer({env,generate,limits,logger:e=>logs.push(e)});await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}`;return {server,url,logs,post:(id,body=values,signal)=>fetch(url+'/api/write',{method:'POST',headers:{Origin:url,'Content-Type':'application/json','X-Request-ID':id},body:JSON.stringify(body),signal})};}
test('동일 ID 중복 차단·완료 결과 복구·상태 조회는 API 호출 없음',async()=>{
 let release,calls=0;const wait=new Promise(r=>release=r);const f=await fixture(async()=>{calls++;await wait;return core.demo(values);});const id=randomUUID();
 try{const original=f.post(id);while(!calls)await delay(3);assert.equal((await f.post(id)).status,202);assert.equal((await (await fetch(f.url+'/api/requests/'+id)).json()).state,'running');release();assert.equal((await original).status,200);assert.equal((await f.post(id)).status,200);assert.equal((await (await fetch(f.url+'/api/requests/'+id)).json()).state,'completed');assert.equal(calls,1);assert.equal(f.server.requestTimeout,30000);assert.equal(f.server.timeout,230000);
 const logs=JSON.stringify(f.logs);for(const s of [values.keyword,env.OPENAI_API_KEY,'private-response-canary'])assert.ok(!logs.includes(s));assert.ok(f.logs.some(e=>e.event==='duplicate_blocked'));}
 finally{release();await new Promise(r=>f.server.close(r));}
});
test('서버 deadline·네트워크 오류 상태 불확실, 동일 ID로 재호출 안 함',async()=>{
 for(const kind of ['timeout','network']){let calls=0;const f=await fixture(async()=>{calls++;if(kind==='network')throw new TypeError('private-response-canary');return new Promise(()=>{});},{operationMs:35});const id=randomUUID();
 try{const r=await f.post(id);assert.equal(r.status,kind==='timeout'?504:502);const data=await r.json();assert.equal(data.state,'uncertain');assert.doesNotMatch(JSON.stringify(data),/private-response-canary|private-key-canary/);await f.post(id);const status=await (await fetch(f.url+'/api/requests/'+id)).json();assert.equal(status.state,'uncertain');assert.equal(calls,1);assert.equal((await fetch(f.url+'/api/requests/'+randomUUID())).status,404);}
 finally{await new Promise(r=>f.server.close(r));}}
});
test('브라우저 연결 종료 후 완료된 원고를 상태 조회로 복구',async()=>{
 let entered,release,calls=0;const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);const f=await fixture(async()=>{calls++;entered();await gate;return core.demo(values);});const id=randomUUID(),controller=new AbortController();
 try{const first=f.post(id,values,controller.signal).catch(()=>null);await ready;controller.abort();await first;release();let data;for(let i=0;i<50;i++){data=await (await fetch(f.url+'/api/requests/'+id)).json();if(data.state==='completed')break;await delay(5);}assert.equal(data.state,'completed');core.validate(data.draft,values);assert.equal(calls,1);}
 finally{release();await new Promise(r=>f.server.close(r));}
});
test('서버 전체 deadline이 provider를 중단하고 로그는 메타데이터만 포함',async()=>{
 let aborted=false,calls=0;
 const f=await fixture((v,opts)=>api.generate(v,{...opts,fetchImpl:async(_url,request)=>{calls++;request.signal.addEventListener('abort',()=>{aborted=true;},{once:true});return new Promise(()=>{});}}),{operationMs:40,providerMs:200});const id=randomUUID();
 try{const r=await f.post(id);assert.equal(r.status,504);assert.equal(aborted,true);assert.equal(calls,1);assert.ok(f.logs.some(e=>e.event==='provider_start'));assert.ok(f.logs.some(e=>e.event==='uncertain'));const allowed=['event','requestId','stage','elapsedMs','httpStatus'];assert.ok(f.logs.every(e=>Object.keys(e).every(k=>allowed.includes(k))));assert.ok(!JSON.stringify(f.logs).includes(env.OPENAI_API_KEY));}
 finally{await new Promise(r=>f.server.close(r));}
});
