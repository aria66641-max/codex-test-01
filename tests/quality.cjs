const {test}=require('node:test');const assert=require('node:assert/strict');const {plan}=require('../server/content-plan.cjs');const adapter=require('../server/openai.cjs');const core=require('../ai-core');
const base={keyword:'보조금24 신청방법',platform:'tistory',length:'1800-2000',tone:'친근한 안내'};
test('검색 의도별 독자 질문·우선 답변 계획과 주제별 구체화',()=>{
 const examples=[['보조금24 신청방법','신청 방법'],['자동차 관리','실행 방법'],['타이어 교체 비용','비용 확인'],['생활정보 정리','실행 방법'],['주민등록등본 발급방법','발급 방법'],['장학금 자격조건','자격 조건'],['자동차 비교','비교 선택'],['금리 뜻','개념 이해'],['프린터 오류해결','오류 해결']];
 const questions=new Set();for(const [keyword,intent] of examples){const p=plan(keyword);assert.equal(p.intent,intent);assert.equal(p.questions.length,5);assert.equal(new Set(p.questions).size,5);assert.equal(p.verification.status,'not_checked');assert.deepEqual(p.verification.officialSources,[]);questions.add(JSON.stringify(p.questions));const prompt=adapter.buildInstructions({...base,keyword});assert.ok(prompt.includes(p.questions[0]));assert.match(prompt,/첫 H2의 첫 두 문장/);assert.match(prompt,/공백 포함 1800~2000자/);assert.match(prompt,/서론 130~160자/);assert.match(prompt,/검증 필요/);assert.match(prompt,/강제 키워드 밀도를 설정하지 않는다/);assert.match(prompt,/개인 경험|경험담/);}
 assert.ok(questions.size>=8);assert.match(plan('자동차 관리').questions[3],/중단/);
});
test('반복·유사 문장·가독성·추상적 H2·최신 주장 탐지는 경고만 제공',()=>{
 const d=core.demo(base);d.sections[0].heading='주의사항';const one='신청하기 전에는 지원사업의 안내 자료에서 본인에게 적용되는 조건과 필요한 서류를 차례로 구분해 살펴보세요';
 d.sections[0].body=one+'. '+one.replace('신청하기 전에는','신청할 때는')+'. '+one+'! '+'지원금은 100만원입니다. '+ '가'.repeat(110)+'.';
 const s=core.contentSignals(d);assert.ok(s.duplicates>=1);assert.ok(s.similarPairs>=1);assert.ok(s.longSentences>=1);assert.ok(s.genericHeadings>=1);assert.ok(s.sensitiveClaims>=1);assert.match(core.quality(d,base).join('\n'),/공식 출처 미조회/);
});
test('모의 Responses 요청에 출처 부재와 구체적 답변 지침 포함, 웹조회·자동 재시도 없음',async()=>{
 let calls=0;const env={ENABLE_LIVE_AI:'true',OPENAI_API_KEY:'test-placeholder',OPENAI_MODEL:'test-model'};
 for(const keyword of ['보조금24 신청방법','생활정보 정리','자동차 관리']){const values={...base,keyword};const d=core.demo(values);const actual=await adapter.generate(values,{env,fetchImpl:async(url,request)=>{calls++;const b=JSON.parse(request.body);assert.equal(b.tools,undefined);assert.equal(b.store,false);assert.match(b.instructions,/공식 출처 실제 조회: 없음/);assert.match(b.instructions,/모델의 사전 지식/);assert.match(b.instructions,/클릭을 유도하는 과장/);assert.match(b.instructions,/행동 → 판단 기준/);return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(d)}]}]})};}});core.validate(actual,values);}
 assert.equal(calls,3);
});
