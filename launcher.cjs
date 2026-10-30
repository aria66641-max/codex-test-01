'use strict';
const fs=require('node:fs');const path=require('node:path');const {spawn}=require('node:child_process');
const root=__dirname;
function loadConfig({filename=path.join(root,'.env'),env=process.env}={}){
 if(Number(process.versions.node.split('.')[0])<20)throw Error('Node.js 20 이상을 설치하세요.');
 if(!fs.existsSync(filename)){
  fs.copyFileSync(path.join(root,'.env.example'),filename,fs.constants.COPYFILE_EXCL);
  console.log('.env 파일이 없어 키가 없는 데모 설정을 만들었습니다.');
 }
 const values=Object.create(null);
 for(const line of fs.readFileSync(filename,'utf8').replace(/^\uFEFF/,'').split(/\r?\n/)){
  if(!line.trim()||line.trim().startsWith('#'))continue;
  const match=line.match(/^([A-Z_]+)\s*=\s*(.*?)\s*$/);if(!match)throw Error('.env 형식이 잘못되었습니다. KEY=value 형식으로 작성하세요.');
  let value=match[2];if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'")))value=value.slice(1,-1);
  if(!['ENABLE_LIVE_AI','OPENAI_API_KEY','OPENAI_MODEL','PORT'].includes(match[1]))continue;
  values[match[1]]=value;
 }
 const config={...env,...values};
 if(!['true','false'].includes(config.ENABLE_LIVE_AI||'false'))throw Error('ENABLE_LIVE_AI는 true 또는 false여야 합니다.');
 if(config.ENABLE_LIVE_AI==='true'&&(!config.OPENAI_API_KEY?.trim()||!config.OPENAI_MODEL?.trim()))throw Error('실제 AI 모드에는 .env의 OPENAI_API_KEY와 OPENAI_MODEL 설정이 필요합니다. 값은 화면에 표시하지 않습니다.');
 if(String(config.PORT||'3000')!=='3000')throw Error('일반 실행기는 PORT=3000만 지원합니다.');
 config.PORT='3000';return config;
}
async function start({openBrowser=true}={}){
 const env=loadConfig();const {createServer}=require('./server/index.cjs');const server=createServer({env});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(3000,'127.0.0.1',resolve);});
 console.log('SEO 도구 실행: http://127.0.0.1:3000');console.log(env.ENABLE_LIVE_AI==='true'?'실제 AI 설정 활성화 · 생성 버튼을 누를 때만 유료 요청':'데모 모드 · API 요청 없음');console.log('종료하려면 이 창을 닫거나 Ctrl+C를 누르세요.');
 if(openBrowser){const url='http://127.0.0.1:3000';let child;
  if(process.platform==='win32')child=spawn('rundll32',['url.dll,FileProtocolHandler',url],{stdio:'ignore'});
  else if(process.platform==='darwin')child=spawn('open',[url],{stdio:'ignore'});
  else child=spawn('xdg-open',[url],{stdio:'ignore'});
  child.on('error',()=>console.log('브라우저 자동 열기 실패: http://127.0.0.1:3000을 직접 여세요.'));child.unref();
 }
 return server;
}
if(require.main===module)start().catch(e=>{console.error(e.code==='EADDRINUSE'?'3000 포트를 사용 중입니다. 이전 실행 창을 닫고 다시 실행하세요.':e.message);process.exitCode=1;});
module.exports={loadConfig,start};
