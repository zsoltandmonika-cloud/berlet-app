/* Cookbook AI transport: family HealthHub login, no vendor key in browser.
 * No request to Cloudflare is made until the authenticated user invokes an AI feature.
 * No paid provider fallback. */
(function(w){
'use strict';
const cloud=()=>w.HH_RECIPE_OWN_CLOUD_V1;
const ready=()=>typeof cloud()?.cookbookAi==='function';
function error(code,message){const e=new Error(message||code);e.code=code;return e}
async function request(operation,extra={}){
 if(!ready())throw error('client_not_configured','A HealthHub AI kapcsolat nem töltődött be.');
 const result=await cloud().cookbookAi({schema:'cookbook.ai/1',operation,...extra});
 if(!result?.ok)throw error(result?.error||'provider_unavailable',result?.message||result?.error||'Az AI nem érhető el.');
 return result;
}
async function status(){return request('status')}
async function ensureReady(){const r=await status();if(!r.ready)throw error(r.reason||'pilot_disabled','A Cookbook AI pilot még nem aktív: '+(r.reason||'konfiguráció szükséges'));return r}
async function photoData(file){
 if(!(file instanceof Blob)||!/^image\//.test(file.type)||file.size>25*1024*1024)throw error('invalid_photo','Csak legfeljebb 25 MB méretű kép küldhető.');
 const bmp=await createImageBitmap(file);
 try{
 const max=1800,scale=Math.min(1,max/Math.max(bmp.width,bmp.height));
 const c=document.createElement('canvas');c.width=Math.max(1,Math.round(bmp.width*scale));c.height=Math.max(1,Math.round(bmp.height*scale));
 const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(bmp,0,0,c.width,c.height);
 for(const q of [.86,.73,.60,.48]){const data=c.toDataURL('image/jpeg',q).split(',')[1];if(data&&data.length<=1500000)return {mime:'image/jpeg',base64:data}}
 throw error('photo_too_large','A fotó túl nagy. Válassz kisebb képet.');
 }finally{bmp.close()}
}
async function text(prompt){const r=await request('text',{prompt:String(prompt),consent:true});if(typeof r.text!=='string'||!r.text.trim())throw error('empty_provider_response');return r.text}
async function vision(prompt,file){
 if(!w.confirm('A kiválasztott fotót és a receptkérést a Cloudflare képelemző szolgáltatásának küldjük. Folytatod?'))throw error('photo_cancelled','A képelemzést megszakítottad.');
 const photo=await photoData(file),r=await request('vision',{prompt:String(prompt),photo,consent:true,photoConsent:true});if(typeof r.text!=='string'||!r.text.trim())throw error('empty_provider_response');return r.text
}
async function image(prompt,kind='hero'){const r=await request('image',{prompt:String(prompt),kind:kind==='steps'?'steps':'hero',consent:true});if(!['image/jpeg','image/png','image/webp'].includes(r.mime)||typeof r.base64!=='string'||r.base64.length>8000000)throw error('invalid_provider_image');const raw=atob(r.base64),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:r.mime})}
w.LENA_COOKBOOK_AI_V2=Object.freeze({available:ready,status,ensureReady,text,vision,image});
})(window);
