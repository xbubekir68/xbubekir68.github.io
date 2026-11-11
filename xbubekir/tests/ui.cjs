// Local browser regression tests; all provider calls are intercepted, no keys needed.
// Start: python -m http.server 8765 --bind 127.0.0.1 (repository root)
// Run: node xbubekir/tests/ui.cjs (requires playwright and Chromium)
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.XBU_TEST_URL||'http://127.0.0.1:8765/xbubekir/';
const out=process.env.XBU_TEST_ARTIFACTS||'/tmp/xbubekir-ui';
fs.mkdirSync(out,{recursive:true});
const settings={provider:'gemini',model:'gemini-3.8-flash',gmode:'key',gkey:'TEST-ONLY',ckey:'TEST-ONLY',name:'',about:'',style:'',effort:'low',web:true,models:{}};
const code='const message = "<script>alert(1)</script>";\nconsole.log(message);';
const cited={id:'cited',title:'Code mit Quellen',created:1,updated:2,provider:'claude',model:'claude-sonnet-5-5',system:'fixed',tools:[],msgs:[{role:'user',content:'Erkläre diesen JavaScript-Code.'},{role:'assistant',content:[{type:'text',text:'Die Konstante speichert einen Text.',citations:[{type:'web_search_result_location',url:'https://developer.mozilla.org/en-US/docs/Web/JavaScript',title:'MDN JavaScript',cited_text:'Die Konstante speichert einen Text.'}]},{type:'text',text:'\n\n```javascript\n'+code+'\n```\n\nكِتَابٌ (*kitābun*) = Buch.'}]}]};
const basic={id:'basic',title:'Testfrage',created:1,updated:1,provider:'gemini',model:'gemini-3.8-flash',system:'fixed',tools:[],msgs:[{role:'user',content:'Was ist 6 mal 7?'},{role:'assistant',content:[{text:'42.'}]}]};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 let checks=0;
 const audit=async(page,label)=>{
  if(!process.env.XBU_AXE_PATH)return;
  await page.evaluate(fs.readFileSync(process.env.XBU_AXE_PATH,'utf8'));
  const result=await page.evaluate(()=>axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
  fs.writeFileSync(out+'/axe-'+label+'.json',JSON.stringify(result,null,2));
  assert.deepEqual(result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)})),[]);
  ok('Axe accessibility: '+label);
 };
 const ok=label=>{checks++;console.log('OK',label)};
 try{
 const context=await browser.newContext({viewport:{width:1280,height:900},permissions:['clipboard-read','clipboard-write'],serviceWorkers:'block',reducedMotion:'reduce'});
 let failure=false,answer='Eine neue Antwort.',requests=[];
 await context.route('**/*',async route=>{
  const url=route.request().url();
  if(url.startsWith(base.replace('/xbubekir/','/')))return route.continue();
  if(url.includes('generativelanguage.googleapis.com')&&url.includes('streamGenerateContent')){
   requests.push(route.request().postDataJSON());
   if(failure)return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:{code:400,message:'Testfehler',status:'INVALID_ARGUMENT'}})});
   return route.fulfill({status:200,contentType:'text/event-stream',body:'data: '+JSON.stringify({candidates:[{content:{role:'model',parts:[{text:answer}]},finishReason:'STOP'}]})+'\n\n'});
  }
  return route.abort();
 });
 await context.addInitScript(s=>{if(!localStorage.getItem('xb.settings'))localStorage.setItem('xb.settings',JSON.stringify(s));},settings);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.locator('.starters').waitFor();await audit(page,'welcome');
 await page.getByRole('button',{name:'Text verbessern',exact:true}).click();assert.match(await page.locator('#inp').inputValue(),/Verbessere/);
 await page.getByRole('button',{name:'Arabisch üben',exact:true}).click();assert.match(await page.locator('#inp').inputValue(),/Verbessere/);ok('Starter fills draft and never overwrites it');
 await page.locator('#inp').fill('');
 await page.evaluate(async data=>{
  await new Promise((resolve,reject)=>{const r=indexedDB.open('xbubekir',1);r.onupgradeneeded=()=>r.result.createObjectStore('chats',{keyPath:'id'});r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,t=db.transaction('chats','readwrite');data.forEach(c=>t.objectStore('chats').put(c));t.oncomplete=()=>{db.close();resolve()};t.onerror=()=>reject(t.error)}});
 },[cited,basic]);
 await page.reload();await page.locator('#sideList [data-id="cited"]').click();
 assert.equal(await page.locator('.codeblock code').textContent(),code);
 assert.ok(await page.locator('.hljs-keyword').count());assert.equal(await page.locator('.msg.a script').count(),0);ok('Highlighted code is escaped without changing its text');
 await page.getByRole('button',{name:'Code kopieren',exact:true}).click();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),code);ok('Per-block clipboard copies exact raw code');
 await page.locator('[data-copy]').click();await page.locator('#toast').filter({hasText:'Antwort mit Quellen kopiert.'}).waitFor();const copied=await page.evaluate(()=>navigator.clipboard.readText());assert.match(copied,/\[1\]/);assert.match(copied,/https:\/\/developer.mozilla.org/);ok('Answer copy includes citation markers and URLs');
 await page.locator('[data-cite]').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'turn-0-source-1');ok('Citation marker focuses the matching source');
 assert.equal(await page.locator('section[aria-label="Du"]').count(),1);assert.equal(await page.locator('section[aria-label="xbubekir"]').count(),1);ok('Semantic speaker labels');
 await audit(page,'desktop-chat');await page.screenshot({path:out+'/desktop.png'});
 await page.setViewportSize({width:360,height:800});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.ok(await page.locator('#log').evaluate(e=>e.scrollWidth<=e.clientWidth));
 assert.ok(await page.locator('.codeblock pre').evaluate(e=>e.scrollWidth>e.clientWidth));
 await audit(page,'mobile-chat');await page.screenshot({path:out+'/mobile.png'});ok('360px layout contains overflow inside code block');
 await page.getByRole('button',{name:'Code erklären',exact:true}).click();assert.match(await page.locator('#inp').inputValue(),/Erkläre mir den Code/);await page.locator('#inp').fill('');ok('Contextual suggestion fills editable composer');
 await page.setViewportSize({width:1280,height:900});await page.locator('#sideList [data-id="basic"]').click();
 failure=true;await page.getByRole('button',{name:'Nochmal',exact:true}).click();await page.locator('.err').waitFor();assert.match(await page.locator('.msg.a').textContent(),/42\./);ok('Failed regeneration keeps original answer');
 failure=false;await page.getByRole('button',{name:'Nochmal',exact:true}).click();await page.locator('.variants').waitFor();assert.match(await page.locator('.msg.a').textContent(),/Eine neue Antwort/);
 await page.getByRole('button',{name:'Vorherige Antwortvariante',exact:true}).click();await page.locator('.msg.a').filter({hasText:'42.'}).waitFor();assert.match(await page.locator('.msg.a').textContent(),/42\./);
 await page.getByRole('button',{name:'Nächste Antwortvariante',exact:true}).click();await page.locator('.msg.a').filter({hasText:'Eine neue Antwort.'}).waitFor();assert.match(await page.locator('.msg.a').textContent(),/Eine neue Antwort/);ok('Successful regeneration adds switchable versions');
 await page.reload();await page.locator('#sideList [data-id="basic"]').click();assert.match(await page.locator('.variants').textContent(),/2 von 2/);ok('Versions persist across reload');
 answer='Antwort im neuen Chat.';await page.getByRole('button',{name:'Bearbeiten',exact:true}).click();await page.locator('#editText').fill('Was ist 8 mal 7?');await page.getByRole('button',{name:'Neuen Chat starten',exact:true}).click();await page.locator('.msg.a').filter({hasText:'Antwort im neuen Chat.'}).waitFor();
 assert.equal(requests.at(-1).contents.at(-1).parts[0].text,'Was ist 8 mal 7?');
 await page.locator('#sideList [data-id="basic"]').click();assert.match(await page.locator('.bub').textContent(),/6 mal 7/);ok('Editing forks context without overwriting original');
 await page.locator('#bSet').click();await audit(page,'settings');await page.locator('#sModel').selectOption('gemini-3.5-flash-lite');await page.locator('#bSave').click();await page.locator('.hello').waitFor();assert.match(await page.locator('#bBrain').textContent(),/Flash-Lite/);ok('Settings model change starts a new chat just like quick picker');
 // Clipboard denial must be visible.
 await page.locator('#sideList [data-id="cited"]').click();
 await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{write:()=>Promise.reject(Error('denied')),writeText:()=>Promise.reject(Error('denied'))}})});
 await page.getByRole('button',{name:'Code kopieren',exact:true}).click();await page.locator('#toast').filter({hasText:'nicht kopiert'}).waitFor();ok('Clipboard failure is visible');
 // IndexedDB write failures must leave a visible persistent warning.
 await page.evaluate(()=>{IDBObjectStore.prototype.put=function(){throw new DOMException('Full','QuotaExceededError')}});
 await page.locator('#sideList [data-id="basic"]').click();await page.getByRole('button',{name:'Vorherige Antwortvariante',exact:true}).click();await page.locator('#storageNotice').waitFor();ok('Storage failure is visible');
 // Keyboard: browser-native dialog trap and Escape restore the opener.
 await page.getByRole('button',{name:'Bearbeiten',exact:true}).click();await page.keyboard.press('Escape');assert.equal(await page.locator('#dEdit').evaluate(e=>e.open),false);ok('Edit dialog supports Escape');
 // Narrow/reflow and reduced motion.
 for(const viewport of [{width:320,height:700},{width:720,height:400}]){await page.setViewportSize(viewport);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));}
 await page.setViewportSize({width:1280,height:900});await page.evaluate(()=>document.body.style.zoom='2');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));ok('200% zoom does not overflow the page');
 assert.equal(errors.length,0,errors.join('\n'));ok('No runtime errors, narrow and landscape reflow');
 await context.close();console.log(`${checks} browser checks passed. Screenshots: ${out}`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
