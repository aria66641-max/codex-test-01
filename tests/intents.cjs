const assert=require('node:assert/strict');
const {generate,exportHTML,exportText,length}=require('../app.js');
const cases=[['청년 지원금 신청방법','apply','신청'],['주민등록등본 발급방법','issue','발급'],['임플란트 비용','cost','비용'],['장학금 자격조건','eligibility','자격'],['아이폰 갤럭시 비교','compare','차이'],['금리 뜻','meaning','뜻'],['프린터 오류해결','error','오류'],['자취방 정리 방법','how','준비'],['커피','info','핵심']];
const outlines=new Set(), introductions=new Set();
for(const [k,id,word] of cases){
 const d=generate(k,'tistory'); assert.equal(d.intentId,id);
 assert.equal(d.titles.length,3); assert.equal(new Set(d.titles).size,3);
 assert.ok(d.titles.some(t=>t.includes(word)));
 assert.ok(length(d.intro)>=130 && length(d.intro)<=160, `${id}: ${length(d.intro)}`);
 outlines.add(JSON.stringify(d.outline)); introductions.add(d.intro);
 assert.equal(d.tags.length,8); assert.equal(new Set(d.tags).size,8);
 assert.equal(d.tags.filter(t=>t.startsWith(k)).length,1);
 assert.equal(d.faq.length,4); assert.equal(new Set(d.faq.map(f=>f[0])).size,4);
 for(const [q,a] of d.faq){assert.ok(q.endsWith('？')||q.endsWith('?')); assert.match(a,/^확인 필요/); assert.doesNotMatch(a,/작성하세요|추가하세요|기록하세요/);}
 const html=exportHTML(d); assert.equal((html.match(/<h2>/g)||[]).length,6);
 assert.doesNotMatch(html,/작성 가이드:|공식 근거와 확인 날짜를 추가/);
 assert.match(exportText(d),/작성자 전용 가이드 · 발행 제외/);
}
assert.equal(outlines.size,cases.length);assert.equal(introductions.size,cases.length);
for(const base of ['신청방법','발급방법','비용','자격조건','비교','뜻','오류해결','설정','주제']){
 for(const n of [0,1,10,19,20,30,50]){
  const k='가'.repeat(n)+base; const d=generate(k,'naver');
  assert.ok(length(d.intro)>=130 && length(d.intro)<=160,`${k}: ${length(d.intro)}`);
 }
}
for(const k of ['신청절차','총비용','용어정의'])assert.equal(new Set(generate(k,'tistory').tags).size,8);
assert.equal(generate('등본 발급 비용','tistory').intentId,'issue');
assert.ok(generate('등본 발급 비용','tistory').alternatives.includes('비용'));
assert.equal(generate('온라인 신청 오류해결','tistory').intentId,'error');
assert.equal(generate('신청 방법','tistory').intentId,'apply');
assert.throws(()=>generate(' '.repeat(3),'tistory'));
assert.throws(()=>generate('가'.repeat(61),'tistory'));
assert.doesNotMatch(exportHTML(generate('<img onerror=x> 비용','tistory')),/<img/);
console.log('PASS: 9개 의도, 의도별 제목·목차·FAQ, 63개 서론 길이 경계 사례, 태그 중복·접미 반복 방지, 복합 의도 우선순위, 콘텐츠/가이드 내보내기 분리');
