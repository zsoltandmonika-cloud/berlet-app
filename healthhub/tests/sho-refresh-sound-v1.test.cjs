'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const code=fs.readFileSync(path.join(root,'sh9/shared/sho-refresh-sound-v1.js'),'utf8');
const pages=JSON.parse(fs.readFileSync(path.join(root,'sh9/shared/sho-refresh-sound-pages-v1.json'),'utf8'));
function run({type='reload',hidden=false,mute=false,blocked=false,unsupported=false,iframe=false,query='',broken=false}={}){
 const log={created:0,started:0,closed:0,stopped:0,timers:0},audioParam=()=>({setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
 let src;
 class Audio{
  constructor(){log.created++;this.state=blocked?'suspended':'running';this.sampleRate=48000;this.currentTime=1;this.destination={}}
  createBuffer(_,n){if(broken)throw Error('audio not available');return {getChannelData:()=>new Float32Array(n)}}
  createBufferSource(){return src={connect(){},start(){log.started++},stop(t){log.stopped=t}}}
  createBiquadFilter(){return {frequency:audioParam(),Q:{},connect(){}}}
  createGain(){return {gain:audioParam(),connect(){}}}
  close(){log.closed++;return Promise.resolve()}
 }
 const w={performance:{getEntriesByType:()=>[{type}]},location:{search:query},localStorage:{getItem:()=>mute?'off':null},
  AudioContext:unsupported?undefined:Audio,addEventListener(){},removeEventListener(){},
  setTimeout(){log.timers++;return 1},clearTimeout(){}};
 w.self=w;w.top=iframe?{}:w;
 const context={window:w,document:{hidden},URLSearchParams,Math};
 vm.runInNewContext(code,context);vm.runInNewContext(code,context);
 src?.onended?.();
 return log;
}
test('exactly one 180ms effect on reload, context released',()=>{
 assert.deepEqual(run(),{created:1,started:1,closed:1,stopped:1.18,timers:1});
});
test('navigation, back, hidden, muted, opt-out, embedded, unsupported stay silent',()=>{
 for(const args of [{type:'navigate'},{type:'back_forward'},{hidden:true},{mute:true},{query:'?shoRefreshSound=off'},{iframe:true},{unsupported:true}]){
  assert.equal(run(args).created,0);
 }
});
test('browser block or audio error closes context without retries or timers',()=>{
 for(const args of [{blocked:true},{broken:true}])assert.deepEqual(run(args),{created:1,started:0,closed:1,stopped:0,timers:0});
});
test('all scoped live pages have exactly one async hook and no audio dependency',()=>{
 assert.equal(pages.length,50);
 for(const p of pages){
  const html=fs.readFileSync(path.join(root,p),'utf8');
  assert.equal(html.split('<script async src="/berlet-app/sh9/shared/sho-refresh-sound-v1.js?v=1"></script>').length-1,1,p);
 }
 assert.doesNotMatch(code,/fetch\(|geolocation|\.resume\(|setInterval\(|preventDefault\(/);
});
