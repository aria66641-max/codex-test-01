const assert=require('node:assert/strict');
const path=require('node:path');
const root=process.env.SEO_ROOT||path.resolve(__dirname,'..');
const {VERSION,generate,length,exportHTML}=require(path.join(root,'app.js'));
assert.equal(VERSION,'2.1');
for(const platform of ['tistory','naver','wordpress']){
 const d=generate('보조금24 신청방법',platform);
 assert.equal(d.intentId,'apply'); assert.equal(length(d.intro),148);
 assert.ok(length(d.intro)>=130&&length(d.intro)<=160);
 assert.equal(d.faq.length,4); assert.match(d.faq[0][1],/정부24/);
 assert.match(d.faq[1][1],/선택한 사업별/); assert.match(d.faq[2][1],/필수 서류를 확정할 수 없습니다/);
 assert.match(d.faq[3][1],/지급일을 확정하지 않습니다/);
 assert.ok(d.faq.every(([q,a])=>!a.includes('작성하세요')));
 assert.deepEqual(d.tags,['보조금24','정부24','정부혜택','맞춤혜택조회','지원대상확인','신청기간','구비서류','접수기관']);
 assert.equal(new Set(d.tags).size,8);assert.equal(d.tags.filter(t=>t.includes(d.k)).length,0);
 assert.match(exportHTML(d),/조회와 개별 지원사업 신청 구분/);
 assert.doesNotMatch(exportHTML(d),/공식 안내 URL과 확인 날짜를 추가하세요/);
}
assert.equal(generate('보조금24 오류해결','tistory').intentId,'error');
assert.match(generate('보조금24 비용','tistory').faq[0][0],/총비용/);
console.log('PASS v2.1: 실제 모듈 버전, 보조금24 신청방법 3개 플랫폼, 서론 148자, FAQ의 구체성·미확인 표시, 태그 8개, HTML, 다른 의도 유지');
