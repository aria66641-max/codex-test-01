'use strict';
(()=>{
 const $=id=>document.getElementById(id),core=window.SEOWriting;let current=null,options=null,mode='demo',published=false;
 const status=message=>$('ai-status').textContent=message;
 
 async function copy(value){try{await navigator.clipboard.writeText(value);status('복사했습니다. 발행 전 내용을 확인하세요.');}catch{$('manual-copy').value=value;$('copy-dialog').showModal();$('manual-copy').focus();$('manual-copy').select();}}
 const selectedTitle=()=>current?.titles[Number($('ai-title-select').value)||0]||'';
 function lock(value){published=!value;for(const id of ['ai-copy-text','ai-copy-html','ai-copy-title','ai-copy-body'])$(id).disabled=value;for(const b of document.querySelectorAll('.ai-card button'))b.disabled=value;}
 function editor(d){
  $('ai-editor-fields').replaceChildren();
  const add=(label,value,key)=>{const wrap=document.createElement('label');wrap.textContent=label;const t=document.createElement('textarea');t.value=value;t.dataset.key=key;t.rows=3;t.style.minHeight='80px';t.oninput=()=>{lock(true);$('ai-quality').textContent='수정 중입니다. 분량·구조 점검 후 복사를 사용할 수 있습니다.';};wrap.append(t);$('ai-editor-fields').append(wrap);};
  d.titles.forEach((v,i)=>add(`제목 ${i+1}`,v,`titles.${i}`));add('서론',d.intro,'intro');
  d.sections.forEach((s,i)=>{add(`H2 ${i+1}`,s.heading,`sections.${i}.heading`);add(`H2 ${i+1} 본문`,s.body,`sections.${i}.body`);});
  d.faq.forEach((f,i)=>{add(`FAQ ${i+1} 질문`,f.question,`faq.${i}.question`);add(`FAQ ${i+1} 답변`,f.answer,`faq.${i}.answer`);});
  add('공감형 결론',d.conclusion,'conclusion');d.tags.forEach((t,i)=>add(`태그 ${i+1}`,t,`tags.${i}`));
 }
 function render(d,valid=true){
  current=d;$('ai-results').hidden=false;$('ai-cards').replaceChildren();lock(!valid);
  const items=[['제목 후보 3개',d.titles.join('\n')],[`서론 · ${core.len(d.intro)}자`,d.intro],...d.sections.map(s=>['H2 · '+s.heading,s.body]),['FAQ',d.faq.map(f=>'Q. '+f.question+'\nA. '+f.answer).join('\n\n')],['결론',d.conclusion],['태그 8개',d.tags.join(', ')]];
  for(const [title,text]of items){const card=document.createElement('article');card.className='card ai-card';const head=document.createElement('div');head.className='card-head';const h=document.createElement('h3');h.textContent=title;const b=document.createElement('button');b.type='button';b.textContent='복사';b.disabled=!valid;b.onclick=()=>published&&copy(text);const body=document.createElement('div');body.className='content';body.textContent=text;head.append(h,b);card.append(head,body);$('ai-cards').append(card);}
  $('ai-summary').textContent=`${mode==='demo'?'데모 샘플 · 실제 AI 생성 아님':'AI 생성 초안 · 공식 출처 미조회 · 최신 정보 검증 필요'} | ${options.tone} | 본문 ${core.len(core.bodyText(d))}자`;
  $('ai-title-select').replaceChildren(...d.titles.map((t,i)=>{const o=document.createElement('option');o.value=i;o.textContent=t;return o;}));
  editor(d);$('ai-editor').open=!valid;$('ai-quality').textContent=core.quality(d,options).join('\n');
 }
 $('ai-apply').onclick=()=>{
  if(!current)return;const edited=structuredClone(current);
  for(const t of $('ai-editor-fields').querySelectorAll('textarea')){const parts=t.dataset.key.split('.');let target=edited;for(const p of parts.slice(0,-1))target=target[p];target[parts.at(-1)]=t.value;}
  try{const d=core.validate(edited,options);render(d);status('분량·구조 점검 통과. 내용의 사실 여부와 출처는 직접 검토하세요.');}catch(e){lock(true);status(e.message);$('ai-quality').textContent=e.message;}
 };
 $('ai-form').addEventListener('submit',async event=>{
  event.preventDefault();current=null;$('ai-results').hidden=true;lock(true);const button=$('ai-generate');button.disabled=true;status('초안을 준비하고 있습니다…');
  try{
   options=core.input({keyword:$('ai-keyword').value,platform:$('ai-platform').value,length:$('ai-length').value,tone:$('ai-tone').value});mode=$('ai-mode').value;
   let data;
   if(mode==='demo')data=core.demo(options);
   else{
    if(location.protocol==='file:')throw Error('실제 AI 모드는 START.bat으로 실행한 로컬 서버에서 사용할 수 있습니다.');
    const response=await fetch('/api/write',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(options),signal:AbortSignal.timeout(125000)});
    const result=await response.json();if(!response.ok){
     if(result.draft){try{render(core.validate(result.draft,options,{allowLengthMismatch:true}),false);}catch{}}
     throw Error(result.error||'생성에 실패했습니다.');
    }
    data=core.validate(result.draft,options);
   }
   render(data);status(mode==='demo'?'샘플을 표시했습니다. 실제 AI 생성 품질을 보여주는 결과는 아닙니다.':'AI 초안을 생성했습니다. 발행 전 점검과 사실 확인을 진행하세요.');
  }catch(e){status(e.name==='TimeoutError'?'응답 시간이 초과되었습니다. 서버 작업이 끝날 때까지 기다려 주세요. 자동 재요청은 없습니다.':e.message||'초안을 만들지 못했습니다.');}finally{button.disabled=false;}
 });
 $('ai-copy-title').onclick=()=>published&&copy(selectedTitle());
 $('ai-copy-body').onclick=()=>published&&copy(current.intro+'\n\n'+current.sections.map(s=>'## '+s.heading+'\n'+s.body).join('\n\n')+'\n\nFAQ\n'+current.faq.map(f=>'Q. '+f.question+'\nA. '+f.answer).join('\n\n')+'\n\n결론\n'+current.conclusion);
 $('ai-copy-text').onclick=()=>published&&copy(($('ai-summary').textContent)+'\n'+core.plain(current));
 $('ai-copy-html').onclick=()=>{if(!published)return;const h=document.createElement('h1');h.textContent=selectedTitle();copy('<!-- '+$('ai-summary').textContent.replace(/--/g,'')+' -->\n'+h.outerHTML+'\n'+core.html(current));};
})();
