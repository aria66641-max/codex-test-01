const {test}=require('node:test');const assert=require('node:assert/strict');const core=require('../ai-core');const api=require('../server/openai.cjs');
const values={keyword:'보조금24 신청방법',platform:'tistory',length:'1800-2000',tone:'친근한 안내'};
test('발행 텍스트·HTML은 선택 제목과 원고만 출력, 검증 메모는 제외',()=>{
 const d=core.demo(values);d.verificationNotes=['작성 가이드: 정책 금액 원문 확인 · 복사 금지 메모'];
 for(const output of [core.plain(d),core.bodyPlain(d),core.html(d)]){assert.doesNotMatch(output,/H2\s*·|행동:|판단 기준:|준비사항:|예외:|작성 가이드:|복사|## |FAQ|Q\.|A\./);assert.doesNotMatch(output,/정책 금액 원문 확인/);assert.match(output,/자주 묻는 질문/);}
 assert.equal((core.html(d).match(/<h2>/g)||[]).length,d.sections.length+1);assert.equal((core.html(d).match(/<h3>/g)||[]).length,4);
 assert.ok(core.plain(d,d.titles[1]).startsWith(d.titles[1]));assert.ok(!core.plain(d,d.titles[1]).includes(d.titles[0]));assert.equal(d.tags.length,8);core.validate(d,values);
});
test('메타 표현이 남은 원고는 삭제하지 않고 검증 실패·편집용 원본 보존, 수동 재작성 후 재검증',async()=>{
 const d=core.demo(values),base=d.sections[0].body;
 for(const marker of ['H2 · ','행동: ','판단 기준: ','준비사항: ','예외: ','작성 가이드: ','검증 필요: ','확인 필요: ','복사']){
  const bad=structuredClone(d);bad.sections[0].body=marker+base;
  assert.throws(()=>core.validate(bad,values),/작성용 표시/);assert.throws(()=>core.plain(bad),/작성용 표시/);assert.throws(()=>core.html(bad),/작성용 표시/);
  assert.equal(bad.sections[0].body,marker+base);
 }
 const bad=structuredClone(d);bad.sections[0].body='행동: '+base;let calls=0;
 await assert.rejects(api.generate(values,{env:{ENABLE_LIVE_AI:'true',OPENAI_API_KEY:'test-placeholder',OPENAI_MODEL:'test-model'},fetchImpl:async()=>{calls++;return {ok:true,status:200,json:async()=>({status:'completed',output_text:JSON.stringify(bad)})};}}),e=>e instanceof core.ValidationError&&e.draft.sections[0].body.startsWith('행동: '));assert.equal(calls,1);
 bad.sections[0].body=base;core.validate(bad,values);
});
test('구조화 출력에 작성자 메모를 분리하고 자연스러운 재작성 지시 포함',()=>{const prompt=api.buildInstructions(values);assert.ok(core.schema.required.includes('verificationNotes'));assert.match(prompt,/라벨만 지워 조각 문장을 남기지/);assert.match(prompt,/완결된 연결 문장/);assert.match(prompt,/verificationNotes/);});

test('gpt-5-mini만 low 추론을 지정하고 다른 모델은 기존 요청을 유지',async()=>{
 for(const model of ['gpt-5-mini','gpt-5-mini-2025-08-07','test-model']){
 let calls=0;await api.generate(values,{env:{ENABLE_LIVE_AI:'true',OPENAI_API_KEY:'test-placeholder',OPENAI_MODEL:model},fetchImpl:async(url,request)=>{calls++;const body=JSON.parse(request.body);assert.equal(body.max_output_tokens,12000);if(model.startsWith('gpt-5-mini'))assert.deepEqual(body.reasoning,{effort:'low'});else assert.equal(body.reasoning,undefined);return {ok:true,status:200,json:async()=>({status:'completed',output_text:JSON.stringify(core.demo(values))})};}});assert.equal(calls,1);
 }
});
