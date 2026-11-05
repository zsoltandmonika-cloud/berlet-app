'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const bridge=read('sh9/shared/sho-ticket-transfer-v1.js');
const reader=read('sh9/shared/sho-private-document-reader-v1.js');
const readerCss=read('sh9/shared/sho-private-document-reader-v1.css');
const walletJs=read('sh9/wallet/smart-valet-private-v7.js');
const wallet=read('sh9/wallet/index.html');
const trips=read('sh9/smart-travel/my-trips/my-trips-cloud-v1086.js');
const tripsHtml=read('sh9/smart-travel/my-trips/index.html');
const provenance=read('supabase/migrations/20261105145000_sho_valet_ecosystem_provenance_v8.sql');
const ATT='11111111-1111-4111-8111-111111111111', TRIP='tp-family-travel';
function fixture(opts={}){
 const input=opts.malformed?'Not a PDF':'%PDF-1.7\nOriginal travel ticket';
 const blob=new Blob([input],{type:'application/pdf'});
 const src={id:ATT,profile_key:'monika',trip_id:TRIP,file_name:'travel.pdf',
  file_type:'application/pdf',bytes:blob.size,storage_path:'monika/'+TRIP+'/'+ATT+'.pdf'};
 const events=[],rows=[],files=new Map();
 const w={crypto:webcrypto,localStorage:{getItem(k){return k==='hh-profile'?'m':null}}};
 const client={
  auth:{async getUser(){return {data:{user:{id:'signed-in-user'}},error:null}}},
  from(name){
   const q={name,filters:[],record:null,select(){return this},
    eq(k,v){this.filters.push([k,v]);return this},
    insert(row){this.record=row;events.push(['insert',name,row]);return this},
    update(p){this.record=p;events.push(['update',name,p]);return this},
    delete(){events.push(['delete',name]);return this},
    async maybeSingle(){
     if(name==='hh_profile_access')return{data:opts.noAccess?null:{profile_key:'monika'}};
     if(name==='hh_my_trip_attachments')return{data:src};
     return{data:null};
    },
    async single(){
     if(opts.duplicate&&name==='hh_valet_items'&&this.record?.sha256)
      return {data:null,error:{code:'23505',message:'duplicate file'}};
     rows.push(this.record);return{data:{id:this.record?.id},error:null};
    }};
   return q;
  },
  storage:{from(bucket){return{
   async download(p){events.push(['download',bucket,p]);return {data:blob,error:null}},
   async upload(p,file,opts){events.push(['upload',bucket,p,file.size,opts]);files.set(p,file);return {data:{path:p},error:null}},
   async remove(ps){events.push(['remove',bucket,ps]);return{data:[],error:null}}
  }}}
 };
 vm.runInNewContext(bridge,{window:w,console,Array,Uint8Array,Date,String,Object,Promise});
 return{api:w.SHO_TICKET_TRANSFER_V1,client,events,rows,files,src,blob};
}
test('My Trips private original copies to Smart Valet without moving/deleting source',async()=>{
 const f=fixture(),r=await f.api.copyMyTrips({client:f.client,profile:'monika',tripId:TRIP,attachmentId:ATT});
 assert.equal(r.ok,true);
 assert.equal(r.sourcePreserved,true);
 assert.equal(f.rows.length,2,'one immutable metadata insert, one uploaded timestamp update');
 const payload=f.rows[0];
 assert.equal(payload.source_module,'my_trips');
 assert.equal(payload.source_context_id,TRIP);
 assert.equal(payload.source_item_id,ATT);
 assert.equal(payload.profile_key,'monika');
 assert.equal(payload.file_name,'travel.pdf');
 assert.equal(payload.mime_type,'application/pdf');
 assert.match(payload.sha256,/^[a-f0-9]{64}$/);
 assert.equal(payload.storage_path,'monika/'+payload.id+'/original.pdf');
 assert.deepEqual(f.events.filter(x=>x[0]==='download').map(x=>x.slice(0,2)),[['download','hh-my-trip-tickets']]);
 assert.deepEqual(f.events.filter(x=>x[0]==='upload').map(x=>x.slice(0,2)),[['upload','hh-smart-valet-private']]);
 assert.equal(f.events.filter(x=>x[0]==='remove').length,0,'source is never removed');
 assert.equal(f.events.filter(x=>x[0]==='delete').length,0,'source metadata stays');
 assert.equal(await f.files.get(payload.storage_path).text(),await f.blob.text(),'original bytes must be identical');
});
test('unauthorized profile, malformed document and fake references fail without private upload',async()=>{
 for(const [opt,args] of [
  [{noAccess:true},{profile:'monika',tripId:TRIP,attachmentId:ATT}],
  [{malformed:true},{profile:'monika',tripId:TRIP,attachmentId:ATT}],
  [{},{profile:'zsolt',tripId:TRIP,attachmentId:ATT}],
  [{},{profile:'monika',tripId:'../../wrong',attachmentId:ATT}],
  [{},{profile:'monika',tripId:TRIP,attachmentId:'bad-file-id'}]
 ]){
  const f=fixture(opt);
  await assert.rejects(f.api.copyMyTrips({client:f.client,...args}));
  assert.equal(f.events.filter(x=>x[0]==='upload').length,0);
  assert.equal(f.events.filter(x=>x[0]==='remove').length,0);
 }
});
test('duplicate original reports already in Valet, never removes source',async()=>{
 const f=fixture({duplicate:true});
 await assert.rejects(f.api.copyMyTrips({client:f.client,profile:'monika',tripId:TRIP,attachmentId:ATT}),/már szerepel/);
 assert.equal(f.events.filter(x=>x[0]==='upload'||x[0]==='remove').length,0);
});
test('Smart Valet uses a real internal PDF canvas, not an iframe/webview browser PDF',()=>{
 assert.match(reader,/pdfjs-dist@6\.4\.299\/build\//);
 assert.match(reader,/getDocument\(\{data:bytes,isEvalSupported:false,enableScripting:false\}\)/);
 assert.match(reader,/numPages/);
 assert.match(reader,/canvas\.getContext\('2d'/);
 assert.match(reader,/4500000\/\(viewport\.width\*viewport\.height\)/);
 assert.match(reader,/shoPrPrevV1/);assert.match(reader,/shoPrNextV1/);
 assert.match(reader,/shoPrMinusV1/);assert.match(reader,/shoPrPlusV1/);
 assert.match(reader,/shoPrFitV1/);assert.match(reader,/shoPrDownloadV1/);
 assert.match(reader,/dialog\.showModal\(\)/);
 assert.match(reader,/w\.SHO_PRIVATE_DOCUMENT_READER_V1=Object\.freeze/);
 assert.match(readerCss,/\.sho-private-reader-v1\[open\]\{display:flex\}/);
 assert.doesNotMatch(walletJs,/<iframe|make\('iframe'/);
 assert.match(walletJs,/await reader\.open\(data,item\.file_name,\{mime:item\.mime_type\}\)/);
});
test('Valet production UI opens Add from whole tile, keeps Golden dock and images',()=>{
 assert.match(wallet,/sho-private-document-reader-v1\.js\?v=2-loyalty-image-zoom/);
 assert.match(wallet,/smart-valet-private-v7\.js\?v=10-coupon-gallery/);
 assert.match(wallet,/smart-valet-bkk-approved-v5\.js/);
 assert.match(wallet,/data-sh9-golden-bottom-nav="on"/);
 assert.match(walletJs,/addTile\.addEventListener\('click',event=>/);
 assert.match(walletJs,/openSheet\(\)/);
 assert.match(walletJs,/source_module==='my_trips'/);
 assert.match(walletJs,/valetTrip=/);
 assert.doesNotMatch(wallet,/get\('valetPilot'\)!=='v7'/);
});
test('My Trips exposes a safe explicit source copy and exact route return link',()=>{
 assert.match(trips,/copyToValet\(file,share,dialog\)/);
 assert.match(trips,/SHO_TICKET_TRANSFER_V1/);
 assert.match(tripsHtml,/sho-ticket-transfer-v1\.js\?v=1-my-trips-valet-copy/);
 assert.match(tripsHtml,/class="mt-valet-hub-link" href="\.\.\/\.\.\/wallet\/"/);
 assert.match(trips,/status\('✅ Jegy a Smart Valetben!/);
 assert.match(trips,/valetTrip/);
 assert.match(trips,/validId\(deepTrip\)/);
 assert.match(provenance,/source_module in \('manual','my_trips','sport','events'\)/);
 assert.match(provenance,/hh_valet_unique_origin_v8/);
 assert.doesNotMatch(bridge,/getPublicUrl|createSignedUrl|service_role/i);
});
