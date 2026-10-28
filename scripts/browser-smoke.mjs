// Local, synthetic-only browser acceptance. Requires Chromium; no npm dependency.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { ROOT } from './validate-catalog.mjs';

const evidence = process.argv[2]; assert(evidence?.startsWith('/tmp/veynrel-site-') && !evidence.includes('..') && !fs.existsSync(evidence));
fs.mkdirSync(evidence, { recursive: true });
const requests = [], browserRequests = [], errors = [], checks = [], screenshots = [];
const server = createServer((req, res) => {
  requests.push({ method: req.method, url: req.url });
  if (!req.url.startsWith('/veynrel-recipes/') || req.method !== 'GET') { res.writeHead(404); res.end(); return; }
  const rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname.slice('/veynrel-recipes/'.length));
  if (rel.includes('..') || rel.includes('\\') || rel.includes('?')) { res.writeHead(400); res.end(); return; }
  const file = path.join(ROOT, 'dist', rel === '' || rel.endsWith('/') ? rel + 'index.html' : rel);
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.svg') ? 'image/svg+xml' : 'application/json'); res.end(fs.readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = process.env.SITE_PUBLIC === "1" ? "https://zinverno.github.io/veynrel-recipes/" : `http://127.0.0.1:${server.address().port}/veynrel-recipes/`;
const child = spawn('/usr/bin/chromium', ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${evidence}/profile`, '--remote-debugging-port=9291', url], { stdio: ['ignore','ignore',fs.openSync(`${evidence}/browser.log`,'a')] });
const pause = ms => new Promise(r => setTimeout(r, ms)); let socket, seq=0; const pending = new Map();
const cdp=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++seq,{resolve,reject});socket.send(JSON.stringify({id:seq,method,params}));});
const ev=async expression=>{const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});assert(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
const wait=async expression=>{for(let i=0;i<150;i++){if(await ev(expression))return;await pause(50);}throw Error(`Timeout: ${expression}`);};
const pass=async(name,expression)=>{assert(await ev(expression),name);checks.push(name);};
const shot=async name=>{fs.writeFileSync(`${evidence}/${name}.png`,Buffer.from((await cdp('Page.captureScreenshot',{format:'png'})).data,'base64'));screenshots.push(`${name}.png`);};
let status='FAIL';
try{
  let page;for(let i=0;i<150;i++){try{page=(await(await fetch('http://127.0.0.1:9291/json/list')).json()).find(p=>p.type==='page');}catch{}if(page)break;await pause(100);}assert(page);
  socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.method==='Network.requestWillBeSent')browserRequests.push({url:m.params.request.url,method:m.params.request.method,hasBody:!!m.params.request.postData});if(m.method==='Runtime.exceptionThrown'||m.method==='Log.entryAdded'&&m.params.entry.level==='error')errors.push(m.params);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}};
  await cdp('Runtime.enable');await cdp('Log.enable');await cdp('Page.enable');await cdp('Network.enable');await cdp('Page.navigate',{url});await wait("document.readyState==='complete'&&document.querySelector('#results')?.textContent.includes('recipes')");
  await pass('Eight real static recipe links are rendered',"document.querySelectorAll('[data-recipe]').length===8");
  await ev("{const e=document.querySelector('#search');e.focus();e.value='лекция';e.dispatchEvent(new Event('input'))}void 0");await pass('Search matches Russian tags',"document.querySelectorAll('[data-recipe]:not([hidden])').length===1");
  await ev("{const e=document.querySelector('#search');e.value='';e.dispatchEvent(new Event('input'));const c=document.querySelector('#category');c.value='work';c.dispatchEvent(new Event('change'))}void 0");await pass('Work category contains two recipes',"document.querySelectorAll('[data-recipe]:not([hidden])').length===2");
  await ev("{const c=document.querySelector('#category');c.value='all';c.dispatchEvent(new Event('change'))}void 0");
  for(const theme of ['dark','light'])for(const width of [1200,390]){
    await cdp('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:theme}]});await cdp('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    await pass(`${theme}/${width}: no horizontal overflow`, 'document.documentElement.scrollWidth<=innerWidth');await ev("window.scrollTo(0,0);void 0");await shot(`catalog-${theme}-${width}`);
  }
  await ev("{const l=document.querySelector('#language');l.value='ru';l.dispatchEvent(new Event('change'));}void 0");
  await pass('Russian switch exposes one language and retains catalog', "document.documentElement.lang==='ru'&&document.querySelector('h1').innerText==='Что сделать с заметкой?'&&document.querySelectorAll('[data-lang=en]:not([hidden])').length===0");await shot('catalog-ru-light-390');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});await shot('catalog-ru-light-1440');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1024,height:1000,deviceScaleFactor:1,mobile:false});await shot('catalog-ru-light-1024');
  await cdp('Page.navigate',{url:url+'recipes/lecture-outline/1.0.0/'});await wait("document.querySelector('h1')?.innerText==='Lecture outline'");
  await pass('Static detail exposes full instruction, examples, author, version and hash',"document.body.textContent.includes('Structure a lecture')&&document.body.textContent.includes('Eviction policies')&&document.body.textContent.includes('SHA-256')&&!!document.querySelector('a[download]')");
  await pass('Detail has no horizontal overflow at narrow width','document.documentElement.scrollWidth<=innerWidth');await shot('detail-light-390');
  const href=await ev("document.querySelector('a[download]').href");assert(href.startsWith(url));const download=await(await fetch(href)).json();assert.equal(download.id,'user.lecture-outline');checks.push('Recipe JSON download matches identity');
  const tree=await cdp('Accessibility.getFullAXTree');assert(tree.nodes.some(n=>n.role?.value==='heading'&&n.name?.value==='Lecture outline'));checks.push('Accessible heading and download link are exposed');
  await cdp('Page.navigate',{url:url+'contribute/'});await wait("document.querySelector('h1')?.innerText==='Share a useful workflow.'");await pass('Submission path links to fork and pull request',"!!document.querySelector('a[href=\"https://github.com/zinverno/veynrel-recipes/compare\"]')&&document.body.textContent.includes('submission.json')");
  await cdp('Emulation.setScriptExecutionDisabled',{value:true});await cdp('Page.navigate',{url});await wait("document.querySelectorAll('[data-recipe]').length===8");
  await pass('Without JavaScript all static recipe links and both translations remain accessible', "document.querySelectorAll('[data-lang][hidden]').length===0&&document.querySelectorAll('[data-recipe] a[href]').length===16");await shot('catalog-no-js');
  assert(requests.every(r=>r.method==='GET'));assert(browserRequests.every(r=>r.method==='GET'&&!r.hasBody&&r.url.startsWith(url)));assert.equal(errors.length,0,JSON.stringify(errors));checks.push('No browser errors; website serves only GET static resources');status='PASS';
}catch(e){errors.push(String(e));console.error(e);process.exitCode=1;}
finally{fs.writeFileSync(`${evidence}/report.json`,JSON.stringify({status,url,checks,screenshots,errors,requests,browserRequests},null,2));socket?.close();child.kill('SIGTERM');server.close();}
