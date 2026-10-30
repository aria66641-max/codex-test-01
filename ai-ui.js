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
  current=d;$('ai-results').hidden=false;$('ai-cards').replaceChildren();
  const blocked=core.publicationIssues(d).length>0;valid=valid&&!blocked;lock(!valid);
  const note=document.createElement('strong');note.textContent='작성자 검증 메모 · 원고에 포함되지 않음';
  const warning=document.createElement('p');warning.textContent='발행 전 검증 필요: 공식 출처는 조회하지 않았습니다. 미확인 사실을 검증하고 독자에게 필요한 불확실성 안내는 원고에 남기세요.';
  $('ai-verification').replaceChildren(note,warning);
  for(const value of d.verificationNotes||[]){const p=document.createElement('p');p.textContent=value;$('ai-verification').append(p);}
  if(blocked){const p=document.createElement('p');p.textContent='작성용 표시가 발견되어 발행 미리보기와 복사를 잠갔습니다. 아래 편집기에서 완결된 문장으로 고친 뒤 다시 점검하세요.';$('ai-cards').append(p);}
  else{
   const items=[['제목 후보 3개',d.titles.join('\n'),'titles'],['서론',d.intro,'intro'],...d.sections.map(s=>[s.heading,s.body,'section']),['자주 묻는 질문',d.faq.map(f=>f.question+'\n'+f.answer).join('\n\n'),'faq'],['결론',d.conclusion,'conclusion'],['태그 8개',d.tags.join(', '),'tags']];
   for(const [title,text,type]of items){
    const card=document.createElement('article');card.className='card ai-card';const head=document.createElement('div');head.className='card-head';
    const h=document.createElement(type==='section'||type==='faq'?'h2':'h3');h.textContent=title;
    const button=()=>{const b=document.createElement('button');b.type='button';b.textContent='복사';b.disabled=!valid;return b;};
    const b=button();b.onclick=()=>published&&copy(text);head.append(h,b);card.append(head);
    const body=document.createElement('div');body.className='content';
    if(type==='faq')for(const f of d.faq){const q=document.createElement('h3');q.textContent=f.question;const a=document.createElement('p');a.textContent=f.answer;body.append(q,a);}
    else if(type==='titles'||type==='tags')for(const value of type==='titles'?d.titles:d.tags){const row=document.createElement('div');const t=document.createElement('span');t.textContent=value;const c=button();c.setAttribute('aria-label',(type==='titles'?'제목 후보':'태그')+' 복사');c.onclick=()=>published&&copy(value);row.append(t,c);body.append(row);}
    else for(const paragraph of text.split(/\n\s*\n/)){const p=document.createElement('p');p.textContent=paragraph;body.append(p);}
    card.append(body);$('ai-cards').append(card);
   }
  }
  $('ai-summary').textContent=`${mode==='demo'?'데모 샘플 · 실제 AI 생성 아님':'AI 생성 초안 · 공식 출처 미조회 · 최신 정보 검증 필요'} | ${options.tone} | 서론 ${core.len(d.intro)}자 · 본문 ${core.len(core.bodyText(d))}자`;
  $('ai-title-select').replaceChildren(...d.titles.map((t,i)=>{const o=document.createElement('option');o.value=i;o.textContent=t;return o;}));
  editor(d);$('ai-editor').open=!valid;$('ai-quality').textContent=core.quality(d,options).join('\n');
 }
 $('ai-apply').onclick=()=>{
  if(!current)return;const edited=structuredClone(current);
  for(const t of $('ai-editor-fields').querySelectorAll('textarea')){const parts=t.dataset.key.split('.');let target=edited;for(const p of parts.slice(0,-1))target=target[p];target[parts.at(-1)]=t.value;}
  try{const d=core.validate(edited,options);render(d);status('분량·구조 점검 통과. 내용의 사실 여부와 출처는 직접 검토하세요.');}catch(e){lock(true);status(e.message);$('ai-quality').textContent=e.message;}
 };
 const REQUEST_TIMEOUT_MS=215000;
 let pendingId=null,running=false;
 try{pendingId=sessionStorage.getItem('seo-pending-request');}catch{}
 function pending(id){if(!id)$('ai-new-request').hidden=true;pendingId=id;try{if(id)sessionStorage.setItem('seo-pending-request',id);else sessionStorage.removeItem('seo-pending-request');}catch{}$('ai-request-status').hidden=!id;}
 pending(pendingId);
 if(pendingId)status('이전 요청이 있습니다. 새 생성 전에 상태를 확인하세요.');
 function accept(result){
  if(result.state==='running'){$('ai-new-request').hidden=true;status(`요청 처리 중 · 단계 ${result.stage||'대기'} · 상태 확인은 새 API 요청을 만들지 않습니다.`);return;}
  if(result.state==='uncertain'||result.state==='unknown'){$('ai-new-request').hidden=false;
   status((result.error||'원격 처리 결과를 확정할 수 없습니다.')+' 새 생성은 추가 비용이 발생할 수 있습니다.');return;
  }
  if(result.options)options=core.input(result.options);
  pending(null);
  if(result.draft){
   try{const d=core.validate(result.draft,options);render(d);status('초안을 복구했습니다. 발행 전 사실 확인이 필요합니다.');}
   catch(e){try{render(core.validate(result.draft,options,{allowLengthMismatch:true,allowEditorialMismatch:true}),false);}catch{}status(result.error||e.message);}
  }else status(result.error||'요청이 종료되었습니다.');
 }
 $('ai-new-request').onclick=()=>{if(window.confirm('원격 요청이 이미 처리되어 비용이 발생했을 수 있습니다. 새 생성은 추가 비용을 유발할 수 있습니다. 그래도 새 생성을 허용할까요?')){pending(null);status('새 생성이 허용되었습니다. 생성 버튼을 누를 때 새 유료 요청이 한 번 발생합니다.');}};
 $('ai-request-status').onclick=async()=>{
  if(!pendingId)return;const b=$('ai-request-status');b.disabled=true;
  try{mode='live';const response=await fetch('/api/requests/'+encodeURIComponent(pendingId),{signal:AbortSignal.timeout(10000)});accept(await response.json());}
  catch{status('요청 상태 조회에 실패했습니다. 생성 요청은 다시 보내지 않았습니다. 서버 실행 상태를 확인하세요.');}finally{b.disabled=false;}
 };
 $('ai-form').addEventListener('submit',async event=>{
  event.preventDefault();if(running)return;
  if($('ai-mode').value==='live'&&pendingId){status('이전 요청이 남아 있습니다. 먼저 무료 상태 확인을 사용하세요.');return;}
  current=null;$('ai-results').hidden=true;lock(true);const button=$('ai-generate');button.disabled=true;running=true;
  const began=Date.now();status('초안을 준비하고 있습니다…');const progress=setInterval(()=>status(`AI 생성 진행 중 · ${Math.floor((Date.now()-began)/1000)}초 경과 · 최대 약 3분 35초 · 자동 재요청 없음`),1000);
  const original=button.textContent;button.textContent='생성 진행 중…';
  try{
   options=core.input({keyword:$('ai-keyword').value,platform:$('ai-platform').value,length:$('ai-length').value,tone:$('ai-tone').value});mode=$('ai-mode').value;
   let data;
   if(mode==='demo')data=core.demo(options);
   else{
    if(location.protocol==='file:')throw Error('실제 AI 모드는 START.bat으로 실행한 로컬 서버에서 사용할 수 있습니다.');
    const id=crypto.randomUUID();pending(id);
    const response=await fetch('/api/write',{method:'POST',headers:{'Content-Type':'application/json','X-Request-ID':id},body:JSON.stringify(options),signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
    const result=await response.json();
    if(result.state==='running'||result.state==='uncertain'){accept(result);return;}
    pending(null);
    if(!response.ok){
     if(result.draft){try{render(core.validate(result.draft,options,{allowLengthMismatch:true,allowEditorialMismatch:true}),false);}catch{}}
     throw Error(result.error||'생성에 실패했습니다.');
    }
    data=core.validate(result.draft,options);
   }
   render(data);status(mode==='demo'?'샘플을 표시했습니다. 실제 AI 생성 품질을 보여주는 결과는 아닙니다.':'AI 초안을 생성했습니다. 발행 전 점검과 사실 확인을 진행하세요.');
  }catch(e){status(e.name==='TimeoutError'?'브라우저 대기 215초 제한을 초과했습니다. 서버 처리가 계속될 수 있으므로 무료 상태 확인을 먼저 사용하세요. 자동 재요청은 없습니다.':e.name==='TypeError'?'브라우저와 로컬 서버의 통신이 끊겼습니다. 원격 처리 여부는 확정할 수 없습니다. 무료 상태 확인을 사용하세요.':e.message||'초안을 만들지 못했습니다.');}
  finally{clearInterval(progress);running=false;button.disabled=false;button.textContent=original;}
 });
 $('ai-copy-title').onclick=()=>published&&copy(selectedTitle());
 $('ai-copy-body').onclick=()=>published&&copy(core.bodyPlain(current));
 $('ai-copy-text').onclick=()=>published&&copy(core.plain(current,selectedTitle()));
 $('ai-copy-html').onclick=()=>{if(!published)return;const h=document.createElement('h1');h.textContent=selectedTitle();copy(h.outerHTML+'\n'+core.html(current));};
})();
