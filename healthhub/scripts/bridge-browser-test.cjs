const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {chromium} = require('../../.tooling/node_modules/playwright');
const root = path.resolve('.');
const out = path.join(root,'artifacts');fs.mkdirSync(out,{recursive:true});
const server = http.createServer((req,res)=>{
  if(req.url==='/__test'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head></head><body></body></html>');return}
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  const target=fs.existsSync(file)&&fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
  if(!fs.existsSync(target)){res.writeHead(404);res.end();return}
  const type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp'}[path.extname(target)]||'application/octet-stream';
  res.setHeader('Content-Type',type);fs.createReadStream(target).pipe(res);
});
(async()=>{
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const results=[];
  try {
    for(const mobile of [false,true]){
      const context=await browser.newContext({viewport:mobile?{width:393,height:852}:{width:1280,height:900},userAgent:mobile?'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36':undefined});
      // No live health service is contacted by browser tests.
      await context.route('**/*', route=>route.request().url().startsWith(origin)?route.continue():route.abort());
      let page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.stack));
      await page.goto(origin+'/healthhub/');
      await page.waitForFunction(()=>!!window.HHBridgeControl&&!!window.hhSyncNow);
      await page.evaluate(()=>window.haOpen());
      await page.waitForFunction(()=>document.documentElement.dataset.healthhubBridgeAdminReady==='1');
      await page.locator('#hhHealthConnect306').waitFor();
      await page.locator('#hhHealthConnect306').screenshot({path:path.join(out,mobile?'admin-integrated-mobile.png':'admin-integrated-desktop.png')});
      await page.evaluate(()=>window.haClose());
      assert.equal(await page.locator('script[src*="live-v306"]').count(),1);
      results.push({test:mobile?'full mobile boot':'full desktop boot',errors});
      assert.equal(errors.length,0,'Full app boot must have no uncaught exceptions: '+errors.join('\n'));
      await page.screenshot({path:path.join(out,mobile?'healthhub-mobile.png':'healthhub-desktop.png')});
      await page.close();
      page=await context.newPage();
      await page.goto(origin+'/__test');
      await page.setContent('<html><head></head><body style="background:#f9f2f6;color:#66334a"><div id="haOv" class="on"><div id="haBody"></div></div></body></html>');
      await page.evaluate(()=>{
        localStorage.setItem('hh-profile','z');
        window.testFiles={};window.testImports=0;
        window.testDevices=['zsolt','monika'].map(p=>({schema:'healthhub.orchestrator.device/1',deviceId:'android-'+p,deviceType:'android',protocolVersion:2,activeProfile:p,name:p==='zsolt'?'Zsolt S24 Ultra':'Mónika telefonja',build:'0.11.0',lastSeenAt:new Date().toISOString(),healthConnectAvailable:true,permissions:{READ_STEPS:true,READ_SLEEP:false},backgroundSupported:true,backgroundGranted:false,counts:{stepDays:2}}));
        testDevices.forEach(d=>testFiles['/HealthHub/orchestrator/devices/'+d.deviceId+'.json']=d);
        window.HH_DROPBOX_VAULT={connected:()=>true,accessToken:async()=> 'mock',uploadJson:async(p,v)=>{testFiles[p]=v},downloadJson:async p=>testFiles[p]||null};
        window.hhHealthCloudSyncProfile=async()=>{testImports++;return true};
        window.fetch=async(url,opts)=>{
          const body=JSON.parse(opts.body);
          if(url.endsWith('/list_folder'))return {ok:true,json:async()=>({entries:Object.keys(testFiles).filter(p=>p.startsWith(body.path+'/')&&!p.slice(body.path.length+1).includes('/')).map(p=>({'.tag':'file',name:p.split('/').pop(),path_display:p})),has_more:false})};
          return {ok:true,json:async()=>({})};
        };
      });
      await page.addScriptTag({path:'healthhub/bridge-control.js'});
      await page.addScriptTag({path:'healthhub/live-v306.js'});
      const panel=page.locator('#hhHealthConnect306');await panel.waitFor();
      await page.locator('[data-sync="android-zsolt"]').waitFor();
      assert.equal(await panel.locator('[data-sync]').count(),1);
      await panel.locator('select').selectOption('7');
      await panel.locator('[data-sync]').click();
      await page.waitForFunction(()=>Object.values(testFiles).some(f=>f.schema==='healthhub.bridge.request/2'));
      let cmd=await page.evaluate(()=>Object.values(testFiles).find(f=>f.schema==='healthhub.bridge.request/2'));
      assert.equal(cmd.days,7);assert.equal(cmd.profile,'zsolt');
      await page.waitForFunction(()=>document.querySelector('#hhHealthConnect306').textContent.includes('Telefonra vár'));
      await page.evaluate(()=>{
        const c=Object.values(testFiles).find(f=>f.schema==='healthhub.bridge.request/2');
        testFiles['/HealthHub/orchestrator/results/'+c.targetDeviceId+'/'+c.requestId+'.json']={requestId:c.requestId,deviceId:c.targetDeviceId,profile:c.profile,state:'done',message:'Tesztfeltöltés visszaigazolva'};
      });
      await panel.locator('#hc306refresh').click();
      await page.waitForFunction(()=>testImports===1);
      await page.screenshot({path:path.join(out,mobile?'admin-health-connect-mobile.png':'admin-health-connect-desktop.png'),fullPage:true});
      await page.evaluate(()=>{localStorage.setItem('hh-profile','m');window.dispatchEvent(new CustomEvent('healthhub:profile-changed'))});
      await panel.locator('[data-sync="android-monika"]').waitFor();
      assert.equal(await panel.locator('[data-sync="android-zsolt"]').count(),0);
      assert.equal(await panel.evaluate(e=>getComputedStyle(e).color),'rgb(102, 51, 74)');
      assert.equal(await panel.locator('[data-native="settings"]').count(),mobile?1:0);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      results.push({test:mobile?'mobile Admin + queue + completion + profile/theme':'desktop Admin + queue + completion + profile/theme',passed:true});
      await context.close();
    }
    fs.writeFileSync(path.join(out,'browser-test-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
  } finally {await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
