/* HealthHub Smart Lunch v1179 · pure and strictly non-PII Interfood parser.
 * Never return full Microsoft Outlook message text or delivery/customer metadata.
 */
export function normalizeDish(value){
 return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
}
export function graphBodyText(body){
 const content=String(body?.content||'').slice(0,100000);
 if(String(body?.contentType||'').toLowerCase()==='text')return content;
 return content.replace(/<(?:br|\/p|\/div|\/tr|\/li)\b[^>]*>/gi,'\n')
  .replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ')
  .replace(/&amp;/gi,'&').replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
}
const macroNumber='(\\d+(?:[.,]\\d+)?)';
const macroRE=new RegExp('^\\(?\\s*'+macroNumber+'\\s*kcal\\s*[,;]\\s*'+
 macroNumber+'\\s*g\\s*(?:szénh\\.?|szénhidrát)\\s*[,;]\\s*'+
 macroNumber+'\\s*g\\s*fehérje\\s*[,;]\\s*'+
 macroNumber+'\\s*g\\s*zsír\\s*\\)?','i');
const rowRE=/^([A-Z][A-Z0-9]{0,7})\s+(\d{1,2})\s+adag\s+(.{2,140}?)\s*:\s*[\d\s.,]+\s*Ft\b/i;
const dayRE=/^(\d{4})[-./](\d{2})[-./](\d{2})\s+(hétfő|kedd|szerda|csütörtök|péntek|szombat|vasárnap)(?:\s|$)/i;
export function parseConfirmedMail(body){
 const lines=graphBodyText(body).split(/\r?\n/).map(x=>x.trim());
 const meals=[];let day=null;
 for(let i=0;i<lines.length;i++){
  const date=lines[i].match(dayRE);
  if(date){
   const candidate=date[1]+'-'+date[2]+'-'+date[3];
   const parsed=new Date(candidate+'T12:00:00Z');
   day=Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===candidate?candidate:null;
   continue;
  }
  if(!day)continue;
  const line=lines[i].replace(/^\*\*([A-Z][A-Z0-9]{0,7})\*\*\s+/,'$1 ');
  const meal=line.match(rowRE);
  if(!meal)continue;
  const macro=lines.slice(i+1,i+4).map(s=>s.match(macroRE)).find(Boolean);
  if(!macro)continue;
  const parse=n=>Number(String(n).replace(',','.'));
  const nutrients={kcal:parse(macro[1]),carbs:parse(macro[2]),protein:parse(macro[3]),fat:parse(macro[4])};
  const quantity=Number(meal[2]);
  if(!Number.isInteger(quantity)||quantity<1||quantity>10||
   !Object.values(nutrients).every(n=>Number.isFinite(n)&&n>=0&&n<=5000))continue;
  const name=meal[3].trim().replace(/\s+/g,' ').slice(0,100);
  if(name.length<2)continue;
  meals.push({menuDate:day,code:meal[1].toUpperCase(),name,quantity,nutrients});
 }
 return meals.slice(0,70);
}
export function validImage(value){
 try{
  const u=new URL(String(value||'')),p=u.searchParams;
  return u.protocol==='https:'&&u.hostname==='ia.interfood.hu'&&
   u.pathname==='/api/v1/i'&&[...p.keys()].sort().join(',')==='height,menu_item_id,width'&&
   /^[1-9][0-9]{0,9}$/.test(p.get('menu_item_id')||'')&&
   p.get('width')==='425'&&p.get('height')==='425'?u.href:null;
 }catch(_){return null}
}
export function matchOfficial(order,feed){
 const candidates=(Array.isArray(feed?.items)?feed.items:[]).filter(item=>
  item.menuDate===order.menuDate&&item.code===order.code&&
  normalizeDish(item.name)===normalizeDish(order.name)&&
  ['kcal','protein','carbs','fat'].every(k=>item.nutrients?.[k]!=null&&
   Math.abs(Number(item.nutrients[k])-Number(order.nutrients[k]))<.011));
 if(candidates.length!==1)return {weightGrams:null,imageUrl:null};
 const item=candidates[0],grams=item.weightGrams==null?null:Number(item.weightGrams);
 return {weightGrams:Number.isFinite(grams)&&grams>0&&grams<=3000?grams:null,
  imageUrl:validImage(item.imageUrl)};
}
