'use strict';
(()=>{
 const $=id=>document.getElementById(id),core=window.SEOWriting;let current=null;
 const status=message=>$('ai-status').textContent=message;
 async function copy(value){try{await navigator.clipboard.writeText(value);status('복사했습니다. 발행 전 내용을 확인하세요.');}catch{$('manual-copy').value=value;$('copy-dialog').showModal();$('manual-copy').focus();$('manual-copy').select();}}
 function render(d,mode,options){
  current=d;$('ai-results').hidden=false;$('ai-cards').replaceChildren();
  const items=[['제목 후보 3개',d.titles.join('\n')],[`서론 · ${core.len(d.intro)}자`,d.intro],...d.sections.map(s=>['H2 · '+s.heading,s.body]),['FAQ',d.faq.map(f=>'Q. '+f.question+'\nA. '+f.answer).join('\n\n')],['결론',d.conclusion],['태그 8개',d.tags.join(', ')]];
  for(const [title,text]of items){const card=document.createElement('article');card.className='card ai-card';const head=document.createElement('div');head.className='card-head';const h=document.createElement('h3');h.textContent=title;const b=document.createElement('button');b.type='button';b.textContent='복사';b.setAttribute('aria-label',title+' 복사');b.onclick=()=>copy(text);const body=document.createElement('div');body.className='content';body.textContent=text;head.append(h,b);card.append(head,body);$('ai-cards').append(card);}
  $('ai-summary').textContent=`${mode==='demo'?'데모 샘플 · 실제 AI 생성 아님':'AI 생성 초안 · 사실 검증되지 않음'} | ${options.tone} | 본문 ${core.len(core.bodyText(d))}자`;
 }
 $('ai-form').addEventListener('submit',async event=>{
  event.preventDefault();current=null;$('ai-results').hidden=true;const button=$('ai-generate');button.disabled=true;status('초안을 준비하고 있습니다…');
  try{
   const options=core.input({keyword:$('ai-keyword').value,platform:$('ai-platform').value,length:$('ai-length').value,tone:$('ai-tone').value});const mode=$('ai-mode').value;
   let data;
   if(mode==='demo')data=core.demo(options);
   else{
    if(location.protocol==='file:')throw Error('실제 AI 모드는 로컬 개발 서버에서 사용할 수 있습니다.');
    const response=await fetch('/api/write',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(options),signal:AbortSignal.timeout(65000)});
    const result=await response.json();if(!response.ok)throw Error(result.error||'생성에 실패했습니다.');data=core.validate(result.draft,options);
   }
   render(data,mode,options);status(mode==='demo'?'샘플을 표시했습니다. 톤과 주제를 반영한 실제 AI 생성 품질을 보여주는 결과는 아닙니다.':'AI 초안을 생성했습니다. 모든 사실과 미확인 항목을 검토하세요.');
  }catch(e){status(e.message||'초안을 만들지 못했습니다.');}finally{button.disabled=false;}
 });
 $('ai-copy-text').onclick=()=>current&&copy(($('ai-summary').textContent)+'\n'+core.plain(current));
 $('ai-copy-html').onclick=()=>current&&copy('<!-- '+$('ai-summary').textContent.replace(/--/g,'')+' -->\n'+core.html(current));
})();
