const { chromium } = require('playwright');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await chromium.launch();
  const p=await b.newPage({viewport:{width:900,height:1000}});
  const msgs=[];
  p.on('console', m=>{ const t=m.text(); if(/error|fail|cannot|expect|Hud|compile/i.test(t)) msgs.push(m.type()+': '+t.slice(0,300)); });
  p.on('pageerror', e=>msgs.push('PAGEERROR: '+String(e.message).slice(0,300)));
  await p.goto('http://127.0.0.1:7456/', {waitUntil:'domcontentloaded', timeout:60000});
  await p.waitForSelector('canvas',{timeout:60000});
  await sleep(15000);
  console.log(msgs.length? msgs.slice(0,15).join('\n') : '（没有相关错误）');
  await b.close();
})();
