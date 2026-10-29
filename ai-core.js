/* Shared contract: browser demo and server response validation. Contains no credentials. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SEOWriting=factory();})(typeof globalThis!=='undefined'?globalThis:this,()=>{
'use strict';
const len=s=>Array.from(s).length;
const ranges={'1800-2000':[1800,2000],'1800-1900':[1800,1900],'1900-2000':[1900,2000]};
function input(value){
 if(!value||typeof value.keyword!=='string'||!value.keyword.trim()||len(value.keyword.trim())>60)throw Error('키워드는 1~60자로 입력하세요.');
 if(!['tistory','naver','wordpress'].includes(value.platform)||!ranges[value.length]||!['친근한 안내','차분한 설명','간결한 실무'].includes(value.tone))throw Error('플랫폼·글 길이·톤을 확인하세요.');
 return {keyword:value.keyword.trim(),platform:value.platform,length:value.length,tone:value.tone};
}
const str={type:'string'};
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const array=(items,minItems,maxItems)=>({type:'array',items,minItems,maxItems});
const schema=obj({titles:array(str,3,3),intro:str,sections:array(obj({heading:str,body:str}),3,8),faq:array(obj({question:str,answer:str}),4,4),conclusion:str,tags:array(str,8,8)});
const bodyText=d=>d.sections.map(s=>s.body).join('\n\n');
function validate(d,options){
 const v=input(options); const [min,max]=ranges[v.length];
 const text=s=>typeof s==='string'&&s.trim()&&len(s)<=10000;
 if(!d||!Array.isArray(d.titles)||d.titles.length!==3||!d.titles.every(text)||new Set(d.titles).size!==3||!text(d.intro)||len(d.intro)<130||len(d.intro)>160||!Array.isArray(d.sections)||d.sections.length<3||d.sections.length>8||!d.sections.every(s=>s&&text(s.heading)&&text(s.body))||!Array.isArray(d.faq)||d.faq.length!==4||!d.faq.every(f=>f&&text(f.question)&&text(f.answer))||!text(d.conclusion)||!Array.isArray(d.tags)||d.tags.length!==8||!d.tags.every(text)||new Set(d.tags.map(t=>t.trim())).size!==8)throw Error('생성 결과의 구조 또는 서론 길이가 기준에 맞지 않습니다.');
 const n=len(bodyText(d));if(n<min||n>max)throw Error(`본문 ${n}자: 요청한 ${min}~${max}자 범위를 벗어났습니다. 자동 재요청은 하지 않습니다.`);
 return d;
}
function demo(options){
 const v=input(options), subject=len(v.keyword)>10?Array.from(v.keyword).slice(0,9).join('')+'…':v.keyword;
 const intro=`${subject}에 대해 무엇부터 알아봐야 할지 고민되나요? 이 샘플은 정보를 찾고 정리하는 흐름을 보여주기 위한 데모입니다. 실제 자격이나 가격, 절차를 확인한 글은 아니며, 필요한 근거와 적용 조건을 구분해 살펴보는 데 도움을 줍니다. 구체적인 답은 공식 자료 확인이 필요합니다.`;
 const headings=['주제의 범위와 먼저 알아둘 점','내 상황에 적용할 조건 살펴보기','확인할 자료와 진행 순서','예외와 주의사항 구분하기','확인 결과를 정리하는 방법'];
 const paragraphs=[
 '주제를 살펴볼 때는 먼저 알고 싶은 질문을 하나로 좁혀 보는 것이 좋습니다. 같은 단어를 사용하더라도 찾는 정보의 범위는 서로 다를 수 있습니다. 기본 개념을 이해하려는 경우와 구체적인 실행 방법을 찾는 경우에는 필요한 자료도 달라집니다. 이 데모에서는 실제 답을 대신 정하지 않고, 어떤 내용을 나누어 살펴볼 수 있는지 예시를 보여줍니다. 확인 필요: 해당 주제의 공식 정의와 최신 안내는 아직 대조하지 않았습니다.',
 '개인에게 적용되는 조건은 일반적인 소개 문구만으로 판단하기 어렵습니다. 이용 목적과 현재 상황을 나누어 적으면 어떤 부분을 더 확인해야 하는지 드러납니다. 특히 기준일이나 대상 범위처럼 판단에 영향을 주는 항목은 서로 섞지 않는 편이 좋습니다. 이 예시에는 특정인의 경험이나 자격 판정이 포함되어 있지 않습니다. 확인 필요: 실제 적용 조건과 제외 대상은 주제에 맞는 원문 자료를 통해 살펴봐야 합니다.',
 '자료를 읽을 때는 제목뿐 아니라 본문이 다루는 대상과 작성 시점을 함께 살펴볼 수 있습니다. 짧은 요약에서 빠진 조건이 원문에 있을 수 있으므로, 행동을 결정하기 전에는 세부 안내를 대조하는 과정이 필요합니다. 이 샘플은 접수처나 구체적인 절차를 임의로 제시하지 않습니다. 확인 필요: 진행 순서, 준비물, 비용이 있는지 여부는 아직 검증하지 않았으며, 실행 가능한 안내로 사용하려면 추가 확인이 필요합니다.',
 '정보를 정리하다 보면 보편적인 내용과 특정 상황에서만 적용되는 예외가 함께 등장할 수 있습니다. 조건이 다른 사례를 그대로 가져오면 자신의 상황과 맞지 않을 수 있으므로, 사례가 어떤 범위에서 설명되는지 구분해 읽는 것이 좋습니다. 이 글에는 실제 사용 후기나 성공 사례가 없습니다. 확인 필요: 주제별 위험 요소와 제한 사항은 관련 기관이나 제공자의 안내와 대조해야 하며, 이 데모만으로 결과를 예측할 수 없습니다.',
 '살펴본 내용을 마지막에 정리할 때는 확인된 항목과 아직 답을 찾지 못한 항목을 구분하면 도움이 됩니다. 질문별로 출처와 확인 시점을 남기면 이후 정보가 달라졌을 때 다시 검토하기도 쉬워집니다. 서로 다른 자료의 설명이 다르다면 적용 대상이나 기준일이 같은지부터 살펴볼 수 있습니다. 확인 필요: 이 샘플 자체는 사실 검증 자료가 아니므로, 실제 게시 전에는 남아 있는 질문에 답할 수 있는 원문을 확보해야 합니다.'
 ];
 const d={titles:[`${v.keyword}: 먼저 확인할 핵심 질문`,`${v.keyword}, 조건과 자료를 살펴보는 순서`,`${v.keyword}: 확인된 정보와 미확인 항목 구분`],intro,sections:headings.map((heading,i)=>({heading,body:paragraphs[i]})),faq:[
 {question:`${subject}의 구체적인 절차는 무엇인가요?`,answer:'확인 필요 — 이 데모에는 공식 절차를 검증한 자료가 없어 순서를 확정하지 않습니다.'},
 {question:'비용이나 준비해야 할 서류가 있나요?',answer:'확인 필요 — 대상과 이용 경로별 비용·필수 서류를 확인하지 않았습니다.'},
 {question:'누구나 같은 조건으로 이용할 수 있나요?',answer:'확인 필요 — 적용 대상과 예외 조건을 확인하지 않아 개인별 판단을 할 수 없습니다.'},
 {question:'언제 결과를 확인할 수 있나요?',answer:'확인 필요 — 처리 기간이나 결과 통보 방식에 대한 검증 자료가 없습니다.'}
 ],conclusion:'이 글은 AI 호출 없이 제공하는 화면 테스트용 샘플입니다. 실제 게시 전에는 주제별 공식 자료를 확인하고 미확인 항목을 보완하세요.',tags:[v.keyword,'정보확인','공식자료','적용조건','준비사항','주의사항','핵심질문','자료정리']};
 d.tags=[...new Set([...d.tags,'출처검토','정보정리'])].slice(0,8);
 const [min,max]=ranges[v.length];
 const supplements=[' 정보가 바뀔 수 있는 항목과 비교적 일정한 개념을 구분해 정리해 보세요.',' 판단 근거가 없는 부분은 추측으로 채우지 않고 확인 필요로 남겨 둡니다.',' 원문의 조건이 내 상황과 일치하는지도 함께 살펴볼 수 있습니다.',' 요약만으로 결론을 정하기보다 필요한 근거를 먼저 찾아보는 과정입니다.'];
 let i=0;while(len(bodyText(d))<min){const t=supplements[i%supplements.length];if(len(bodyText(d))+len(t)>max)break;d.sections[i%5].body+=t;i++;}
 return validate(d,v);
}
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function plain(d){return `[발행 전 사실 확인이 필요한 초안]\n${d.titles.join('\n')}\n\n${d.intro}\n\n${d.sections.map(s=>'## '+s.heading+'\n'+s.body).join('\n\n')}\n\nFAQ\n${d.faq.map(f=>'Q. '+f.question+'\nA. '+f.answer).join('\n\n')}\n\n결론\n${d.conclusion}\n\n태그: ${d.tags.join(', ')}`;}
function html(d){return '<!-- 제목은 편집기 제목란에 별도 입력. 발행 전 사실 확인 필요. -->\n<p>'+escape(d.intro)+'</p>\n'+d.sections.map(s=>'<h2>'+escape(s.heading)+'</h2>\n<p>'+escape(s.body).replace(/\n/g,'<br>')+'</p>').join('\n')+'\n<h2>FAQ</h2>'+d.faq.map(f=>'<h3>'+escape(f.question)+'</h3><p>'+escape(f.answer)+'</p>').join('\n')+'<h2>결론</h2><p>'+escape(d.conclusion)+'</p>';}
return {input,schema,validate,demo,bodyText,len,plain,html};
});
