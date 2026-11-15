/* SHO Book Studio · Hungarian metadata, conservative duplicate grouping (V4).
 * Presentation and per-profile overrides only; never rename/delete OneDrive files.
 */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SH9_BOOK_METADATA_V4=api;
})(typeof window==='object'?window:null,function(){
 'use strict';
 const text=x=>String(x||'').trim().replace(/\s+/g,' ');
 const accents=x=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('hu-HU');
 const normAuthor=x=>accents(x).replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
 const CATALOG=[
  [/^a\s*kis\s*herceg$/i,['A kis herceg','Antoine de Saint-Exupéry']],
  [/^a\s*bankar$/i,['A bankár','Frei Tamás']],
  [/^agrarbarok$/i,['Agrárbárók','Frei Tamás']],
  [/^a\s*megmento$/i,['A Megmentő','Frei Tamás']],
  [/^tuskevar$/i,['Tüskevár','Fekete István']],
  [/^negyven\s*kabat\s*es\s*egy\s*gomb$/i,['Negyven kabát és egy gomb','Ivan Sciapeconi']],
  [/^a\s*gonosz$/i,['A gonosz','Alex Kava']],
  [/^a\s*lincoln\s*mitosz$/i,['A Lincoln-mítosz','Steve Berry']],
  [/^a\s*kuldetes$/i,['A küldetés','Wilbur Smith']],
  [/^arctalan\s*demonok$/i,['Arctalan démonok','John Connolly']],
  [/^alaskaban\s*vadasztam$/i,['Alaszkában vadásztam','Széchenyi Zsigmond']],
  [/^perujrafelvetel$/i,['Perújrafelvétel','Michael Connelly']],
  [/^a\s*kisherceg$/i,['A kis herceg','Antoine de Saint-Exupéry']]
 ];
 const KNOWN_AUTHORS=[
 'Frei Tamás','Fekete István','Antoine de Saint-Exupéry','Alex Kava','John Connolly',
 'James Grippando','John Sandford','Jonathan Kellerman','Michael Connelly','Patrick Robinson',
 'Pierre Berton','Robert E. Howard','Steve Berry','Terry Bisson','Wilbur Smith','Dan Brown',
 'Széchenyi Zsigmond','Ivan Sciapeconi','Miloš Mikeln','Bagdy Emőke','Robert E. Howard',
 'G. R. R. Martin','George R. R. Martin','Bártfai Barnabás','Pétery Kristóf'
 ];
 const NAME_FIXES=[
 [/\btronok\s*harca\b/gi,'Trónok harca'],[/\bfrei\s*tamas\b/gi,'Frei Tamás'],
 [/\bfrei\s+tamas\b/gi,'Frei Tamás'],[/\bexupry\b/gi,'Exupéry'],[/\bexupery\b/gi,'Exupéry'],
 [/\bszechenyi\s+zsigmond\b/gi,'Széchenyi Zsigmond'],[/\bmilos\s+mikeln\b/gi,'Miloš Mikeln']
 ];
 function clean(x){
  let s=text(x).replace(/\.(epub|pdf)$/i,'').replace(/[_]+/g,' ').replace(/\u200b/g,'');
  s=s.replace(/(?:-?up\s*by\s*om|-?upbyom|-?olvas\s*om(?:mani)?|-?bootleg|-?ebook)\b/gi,' ');
  s=s.replace(/(\b(?:epub|hungarian)\b)/gi,' ').replace(/[\[\]{}]/g,' ')
   .replace(/\s*\.\s*/g,' ').replace(/--+/g,' - ').replace(/\s*[-–—]\s+/g,' - ')
   .replace(/\s+/g,' ').replace(/^[-,.\s]+|[-,.\s]+$/g,'');
  for(const [pattern,replacement] of NAME_FIXES)s=s.replace(pattern,replacement);
  return s.slice(0,210);
 }
 function authorCanonical(input){
  const author=clean(input).replace(/\s+-\s+.*$/,'');
  const known=KNOWN_AUTHORS.find(a=>normAuthor(a)===normAuthor(author));
  return known||author;
 }
 function findCanonical(title,author=''){
  const norm=accents(clean(title)).replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
  for(const [pattern,meta] of CATALOG){
   if(pattern.test(norm))return {title:meta[0],author:authorCanonical(author)||meta[1]};
  }
  return {title:clean(title),author:authorCanonical(author)};
 }
 function parseFilename(name){
  let stem=clean(name);
  let author='',title=stem;
  if(accents(stem).startsWith('fekete istvan tuskevar'))return {title:'Tüskevár',author:'Fekete István'};
  const known=KNOWN_AUTHORS.find(a=>{
   const aNorm=normAuthor(a),sNorm=normAuthor(stem);
   return sNorm.startsWith(aNorm+' - ')||sNorm.startsWith(aNorm+' ');
  });
  if(known){
   author=known;
   title=stem.slice(known.length).replace(/^\s*[-–—]\s*/,'').replace(/^(?:.+?\s+\d{1,2}\s+-\s+)/,'');
  }else{
   const parts=stem.split(' - ').filter(Boolean);
   if(parts.length>1){
    const candidate=authorCanonical(parts[0]);
    const candidateKnown=KNOWN_AUTHORS.some(a=>normAuthor(a)===normAuthor(candidate));
    if(candidateKnown){author=candidate;title=parts.slice(1).join(' - ')}
    else if(KNOWN_AUTHORS.some(a=>normAuthor(a)===normAuthor(authorCanonical(parts[parts.length-1])))){
     author=authorCanonical(parts.at(-1));title=parts.slice(0,-1).join(' - ');
    }
   }
  }
  title=title.replace(/^(?:Alex Delaware|Harry Bosch|Maggie O.Dell|Charlie Parker|Cotton Malone|Jack Swyteck|Ókori Egyiptom)\s*\d{1,2}\s*-\s*/i,'');
  return findCanonical(title,author);
 }
 function overridesKey(account,driveId,itemId){return 'sh9-book-title-v4:'+encodeURIComponent(String(account||'').toLowerCase())+':'+encodeURIComponent(String(driveId||''))+':'+encodeURIComponent(String(itemId||''))}
 function readOverride(store,account,b){
  try{
   const raw=store.getItem(overridesKey(account,b.drive_id,b.drive_item_id));
   const v=JSON.parse(raw);
   return v&&typeof v.title==='string'&&v.title.trim().length>0?{title:v.title.slice(0,180),author:(v.author||'').slice(0,150)}:null
  }catch(_){return null}
 }
 function saveOverride(store,account,b,title,author){
  const t=text(title).slice(0,180),a=text(author).slice(0,150);
  if(!t||t.length>180)throw Error('A könyvcím nem lehet üres.');
  store.setItem(overridesKey(account,b.drive_id,b.drive_item_id),JSON.stringify({title:t,author:a}));
  return {title:t,author:a};
 }
 function removeOverride(store,account,b){store.removeItem(overridesKey(account,b.drive_id,b.drive_item_id))}
 function metadata(title,author,fallbackName){
  const raw=clean(title),source=raw||parseFilename(fallbackName).title;
  const fallback=parseFilename(fallbackName);
  // EPUB metadata often uses only the raw publisher's filename; cleaned aliases are preferred.
  let canonical=findCanonical(source,author||fallback.author);
  if(!canonical.title||/^2015\s*v\d+/i.test(canonical.title))canonical=findCanonical(fallback.title,fallback.author);
  if(!canonical.author)canonical.author=fallback.author;
  return canonical;
 }
 function key(book){
  return accents(clean(book.title)).replace(/[^\p{L}\p{N}]/gu,'').trim();
 }
 function score(book){
  return (book.progress_locator?10000:0)+(book.is_favorite?5000:0)
   +(book.format==='epub'?110:0)+(book.coverReady?35:0)+(book.author?15:0)
   +Math.max(0,60-Math.floor(String(book.title||'').length/10));
 }
 function deduplicate(items){
  const groups=new Map(),singles=[];
  for(const item of items){
   const k=key(item);
   if(k.length<4){singles.push([item]);continue}
   const cohort=groups.get(k)||[];
   let group=cohort.find(g=>g.every(e=>!e.author||!item.author||accents(e.author)===accents(item.author)));
   if(!group){group=[];cohort.push(group)}
   group.push(item);groups.set(k,cohort);
  }
  const all=[...singles,...Array.from(groups.values()).flat()];
  const primary=[],hidden=[],mapping=new Map();
  for(const group of all){
   const sorted=group.slice().sort((a,b)=>score(b)-score(a)||String(a.drive_item_id).localeCompare(String(b.drive_item_id)));
   primary.push(sorted[0]);
   for(const duplicate of sorted.slice(1)){
    hidden.push(duplicate);mapping.set(duplicate.id,sorted[0].id);
   }
  }
  primary.sort((a,b)=>String(a.title).localeCompare(String(b.title),'hu-HU'));
  hidden.sort((a,b)=>String(a.title).localeCompare(String(b.title),'hu-HU'));
  return {primary,hidden,mapping};
 }
 return Object.freeze({clean,parseFilename,metadata,findCanonical,deduplicate,key,readOverride,saveOverride,removeOverride});
});
