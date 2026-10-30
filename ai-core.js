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
const schema=obj({titles:array(str,3,3),intro:{type:'string',description:'공백 포함 130~160자 한국어 서론. 앞뒤 공백 제외, NFC 정규화, 줄바꿈 LF 기준.'},sections:array(obj({heading:str,body:str}),3,8),faq:array(obj({question:str,answer:str}),4,4),conclusion:str,tags:array(str,8,8),verificationNotes:array(str,0,12)});
function writingLimits(options){const v=input(options);return {bodyMin:ranges[v.length][0],bodyMax:ranges[v.length][1],introMin:130,introMax:160};}
const bodyText=d=>d.sections.map(s=>s.body).join('\n\n');
class ValidationError extends Error {
 constructor(issues){super('AI 초안을 확인해 주세요: '+issues.map(i=>i.message).join(' / ')+' 자동 재요청은 하지 않습니다.');this.name='ValidationError';this.code='INVALID_DRAFT';this.issues=issues;}
}
// Preserve meaningful spaces; normalize only equivalent Unicode/newlines and outer whitespace.
const clean=s=>typeof s==='string'?s.normalize('NFC').replace(/\r\n?/g,'\n').trim():s;
function validate(source,options,{allowLengthMismatch=false,allowEditorialMismatch=false}={}){
 const v=input(options), [min,max]=ranges[v.length], issues=[];
 const issue=(path,message)=>issues.push({path,message});
 if(!source||typeof source!=='object'||Array.isArray(source))throw new ValidationError([{path:'draft',message:'결과는 JSON 객체여야 합니다.'}]);
 const d={...source};
 const text=(value,path,label)=>{
  const result=clean(value);
  if(typeof result!=='string'||!result)issue(path,`${label}: 비어 있지 않은 문자열이 필요합니다.`);
  else if(len(result)>10000)issue(path,`${label}: 10000자 제한을 초과했습니다.`);
  return result;
 };
 function list(key,label,count,mapper){
  if(!Array.isArray(d[key])){issue(key,`${label}: 배열이 필요합니다.`);return null;}
  if(d[key].length<count[0]||d[key].length>count[1])issue(key,`${label}: 현재 ${d[key].length}개, ${count[0]===count[1]?count[0]:count.join('~')}개가 필요합니다.`);
  return d[key].map(mapper);
 }
 d.titles=list('titles','제목 후보',[3,3],(t,i)=>text(t,`titles[${i}]`,`제목 ${i+1}`));
 if(d.titles&&new Set(d.titles).size!==d.titles.length)issue('titles','제목 후보: 중복된 제목이 있습니다.');
 d.intro=text(d.intro,'intro','서론');
 if(!allowLengthMismatch&&typeof d.intro==='string'&&(len(d.intro)<130||len(d.intro)>160))issue('intro',`서론: 현재 ${len(d.intro)}자, 공백 포함 130~160자가 필요합니다.`);
 d.sections=list('sections','H2 본문',[3,8],(section,i)=>({
  heading:text(section?.heading,`sections[${i}].heading`,`H2 ${i+1} 소제목`),
  body:text(section?.body,`sections[${i}].body`,`H2 ${i+1} 본문`)
 }));
 if(!allowLengthMismatch&&d.sections?.every(s=>typeof s.body==='string')){
  const n=len(bodyText(d));if(n<min||n>max)issue('sections',`본문: 현재 ${n}자, 요청한 ${min}~${max}자가 필요합니다. H2 본문과 섹션 사이 빈 줄만 계산하며 서론·FAQ·결론은 제외합니다.`);
 }
 d.faq=list('faq','FAQ',[4,4],(f,i)=>({question:text(f?.question,`faq[${i}].question`,`FAQ ${i+1} 질문`),answer:text(f?.answer,`faq[${i}].answer`,`FAQ ${i+1} 답변`)}));
 d.conclusion=text(d.conclusion,'conclusion','결론');
 d.tags=list('tags','태그',[8,8],(t,i)=>text(t,`tags[${i}]`,`태그 ${i+1}`));
 if(d.tags&&new Set(d.tags).size!==d.tags.length)issue('tags','태그: 중복을 제거한 서로 다른 태그 8개가 필요합니다.');
 if(d.verificationNotes!==undefined&&(!Array.isArray(d.verificationNotes)||d.verificationNotes.length>12||!d.verificationNotes.every(s=>typeof s==='string'&&s.trim())))issue('verificationNotes','작성자 검증 메모: 12개 이하의 비어 있지 않은 문자열 배열이 필요합니다.');
 d.verificationNotes=Array.isArray(d.verificationNotes)?d.verificationNotes.map(clean).filter(s=>typeof s==='string'&&s).slice(0,12):[];
 if(!allowEditorialMismatch)issues.push(...publicationIssues(d));
 if(issues.length)throw new ValidationError(issues);
 return d;
}
function publicationIssues(d){
 const fields=[...(d.titles||[]).map((s,i)=>[`titles[${i}]`,s]),['intro',d.intro],...(d.sections||[]).flatMap((s,i)=>[[`sections[${i}].heading`,s.heading],[`sections[${i}].body`,s.body]]),...(d.faq||[]).flatMap((f,i)=>[[`faq[${i}].question`,f.question],[`faq[${i}].answer`,f.answer]]),['conclusion',d.conclusion],...(d.tags||[]).map((t,i)=>[`tags[${i}]`,t])];
 const meta=/(?:H2\s*[·:：]|(?:행동|판단\s*기준|준비\s*사항|예외|작성\s*가이드|(?:검증|확인)\s*필요)\s*[:：]|(?:^|\n)\s*복사\s*(?=$|\n)|<(?:h[1-6]|button)[\s>]|^\s*#{1,6}\s)/im;
 return fields.filter(([,s])=>typeof s==='string'&&meta.test(s)).map(([path,s])=>({path,message:`${path}: 작성용 표시(${s.match(meta)[0].trim()})가 남았습니다. 내용을 삭제만 하지 말고 독자가 읽는 자연스러운 문장으로 다시 작성하세요.`}));
}
function assertPublishable(d){const issues=publicationIssues(d);if(issues.length)throw new ValidationError(issues);}
function contentSignals(d){
 const text=bodyText(d);const sentences=text.split(/[.!?。！？\n]+/).map(s=>s.trim()).filter(Boolean);
 const key=s=>s.normalize('NFC').replace(/[\p{P}\p{Z}\s]/gu,'').toLowerCase();
 const normalized=sentences.filter(s=>len(s)>15).map(key);const duplicates=normalized.length-new Set(normalized).size;
 const grams=s=>new Set(Array.from({length:Math.max(0,s.length-2)},(_,i)=>s.slice(i,i+3)));
 let similarPairs=0;
 for(let i=0;i<normalized.length;i++)for(let j=i+1;j<normalized.length;j++){
  const x=normalized[i],y=normalized[j];if(x===y||Math.min(x.length,y.length)<30)continue;
  const a=grams(x),b=grams(y);let both=0;for(const g of a)if(b.has(g))both++;
  if(both/(a.size+b.size-both)>=0.75)similarPairs++;
 }
 return {duplicates,similarPairs,longSentences:sentences.filter(s=>len(s)>100).length,
  genericHeadings:d.sections.filter(s=>/^(기본\s*개념|핵심\s*정보|주의사항|마무리|결론|개요)$/.test(s.heading.trim())).length,
  sensitiveClaims:sentences.filter(s=>/\d+\s*(만원|원|월|일|%|세)|지원금액|신청기한|신청 기한|공식.{0,8}확인/.test(s)&&!/(검증|확인)\s*필요/.test(s)).length};
}
function quality(d,options){
 const k=input(options).keyword,body=bodyText(d),signals=contentSignals(d);
 return [
  `서론 ${len(d.intro)}자 · 본문 ${len(body)}자 (공백 포함)`,
  `제목 ${d.titles.length}개 · H2 ${d.sections.length}개 · FAQ ${d.faq.length}개 · 태그 ${d.tags.length}개`,
  d.titles.some(t=>t.includes(k))?'제목 키워드 포함 확인':'살펴보기: 제목에 핵심 키워드가 없습니다.',
  body.includes(k)?'본문 키워드 포함 확인':'살펴보기: 본문에 핵심 키워드가 없습니다.',
  `문장 반복 ${signals.duplicates}개 · 유사 문장 후보 ${signals.similarPairs}쌍 · 100자 초과 문장 ${signals.longSentences}개 · 추상적 H2 후보 ${signals.genericHeadings}개. 편집 참고용 탐지이며 의미 분석 결과가 아닙니다.`,
  `최신 정보 검토 후보 ${signals.sensitiveClaims}개 · 공식 출처 미조회: 정책·금액·기한은 검증 필요. ‘확인 필요’ 또는 ‘검증 필요’ 항목을 발행 전에 보완하세요.`,
  'SEO 편집 참고용입니다. 사실 여부·의미 품질·검색 순위는 판정하지 않습니다. 자연스러운 키워드 사용과 독자에게 필요한 답을 직접 검토하세요.'
 ];
}
function demo(options){
 const v=input(options), subject=len(v.keyword)>10?Array.from(v.keyword).slice(0,9).join('')+'…':v.keyword;
 const intro=`${subject}에 대해 무엇부터 알아봐야 할지 고민되나요? 이 샘플은 정보를 찾고 정리하는 흐름을 보여주기 위한 데모입니다. 실제 자격이나 가격, 절차를 확인한 글은 아니며, 필요한 근거와 적용 조건을 구분해 살펴보는 데 도움을 줍니다. 구체적인 답은 공식 자료 확인이 필요합니다.`;
 const headings=['주제의 범위와 먼저 알아둘 점','내 상황에 적용할 조건 살펴보기','확인할 자료와 진행 순서','예외와 주의사항 구분하기','확인 결과를 정리하는 방법'];
 const paragraphs=[
 '주제를 살펴볼 때는 먼저 알고 싶은 질문을 하나로 좁혀 보는 것이 좋습니다. 같은 단어를 사용하더라도 찾는 정보의 범위는 서로 다를 수 있습니다. 기본 개념을 이해하려는 경우와 구체적인 실행 방법을 찾는 경우에는 필요한 자료도 달라집니다. 이 데모에서는 실제 답을 대신 정하지 않고, 어떤 내용을 나누어 살펴볼 수 있는지 예시를 보여줍니다. 아직 확인하지 못한 내용도 있습니다. 해당 주제의 공식 정의와 최신 안내는 아직 대조하지 않았습니다.',
 '개인에게 적용되는 조건은 일반적인 소개 문구만으로 판단하기 어렵습니다. 이용 목적과 현재 상황을 나누어 적으면 어떤 부분을 더 확인해야 하는지 드러납니다. 특히 기준일이나 대상 범위처럼 판단에 영향을 주는 항목은 서로 섞지 않는 편이 좋습니다. 이 예시에는 특정인의 경험이나 자격 판정이 포함되어 있지 않습니다. 아직 확인하지 못한 내용도 있습니다. 실제 적용 조건과 제외 대상은 주제에 맞는 원문 자료를 통해 살펴봐야 합니다.',
 '자료를 읽을 때는 제목뿐 아니라 본문이 다루는 대상과 작성 시점을 함께 살펴볼 수 있습니다. 짧은 요약에서 빠진 조건이 원문에 있을 수 있으므로, 행동을 결정하기 전에는 세부 안내를 대조하는 과정이 필요합니다. 이 샘플은 접수처나 구체적인 절차를 임의로 제시하지 않습니다. 아직 확인하지 못한 내용도 있습니다. 진행 순서, 준비물, 비용이 있는지 여부는 아직 검증하지 않았으며, 실행 가능한 안내로 사용하려면 추가 확인이 필요합니다.',
 '정보를 정리하다 보면 보편적인 내용과 특정 상황에서만 적용되는 예외가 함께 등장할 수 있습니다. 조건이 다른 사례를 그대로 가져오면 자신의 상황과 맞지 않을 수 있으므로, 사례가 어떤 범위에서 설명되는지 구분해 읽는 것이 좋습니다. 이 글에는 실제 사용 후기나 성공 사례가 없습니다. 아직 확인하지 못한 내용도 있습니다. 주제별 위험 요소와 제한 사항은 관련 기관이나 제공자의 안내와 대조해야 하며, 이 데모만으로 결과를 예측할 수 없습니다.',
 '살펴본 내용을 마지막에 정리할 때는 확인된 항목과 아직 답을 찾지 못한 항목을 구분하면 도움이 됩니다. 질문별로 출처와 확인 시점을 남기면 이후 정보가 달라졌을 때 다시 검토하기도 쉬워집니다. 서로 다른 자료의 설명이 다르다면 적용 대상이나 기준일이 같은지부터 살펴볼 수 있습니다. 아직 확인하지 못한 내용도 있습니다. 이 샘플 자체는 사실 검증 자료가 아니므로, 실제 게시 전에는 남아 있는 질문에 답할 수 있는 원문을 확보해야 합니다.'
 ];
 const d={titles:[`${v.keyword}: 먼저 확인할 핵심 질문`,`${v.keyword}, 조건과 자료를 살펴보는 순서`,`${v.keyword}: 확인된 정보와 미확인 항목 구분`],intro,sections:headings.map((heading,i)=>({heading,body:paragraphs[i]})),faq:[
 {question:`${subject}의 구체적인 절차는 무엇인가요?`,answer:'아직 확인되지 않았습니다. 이 데모에는 공식 절차를 검증한 자료가 없어 순서를 확정하지 않습니다.'},
 {question:'비용이나 준비해야 할 서류가 있나요?',answer:'아직 확인되지 않았습니다. 대상과 이용 경로별 비용·필수 서류를 확인하지 않았습니다.'},
 {question:'누구나 같은 조건으로 이용할 수 있나요?',answer:'아직 확인되지 않았습니다. 적용 대상과 예외 조건을 확인하지 않아 개인별 판단을 할 수 없습니다.'},
 {question:'언제 결과를 확인할 수 있나요?',answer:'아직 확인되지 않았습니다. 처리 기간이나 결과 통보 방식에 대한 검증 자료가 없습니다.'}
 ],verificationNotes:['주제별 공식 출처, 적용 조건과 확인 날짜를 검토하세요. 이 메모는 발행 원고에 포함되지 않습니다.'],conclusion:'이 글은 AI 호출 없이 제공하는 화면 테스트용 샘플입니다. 실제 게시 전에는 주제별 공식 자료를 확인하고 미확인 항목을 보완하세요.',tags:[v.keyword,'정보확인','공식자료','적용조건','준비사항','주의사항','핵심질문','자료정리']};
 d.tags=[...new Set([...d.tags,'출처검토','정보정리'])].slice(0,8);
 const [min,max]=ranges[v.length];
 const supplements=[' 정보가 바뀔 수 있는 항목과 비교적 일정한 개념을 구분해 정리해 보세요.',' 판단 근거가 없는 부분은 추측으로 채우지 않고 확인 필요로 남겨 둡니다.',' 원문의 조건이 내 상황과 일치하는지도 함께 살펴볼 수 있습니다.',' 요약만으로 결론을 정하기보다 필요한 근거를 먼저 찾아보는 과정입니다.'];
 let i=0;while(len(bodyText(d))<min){const t=supplements[i%supplements.length];if(len(bodyText(d))+len(t)>max)break;d.sections[i%5].body+=t;i++;}
 return validate(d,v);
}
const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function bodyPlain(d){assertPublishable(d);return `${d.intro}\n\n${d.sections.map(s=>s.heading+'\n'+s.body).join('\n\n')}\n\n자주 묻는 질문\n${d.faq.map(f=>f.question+'\n'+f.answer).join('\n\n')}\n\n${d.conclusion}`;}
function plain(d,title=d.titles[0]){assertPublishable(d);return title+'\n\n'+bodyPlain(d);}
function html(d){assertPublishable(d);return '<p>'+escape(d.intro)+'</p>\n'+d.sections.map(s=>'<h2>'+escape(s.heading)+'</h2>\n'+s.body.split(/\n\s*\n/).map(p=>'<p>'+escape(p).replace(/\n/g,'<br>')+'</p>').join('\n')).join('\n')+'\n<h2>자주 묻는 질문</h2>'+d.faq.map(f=>'<h3>'+escape(f.question)+'</h3><p>'+escape(f.answer)+'</p>').join('\n')+'<p>'+escape(d.conclusion)+'</p>';}
return {input,schema,writingLimits,ValidationError,validate,quality,contentSignals,publicationIssues,demo,bodyText,len,bodyPlain,plain,html};
});
