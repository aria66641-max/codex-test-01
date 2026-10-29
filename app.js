'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const length = text => Array.from(text).length;
  const escapeHTML = text => text.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const platforms = {
    tistory: ['티스토리', 'HTML 모드에 붙여넣은 뒤 제목·문단·링크를 미리보기에서 확인하세요.'],
    naver: ['네이버', '일반 텍스트로 복사한 뒤 에디터에서 소제목과 문단을 직접 꾸며 주세요.'],
    wordpress: ['워드프레스', '블록 편집기에서 제목·소제목을 구분하고 SEO 플러그인 설정은 직접 확인하세요.']
  };
  function generate(keyword, platform) {
    const k = keyword.trim().replace(/\s+/g, ' ');
    if (!k || length(k) > 60) throw new Error('키워드를 1~60자로 입력해 주세요.');
    let intent = '정보 탐색', direction = '개념, 준비 사항, 실행 순서를 중심으로 설명하세요.';
    if (/비교|추천|차이|vs/i.test(k)) { intent = '비교·선택'; direction = '비교 기준을 먼저 정하고 장단점과 적용 조건을 근거와 함께 정리하세요.'; }
    else if (/가격|비용|구매|할인/.test(k)) { intent = '구매 검토'; direction = '가격 확인 시점과 출처, 추가 비용 및 선택 조건을 직접 확인하세요.'; }
    else if (/방법|하는 법|설정|해결/.test(k)) { intent = '실행·문제 해결'; direction = '준비 사항과 단계별 방법, 실패 시 확인할 항목을 정리하세요.'; }
    const titles = [`${k}: 처음 시작하는 사람을 위한 안내`, `${k}, 시작 전 확인할 핵심 기준`, `${k} 정리: 준비부터 자주 묻는 질문까지`];
    const related = ['기초','방법','준비 사항','비교 기준','주의사항','체크리스트'].map(s => `${k} ${s}`);
    const meta = `${k}에 대해 알아보고 있나요? 기본 개념부터 준비 사항, 확인할 기준과 자주 묻는 질문까지 정리할 글의 초안입니다. 필요한 정보를 직접 확인하고 자신의 상황에 맞게 내용을 보완해 보세요.`;
    const intro = `${k}에 대해 어디서부터 알아봐야 할지 고민되나요? 이 글에서는 처음 살펴볼 기본 개념과 준비 사항, 단계별로 확인할 기준을 정리하려고 합니다. 독자의 상황에 따라 필요한 정보가 다를 수 있으므로, 아래 목차를 바탕으로 공식 자료와 최신 정보를 확인하고 자신에게 맞는 방법을 찾아보세요.`;
    const outline = [
      [`${k}, 먼저 이해할 기본 개념`, '용어와 글의 범위를 정의하고 공식 출처를 추가하세요.'],
      ['시작하기 전 준비 사항', '필요한 조건과 준비물을 직접 확인해 목록으로 작성하세요.'],
      [`${k} 핵심 확인 단계`, direction],
      ['주의사항과 상황별 확인 기준', '예외 조건과 한계를 적고 확인하지 않은 경험이나 수치는 넣지 마세요.'],
      ['마무리 체크리스트', '독자가 실행할 다음 행동을 정리하고 참고 자료의 확인 날짜를 남기세요.']
    ];
    const faq = [
      [`${k}, 처음에는 무엇부터 확인하나요?`, '글의 목적과 독자에게 필요한 기본 조건을 확인하세요. 주제별 구체적인 조건은 공식 자료를 찾아 보완하세요.'],
      [`${k} 관련 정보는 어디서 확인하나요?`, '공식 안내와 원문 자료를 우선 확인하고 출처 및 확인 날짜를 기록하세요.'],
      [`${k} 선택 기준은 어떻게 정하나요?`, '목적, 예산, 적용 환경을 기준으로 비교할 항목을 직접 정리하세요.'],
      [`${k}에서 주의할 점은 무엇인가요?`, '상황별 예외와 최신 변경 사항을 확인하세요. 검증하지 않은 효과나 결과를 단정하지 마세요.']
    ];
    const tags = [k, ...['기초','가이드','준비','확인사항','질문','정리','활용'].map(s => `${k.replace(/\s/g,'')}${s}`)];
    return { k, platform, intent, direction, titles, related, meta, intro, outline, faq, tags };
  }
  function sections(d) {
    return [
      ['검색 의도와 연관 키워드', `${d.intent} (키워드 표현으로 추정)\n${d.direction}\n\n${d.related.join(' · ')}\n검색 데이터가 아닌 규칙 기반 확장 제안입니다.`],
      ['SEO 제목 3개', d.titles.join('\n')], ['메타설명 초안', d.meta],
      [`서론 초안 · ${length(d.intro)}자`, d.intro],
      ['H2 목차와 작성 가이드', d.outline.map(([h,g]) => `## ${h}\n작성 가이드: ${g}`).join('\n\n')],
      ['FAQ 4개', d.faq.map(([q,a]) => `Q. ${q}\nA. ${a}`).join('\n\n')], ['태그 8개', d.tags.join(', ')]
    ];
  }
  function exportText(d) { return `${d.titles[0]}\n\n[규칙 기반 글쓰기 자료 · 직접 검증 및 보완 필요]\n\n${sections(d).map(([h,t]) => `${h}\n${t}`).join('\n\n')}`; }
  function exportHTML(d) {
    const e = escapeHTML;
    return `<!-- 규칙 기반 초안: 사실 확인과 본문 보완 후 발행하세요. 게시물 제목은 에디터 제목란에 별도로 입력하세요. -->\n<p>${e(d.intro)}</p>\n` + d.outline.map(([h,g]) => `<h2>${e(h)}</h2>\n<p>[작성 가이드: ${e(g)}]</p>`).join('\n') + `\n<h2>자주 묻는 질문</h2>\n` + d.faq.map(([q,a]) => `<h3>${e(q)}</h3>\n<p>${e(a)}</p>`).join('\n');
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
    sections(current).forEach(([heading,content]) => {
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
  if (typeof module !== 'undefined') module.exports={generate,analyze,exportHTML,exportText,length};
})();
