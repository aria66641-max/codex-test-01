const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
(async () => {
 const browser = await chromium.launch({headless:true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {})});
 const page = await browser.newPage();
 const errors=[]; const requests=[];
 page.on('pageerror', e=>errors.push(e.message));
 page.on('request', r=>requests.push(r.url()));
 if (process.env.TEST_VIRTUAL_ORIGIN) {
  const fs=require('node:fs');
  await page.route('https://seo-test.local/**', route=>{
   const name=new URL(route.request().url()).pathname.slice(1)||'index.html';
   if (!['index.html','styles.css','app.js'].includes(name)) return route.abort();
   return route.fulfill({body:fs.readFileSync(path.resolve(__dirname,'..',name)),contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.css')?'text/css':'text/html'});
  });
  await page.goto('https://seo-test.local/');
 } else await page.goto('file://'+path.resolve(__dirname,'../index.html'));
 assert.equal(await page.locator('#empty').isVisible(),true);
 await page.fill('#keyword','   '); await page.click('button[type=submit]');
 assert.match(await page.locator('#form-error').innerText(),/1~60/);
 for (const platform of ['tistory','naver','wordpress']) {
  await page.selectOption('#platform',platform);
  await page.fill('#keyword','자취방 정리 방법'); await page.click('button[type=submit]');
  assert.equal(await page.locator('.card').count(),7);
  assert.match(await page.locator('#cards').innerText(),/실행·문제 해결/);
  assert.equal((await page.locator('.card .content').nth(1).innerText()).split('\n').length,3);
  const intro=await page.locator('.card .content').nth(3).innerText();
  assert.ok(Array.from(intro).length>=130 && Array.from(intro).length<=210);
  assert.equal((await page.locator('.card .content').nth(5).innerText()).match(/Q\./g).length,4);
  assert.equal((await page.locator('.card .content').nth(6).innerText()).split(', ').length,8);
 }
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true}));
 await page.click('#copy-html'); assert.equal(await page.locator('#copy-dialog').isVisible(),true);
 assert.match(await page.inputValue('#manual-copy'),/<h2>/); await page.click('#close-dialog');
 await page.evaluate(()=>{ window.copied=''; Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copied=text}},configurable:true}); });
 await page.click('#copy-text'); assert.match(await page.evaluate(()=>window.copied),/FAQ 4개/);
 await page.locator('.card button').first().click(); assert.match(await page.evaluate(()=>window.copied),/실행·문제 해결/);
 await page.click('#check'); assert.match(await page.locator('#check-results').innerText(),/본문을 입력/);
 await page.fill('#article-title','자취방 정리 방법, 처음 시작하는 안내');
 await page.fill('#article','## 자취방 정리 방법 기초\n\n자취방 정리 방법을 확인합니다.\n\n## 준비 사항\n\n출처를 확인하세요.');
 await page.click('#check'); assert.equal(await page.locator('.check-item').count(),7);
 assert.match(await page.locator('#check-results').innerText(),/2개 인식/);
 await page.fill('#article','<h2>자취방 정리 방법</h2><p>자취방 정리 방법을 확인하세요.</p><h2>준비</h2><script>window.injected=true</script>');
 await page.click('#check'); assert.match(await page.locator('#check-results').innerText(),/2개 인식/);
 assert.equal(await page.evaluate(()=>window.injected),undefined);
 await page.fill('#keyword','<img src=x onerror=alert(1)> & "테스트"'); await page.click('button[type=submit]');
 assert.equal(await page.locator('#cards img').count(),0);
 await page.click('#copy-html'); assert.match(await page.evaluate(()=>window.copied),/&lt;img/);
 for (const width of [375,768,1440]) {
  await page.setViewportSize({width,height:900});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`overflow at ${width}`);
 }
 assert.deepEqual(errors,[]);
 assert.equal(requests.some(url=>/^https?:/.test(url) && !url.startsWith('https://seo-test.local/')),false);
 await browser.close(); console.log('PASS: 정적 파일 실행, 3개 플랫폼, 생성 개수, 서론 길이, 복사·대체 복사, 빈 입력, Markdown/HTML 점검, XSS 방지, 375/768/1440px 반응형, 외부 요청 없음');
})().catch(e=>{console.error(e);process.exit(1)});
