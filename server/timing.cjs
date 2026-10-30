'use strict';
const LIMITS=Object.freeze({providerMs:180000,operationMs:200000,browserMs:215000,socketMs:230000,uploadMs:30000,retentionMs:1800000});
class DeadlineError extends Error{constructor(stage){super(stage==='provider'?'OpenAI 응답 대기 180초 제한을 초과했습니다.':'로컬 서버 처리 시간 제한을 초과했습니다.');this.name='DeadlineError';this.stage=stage;}}
async function deadline(task,{ms,stage,signal}={}){
 const controller=new AbortController();let timer,listener;
 const stop=new Promise((_,reject)=>{
  const abort=reason=>{controller.abort(reason);reject(reason);};
  listener=()=>abort(signal.reason||new DeadlineError(stage));
  if(signal?.aborted)listener();else signal?.addEventListener('abort',listener,{once:true});
  timer=setTimeout(()=>abort(new DeadlineError(stage)),ms);
 });
 try{return await Promise.race([stop,Promise.resolve().then(()=>{if(controller.signal.aborted)throw controller.signal.reason;return task(controller.signal);})]);}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',listener);}
}
module.exports={LIMITS,DeadlineError,deadline};
