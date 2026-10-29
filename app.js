'use strict';
(() => {
  const VERSION = '2.1';
  const $ = id => document.getElementById(id);
  const length = text => Array.from(text).length;
  const escapeHTML = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const platforms = {
    tistory: ['티스토리', 'HTML 모드에 붙여넣은 뒤 제목·문단·링크를 미리보기에서 확인하세요.'],
    naver: ['네이버', '일반 텍스트로 복사한 뒤 에디터에서 소제목과 문단을 직접 꾸며 주세요.'],
    wordpress: ['워드프레스', '블록 편집기에서 제목·소제목을 구분하고 SEO 플러그인 설정은 직접 확인하세요.']
  };
  // Ordered rules: specific tasks take precedence over generic words such as “방법”.
  const profiles = [
    {id:'error', re:/오류|에러|안\s*됨|안돼|안되|해결|실패/, name:'오류 해결', focus:'증상과 발생 환경', benefit:'원인 후보와 복구 순서',
      titles:['원인부터 확인할 점검 순서','증상별 해결 단서와 문의 준비','재시도 전 확인할 오류 체크리스트'],
      heads:['오류 메시지와 발생 환경','오류가 발생하는 단계 구분','원인 후보별 점검 순서','재시도와 데이터 보호 주의사항','해결되지 않을 때 문의할 정보'],
      questions:['이 오류는 왜 발생하나요?','다시 시도하면 해결되나요?','초기화하면 데이터가 삭제되나요?','해결되지 않으면 어디에 문의하나요?'],
      unknown:['오류 메시지, 버전, 발생 단계가 없어 원인을 확정할 수 없습니다.','서비스 상태와 오류 원인이 확인되지 않아 재시도의 효과를 단정할 수 없습니다.','제품과 초기화 방식에 따라 달라 삭제 범위를 확인하지 못했습니다.','제품명과 운영 주체가 확인되지 않아 문의처를 특정할 수 없습니다.'],
      tags:['오류메시지','문제해결','원인점검','실행환경','복구절차','데이터보호','고객지원']},
    {id:'apply', re:/신청|접수/, name:'신청방법', focus:'신청 대상과 접수 경로', benefit:'준비 서류와 접수 이후 확인할 사항',
      titles:['대상·서류·접수 순서 정리','온라인 신청 전 확인할 사항','접수부터 결과 확인까지 핵심 질문'],
      heads:['누가 신청할 수 있나요?','신청 기간과 접수 가능한 경로','필요 서류와 본인 확인 준비','신청서 제출 및 접수 확인','결과 조회와 보완·취소 절차'],
      questions:['누가 신청할 수 있나요?','온라인으로 신청할 수 있나요?','신청할 때 어떤 서류가 필요한가요?','신청 결과는 언제 알 수 있나요?'],
      unknown:['대상 기준을 확인할 공식 공고가 제공되지 않았습니다.','운영 기관과 신청 서비스가 특정되지 않아 온라인 접수 여부를 확인하지 못했습니다.','신청 유형과 신청자 조건에 따른 필수 서류가 확인되지 않았습니다.','처리 기간과 결과 통보 방식은 해당 접수 공고 확인이 필요합니다.'],
      tags:['신청절차','접수기간','신청대상','필요서류','온라인접수','접수확인','결과조회']},
    {id:'issue', re:/발급|재발급/, name:'발급방법', focus:'발급 대상과 이용 경로', benefit:'본인 확인 준비와 수령 방식',
      titles:['온라인·방문 발급 전 준비사항','본인 확인부터 수령까지 절차 정리','발급 수수료와 유효기간 확인 항목'],
      heads:['발급 대상과 증명서 종류','온라인·방문 발급 경로','본인 확인 및 대리 발급 조건','수수료와 발급·수령 방식','유효기간과 재발급 시 확인사항'],
      questions:['온라인으로 바로 발급받을 수 있나요?','대리인이 대신 발급받을 수 있나요?','발급 수수료는 얼마인가요?','발급한 서류의 유효기간은 얼마인가요?'],
      unknown:['문서 종류와 발급 기관을 확인하지 않아 즉시 발급 여부를 알 수 없습니다.','기관별 대리 발급 허용 범위와 위임 서류가 확인되지 않았습니다.','발급 방식별 수수료표를 확인하지 않았으므로 금액을 제시할 수 없습니다.','문서 자체의 유효기간과 제출처의 인정 기간이 확인되지 않았습니다.'],
      tags:['증명서발급','온라인발급','방문발급','본인확인','대리발급','발급수수료','서류유효기간']},
    {id:'cost', re:/비용|가격|요금|수수료|얼마/, name:'비용', focus:'가격에 포함되는 항목과 추가 지출', benefit:'조건별 총비용을 비교할 기준',
      titles:['기본 금액과 추가 비용 확인 기준','총비용 비교 전 확인할 항목','할인·환불 조건까지 살펴보기'],
      heads:['기본 가격과 포함 항목','별도로 발생하는 추가 비용','기간·수량·옵션별 총비용','할인 적용 조건과 제외 항목','취소·환불 시 부담할 금액'],
      questions:['총비용은 얼마인가요?','추가로 내야 할 비용이 있나요?','할인이나 감면을 받을 수 있나요?','취소하면 전액 환불되나요?'],
      unknown:['현재 가격표와 이용 조건이 없어 총금액을 계산할 수 없습니다.','기본 제공 범위와 선택 옵션의 요금이 확인되지 않았습니다.','할인 대상, 적용 기간 및 중복 적용 여부가 확인되지 않았습니다.','계약 조건과 취소 시점별 환불 규정이 확인되지 않았습니다.'],
      tags:['총비용','가격비교','추가비용','견적확인','할인조건','환불규정','예산계획']},
    {id:'eligibility', re:/자격|조건|대상|요건/, name:'자격조건', focus:'대상 기준과 제외 조건', benefit:'내 상황에 맞춰 자격을 확인할 항목',
      titles:['대상 기준과 제외 조건 정리','내가 해당하는지 확인할 핵심 항목','증빙 자료와 기준일 확인 안내'],
      heads:['자격을 판단하는 기준일','연령·거주·소득 등 대상 요건','제외 대상과 중복 이용 제한','조건을 증명할 서류','경계 사례와 자격 변경 시 확인사항'],
      questions:['내가 대상에 해당하나요?','소득이나 연령 기준이 있나요?','다른 제도를 이용 중이어도 가능한가요?','자격을 증명하려면 어떤 서류가 필요한가요?'],
      unknown:['공식 자격 기준과 개인 조건이 없어 대상 여부를 판단할 수 없습니다.','제도별 요건이 확인되지 않아 특정 기준이나 수치를 제시할 수 없습니다.','중복 수혜 및 이용 제한 규정이 확인되지 않았습니다.','인정되는 증빙 서류와 발급 기준일이 확인되지 않았습니다.'],
      tags:['자격요건','지원대상','제외대상','소득기준','연령조건','중복제한','증빙서류']},
    {id:'compare', re:/비교|추천|차이|\bvs\b/i, name:'비교·선택', focus:'선택지별 차이와 적용 조건', benefit:'우선순위에 따라 선택할 비교 기준',
      titles:['차이와 선택 기준 한눈에 보기','가격·기능·제약 비교할 핵심 항목','어떤 상황에 적합한지 판단하는 기준'],
      heads:['비교 대상과 동일한 비교 조건','가격과 포함 기능의 차이','이용 조건과 제약 사항','사용 목적별 선택 기준','선택 전 확인할 최신 정보'],
      questions:['두 선택지의 가장 큰 차이는 무엇인가요?','어느 쪽이 더 저렴한가요?','초보자에게 어떤 선택이 더 적합한가요?','나중에 다른 선택지로 바꿀 수 있나요?'],
      unknown:['비교 대상의 공식 사양이 확인되지 않아 차이를 확정할 수 없습니다.','동일한 기간과 옵션의 가격이 없어 더 저렴한 쪽을 판단할 수 없습니다.','사용 목적과 각 선택지의 학습 난도가 확인되지 않아 추천을 확정할 수 없습니다.','이전 절차, 계약 제한 및 전환 비용이 확인되지 않았습니다.'],
      tags:['선택기준','기능비교','가격비교','장단점','사용목적','이용조건','전환비용']},
    {id:'meaning', re:/뜻|의미|정의|개념|무엇/, name:'뜻·개념', focus:'용어의 의미와 사용 맥락', benefit:'비슷한 개념과 구분할 기준',
      titles:['뜻과 쓰임을 이해하는 핵심 질문','비슷한 용어와 구분하는 기준','개념부터 적용 범위까지 정리'],
      heads:['용어의 정의와 출처','어떤 맥락에서 쓰이나요?','혼동하기 쉬운 유사 개념','이해를 돕는 예시와 적용 범위','자주 생기는 오해와 주의점'],
      questions:['정확히 어떤 뜻인가요?','비슷한 용어와 무엇이 다른가요?','어떤 상황에서 사용하는 표현인가요?','모든 분야에서 같은 의미인가요?'],
      unknown:['사전이나 해당 분야의 공식 정의를 확인하지 않아 의미를 확정하지 않았습니다.','대조할 용어와 정의의 출처가 확인되지 않았습니다.','실제 용례와 분야별 사용 맥락이 확인되지 않았습니다.','분야별 정의를 대조하지 않아 같은 의미라고 단정할 수 없습니다.'],
      tags:['용어정의','기본개념','사용맥락','유사개념','용어차이','적용범위','개념이해']},
    {id:'how', re:/방법|하는\s*법|설정/, name:'실행·문제 해결', focus:'시작 전 준비와 실행 순서', benefit:'단계별 진행과 완료 여부를 확인할 기준',
      titles:['준비부터 실행까지 단계별 확인','처음 시도할 때 놓치기 쉬운 항목','완료 여부와 주의사항 정리'],
      heads:['시작 전 필요한 조건과 준비물','실행 순서와 단계별 확인사항','완료 여부를 판단하는 기준','진행이 막힐 때 점검할 사항','유지 관리와 다음 단계'],
      questions:['시작 전에 무엇을 준비해야 하나요?','어떤 순서로 진행하나요?','얼마나 시간이 걸리나요?','제대로 완료했는지 어떻게 확인하나요?'],
      unknown:['실행 대상의 공식 준비 조건이 확인되지 않았습니다.','대상별 절차가 확인되지 않아 구체적인 실행 순서를 확정하지 않았습니다.','작업 범위와 환경이 달라 소요 시간을 추정할 근거가 없습니다.','공식 완료 기준이나 결과 예시가 확인되지 않았습니다.'],
      tags:['실행절차','준비물','단계별방법','완료확인','주의사항','진행점검','유지관리']},
    {id:'info', re:/.*/, name:'정보 탐색', focus:'주제의 범위와 핵심 질문', benefit:'필요한 정보를 골라 살펴볼 기준',
      titles:['핵심 개념과 궁금한 점 정리','처음 알아볼 때 확인할 기준','기본 정보와 활용 범위 살펴보기'],
      heads:['주제의 범위와 기본 개념','독자가 먼저 알아둘 핵심 정보','상황별 활용과 확인 기준','정보의 출처와 적용 시점','더 알아볼 질문과 다음 단계'],
      questions:['어떤 내용을 다루는 주제인가요?','처음 알아볼 때 무엇이 중요한가요?','내 상황에도 적용할 수 있나요?','최신 정보는 어디서 확인하나요?'],
      unknown:['키워드만으로 구체적인 범위와 정의를 확정할 수 없습니다.','독자의 목적과 해당 분야의 기준이 확인되지 않았습니다.','적용 조건과 개인 상황을 확인하지 않아 판단할 수 없습니다.','정보를 제공하는 공식 기관이나 원문이 특정되지 않았습니다.'],
      tags:['주제이해','핵심정보','기본지식','활용범위','확인기준','정보출처','자주묻는질문']}
  ];
  function generate(keyword, platform) {
    const k = keyword.trim().replace(/\s+/g, ' ');
    if (!k || length(k) > 60) throw new Error('키워드를 1~60자로 입력해 주세요.');
    const matches = profiles.filter(p => p.id !== 'info' && p.re.test(k));
    const p = matches[0] || profiles[profiles.length-1];
    const direction = `${p.focus} 중심으로 ${p.benefit}을 정리하세요. 공식 출처와 확인 날짜를 기록하세요.`;
    // A short display subject keeps the intro readable even for a 60-character keyword.
    const subject = length(k) > 20 ? Array.from(k).slice(0,19).join('')+'…' : k;
    let intro = `${subject}, ${p.focus} 때문에 막막한가요? 이 글에서 살펴볼 핵심은 ${p.benefit}입니다. 필요한 정보를 순서대로 살펴보면 내 상황에서 무엇을 먼저 확인해야 할지 정리할 수 있습니다.`;
    for (const sentence of [' 구체적인 내용은 공식 안내와 대조가 필요합니다.', ' 적용 시점과 예외도 함께 살펴보세요.', ' 확인된 정보를 바탕으로 판단하세요.']) {
      if (length(intro) < 130 && length(intro + sentence) <= 160) intro += sentence;
    }
    const titles = p.titles.map(t => `${k}: ${t}`);
    const outline = p.heads.map(h => [h, `“${h}”에 답할 공식 근거와 확인 날짜를 추가하세요. 확인되지 않은 수치·절차·경험은 단정하지 마세요.`]);
    let faq = p.questions.map((q,i) => [`${k}: ${q}`, `확인 필요 — ${p.unknown[i]}`]);
    let tags = [k, ...p.tags.filter(t=>t!==k)];
    for (const t of ['관련정보','자료확인']) if(tags.length<8 && !tags.includes(t)) tags.push(t);
    // Topic-aware local reference: a keyword is not itself a particular benefit.
    // These are stored reference notes, not a live lookup or eligibility decision.
    if (/보조금\s*24/.test(k)) {
      tags = ['보조금24','정부24','정부혜택','맞춤혜택조회','지원대상확인','신청기간','구비서류','접수기관'];
      if (p.id === 'apply') {
        intro = '보조금24 신청방법을 찾고 있지만 혜택 조회와 실제 지원사업 신청이 헷갈리나요? 먼저 받을 수 있는 혜택을 찾고, 선택한 사업의 대상·기간·접수처를 구분해 살펴보세요. 이 글에서는 조회부터 신청 준비까지 필요한 확인 순서를 정리해 누락할 수 있는 항목을 짚어봅니다.';
        const heads = ['정부24에서 혜택을 찾는 방법','혜택 조회와 개별 지원사업 신청 구분','선택한 사업의 지원 대상과 신청 기간','신청 경로·접수기관·구비서류 확인','접수 확인과 결과 문의 준비'];
        outline.splice(0, outline.length, ...heads.map(h=>[h, `“${h}”에 해당하는 공식 안내 URL과 확인 날짜를 추가하세요. 사업별 조건을 보조금24 전체의 공통 조건처럼 단정하지 마세요.`]));
        faq = [
          ['보조금24 신청방법은 어디서부터 찾나요?', '정부24의 혜택 안내에서 나의 혜택·간편찾기·전체 혜택을 통해 지원사업을 살펴볼 수 있습니다. 개별 신청 경로는 선택한 사업의 안내를 확인해야 합니다. 출처: 정부24 https://www.gov.kr/ (자료 확인: 2026-10-29, 실행 시 실시간 조회 아님)'],
          ['보조금24에서 찾은 혜택은 모두 같은 방법으로 신청하나요?', '하나의 신청 절차로 안내하지 않습니다. 선택한 사업별 신청방법·접수기관·신청기간을 구분해 확인해야 합니다. 확인 필요 — 이 초안에는 특정 사업의 접수 경로나 온라인 신청 가능 여부가 확인되어 있지 않습니다.'],
          ['보조금24 신청에 필요한 서류는 무엇인가요?', '확인 필요 — 신청할 지원사업이 정해지지 않아 필수 서류를 확정할 수 없습니다. 선택한 사업의 구비서류 항목과 본인·대리 신청 구분을 확인해야 하며, 모든 혜택에 같은 서류가 필요하다고 볼 수 없습니다.'],
          ['조회한 혜택의 지원금액과 신청 결과는 언제 확정되나요?', '확인 필요 — 선택한 사업의 지급 기준·심사 기간·결과 통보 방식이 확인되지 않았습니다. 이 도구의 키워드 분석이나 혜택 조회만으로 수급 자격, 금액 또는 지급일을 확정하지 않습니다.']
        ];
      }
    }
    // Fail visibly instead of returning an out-of-range draft after a template edit.
    if (length(intro) < 130 || length(intro) > 160) throw new Error('서론 길이 규칙을 확인해 주세요.');
    return {k,platform,intent:p.name,intentId:p.id,direction,titles,
      related:p.heads, meta:`${k}의 ${p.focus}, ${p.benefit}을 살펴보는 초안입니다. 세부 조건은 공식 안내 확인이 필요합니다.`,
      intro,outline,faq,tags:tags.slice(0,8),
      alternatives:matches.slice(1).map(p=>p.name)};
  }
  function sections(d) {
    return [
      ['검색 의도와 연관 키워드', `${d.intent} (키워드 표현으로 추정)\n${d.alternatives.length ? '함께 감지한 의도: '+d.alternatives.join(', ')+' · 구체적인 작업 의도를 우선 적용합니다.\n' : ''}\n${d.related.join(' · ')}\n검색 데이터가 아닌 규칙 기반 확장 제안입니다.`],
      ['SEO 제목 3개', d.titles.join('\n')], ['메타설명 초안', d.meta],
      [`서론 초안 · ${length(d.intro)}자`, d.intro],
      ['H2 목차', d.outline.map(([h]) => `## ${h}`).join('\n\n')],
      ['FAQ 4개', d.faq.map(([q,a]) => `Q. ${q}\nA. ${a}`).join('\n\n')], ['태그 8개', d.tags.join(', ')],
      ['작성 가이드 · 발행 전 확인', `${d.direction}\n\n${d.outline.map(([h,g])=>`${h}\n${g}`).join('\n\n')}`]
    ];
  }
  function exportText(d) { return `${d.titles[0]}\n\n[규칙 기반 글쓰기 자료 · 직접 검증 및 보완 필요]\n\n${sections(d).map(([h,t],i) => `${i===0?'[검색 의도 분석]\n':i===1?'[독자용 콘텐츠 초안]\n':i===7?'[작성자 전용 가이드 · 발행 제외]\n':''}${h}\n${t}`).join('\n\n')}`; }
  function exportHTML(d) {
    const e = escapeHTML;
    return `<!-- 규칙 기반 초안: 사실 확인과 본문 보완 후 발행하세요. 게시물 제목은 에디터 제목란에 별도로 입력하세요. -->\n<p>${e(d.intro)}</p>\n` + d.outline.map(([h]) => `<h2>${e(h)}</h2>`).join('\n') + `\n<h2>자주 묻는 질문</h2>\n` + d.faq.map(([q,a]) => `<h3>${e(q)}</h3>\n<p>${e(a)}</p>`).join('\n');
  }
  function parseArticle(raw) {
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    doc.querySelectorAll('script,style,iframe,object').forEach(n => n.remove());
    const headings = [...doc.querySelectorAll('h2')].map(n => n.textContent.trim());
    doc.querySelectorAll('p,div,br,h1,h2,h3,li').forEach(n => { n.prepend(doc.createTextNode('\n')); n.append(doc.createTextNode('\n')); });
    const text = doc.body.textContent;
    headings.push(...text.split('\n').filter(l => /^\s*##\s+\S/.test(l)).map(l => l.replace(/^\s*##\s+/,'')));
    return {text, headings};
  }
  function analyze(title, raw, keyword) {
    const {text,headings} = parseArticle(raw);
    if (!text.trim()) return null;
    const k = keyword.trim().replace(/\s+/g,' ');
    const normalized = text.replace(/\s+/g,' ');
    const count = k ? normalized.split(k).length - 1 : 0;
    const sentences = text.split(/[.!?。！？\n]+/).map(s=>s.trim()).filter(Boolean);
    const long = sentences.filter(s=>length(s)>100).length;
    const paragraphs = text.split(/\n\s*\n/).filter(s=>s.trim());
    return {characters:length(text.trim()), count, items:[
      [length(title.trim()) >= 10 && length(title.trim()) <= 60, '제목 길이', `현재 ${length(title.trim())}자. 10~60자는 이 도구의 편집 참고 범위입니다.`],
      [!!k && title.includes(k), '제목의 핵심 키워드', k ? '키워드의 정확한 문자열 포함 여부를 확인합니다.' : '상단 키워드를 입력하면 확인할 수 있습니다.'],
      [headings.length >= 2, 'H2 소제목', `${headings.length}개 인식. HTML <h2> 또는 별도 줄의 ## 소제목으로 표시하세요. 2개 이상을 편집 참고 기준으로 사용합니다.`],
      [!!k && count > 0, '본문 키워드', k ? `정확히 일치하는 표현 ${count}회. 횟수보다 문맥의 자연스러움이 중요합니다.` : '상단 키워드를 입력해 주세요.'],
      [!!k && headings.some(h=>h.includes(k)), '소제목의 핵심 키워드', '독자의 이해에 도움이 되는 위치에 자연스럽게 사용하세요.'],
      [long === 0, '문장 가독성', `100자를 넘는 문장·줄 ${long}개. 긴 문장은 나누어 읽어 보세요. 의미나 문법을 분석한 결과는 아닙니다.`],
      [paragraphs.every(p=>length(p)<=500), '문단 가독성', '500자를 넘는 문단이 있는지 확인합니다. 줄바꿈으로 문단을 나누면 모바일에서 읽기 편합니다.']
    ]};
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports={VERSION,generate,analyze,exportHTML,exportText,length}; return; }
  document.documentElement.dataset.seoVersion = VERSION;
  let current = null, timer;
  function toast(message) { $('toast').textContent=message; $('toast').style.display='block'; clearTimeout(timer); timer=setTimeout(()=>$('toast').style.display='none',3000); }
  async function copy(text) {
    try { if (!navigator.clipboard?.writeText) throw new Error(); await navigator.clipboard.writeText(text); toast('복사했습니다. 붙여넣은 뒤 내용을 확인해 주세요.'); }
    catch { $('manual-copy').value=text; $('copy-dialog').showModal(); $('manual-copy').focus(); $('manual-copy').select(); }
  }
  function platformGuide() { $('platform-guide').textContent=platforms[$('platform').value][1]; }
  $('platform').addEventListener('change',platformGuide); platformGuide();
  $('generate-form').addEventListener('submit', event => {
    event.preventDefault(); $('form-error').textContent='';
    try { current=generate($('keyword').value,$('platform').value); }
    catch(error) { $('form-error').textContent=error.message; return; }
    $('cards').replaceChildren();
    sections(current).forEach(([heading,content], index) => {
      if ([0,1,7].includes(index)) {
        const label=document.createElement('h3'); label.className='result-group';
        label.textContent=index===0?'검색 의도 분석':index===1?'독자용 콘텐츠 초안 · 검증 후 사용':'작성자 전용 가이드 · 발행 내용에서 제외';
        $('cards').append(label);
      }
      const card=document.createElement('article'); card.className='card';
      const head=document.createElement('div'); head.className='card-head';
      const h=document.createElement('h3'); h.textContent=heading;
      const button=document.createElement('button'); button.type='button'; button.textContent='복사'; button.setAttribute('aria-label',`${heading} 복사`); button.addEventListener('click',()=>copy(content));
      const body=document.createElement('div'); body.className='content'; body.textContent=content;
      head.append(h,button); card.append(head,body); $('cards').append(card);
    });
    $('result-label').textContent=`${current.k} · ${platforms[current.platform][0]}`;
    $('empty').hidden=true; $('results').hidden=false;
    toast('글쓰기 자료를 만들었습니다. 아래 결과를 확인하세요.');
  });
  $('copy-text').addEventListener('click',()=>current && copy(exportText(current)));
  $('copy-html').addEventListener('click',()=>current && copy(exportHTML(current)));
  $('close-dialog').addEventListener('click',()=>$('copy-dialog').close());
  $('check').addEventListener('click',()=>{
    const report=analyze($('article-title').value,$('article').value,$('keyword').value);
    const target=$('check-results'); target.replaceChildren();
    if (!report) { target.textContent='점검할 본문을 입력해 주세요.'; return; }
    const summary=document.createElement('p'); summary.textContent=`본문 ${report.characters}자 · 편집 참고용 점검`; target.append(summary);
    report.items.forEach(([ok,title,detail])=>{
      const row=document.createElement('div'); row.className='check-item';
      const h=document.createElement('strong'); h.className=ok?'good':'warn'; h.textContent=`${ok?'✓ 확인':'△ 살펴보기'} · ${title}`;
      const p=document.createElement('p'); p.textContent=detail; row.append(h,p); target.append(row);
    });
  });
  // Dependency-free test access; no network calls or persistence.
  if (typeof module !== 'undefined') module.exports={VERSION,generate,analyze,exportHTML,exportText,length};
})();
