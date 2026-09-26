const baseRecipes=window.LENA_RECIPES||[],baseCategories=window.LENA_CATEGORIES||[],baseReadable=window.LENA_READABLE||{};
const $=s=>document.querySelector(s);
const GH_OWNER="zsoltandmonika-cloud",GH_REPO="berlet-app",GH_BRANCH="feature/recipe-studio-v1",CLOUD_KEY_PREFIX="lena:recipe:",RECIPE_META_KEY_PREFIX="lena:recipe-meta:",CATEGORY_CONFIG_KEY="lena:category-config:v1",TASTE_KEY_PREFIX="lena:taste:",NUTRI_KEY_PREFIX="lena:nutri:",CLOUD_DIR="lena-recepttar",DB_NAME="lena-recepttar-studio-preview",DB_STORE="recipes";
baseRecipes.forEach(r=>{if(r.file&&r.file.startsWith("recipes/"))r.file="../recepttar/"+r.file});
let activeCategory="Mind",favoritesOnly=false,currentId=null,customRecipes=[],sharedRecipes=[],sharedReadable={},tasteFeedback={},nutritionCache={},categoryConfig={added:[],hidden:[]},feedbackRating=0,selectedNewBlob=null,selectedNewPreviewUrl=null;
function migrateCanonicalBaseState(){
  const flag="lena27:canonicalBaseMigration";
  if(localStorage.getItem(flag)==="1")return;
  const ids=new Set(baseRecipes.map(r=>r.id));
  const remove=[];
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i);
    if(k&&k.startsWith("lena22:meta:")){
      const id=k.slice("lena22:meta:".length);
      if(ids.has(id))remove.push(k);
    }
  }
  remove.forEach(k=>localStorage.removeItem(k));
  localStorage.setItem(flag,"1");
}


function keyFav(id){return"lena21:fav:"+id}function keyText(id){return"lena21:text:"+id}function keyMeta(id){return"lena22:meta:"+id}
function keyReadable(id){return"lena25:readable:"+id}
function getReadable(id){try{const local=localStorage.getItem(keyReadable(id));if(local)return JSON.parse(local)}catch(e){}return sharedReadable[id]||baseReadable[id]||{status:"unprocessed",ingredients:[],steps:[],notes:[]}}
function setReadable(id,v){localStorage.setItem(keyReadable(id),JSON.stringify(v))}
function clearReadableLocal(id){localStorage.removeItem(keyReadable(id))}
function statusInfo(status){if(status==="verified")return["✅ Ellenőrzött","status-verified"];if(status==="review")return["⚠️ Ellenőrzésre vár","status-review"];return["○ Nincs feldolgozva","status-unprocessed"]}
function splitLines(v){return(v||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}

function isFav(id){return localStorage.getItem(keyFav(id))==="1"}function setFav(id,v){localStorage.setItem(keyFav(id),v?"1":"0")}
function getText(id){return localStorage.getItem(keyText(id))||""}function setText(id,t){t.trim()?localStorage.setItem(keyText(id),t.trim()):localStorage.removeItem(keyText(id))}
function getMeta(id){try{return JSON.parse(localStorage.getItem(keyMeta(id))||"{}")}catch(e){return{}}}function setMeta(id,m){localStorage.setItem(keyMeta(id),JSON.stringify(m))}
function effective(r){
 const m=getMeta(r.id),hasYoutube=Object.prototype.hasOwnProperty.call(m,"youtubeId");
 return Object.assign({},r,{title:m.title||r.title,category:m.category||r.category,deleted:!!(m.deleted||m.permanentlyDeleted),youtubeId:hasYoutube?m.youtubeId:(r.youtubeId||"")})
}
function youtubeVideoId(value){
 const raw=String(value||"").trim();if(!raw)return"";
 try{
  const u=new URL(raw),host=u.hostname.toLowerCase().replace(/^www\./,"");let id="";
  if(host==="youtu.be")id=u.pathname.split("/").filter(Boolean)[0]||"";
  else if(host==="youtube.com"||host==="m.youtube.com"||host==="music.youtube.com"){
   if(u.pathname==="/watch")id=u.searchParams.get("v")||"";
   else id=(u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)||[])[1]||""
  }
  return/^[A-Za-z0-9_-]{11}$/.test(id)?id:""
 }catch(e){return""}
}
function youtubeWatchUrl(id){return id?"https://www.youtube.com/watch?v="+encodeURIComponent(id):""}
function youtubeThumbnailUrl(id,quality="hqdefault"){return id?"https://i.ytimg.com/vi/"+encodeURIComponent(id)+"/"+quality+".jpg":""}
function youtubeEmbedUrl(id){return id?"https://www.youtube-nocookie.com/embed/"+encodeURIComponent(id)+"?rel=0&playsinline=1":""}
function feedbackKey(id){return"lena:taste:local:"+id}
function historyKey(){return"lena:taste:history"}
function localFeedback(id){try{return JSON.parse(localStorage.getItem(feedbackKey(id))||"null")}catch(e){return null}}
function getRecipeFeedback(id){return tasteFeedback[id]||localFeedback(id)||{rating:0,note:"",updatedAt:null}}
async function loadTasteFeedback(){
 const merged={};
 for(let i=0;i<localStorage.length;i++){
   const k=localStorage.key(i);if(!k||!k.startsWith("lena:taste:local:"))continue;
   try{const v=JSON.parse(localStorage.getItem(k));if(v&&v.id)merged[v.id]=v}catch(e){}
 }
 if(puterCloudReady()&&puter.auth.isSignedIn()){
   try{
     const rows=await puter.kv.list(TASTE_KEY_PREFIX+"*",true);
     for(const row of rows){const v=row&&row.value;if(v&&v.id&&(v.rating||v.note))merged[String(v.id)]=v}
   }catch(e){console.warn("Ízlésprofil felhőből nem tölthető",e)}
 }
 tasteFeedback=merged;return merged
}
function tasteContextText(){
 const items=Object.values(tasteFeedback).concat(Object.keys(tasteFeedback).length?[]:allRecipes().map(r=>localFeedback(r.id)).filter(Boolean));
 const seen=new Set(),lines=[];
 items.sort((a,b)=>String(b.updatedAt||"").localeCompare(String(a.updatedAt||"")));
 for(const f of items){
   if(!f||seen.has(f.id)||(!f.rating&&!f.note))continue;seen.add(f.id);
   const r=getRecipe(f.id),name=r?.title||f.title||"Recept";
   lines.push("- "+name+": "+(f.rating?f.rating+"/5 csillag":"nincs csillag")+(f.note?" · Megjegyzés: "+f.note:""));
   if(lines.length>=12)break
 }
 return lines.length?lines.join("\n"):"Még nincs elmentett saját értékelés."
}
function recentCookHistory(){
 try{const a=JSON.parse(localStorage.getItem(historyKey())||"[]");return Array.isArray(a)?a:[]}catch(e){return[]}
}
function recentCookHistoryText(){
 const a=recentCookHistory().slice(0,6);return a.length?a.map(x=>"- "+x.title+" ("+new Date(x.cookedAt).toLocaleDateString("hu-HU")+")").join("\n"):"Még nincs rögzített közelmúltbeli főzés."
}
function recordCookedRecipe(id){
 const r=getRecipe(id);if(!r)return;let a=recentCookHistory().filter(x=>x.id!==id);a.unshift({id,title:r.title,cookedAt:new Date().toISOString()});a=a.slice(0,12);localStorage.setItem(historyKey(),JSON.stringify(a))
}
async function saveCurrentFeedback(){
 if(!currentId)return;const r=getRecipe(currentId);if(!r)return;
 const note=$("#feedbackNote").value.trim(),v={id:currentId,title:r.title,rating:feedbackRating,note,updatedAt:new Date().toISOString()};
 localStorage.setItem(feedbackKey(currentId),JSON.stringify(v));tasteFeedback[currentId]=v;
 $("#feedbackSaveState").textContent="✓ mentve helyben";
 if(puterCloudReady()&&puter.auth.isSignedIn()){
   try{await puter.kv.set(TASTE_KEY_PREFIX+currentId,v);$("#feedbackSaveState").textContent="☁ szinkronizálva"}catch(e){console.warn("Ízlésprofil felhőmentés hiba",e)}
 }
 toast("⭐ Saját értékelés elmentve.")
}
function renderRecipeFeedback(id){
 const f=getRecipeFeedback(id);feedbackRating=Math.max(0,Math.min(5,Number(f.rating)||0));$("#feedbackNote").value=f.note||"";
 $("#feedbackStars").querySelectorAll("button").forEach(b=>{const n=Number(b.dataset.rating);b.textContent=n<=feedbackRating?"★":"☆";b.classList.toggle("active",n<=feedbackRating)});
 $("#feedbackSaveState").textContent=f.updatedAt?(puterCloudReady()&&puter.auth.isSignedIn()?"ízlésprofil":"helyi"):"nincs értékelve"
}
function setFeedbackRating(n){feedbackRating=n;$("#feedbackStars").querySelectorAll("button").forEach(b=>{const x=Number(b.dataset.rating);b.textContent=x<=n?"★":"☆";b.classList.toggle("active",x<=n)})}
function nutriLocalKey(id){return"lena:nutri:local:"+id}
function localNutrition(id){try{return JSON.parse(localStorage.getItem(nutriLocalKey(id))||"null")}catch(e){return null}}
function getNutrition(id){return nutritionCache[id]||localNutrition(id)||null}
function nutriNum(v,digits=0){
 const n=Number(String(v??"").replace(",",".").replace(/[^0-9.+-]/g,""));
 if(!Number.isFinite(n))return 0;
 const p=Math.pow(10,digits);return Math.round(n*p)/p
}
function normalizeNutrition(v,id,title){
 const p=v?.perServing||v?.per_serving||v||{};
 return{
  id,title,
  servings:String(v?.servings||"4 fő").trim()||"4 fő",
  perServing:{
   kcal:Math.max(0,nutriNum(p.kcal)),
   protein_g:Math.max(0,nutriNum(p.protein_g??p.protein,1)),
   carbs_g:Math.max(0,nutriNum(p.carbs_g??p.carbs,1)),
   fat_g:Math.max(0,nutriNum(p.fat_g??p.fat,1)),
   fiber_g:Math.max(0,nutriNum(p.fiber_g??p.fiber,1))
  },
  updatedAt:new Date().toISOString(),
  source:"ai_estimate"
 }
}
async function loadNutritionCache(){
 const merged={};
 for(let i=0;i<localStorage.length;i++){
   const k=localStorage.key(i);if(!k||!k.startsWith("lena:nutri:local:"))continue;
   try{const v=JSON.parse(localStorage.getItem(k));if(v&&v.id)merged[v.id]=v}catch(e){}
 }
 if(puterCloudReady()&&puter.auth.isSignedIn()){
   try{
     const rows=await puter.kv.list(NUTRI_KEY_PREFIX+"*",true);
     for(const row of rows){const v=row&&row.value;if(v&&v.id)merged[String(v.id)]=v}
   }catch(e){console.warn("Nutri Info felhőből nem tölthető",e)}
 }
 nutritionCache=merged;return merged
}
async function saveNutrition(v){
 localStorage.setItem(nutriLocalKey(v.id),JSON.stringify(v));nutritionCache[v.id]=v;
 if(puterCloudReady()&&puter.auth.isSignedIn()){
   try{await puter.kv.set(NUTRI_KEY_PREFIX+v.id,v)}catch(e){console.warn("Nutri Info felhőmentés hiba",e)}
 }
}
function formatNutriG(v){return nutriNum(v,1).toLocaleString("hu-HU",{maximumFractionDigits:1})+" g"}
function recipeServingText(id,d){
 const r=getRecipe(id),studio=r?.studioData;
 if(studio?.servings)return String(studio.servings);
 const note=(d?.notes||[]).find(x=>/\b\d+\s*(fő|adag|személy)/i.test(String(x)));
 const m=String(note||"").match(/\b\d+\s*(?:fő|adag|személy)/i);
 return m?m[0]:"4 fő"
}
function renderRecipeNutriStrip(id){
 const strip=$("#recipeNutriStrip");if(!strip)return;
 const n=getNutrition(id);
 strip.hidden=!n;
 if(!n)return;
 const p=n.perServing||{};
 $("#recipeNutriKcal").textContent=Math.round(p.kcal||0);
 $("#recipeNutriProtein").textContent=formatNutriG(p.protein_g);
 $("#recipeNutriCarbs").textContent=formatNutriG(p.carbs_g);
 $("#recipeNutriFat").textContent=formatNutriG(p.fat_g);
 $("#recipeNutriFiber").textContent=formatNutriG(p.fiber_g)
}
function renderNutriCard(id){
 const card=$("#nutriCard");if(!card)return;
 const d=getReadable(id),valid=d.status==="verified"&&d.ingredients?.length;
 card.hidden=!valid;if(!valid)return;
 const n=getNutrition(id),empty=$("#nutriEmpty"),values=$("#nutriValues");
 $("#nutriServings").textContent=n?.servings||recipeServingText(id,d);
 empty.hidden=!!n;values.hidden=!n;
 if(!n)return;
 const p=n.perServing||{};
 $("#nutriKcal").textContent=Math.round(p.kcal||0);
 $("#nutriProtein").textContent=formatNutriG(p.protein_g);
 $("#nutriCarbs").textContent=formatNutriG(p.carbs_g);
 $("#nutriFat").textContent=formatNutriG(p.fat_g);
 $("#nutriFiber").textContent=formatNutriG(p.fiber_g);renderRecipeNutriStrip(id)
}
function renderHealthResult(id){
 const box=$("#healthResult"),n=getNutrition(id),r=getRecipe(id);
 if(!n||!r){box.hidden=true;return}
 box.hidden=false;$("#healthResultName").textContent=r.title;$("#healthResultServing").textContent=(n.servings||"4 fő")+" · adagonként";
 const p=n.perServing||{};$("#healthKcal").textContent=Math.round(p.kcal||0);$("#healthProtein").textContent=formatNutriG(p.protein_g);
 $("#healthCarbs").textContent=formatNutriG(p.carbs_g);$("#healthFat").textContent=formatNutriG(p.fat_g);$("#healthFiber").textContent=formatNutriG(p.fiber_g)
}
function populateHealthRecipes(preferId=null){
 const sel=$("#healthRecipeSelect");sel.innerHTML="";
 const list=allRecipes().filter(r=>!r.deleted).map(r=>({r,d:getReadable(r.id)})).filter(x=>x.d.status==="verified"&&x.d.ingredients?.length).sort((a,b)=>a.r.title.localeCompare(b.r.title,"hu"));
 list.forEach(({r})=>{const o=document.createElement("option");o.value=r.id;o.textContent=r.title;sel.appendChild(o)});
 if(!list.length){const o=document.createElement("option");o.value="";o.textContent="Nincs még strukturált recept";sel.appendChild(o);$("#healthAnalyzeBtn").disabled=true;$("#healthResult").hidden=true;return}
 $("#healthAnalyzeBtn").disabled=false;
 const id=preferId&&list.some(x=>x.r.id===preferId)?preferId:list[0].r.id;sel.value=id;renderHealthResult(id)
}
function openHealth(){
 populateHealthRecipes(currentId);$("#healthDialog").showModal()
}
async function estimateNutrition(id){
 const d=getReadable(id),r=getRecipe(id);if(!r||d.status!=="verified"||!d.ingredients?.length){alert("Ehhez előbb kell egy strukturált, olvasható recept.");return null}
 if(!puterAvailable()){alert("A Nutri Info AI most nem érhető el.");return null}
 const servings=recipeServingText(id,d);
 const req=[
  "Te egy élelmiszer-tápérték becslő asszisztens vagy. Becsüld meg az alábbi recept tápértékét adagonként.",
  "A becslést a megadott mennyiségekből készítsd. Ne állítsd, hogy laborpontosságú. Ha egy mennyiség bizonytalan, használj ésszerű tipikus értéket.",
  "Válaszolj KIZÁRÓLAG érvényes JSON-nal, markdown nélkül.",
  'Séma: {"servings":"4 fő","perServing":{"kcal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0}}',
  "Recept: "+r.title,
  "Adag: "+servings,
  "Hozzávalók:",
  d.ingredients.join("\n")
 ].join("\n");
 busy(true,"Nutri Info számítása…");
 try{
  let resp;try{resp=await puter.ai.chat(req,{model:STUDIO_TEXT_MODEL,normalize:true,verbosity:"low"})}catch(e){resp=await puter.ai.chat(req,{normalize:true})}
  const v=normalizeNutrition(parseRecipeJson(puterText(resp)),id,r.title);v.servings=servings;
  await saveNutrition(v);if(currentId===id)renderNutriCard(id);renderHealthResult(id);toast("🥗 Nutri Info elkészült.");return v
 }catch(e){console.error(e);alert("A Nutri Info számítása most nem sikerült: "+(e.message||e));return null}
 finally{busy(false)}
}


function norm(s){return(s||"").toLocaleLowerCase("hu").normalize("NFD").replace(/\p{Diacritic}/gu,"").replace(/\s+/g," ").trim()}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");clearTimeout(window.__tt);window.__tt=setTimeout(()=>e.classList.remove("show"),2200)}
function busy(on,text){$("#busyText").textContent=text||"Feldolgozás…";$("#busyOverlay").hidden=!on}

function openDb(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(DB_STORE))r.result.createObjectStore(DB_STORE,{keyPath:"id"})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function dbPut(v){const db=await openDb();await new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,"readwrite");tx.objectStore(DB_STORE).put(v);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close()}
async function dbGet(id){const db=await openDb();const v=await new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,"readonly"),r=tx.objectStore(DB_STORE).get(id);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)});db.close();return v}
async function dbAll(){const db=await openDb();const v=await new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,"readonly"),r=tx.objectStore(DB_STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)});db.close();return v}
async function dbDelete(id){const db=await openDb();await new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,"readwrite");tx.objectStore(DB_STORE).delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close()}

function puterCloudReady(){return !!(window.puter&&puter.auth&&puter.kv&&puter.fs)}
async function currentPuterUser(){
 if(!puterCloudReady()||!puter.auth.isSignedIn())return null;
 try{return await puter.auth.getUser()}catch(e){return null}
}
async function ensurePuterSignIn(forcePick=false){
 if(!puterCloudReady())throw new Error("A Puter felhő nem érhető el.");
 if(puter.auth.isSignedIn()&&!forcePick)return currentPuterUser();
 await puter.auth.signIn(forcePick?{request_auth:true}:{});
 return currentPuterUser()
}
async function loadSharedRecipes(){
 sharedRecipes.forEach(r=>r._url&&URL.revokeObjectURL(r._url));sharedRecipes=[];sharedReadable={};
 try{
  if(!puterCloudReady()||!puter.auth.isSignedIn())return false;
  const rows=await puter.kv.list(CLOUD_KEY_PREFIX+"*",true),next=[],readable={};
  for(const row of rows){
    const v=row&&row.value;if(!v||!v.id||!v.title||!v.cardPath)continue;
    try{
      const cardBlob=await puter.fs.read(v.cardPath),url=URL.createObjectURL(cardBlob);
      next.push({id:String(v.id),title:String(v.title),category:String(v.category||"Egyébb"),file:url,mime:"image/jpeg",originalName:String(v.originalName||v.title+".jpg"),central:true,createdAt:v.createdAt||null,heroPath:v.heroPath||null,processPath:v.processPath||null,studioData:v.studioData||null,youtubeId:String(v.youtubeId||""),_url:url});
      if(v.readable)readable[String(v.id)]=v.readable
    }catch(fileErr){console.warn("Központi receptkép nem olvasható",v.id,fileErr)}
  }
  sharedRecipes=next;sharedReadable=readable;return true
 }catch(e){console.warn("Puter központi recepttár nem érhető el",e);return false}
}
async function refreshSharedRecipes(render=true){
 const ok=await loadSharedRecipes();await loadCustomRecipes();if(render){renderHome();renderPending()}return ok
}

async function loadCustomRecipes(){
 customRecipes.forEach(r=>r._url&&URL.revokeObjectURL(r._url));customRecipes=[];
 const rows=await dbAll();
 for(const row of rows){
   if(sharedRecipes.some(x=>x.id===row.id)&&!row.pending&&!row.localOverride)continue;
   const url=URL.createObjectURL(row.blob);
   customRecipes.push({id:row.id,title:row.title,category:row.category,file:url,mime:"image/jpeg",originalName:row.originalName||row.title+".jpg",localCustom:true,pending:!!row.pending,studio:!!row.studio,studioData:row.studioData||null,youtubeId:String(row.youtubeId||""),_url:url,_blob:row.blob});
 }
}
function allRecipes(){
 const map=new Map();baseRecipes.map(effective).forEach(r=>map.set(r.id,r));sharedRecipes.map(effective).forEach(r=>map.set(r.id,r));customRecipes.map(effective).forEach(r=>map.set(r.id,r));return Array.from(map.values())
}
function getRecipe(id){return allRecipes().find(x=>x.id===id)||null}

function cleanCategoryName(v){return String(v||"").trim().replace(/\s+/g," ")}
function categoryConfigLocal(){
 try{
   const v=JSON.parse(localStorage.getItem(CATEGORY_CONFIG_KEY)||"null");
   if(v&&typeof v==="object")return{added:Array.isArray(v.added)?v.added.map(cleanCategoryName).filter(Boolean):[],hidden:Array.isArray(v.hidden)?v.hidden.map(cleanCategoryName).filter(Boolean):[]}
 }catch(e){}
 return{added:[],hidden:[]}
}
function storeCategoryConfigLocal(){
 categoryConfig={added:Array.from(new Set((categoryConfig.added||[]).map(cleanCategoryName).filter(Boolean))),hidden:Array.from(new Set((categoryConfig.hidden||[]).map(cleanCategoryName).filter(Boolean)))};
 localStorage.setItem(CATEGORY_CONFIG_KEY,JSON.stringify(categoryConfig))
}
async function loadCategoryConfig(){
 const local=categoryConfigLocal(),merged={added:[...local.added],hidden:[...local.hidden]};
 if(puterCloudReady()&&puter.auth.isSignedIn()){
   try{
     const remote=await puter.kv.get(CATEGORY_CONFIG_KEY);
     if(remote&&typeof remote==="object"){
       merged.added=[...new Set([...merged.added,...(Array.isArray(remote.added)?remote.added:[])].map(cleanCategoryName).filter(Boolean))];
       merged.hidden=[...new Set([...(Array.isArray(remote.hidden)?remote.hidden:[]),...merged.hidden].map(cleanCategoryName).filter(Boolean))]
     }
   }catch(e){console.warn("Kategória-beállítások felhőből nem tölthetők",e)}
 }
 categoryConfig=merged;storeCategoryConfigLocal();return categoryConfig
}
async function saveCategoryConfig(){
 storeCategoryConfigLocal();
 if(puterCloudReady()&&puter.auth.isSignedIn()){
   try{await puter.kv.set(CATEGORY_CONFIG_KEY,{added:categoryConfig.added,hidden:categoryConfig.hidden,updatedAt:new Date().toISOString()})}
   catch(e){console.warn("Kategória-beállítások felhőmentése sikertelen",e)}
 }
}
async function saveRecipeMetaCloud(id,meta){
 if(!puterCloudReady()||!puter.auth.isSignedIn())return false;
 try{await puter.kv.set(RECIPE_META_KEY_PREFIX+id,{id,...meta,updatedAt:new Date().toISOString()});return true}
 catch(e){console.warn("Recept metaadat felhőmentése sikertelen",id,e);return false}
}
async function loadCloudRecipeMeta(){
 if(!puterCloudReady()||!puter.auth.isSignedIn())return;
 try{
   const rows=await puter.kv.list(RECIPE_META_KEY_PREFIX+"*",true);
   for(const row of rows){
     const v=row&&row.value;if(!v||!v.id)continue;
     const local=getMeta(String(v.id)),lu=String(local.updatedAt||""),ru=String(v.updatedAt||"");
     if(!lu||!ru||ru>=lu)setMeta(String(v.id),{...local,...v})
   }
 }catch(e){console.warn("Recept metaadatok felhőből nem tölthetők",e)}
}
function allCategoryNamesRaw(){
 const s=new Set(baseCategories);allRecipes().forEach(r=>r.category&&s.add(cleanCategoryName(r.category)));(categoryConfig.added||[]).forEach(c=>s.add(cleanCategoryName(c)));
 return Array.from(s).filter(Boolean).sort((a,b)=>a.localeCompare(b,"hu"))
}
function allCategories(){
 const hidden=new Set((categoryConfig.hidden||[]).map(cleanCategoryName));
 return allCategoryNamesRaw().filter(c=>!hidden.has(c))
}
function ensureManagedCategory(cat){
 cat=cleanCategoryName(cat);if(!cat)return;
 categoryConfig.hidden=(categoryConfig.hidden||[]).filter(c=>c!==cat);
 if(!baseCategories.includes(cat)&&!(categoryConfig.added||[]).includes(cat))categoryConfig.added.push(cat);
 storeCategoryConfigLocal()
}
function categoryUsage(cat){return allRecipes().filter(r=>!r.deleted&&cleanCategoryName(r.category)===cat).length}
function renderCategoryManager(){
 const box=$("#categoryManagerList");if(!box)return;box.innerHTML="";
 const hidden=new Set(categoryConfig.hidden||[]);
 allCategoryNamesRaw().forEach(cat=>{
   const row=document.createElement("div");row.className="category-manager-row"+(hidden.has(cat)?" is-hidden":"");
   const main=document.createElement("div");main.className="category-manager-main";
   const name=document.createElement("b");name.textContent=cat;
   const count=document.createElement("small");const n=categoryUsage(cat);count.textContent=n+" recept"+(hidden.has(cat)?" · elrejtve":"");
   main.append(name,count);
   const actions=document.createElement("div");actions.className="category-manager-actions";
   if(!hidden.has(cat)){
     const rename=document.createElement("button");rename.type="button";rename.className="outline-btn compact-btn";rename.textContent="Átnevezés";rename.onclick=()=>renameManagedCategory(cat);
     const hide=document.createElement("button");hide.type="button";hide.className="outline-btn compact-btn";hide.textContent="Elrejtés";hide.onclick=()=>hideManagedCategory(cat);
     actions.append(rename,hide)
   }else{
     const restore=document.createElement("button");restore.type="button";restore.className="primary-btn compact-btn";restore.textContent="Vissza";restore.onclick=()=>restoreManagedCategory(cat);actions.append(restore)
   }
   row.append(main,actions);box.appendChild(row)
 })
}
async function addManagedCategory(){
 const input=$("#newCategoryName"),cat=cleanCategoryName(input.value);if(!cat){input.focus();return}
 ensureManagedCategory(cat);await saveCategoryConfig();input.value="";fillCategoryList();renderCategoryManager();renderHome();toast("📚 Kategória hozzáadva: "+cat)
}
async function hideManagedCategory(cat){
 const n=categoryUsage(cat);
 if(n&&!confirm('A(z) "'+cat+'" kategóriában '+n+' recept van.\n\nAz elrejtés csak a kategóriagombot veszi ki, a recepteket nem törli. Folytassuk?'))return;
 if(!(categoryConfig.hidden||[]).includes(cat))categoryConfig.hidden.push(cat);
 if(activeCategory===cat)activeCategory="Mind";
 await saveCategoryConfig();fillCategoryList();renderCategoryManager();renderHome();toast("Kategória elrejtve: "+cat)
}
async function restoreManagedCategory(cat){
 categoryConfig.hidden=(categoryConfig.hidden||[]).filter(c=>c!==cat);await saveCategoryConfig();fillCategoryList();renderCategoryManager();renderHome();toast("Kategória visszaállítva: "+cat)
}
async function renameManagedCategory(oldCat){
 const next=cleanCategoryName(prompt('Új kategórianév a(z) "'+oldCat+'" helyett:',oldCat)||"");if(!next||next===oldCat)return;
 const recipes=allRecipes().filter(r=>!r.deleted&&cleanCategoryName(r.category)===oldCat);
 busy(true,"Kategória átnevezése…");
 try{
   for(const r of recipes){
     if(r.localCustom){
       const row=await dbGet(r.id);if(row){row.category=next;row.pending=true;await dbPut(row)}
     }else{
       const m={...getMeta(r.id),category:next,deleted:!!getMeta(r.id).deleted,updatedAt:new Date().toISOString()};setMeta(r.id,m);await saveRecipeMetaCloud(r.id,m)
     }
   }
   categoryConfig.hidden=[...new Set([...(categoryConfig.hidden||[]),oldCat])];
   categoryConfig.added=(categoryConfig.added||[]).filter(c=>c!==oldCat);
   ensureManagedCategory(next);await saveCategoryConfig();await loadCustomRecipes();
   if(activeCategory===oldCat)activeCategory=next;
   fillCategoryList();renderCategoryManager();renderHome();toast("📚 "+oldCat+" → "+next)
 }finally{busy(false)}
}
function fillCategoryList(){const d=$("#categoryList");d.innerHTML="";allCategories().forEach(c=>{const o=document.createElement("option");o.value=c;d.appendChild(o)})}
function fillEditCategorySelect(selectedCategory){
 const select=$("#editCategory");if(!select)return;
 const current=cleanCategoryName(selectedCategory),categories=allCategories();
 if(current&&!categories.includes(current))categories.unshift(current);
 select.innerHTML="";
 categories.forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;select.appendChild(o)});
 select.value=current
}

function categoryChipPalette(cat,index){
 const p=[
  ["#e7efe6","#b9ccb9","#294a32","#587b59"],
  ["#f4e2d7","#d9b8a6","#6d3d2c","#a85f43"],
  ["#f3ead0","#d8c889","#69541d","#9a7c2c"],
  ["#e0eaf0","#b6c9d5","#365667","#597b8d"],
  ["#ebe0ea","#cab7c8","#5e415b","#81617d"],
  ["#e8ead7","#c5ca9f","#4e542a","#737a3e"],
  ["#f2deda","#d8b5ae","#6e4239","#9b6558"],
  ["#dcebea","#aecbc8","#315957","#4f7d79"]
 ];
 if(cat==="Mind")return["#e5ece5","#b8c7ba","#29483a","#45674f"];
 let h=0;for(let i=0;i<cat.length;i++)h=(h*31+cat.charCodeAt(i))>>>0;return p[(h+index)%p.length]
}
function renderChips(){
 const c=$("#chips");c.innerHTML="";["Mind"].concat(allCategories()).forEach((cat,i)=>{
  const b=document.createElement("button"),p=categoryChipPalette(cat,i);
  b.className="chip"+(activeCategory===cat?" active":"");b.textContent=cat;
  b.style.setProperty("--chip-bg",p[0]);b.style.setProperty("--chip-border",p[1]);b.style.setProperty("--chip-ink",p[2]);b.style.setProperty("--chip-active",p[3]);
  b.onclick=()=>{activeCategory=cat;renderHome()};c.appendChild(b)
 })
}
function visibleRecipes(){const q=norm($("#search").value);return allRecipes().filter(r=>!r.deleted&&(activeCategory==="Mind"||r.category===activeCategory)&&(!favoritesOnly||isFav(r.id))&&(!q||norm(r.title+" "+r.category).includes(q))).sort((a,b)=>a.title.localeCompare(b.title,"hu"))}
function renderHome(){
 renderChips();const list=visibleRecipes();$("#count").textContent=list.length;$("#grid").innerHTML="";$("#favFilter").textContent=(favoritesOnly?"★ ":"☆ ")+"Kedvencek";
 list.forEach(r=>{const a=document.createElement("article");a.className="card";const media=document.createElement("div");media.className="card-media";
 if(r.mime==="application/pdf"){const d=document.createElement("div");d.className="pdf-tile";d.textContent="📄";media.appendChild(d)}else{const im=document.createElement("img");im.loading="lazy";im.src=r.file;im.alt=r.title;media.appendChild(im)}
 media.onclick=()=>openRecipe(r.id,true);const body=document.createElement("div");body.className="card-body";body.innerHTML='<h2 class="card-title"></h2><div class="card-sub"><span class="cat"></span><div class="card-actions"><button class="fav"></button><button class="open">⛶</button></div></div>';
 body.querySelector(".card-title").textContent=r.title;body.querySelector(".cat").textContent="📂 "+r.category+(r.localCustom?" · helyi":r.central?" · ☁ központi":"");const fav=body.querySelector(".fav");fav.textContent=isFav(r.id)?"★":"☆";fav.onclick=()=>{setFav(r.id,!isFav(r.id));renderHome()};body.querySelector(".open").onclick=()=>openRecipe(r.id,true);a.append(media,body);$("#grid").appendChild(a)})
}
function showHome(push){setOriginalFullscreen(false);currentId=null;$("#recipeView").hidden=true;$("#homeView").hidden=false;if(push)history.pushState({view:"home"},"","#home");window.scrollTo({top:0,behavior:"instant"});renderHome()}
function setMode(mode){
 const o=mode==="original";if(!o)setOriginalFullscreen(false);
 $("#originalPanel").hidden=!o;$("#readablePanel").hidden=o;$("#originalMode").classList.toggle("active",o);$("#readableMode").classList.toggle("active",!o)
}
function setOriginalFullscreen(active){
 const on=!!active,button=$("#originalMode");
 document.body.classList.toggle("original-card-fullscreen",on);
 if(button){
  button.textContent=on?"← Vissza":"Eredeti kártya";
  button.setAttribute("aria-pressed",String(on));
  button.setAttribute("aria-label",on?"Vissza a normál receptnézethez":"Eredeti receptkártya teljes képernyőn")
 }
}
function toggleOriginalFullscreen(){
 const open=!document.body.classList.contains("original-card-fullscreen");
 if(open)setMode("original");
 setOriginalFullscreen(open)
}
let photoLightboxObjectUrl=null;
function closeRecipePhoto(){
 const d=$("#photoLightbox");if(d.open)d.close();
 if(photoLightboxObjectUrl){URL.revokeObjectURL(photoLightboxObjectUrl);photoLightboxObjectUrl=null}
 $("#photoLightboxImage").removeAttribute("src");$("#photoLightboxCaption").textContent="";
}
async function recipeHeroSource(r){
 if(!r)return null;
 if(r.localCustom){
   const row=await dbGet(r.id);
   if(row&&row.heroBlob){photoLightboxObjectUrl=URL.createObjectURL(row.heroBlob);return photoLightboxObjectUrl}
 }
 if(r.central&&r.heroPath&&puterCloudReady()&&puter.auth.isSignedIn()){
   try{const b=await puter.fs.read(r.heroPath);photoLightboxObjectUrl=URL.createObjectURL(b);return photoLightboxObjectUrl}catch(e){console.warn("Központi ételfotó nem olvasható",e)}
 }
 return r.file||null
}
async function openRecipePhoto(){
 const r=currentId?getRecipe(currentId):null;if(!r||r.mime==="application/pdf")return;
 const d=$("#photoLightbox"),img=$("#photoLightboxImage"),loading=$("#photoLightboxLoading");
 if(photoLightboxObjectUrl){URL.revokeObjectURL(photoLightboxObjectUrl);photoLightboxObjectUrl=null}
 img.removeAttribute("src");img.alt=r.title;$("#photoLightboxCaption").textContent=r.title;loading.hidden=false;
 d.showModal();
 try{
   const src=await recipeHeroSource(r);if(!src)throw new Error("Nincs megjeleníthető kép.");
   img.src=src;
 }catch(e){console.error(e);$("#photoLightboxCaption").textContent="A kép most nem tölthető be."}
 finally{loading.hidden=true}
}
function setYoutubeThumb(img,id){
 img.onerror=()=>{img.onerror=null;img.src=youtubeThumbnailUrl(id,"mqdefault")};
 img.src=youtubeThumbnailUrl(id)
}
function renderRecipeVideo(r){
 const section=$("#recipeVideoSection"),id=String(r?.youtubeId||"");if(!section)return;
 section.hidden=!id;
 if(!id){$("#recipeVideoThumb").removeAttribute("src");return}
 setYoutubeThumb($("#recipeVideoThumb"),id);
 $("#recipeVideoName").textContent=r.title+" · kapcsolódó videó";
 $("#recipeVideoCard").setAttribute("aria-label",r.title+" kapcsolódó YouTube-videójának lejátszása")
}
function renderEditYoutubePreview(){
 const raw=$("#editYoutubeUrl").value.trim(),id=youtubeVideoId(raw),box=$("#editYoutubePreview");
 box.hidden=!id;$("#editYoutubeInvalid").hidden=!raw||!!id;
 if(id)setYoutubeThumb($("#editYoutubeThumb"),id);else $("#editYoutubeThumb").removeAttribute("src")
}
function openYoutubePlayer(){
 const r=currentId?getRecipe(currentId):null,id=String(r?.youtubeId||"");if(!id)return;
 $("#youtubePlayerTitle").textContent=r.title;
 $("#youtubePlayer").src=youtubeEmbedUrl(id);
 $("#youtubeOpenExternal").href=youtubeWatchUrl(id);
 $("#youtubeDialog").showModal()
}
function closeYoutubePlayer(){
 const d=$("#youtubeDialog");if(d.open)d.close();$("#youtubePlayer").removeAttribute("src")
}
function openRecipe(id,push){
 setOriginalFullscreen(false);const r=getRecipe(id);if(!r||r.deleted){showHome(push);return}currentId=id;$("#homeView").hidden=true;$("#recipeView").hidden=false;$("#recipeCategory").textContent=r.category+(r.localCustom?" · helyi":r.central?" · ☁ központi":"");$("#recipeTitle").textContent=r.title;$("#favBtn").textContent=isFav(id)?"★":"☆";
 renderReadableFor(id);renderRecipeFeedback(id);renderRecipeNutriStrip(id);renderRecipeVideo(r);
 if(r.mime==="application/pdf"){$("#recipeImage").hidden=true;$("#recipeImageHint").hidden=true;$("#recipePdf").hidden=false;$("#recipePdf").src=r.file}else{$("#recipePdf").hidden=true;$("#recipeImage").hidden=false;$("#recipeImageHint").hidden=false;$("#recipeImage").src=r.file;$("#recipeImage").alt=r.title}
 setMode("original");if(push)history.pushState({view:"recipe",id},"","#recipe="+encodeURIComponent(id));window.scrollTo({top:0,behavior:"instant"})
}
function askLena(){const r=currentId?getRecipe(currentId):null,prefix=r?"Léna, ezt a receptet nézem: "+r.title+". ":"";navigator.clipboard?.writeText(prefix).catch(()=>{});window.open("https://chatgpt.com/","_blank","noopener");if(r)toast("A recept címe a vágólapra került.")}
function recipeShareUrl(id){return location.origin+location.pathname+"#recipe="+encodeURIComponent(id)}
async function shareCurrentRecipe(){
 if(!currentId)return;const r=getRecipe(currentId);if(!r)return;const url=recipeShareUrl(r.id),data={title:r.title,text:r.title+" · Léna Recepttár",url};
 if(navigator.share){try{await navigator.share(data);return}catch(e){if(e&&e.name==="AbortError")return;console.warn("Natív megosztás nem sikerült",e)}}
 try{await navigator.clipboard.writeText(url);toast("🔗 A recept linkje a vágólapra került.")}
 catch(e){prompt("Másold ki a recept linkjét:",url)}
}
function editText(){openReadableEditor()}
function openEdit(){
 if(!currentId)return;const r=getRecipe(currentId);if(!r)return;fillCategoryList();fillEditCategorySelect(r.category);$("#editTitle").value=r.title;
 $("#editYoutubeUrl").value=youtubeWatchUrl(r.youtubeId||"");renderEditYoutubePreview();$("#editDialog").showModal()
}
async function saveEdit(){
 if(!currentId)return;const r=getRecipe(currentId);if(!r)return;const title=$("#editTitle").value.trim()||r.title,category=cleanCategoryName($("#editCategory").value)||r.category,rawYoutube=$("#editYoutubeUrl").value.trim(),youtubeId=youtubeVideoId(rawYoutube);
 if(rawYoutube&&!youtubeId){alert("Ez nem felismerhető YouTube-link. Illessz be youtube.com vagy youtu.be videólinket.");$("#editYoutubeUrl").focus();return}
 ensureManagedCategory(category);await saveCategoryConfig();
 const prev=getMeta(currentId),m={...prev,title,category,youtubeId,deleted:!!prev.deleted,updatedAt:new Date().toISOString()};setMeta(currentId,m);
 if(r.localCustom){const row=await dbGet(r.id);if(row){row.title=title;row.category=category;row.youtubeId=youtubeId;row.pending=true;await dbPut(row);await loadCustomRecipes()}}
 await saveRecipeMetaCloud(currentId,m);
 $("#editDialog").close();openRecipe(currentId,false);renderHome();toast("Recept adatai elmentve.")
}
function deleteCurrent(){if(!currentId)return;const r=getRecipe(currentId);if(!r)return;if(!confirm("Biztosan törlöd ezt a receptet?\n\n"+r.title+"\n\nA törlés visszaállítható."))return;const m=getMeta(currentId);m.deleted=true;setMeta(currentId,m);$("#editDialog").close();showHome(true);toast("Recept a kukába került.")}
function resetCurrent(){if(!currentId)return;const m=getMeta(currentId);delete m.title;delete m.category;m.deleted=false;if(Object.keys(m).length)setMeta(currentId,m);else localStorage.removeItem(keyMeta(currentId));const r=getRecipe(currentId);$("#editTitle").value=r.title;fillEditCategorySelect(r.category);toast("Alapadatok visszaállítva.")}

function filenameTitle(name){return(name||"").replace(/\.[^.]+$/,"").replace(/[_-]+/g," ").trim()}
async function processImage(file){const bm=await createImageBitmap(file,{imageOrientation:"from-image"}),max=1800,scale=Math.min(1,max/Math.max(bm.width,bm.height)),c=document.createElement("canvas");c.width=Math.max(1,Math.round(bm.width*scale));c.height=Math.max(1,Math.round(bm.height*scale));const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.imageSmoothingEnabled=true;x.imageSmoothingQuality="high";x.drawImage(bm,0,0,c.width,c.height);bm.close();return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("Képfeldolgozási hiba")),"image/jpeg",.9))}
function resetAddForm(){selectedNewBlob=null;if(selectedNewPreviewUrl){URL.revokeObjectURL(selectedNewPreviewUrl);selectedNewPreviewUrl=null}$("#newImageInput").value="";$("#newPreviewWrap").hidden=true;$("#newPreview").removeAttribute("src");$("#newTitle").value="";$("#newCategory").value="";$("#newCentralSync").checked=true}
function openAdd(){fillCategoryList();resetAddForm();$("#addDialog").showModal()}
async function handleNewImage(file){if(!file)return;busy(true,"Kép optimalizálása…");try{selectedNewBlob=await processImage(file);if(selectedNewPreviewUrl)URL.revokeObjectURL(selectedNewPreviewUrl);selectedNewPreviewUrl=URL.createObjectURL(selectedNewBlob);$("#newPreview").src=selectedNewPreviewUrl;$("#newPreviewWrap").hidden=false;if(!$("#newTitle").value.trim())$("#newTitle").value=filenameTitle(file.name)}catch(e){console.error(e);alert("A kép feldolgozása nem sikerült.")}finally{busy(false)}}
function newId(){return"u"+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
async function saveNew(){
 const title=$("#newTitle").value.trim(),category=cleanCategoryName($("#newCategory").value);if(!selectedNewBlob){alert("Először válassz vagy fotózz egy receptképet.");return}if(!title){alert("Add meg a recept nevét.");return}if(!category){alert("Add meg a kategóriát.");return}
 ensureManagedCategory(category);await saveCategoryConfig();
 const central=$("#newCentralSync").checked;let cloudOk=false;
 if(central){try{cloudOk=!!(await ensurePuterSignIn())}catch(e){console.warn(e);toast("A recept helyben megmarad; a központi felhőhöz bejelentkezés kell.")}}
 const id=newId();await dbPut({id,title,category,originalName:title+".jpg",blob:selectedNewBlob,pending:central,createdAt:Date.now()});$("#addDialog").close();await loadCustomRecipes();activeCategory="Mind";favoritesOnly=false;showHome(false);toast("Új recept elmentve.");
 if(central&&cloudOk)await syncLocalRecipe(id)
}


const STUDIO_TEXT_MODEL="gpt-5.6-luna";
const STUDIO_IMAGE_MODEL="gpt-image-2";

function puterChatAvailable(){return !!(window.puter&&puter.ai&&typeof puter.ai.chat==="function")}
function puterImageAvailable(){return !!(window.puter&&puter.ai&&typeof puter.ai.txt2img==="function")}
function puterAvailable(){return puterChatAvailable()}
function ensurePuterAiSession(){
 if(!puterChatAvailable())throw new Error("A Puter AI könyvtár nem töltődött be.");
 // A Puter AI-hívások saját maguk kezelik a szükséges hitelesítést. A kézi
 // signIn() itt külön felugró ablakot nyitott, és egyes böngészőkben a
 // generálás látható visszajelzés nélkül ezen a lépésen maradt.
 return true
}
function puterErrorCode(error){
 const nested=error&&typeof error.error==="object"?error.error:null;
 return String(error&&(
   error.code||error.errorCode||(nested&&(nested.code||nested.errorCode))||
   (typeof error.error==="string"?error.error:"")
 )||"").toLowerCase()
}
function puterErrorText(error){
 const nested=error&&typeof error.error==="object"?error.error:null;
 const value=error&&(
   error.message||error.msg||(nested&&(nested.message||nested.msg))||
   (typeof error.error==="string"?error.error:"")||error.code||error.errorCode
 );
 return String(value||"Ismeretlen Puter AI-hiba.")
}
function puterImageErrorMessage(error){
 const code=puterErrorCode(error),text=puterErrorText(error);
 if(code.includes("popup_blocked"))return"A böngésző blokkolta a Puter engedélyező ablakát. Engedélyezd a felugró ablakokat, majd próbáld újra.";
 if(code.includes("auth_window_closed"))return"A Puter AI engedélyezése megszakadt. Indítsd újra a generálást, és fejezd be a megjelenő engedélyezést.";
 if(code.includes("unauthorized")||code.includes("auth_required"))return"A Puter AI használatát előbb engedélyezni kell a megjelenő ablakban.";
 if(code.includes("insufficient_funds"))return"A Puter-fiók elérhető AI-kerete nem elegendő ehhez a képgeneráláshoz.";
 if(code.includes("moderation_flagged"))return"A képgenerátor tartalmi szűrője elutasította ezt a leírást. Módosítsd kissé a recept nevét vagy a hozzávalókat.";
 return text
}
function canRetryImageWithFallback(error){
 const code=puterErrorCode(error);
 return !["popup_blocked","auth_window_closed","unauthorized","auth_required","insufficient_funds","moderation_flagged"].some(x=>code.includes(x))
}
function updateStudioProviderBadge(){
 const b=$("#studioProviderBadge");if(!b)return;
 if(puterAvailable()){b.textContent="AI READY";b.classList.remove("provider-offline");b.classList.add("provider-ready")}
 else{b.textContent="HELYI MÓD";b.classList.remove("provider-ready");b.classList.add("provider-offline")}
}
function puterText(resp){
 let c=resp&&resp.message?resp.message.content:resp;
 if(Array.isArray(c))c=c.map(x=>typeof x==="string"?x:(x&&x.text)||"").join("");
 if(c&&typeof c==="object"&&typeof c.text==="string")c=c.text;
 return String(c||"").trim()
}
async function puterVisionChat(prompt,file){
 try{return await puter.ai.chat(prompt,file,false,{model:STUDIO_TEXT_MODEL,normalize:true,verbosity:"low"})}
 catch(first){console.warn("Vision preferred model fallback",first);return puter.ai.chat(prompt,file,false,{normalize:true})}
}
function parseRecipeJson(text){
 let s=String(text||"").trim();
 s=s.replace(/^\s*\`\`\`(?:json)?\s*/i,"").replace(/\s*\`\`\`\s*$/,"").trim();
 const first=s.indexOf("{"),last=s.lastIndexOf("}");if(first>=0&&last>first)s=s.slice(first,last+1);
 return JSON.parse(s)
}
function studioQualityIssues(x){
 const issues=[],tw=x.title.split(/\s+/).filter(Boolean).length;
 if(tw<3||tw>9)issues.push("A cím legyen 3–9 szavas, konkrét és étvágygerjesztő.");
 if(/^(csirkés|sertéses|marhás|zöldséges|tésztás|leves|desszert|egytálétel)$/i.test(x.title))issues.push("A cím túl általános.");
 if(x.ingredients.length<4)issues.push("Kevés a hozzávaló.");
 if(x.steps.length<4)issues.push("Kevés az elkészítési lépés.");
 const promptLeak=/\b(szeretnék|szeretnem|ebből|ebbol|valami|legyen|főre szeretnék|fo-re szeretnek|készíts nekem|keszits nekem)\b/i;
 if(x.ingredients.some(v=>promptLeak.test(v)))issues.push("Felhasználói kérés szövege került a hozzávalók közé.");
 if(x.steps.some(v=>promptLeak.test(v)))issues.push("Felhasználói kérés szövege került az elkészítés közé.");
 if(x.ingredients.some(v=>v.length>95))issues.push("Túl hosszú hozzávalósor.");
 return issues
}
function normalizeStudioDraft(d){
 if(!d||typeof d!=="object")throw new Error("A receptválasz nem értelmezhető.");
 const x={
  title:String(d.title||"").replace(/\s+/g," ").trim(),
  category:String(d.category||"Egyébb").replace(/\s+/g," ").trim(),
  servings:String(d.servings||"4 fő").replace(/\s+/g," ").trim(),
  time:String(d.time||"30–40 perc").replace(/\s+/g," ").trim(),
  difficulty:String(d.difficulty||"Könnyű").replace(/\s+/g," ").trim(),
  ingredients:Array.isArray(d.ingredients)?d.ingredients.map(v=>String(v).replace(/\s+/g," ").trim()).filter(Boolean):[],
  steps:Array.isArray(d.steps)?d.steps.map(v=>String(v).replace(/\s+/g," ").trim()).filter(Boolean):[],
  notes:Array.isArray(d.notes)?d.notes.map(v=>String(v).replace(/\s+/g," ").trim()).filter(Boolean):[]
 };
 if(!x.title||!x.ingredients.length||!x.steps.length)throw new Error("A receptválasz hiányos.");
 const issues=studioQualityIssues(x);if(issues.length){const e=new Error("Minőségi ellenőrzés: "+issues.join(" "));e.qualityIssues=issues;throw e}
 return x
}
function dataUrlToBlob(url){
 const m=String(url||"").match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.*)$/);
 if(!m)throw new Error("A képgenerátor nem data URL képet adott vissza.");
 const bin=atob(m[2]),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);
 return new Blob([a],{type:m[1]||"image/png"})
}
async function generatedImageBlob(image){
 const src=image&&image.src;if(!src)throw new Error("A képgenerátor nem adott vissza képet.");
 if(String(src).startsWith("data:"))return dataUrlToBlob(src);
 const response=await fetch(src);if(!response.ok)throw new Error("A generált kép nem tölthető le.");
 return response.blob()
}
function studioAiPrompt(userText,currentRecipe=null){
 const categories=allCategories().join(", ");
 const schema='{"title":"...","category":"...","servings":"4 fő","time":"30 perc","difficulty":"Könnyű","ingredients":["..."],"steps":["..."],"notes":["..."]}';
 const taste=tasteContextText();
 let p="Te Léna vagy, a Léna Recepttár magyar receptasszisztense. Készíts pontos, hétköznapi konyhában megbízhatóan elkészíthető receptet. Alapértelmezésben 4 főre tervezz, kivéve ha a felhasználó más adagszámot kér. Tartsd meg a felhasználó által megadott mennyiségeket, adagokat és korlátozásokat. A mennyiségek legyenek konkrétak, az elkészítés sorrendhelyes, 4–9 lépés. A recept CÍME legyen étvágygerjesztő, konkrét és 3–7 szavas: nevezze meg a fő alapanyagot ÉS az ízvilágot/elkészítést/mártást. Tilos az egyszavas vagy semmitmondó cím, például: 'Csirkés', 'Zöldséges', 'Tésztás'. Jó cím például: 'Magyaros tejfölös-paprikás csirkemellragu', 'Krémes fokhagymás-gombás penne'. Válaszolj KIZÁRÓLAG érvényes JSON objektummal, markdown nélkül. Séma: "+schema+". Kategória lehetőleg ezek közül: "+categories+".\n\nSAJÁT ÍZLÉSPROFIL (jelzés, nem merev szabály):\n"+taste+"\n\n";
 if(currentRecipe)p+="Jelenlegi recept:\n"+JSON.stringify(currentRecipe)+"\n\nMódosítási kérés:\n"+userText+"\n\nA teljes frissített receptet add vissza.";
 else p+="Felhasználói kérés:\n"+userText;
 return p
}
async function puterRecipe(prompt,currentRecipe=null){
 if(!puterAvailable())throw new Error("A Puter AI könyvtár nem töltődött be.");
 const req=studioAiPrompt(prompt,currentRecipe);
 async function ask(text,usePreferred=true){
   if(usePreferred){try{return await puter.ai.chat(text,{model:STUDIO_TEXT_MODEL,normalize:true,verbosity:"low"})}catch(first){console.warn("Studio preferred model fallback",first)}}
   return puter.ai.chat(text,{normalize:true})
 }
 let resp=await ask(req,true),raw=puterText(resp);
 try{return normalizeStudioDraft(parseRecipeJson(raw))}
 catch(firstQuality){
   console.warn("Studio quality retry",firstQuality);
   const issues=firstQuality.qualityIssues||[firstQuality.message];
   const retry=req+"\n\nFONTOS MINŐSÉGI JAVÍTÁS: Az előző válasz nem ment át az ellenőrzésen. Hibák: "+issues.join(" | ")+
     "\nAz előző válasz: "+raw+
     "\nKészítsd újra a TELJES JSON receptet. Ne ismételd a felhasználó kérőmondatát hozzávalóként. A cím legyen konkrét, természetes magyar receptnév, ne általános jelző.";
   resp=await ask(retry,false);return normalizeStudioDraft(parseRecipeJson(puterText(resp)))
 }
}
async function puterFoodImage(recipe,kind="hero"){
 if(!puterImageAvailable())throw new Error("A Puter képgenerátor nem érhető el.");
 const isSteps=kind==="steps";
 const prompt=isSteps?[
   "Create a detailed culinary process photo storyboard for a premium illustrated Hungarian recipe card.",
   "Recipe: "+recipe.title+". Key ingredients: "+recipe.ingredients.slice(0,10).join(", ")+".",
   "Exactly six distinct panels in a clean 2 columns by 3 rows contact sheet, with even gutters and no overlapping panels.",
   "Show these cooking stages in order, one stage per panel: "+recipe.steps.slice(0,6).map((s,i)=>(i+1)+". "+s).join(" "),
   "Photorealistic overhead and three-quarter close-ups, warm natural kitchen light, consistent cookware and ingredients, richly detailed food-magazine styling.",
   "No text, no letters, no numbers, no labels, no watermark, no people, no hands."
 ].join(" "):[
   "Photorealistic premium editorial food photography matching a richly illustrated classic Hungarian recipe card.",
   "Finished dish: "+recipe.title+". Key ingredients: "+recipe.ingredients.slice(0,10).join(", ")+".",
   "Generous appetizing portion in the correct cookware, clearly visible ingredients, natural proportions, warm side light, elegant rustic home-kitchen setting, extremely detailed food texture.",
   "Landscape-friendly composition with the main dish centered, no text, no lettering, no labels, no watermark, no hands, no people."
 ].join(" ");
 let img;
 const ratio=isSteps?{w:2,h:3}:{w:4,h:3};
 try{img=await puter.ai.txt2img(prompt,{model:STUDIO_IMAGE_MODEL,ratio,quality:"high"})}
 catch(first){
   if(!canRetryImageWithFallback(first))throw first;
   console.warn("Studio primary image model fallback",first);
   img=await puter.ai.txt2img(prompt,{model:"gemini-3.1-flash-image",ratio,quality:"1K"})
 }
 return generatedImageBlob(img)
}

let studioFridgeFile=null,studioFridgeUrl=null,studioFridgeIdeas=[];

function fridgeVisionPrompt(){
 return [
  "Te Léna vagy, egy magyar konyhai asszisztens. Elemezd ezt a hűtő-, kamra- vagy alapanyagfotót.",
  "Csak olyan élelmiszert nevezz meg, amely ténylegesen látható vagy a csomagolás alapján ésszerűen azonosítható. Ne találj ki rejtett alapanyagokat.",
  "Az items listába rövid, magyar alapanyagnevek kerüljenek, becsült mennyiséggel csak akkor, ha a képből ésszerűen megállapítható.",
  "Az uncertain listába tedd, amit nem tudsz biztosan azonosítani.",
  "Adj 3 rövid, otthoni receptötletet a látható alapanyagokra építve. A missing listában csak a valószínűleg még szükséges alapanyagok legyenek.",
  "Válaszolj kizárólag JSON-nal ebben a sémában:",
  '{"items":["..."],"uncertain":["..."],"ideas":[{"title":"...","why":"...","missing":["..."]}]}'
 ].join("\n")
}
function cleanFridgeVision(v){
 if(!v||typeof v!=="object")throw new Error("A képelemzés válasza nem értelmezhető.");
 return{
  items:Array.isArray(v.items)?v.items.map(String).map(s=>s.trim()).filter(Boolean):[],
  uncertain:Array.isArray(v.uncertain)?v.uncertain.map(String).map(s=>s.trim()).filter(Boolean):[],
  ideas:Array.isArray(v.ideas)?v.ideas.slice(0,4).map(x=>({title:String(x?.title||"").trim(),why:String(x?.why||"").trim(),missing:Array.isArray(x?.missing)?x.missing.map(String).filter(Boolean):[]})).filter(x=>x.title):[]
 }
}
function renderFridgeIdeas(){
 const box=$("#studioFridgeIdeas");box.innerHTML="";
 if(!studioFridgeIdeas.length){const d=document.createElement("div");d.className="empty-admin";d.textContent="Az alapanyaglista alapján a Recept Studio készít majd javaslatot.";box.appendChild(d);return}
 studioFridgeIdeas.forEach((idea,i)=>{
   const b=document.createElement("button");b.type="button";b.className="fridge-idea";
   const t=document.createElement("b");t.textContent=idea.title;const s=document.createElement("small");
   s.textContent=(idea.why||"Jó kiindulás a felismert alapanyagokból.")+(idea.missing.length?" · Még kellhet: "+idea.missing.join(", "):" · Valószínűleg minden fő alapanyag megvan.");
   b.append(t,s);b.onclick=()=>useFridgeInventory(idea.title);box.appendChild(b)
 })
}
function useFridgeInventory(chosenIdea=""){
 const items=splitLines($("#studioDetectedItems").value);if(!items.length){alert("Nem látok használható alapanyaglistát.");return}
 let p="Ezek az alapanyagok vannak itthon: "+items.join(", ")+". ";
 if(chosenIdea)p+="Ezt szeretném elkészíteni: "+chosenIdea+". ";
 p+="Elsősorban a meglévő alapanyagokat használd, és külön jelezd, ha valami alapvető hozzávaló még szükséges. Adj pontos, teljes receptet.";
 $("#studioPrompt").value=p;studioGenerate()
}
async function analyzeFridgePhoto(file){
 if(!file)return;studioFridgeFile=file;
 if(studioFridgeUrl)URL.revokeObjectURL(studioFridgeUrl);studioFridgeUrl=URL.createObjectURL(file);$("#studioFridgePreview").src=studioFridgeUrl;
 $("#studioFridgeResult").hidden=false;$("#studioDetectedItems").value="";$("#studioFridgeIdeas").innerHTML="";$("#studioUncertain").hidden=true;
 busy(true,"Léna körbenéz a hűtőben…");
 try{
   if(!puterAvailable())throw new Error("A Puter Vision nem érhető el.");
   const resp=await puterVisionChat(fridgeVisionPrompt(),file);
   const vision=cleanFridgeVision(parseRecipeJson(puterText(resp)));
   if(!vision.items.length)throw new Error("Nem sikerült biztosan felismerhető alapanyagot találni.");
   $("#studioDetectedItems").value=vision.items.join("\n");studioFridgeIdeas=vision.ideas;renderFridgeIdeas();
   if(vision.uncertain.length){$("#studioUncertain").hidden=false;$("#studioUncertain").textContent="🤔 Bizonytalan felismerés: "+vision.uncertain.join(", ")+" · Ezt érdemes ellenőrizni."}
   $("#studioStatus").textContent="✓ A fotó elemzése elkészült. Ellenőrizd a listát, válassz egy ötletet vagy készíttess receptet az összes felismert alapanyagból."
 }catch(e){
   console.error(e);$("#studioDetectedItems").value="";studioFridgeIdeas=[];renderFridgeIdeas();$("#studioUncertain").hidden=false;$("#studioUncertain").textContent="A képelemzés most nem sikerült: "+e.message;
 }finally{busy(false)}
}

let studioDraft=null,studioPhotoBlob=null,studioPhotoUrl=null,studioProcessBlob=null,studioProcessUrl=null,studioCardPreviewUrl=null,studioEditingId=null,studioImageGenerating=false;

function studioIcon(category,title){
 const n=norm((category||"")+" "+(title||""));
 if(n.includes("teszta")||n.includes("penne")||n.includes("fus"))return"🍝";
 if(n.includes("leves"))return"🍲";
 if(n.includes("kenyer")||n.includes("pek"))return"🥖";
 if(n.includes("desszert")||n.includes("torta")||n.includes("suti"))return"🍰";
 if(n.includes("salata"))return"🥗";
 return"🥘"
}
function studioCategoryFromPrompt(p){
 const n=norm(p);
 if(/leves|kremleves/.test(n))return"Levesek";
 if(/penne|fusilli|spagetti|teszta|carbonara/.test(n))return"Tészták";
 if(/kenyer|zsemle|pogacsa|focaccia|stangli/.test(n))return"Kenyerek, Pékárú";
 if(/torta|suti|desszert|keksz|golyo/.test(n))return"Desszertek";
 if(/magyaros|paprikas|csirkepaprikas|lecso|fozelek|rakott krumpli|gulyas|porkolt/.test(n))return"Hungarikum";
 return"Egyébb"
}
function studioIngredientCandidates(prompt){
 const n=norm(prompt),out=[];
 function qtyFor(pattern,def){
   const raw=String(prompt||"").replace(/,/g,".");
   const m=raw.match(new RegExp("(\\d+(?:\\.\\d+)?)\\s*(kg|g|dkg|ml|l)?\\s*"+pattern,"i"));
   return m?((m[1]+" "+(m[2]||"")).trim()):def
 }
 if(n.includes("csirkemell"))out.push(qtyFor("csirkemell(?:em|et|ből|bol)?","1 kg")+" csirkemell");
 else if(n.includes("csirk"))out.push(qtyFor("csirk(?:e|ét|et|ebol|éből)?","1 kg")+" csirkehús");
 if(n.includes("paprika")){out.push("2 db húsos paprika");out.push("1,5 ek őrölt pirospaprika")}
 if(n.includes("tejfol"))out.push(qtyFor("tejf[oö]l","400 g")+" tejföl");
 if(n.includes("brokk"))out.push("1 nagy fej brokkoli");
 if(n.includes("cukkini"))out.push("2 közepes cukkini");
 if(n.includes("tejszin"))out.push(qtyFor("tejsz[ií]n","250 ml")+" főzőtejszín");
 if(n.includes("gouda"))out.push("150 g reszelt Gouda");
 if(n.includes("penne"))out.push(qtyFor("penne","500 g")+" penne");
 if(n.includes("fusilli"))out.push(qtyFor("fusilli","500 g")+" fusilli");
 if(n.includes("gomba"))out.push("300 g gomba");
 if(n.includes("rizs"))out.push("300 g rizs");
 if(n.includes("krumpli")||n.includes("burgonya"))out.push("800 g burgonya");
 if(n.includes("paradics"))out.push("400 g paradicsom");
 if(/magyaros|paprikas|tejfol/.test(n)){out.push("1 nagy vöröshagyma");out.push("2 gerezd fokhagyma")}
 if(!out.length)out.push("500 g választott fő hozzávaló");
 if(!out.some(x=>norm(x).includes("olaj")))out.push("2 ek olaj");
 if(!out.some(x=>norm(x).includes("so")))out.push("Só és frissen őrölt bors");
 return [...new Set(out)].slice(0,12)
}
function studioTitleFromPrompt(p,ingredients,category){
 const n=norm(p);
 if(n.includes("csirk")&&n.includes("tejfol")&&n.includes("paprika"))return n.includes("magyaros")?"Magyaros tejfölös-paprikás csirkemellragu":"Tejfölös-paprikás csirkemellragu";
 if(n.includes("csirk")&&n.includes("tejfol"))return"Tejfölös csirkemellragu";
 if(n.includes("csirk")&&n.includes("paprika"))return"Paprikás csirkemellragu";
 if(n.includes("csirk")&&n.includes("brokk"))return n.includes("tejszin")?"Krémes brokkolis csirkemell":"Brokkolis csirkemell serpenyőben";
 if(n.includes("penne")&&n.includes("gomba"))return n.includes("tejszin")?"Krémes gombás penne":"Fokhagymás-gombás penne";
 if(n.includes("fusilli")&&n.includes("brokk")&&n.includes("cukkini"))return"Brokkolis-cukkinis fusilli";
 const names=[];[["csirk","csirkemell"],["brokk","brokkoli"],["cukkini","cukkini"],["gomba","gomba"],["penne","penne"],["fusilli","fusilli"],["rizs","rizs"],["krumpli","burgonya"],["paradics","paradicsom"]].forEach(([k,v])=>{if(n.includes(k))names.push(v)});
 const main=names.slice(0,2).join("–");
 if(main)return (n.includes("magyaros")?"Magyaros ":"")+(n.includes("kremes")||n.includes("tejszin")?"krémes ":"")+main+" egytálétel";
 return category==="Levesek"?"Házi krémleves":category==="Tészták"?"Krémes házi tészta":"Léna házias serpenyős fogása"
}
function studioLocalDraft(prompt){
 const category=studioCategoryFromPrompt(prompt),ingredients=studioIngredientCandidates(prompt),title=studioTitleFromPrompt(prompt,ingredients,category);
 const n=norm(prompt),servings=(n.match(/(\d+)\s*(fo|adag)/)||[])[1];
 let steps=[
   "Készítsd elő és darabold fel a fő hozzávalókat.",
   "Egy nagy serpenyőben vagy lábasban hevítsd fel az olajat, majd kezdd el pirítani a fő hozzávalókat.",
   "Add hozzá a többi hozzávalót, ízesítsd, és közepes lángon főzd össze, amíg minden megfelelően megpuhul.",
   "A végén állítsd be a krémességet és a fűszerezést, majd frissen tálald."
 ];
 if(n.includes("csirk")&&n.includes("tejfol")&&n.includes("paprika")){
   steps=[
    "A csirkemellet vágd nagyobb falatnyi kockákra, a hagymát és a paprikát aprítsd fel.",
    "Az olajon dinszteld üvegesre a hagymát, majd húzd le röviden a tűzről és keverd hozzá az őrölt pirospaprikát.",
    "Add hozzá a csirkemellet, pirítsd körbe, majd tedd bele a paprikát és a fokhagymát.",
    "Sózd, borsozd, önts alá kevés vizet, és fedő alatt párold 15–20 percig, amíg a hús megpuhul.",
    "A tejfölt keverd simára kevés forró szafttal, majd alacsony lángon forgasd a raguhoz. Ne forrald erősen.",
    "Kóstold, igazítsd a fűszerezést, és nokedlivel, rizzsel vagy friss kenyérrel tálald."
   ]
 }
 if(category==="Tészták")steps.splice(0,1,"A tésztát főzd al dentére, és tegyél félre egy kevés főzővizet.");
 if(category==="Levesek"){steps[1]="A hagymás-fűszeres alapon párold át a zöldségeket.";steps[2]="Öntsd fel alaplével, főzd puhára, majd turmixold krémesre."}
 return{title,category,servings:servings?servings+" fő":"4–6 fő",time:n.includes("csirk")&&n.includes("tejfol")?"35–40 perc":"30–35 perc",difficulty:"Könnyű",ingredients,steps,notes:["Helyi tartalék-javaslat, ha az AI szolgáltatás átmenetileg nem érhető el."]}
}
function resetStudio(){
 studioDraft=null;studioPhotoBlob=null;studioProcessBlob=null;if(studioPhotoUrl){URL.revokeObjectURL(studioPhotoUrl);studioPhotoUrl=null}if(studioProcessUrl){URL.revokeObjectURL(studioProcessUrl);studioProcessUrl=null}if(studioFridgeUrl){URL.revokeObjectURL(studioFridgeUrl);studioFridgeUrl=null}studioFridgeFile=null;studioFridgeIdeas=[];$("#studioHero").style.backgroundImage="";$("#studioHero").classList.remove("has-photo")
 $("#studioPrompt").value="";$("#studioFridgeCamera").value="";$("#studioFridgeGallery").value="";$("#studioFridgeResult").hidden=true;$("#studioDetectedItems").value="";$("#studioFridgeIdeas").innerHTML="";$("#studioUncertain").hidden=true;$("#studioPreview").hidden=true;$("#studioPhotoPreview").hidden=true;$("#studioPhotoPreview").removeAttribute("src");$("#studioPhotoInput").value="";$("#studioExactCardWrap").hidden=true;$("#studioExactCard").removeAttribute("src");setStudioPreviewMode("card");
 $("#studioStatus").textContent="A Studio AI-receptet és ételfotót készít fizetős API-kulcs nélkül.";
 $("#studioCentralSync").checked=true;$("#studioDialogTitle").textContent="✨ Új recept készítése";$("#studioFinalize").textContent="✅ Véglegesítés és mentés"
}
function openStudio(){studioEditingId=null;fillCategoryList();resetStudio();updateStudioProviderBadge();$("#studioDialog").showModal()}
async function recipeStudioSource(r){
 const readable=getReadable(r.id),saved=r.studioData||{};
 return{
  title:r.title,category:r.category,servings:saved.servings||recipeServingText(r.id,readable)||"4 fő",time:saved.time||"30–40 perc",difficulty:saved.difficulty||"Könnyű",
  ingredients:(saved.ingredients&&saved.ingredients.length?saved.ingredients:readable.ingredients)||[],
  steps:(saved.steps&&saved.steps.length?saved.steps:readable.steps)||[],
  notes:(saved.notes&&saved.notes.length?saved.notes:readable.notes)||[]
 }
}
async function loadStudioArtwork(r){
 let hero=null,process=null;
 if(r.localCustom){const row=await dbGet(r.id);hero=row&&row.heroBlob;process=row&&row.processBlob}
 else if(r.central&&puterCloudReady()&&puter.auth.isSignedIn()){
  if(r.heroPath)try{hero=await puter.fs.read(r.heroPath)}catch(e){console.warn("A régi címlapkép nem tölthető be",e)}
  if(r.processPath)try{process=await puter.fs.read(r.processPath)}catch(e){console.warn("A régi lépésképek nem tölthetők be",e)}
 }
 studioPhotoBlob=hero||null;studioProcessBlob=process||null;
 if(studioPhotoBlob){studioPhotoUrl=URL.createObjectURL(studioPhotoBlob);$("#studioPhotoPreview").src=studioPhotoUrl;$("#studioPhotoPreview").hidden=false;$("#studioHero").style.backgroundImage='linear-gradient(rgba(0,0,0,.08),rgba(0,0,0,.42)),url("'+studioPhotoUrl+'")';$("#studioHero").classList.add("has-photo")}
}
async function openCurrentRecipeInStudio(){
 if(!currentId)return;const r=getRecipe(currentId);if(!r)return;const source=await recipeStudioSource(r);
 if(source.ingredients.length<2||source.steps.length<2){alert("A Golden kártyához előbb dolgozd fel a receptet, hogy meglegyenek a hozzávalók és az elkészítési lépések.");$("#editDialog").close();setMode("readable");return}
 $("#editDialog").close();fillCategoryList();resetStudio();studioEditingId=r.id;studioDraft=source;await loadStudioArtwork(r);studioFillEditor();$("#studioPreview").hidden=false;renderStudioPreview();
 $("#studioDialogTitle").textContent="🎨 Recept javítása és újragenerálása";$("#studioFinalize").textContent="✅ Javítás mentése";$("#studioCentralSync").checked=!!(r.central||r.pending||r.studio);updateStudioProviderBadge();$("#studioDialog").showModal();await studioRenderExactCard()
}
function studioPullEditor(){
 if(!studioDraft)return null;
 studioDraft.title=$("#studioTitle").value.trim()||studioDraft.title;
 studioDraft.category=$("#studioCategory").value.trim()||studioDraft.category;
 studioDraft.servings=$("#studioServings").value.trim()||studioDraft.servings;
 studioDraft.time=$("#studioTime").value.trim()||studioDraft.time;
 studioDraft.ingredients=splitLines($("#studioIngredients").value);
 studioDraft.steps=splitLines($("#studioSteps").value);
 studioDraft.notes=splitLines($("#studioNotes").value);
 return studioDraft
}
function studioFillEditor(){
 const d=studioDraft;if(!d)return;
 $("#studioTitle").value=d.title;$("#studioCategory").value=d.category;$("#studioServings").value=d.servings;$("#studioTime").value=d.time;
 $("#studioIngredients").value=d.ingredients.join("\n");$("#studioSteps").value=d.steps.join("\n");$("#studioNotes").value=(d.notes||[]).join("\n")
}
function setStudioPreviewMode(mode){
 const card=mode!=="readable";$("#studioCardPanel").hidden=!card;$("#studioReadablePreview").hidden=card;
 $("#studioCardTab").classList.toggle("active",card);$("#studioReadableTab").classList.toggle("active",!card)
}
function renderStudioReadablePreview(d){
 $("#studioReadableTitle").textContent=d.title;$("#studioReadableMeta").innerHTML="";
 [d.category,d.servings,d.time,d.difficulty].filter(Boolean).forEach(v=>{const s=document.createElement("span");s.textContent=v;$("#studioReadableMeta").appendChild(s)});
 $("#studioReadableIngredients").innerHTML="";d.ingredients.forEach(v=>{const row=document.createElement("label");row.className="ingredient-row";const cb=document.createElement("input");cb.type="checkbox";cb.disabled=true;const s=document.createElement("span");s.textContent=v;row.append(cb,s);$("#studioReadableIngredients").appendChild(row)});
 $("#studioReadableSteps").innerHTML="";d.steps.forEach(v=>{const li=document.createElement("li");li.textContent=v;$("#studioReadableSteps").appendChild(li)});
 const notes=d.notes||[];$("#studioReadableNotes").innerHTML="";$("#studioReadableNotesBox").hidden=!notes.length;notes.forEach(v=>{const p=document.createElement("p");p.textContent=v;$("#studioReadableNotes").appendChild(p)})
}
function renderStudioPreview(){
 const d=studioPullEditor()||studioDraft;if(!d)return;
 $("#studioPreviewTitle").textContent=d.title;$("#studioPreviewCategory").textContent=d.category;
 $("#studioHeroEmoji").textContent=studioIcon(d.category,d.title);
 $("#studioPreviewMeta").innerHTML="";
 [d.servings,d.time,d.difficulty].filter(Boolean).forEach(x=>{const s=document.createElement("span");s.textContent=x;$("#studioPreviewMeta").appendChild(s)});
 $("#studioPreviewIngredients").innerHTML="";d.ingredients.slice(0,8).forEach(x=>{const li=document.createElement("li");li.textContent=x;$("#studioPreviewIngredients").appendChild(li)});
 $("#studioPreviewSteps").innerHTML="";d.steps.slice(0,4).forEach(x=>{const li=document.createElement("li");li.textContent=x;$("#studioPreviewSteps").appendChild(li)});
 renderStudioReadablePreview(d)
}
async function studioGenerate(){
 const prompt=$("#studioPrompt").value.trim();if(!prompt){alert("Írd le, milyen receptet szeretnél.");return}
 busy(true,"Léna receptjavaslatot készít…");
 try{
   studioDraft=await puterRecipe(prompt);
   $("#studioStatus").textContent="✓ AI receptjavaslat elkészült. Finomíthatod, generálhatsz hozzá ételfotót, majd véglegesítheted.";
 }catch(e){
   console.error(e);studioDraft=studioLocalDraft(prompt);
   $("#studioStatus").textContent="⚠ AI hívás most nem sikerült ("+e.message+"). Helyi prototípus-javaslatot mutatok helyette.";
 }
 studioFillEditor();$("#studioPreview").hidden=false;renderStudioPreview();$("#studioPreview").scrollIntoView({behavior:"smooth",block:"start"});busy(false);studioRenderExactCard()
}
async function studioRefine(){
 if(!studioDraft)return;studioPullEditor();const q=$("#studioRefineText").value.trim(),n=norm(q);if(!q)return;
 busy(true,"Léna finomítja a receptet…");
 try{
   studioDraft=await puterRecipe(q,studioDraft);studioFillEditor();renderStudioPreview();$("#studioRefineText").value="";toast("✓ Recept finomítva.");return
 }catch(e){console.error(e);toast("AI finomítás most nem sikerült, helyi módosítást alkalmazok.")}
 finally{busy(false)}
 const mult=(n.match(/(\d+)\s*(fo|adag)/)||[])[1];if(mult)studioDraft.servings=mult+" fő";
 if(n.includes("csipos")&&!studioDraft.ingredients.some(x=>norm(x).includes("chili")))studioDraft.ingredients.push("Chilipehely ízlés szerint");
 if(n.includes("laktozmentes"))studioDraft.ingredients=studioDraft.ingredients.map(x=>x.replace(/tejszín/gi,"laktózmentes tejszín").replace(/gouda/gi,"laktózmentes Gouda"));
 const pen=(n.match(/(\d+)\s*g\s*penne/)||[])[1];if(pen){const i=studioDraft.ingredients.findIndex(x=>norm(x).includes("penne"));if(i>=0)studioDraft.ingredients[i]=pen+" g penne";else studioDraft.ingredients.unshift(pen+" g penne")}
 if(n.includes("gyors"))studioDraft.time="20–25 perc";
 studioDraft.notes=(studioDraft.notes||[]).concat("Finomítási kérés: "+q);
 studioFillEditor();renderStudioPreview();$("#studioRefineText").value=""
}
async function studioGenerateImage(){
 if(!studioDraft||studioImageGenerating)return;studioPullEditor();
 studioImageGenerating=true;$("#studioStatus").textContent="⏳ A Golden címlapkép generálása elindult…";
 busy(true,"Puter AI előkészítése…");
 try{
   ensurePuterAiSession();busy(true,"Golden címlapkép generálása…");
   const raw=await puterFoodImage(studioDraft,"hero");studioPhotoBlob=await processImage(raw);
   if(studioPhotoUrl)URL.revokeObjectURL(studioPhotoUrl);studioPhotoUrl=URL.createObjectURL(studioPhotoBlob);
   $("#studioPhotoPreview").src=studioPhotoUrl;$("#studioPhotoPreview").hidden=false;
   $("#studioHero").style.backgroundImage='linear-gradient(rgba(0,0,0,.08),rgba(0,0,0,.42)),url("'+studioPhotoUrl+'")';$("#studioHero").classList.add("has-photo");
   $("#studioStatus").textContent="⏳ A címlapkép elkészült, készülnek a részletes lépésillusztrációk…";
   busy(true,"Hat részletes lépésillusztráció készítése…");
   try{const stepsRaw=await puterFoodImage(studioDraft,"steps");studioProcessBlob=await processImage(stepsRaw);if(studioProcessUrl)URL.revokeObjectURL(studioProcessUrl);studioProcessUrl=URL.createObjectURL(studioProcessBlob)}
   catch(stepError){console.warn("A lépésillusztrációk külön generálása nem sikerült",stepError);studioProcessBlob=null}
   await studioRenderExactCard();$("#studioStatus").textContent="✓ Golden címlapkép és részletes kártya elkészült.";toast("✓ Golden címlapkép és részletes kártya elkészült.")
 }catch(e){const message=puterImageErrorMessage(e);console.error(e);$("#studioStatus").textContent="⚠ A képgenerálás nem sikerült: "+message;alert("A képgenerálás nem sikerült: "+message)}finally{studioImageGenerating=false;busy(false)}
}
async function studioHandlePhoto(file){
 if(!file)return;busy(true,"Ételfotó előkészítése…");try{studioPhotoBlob=await processImage(file);studioProcessBlob=null;if(studioProcessUrl){URL.revokeObjectURL(studioProcessUrl);studioProcessUrl=null}if(studioPhotoUrl)URL.revokeObjectURL(studioPhotoUrl);studioPhotoUrl=URL.createObjectURL(studioPhotoBlob);$("#studioPhotoPreview").src=studioPhotoUrl;$("#studioPhotoPreview").hidden=false;$("#studioHero").style.backgroundImage='linear-gradient(rgba(0,0,0,.08),rgba(0,0,0,.42)),url("'+studioPhotoUrl+'")';$("#studioHero").classList.add("has-photo")}catch(e){console.error(e);alert("A kép feldolgozása nem sikerült.");busy(false);return}busy(false);await studioRenderExactCard()
}
async function studioRenderExactCard(){
 if(!studioDraft)return;const d=studioPullEditor();busy(true,"Golden kártya előnézet készítése…");
 try{
   const blob=await studioCardBlob(d);if(studioCardPreviewUrl)URL.revokeObjectURL(studioCardPreviewUrl);studioCardPreviewUrl=URL.createObjectURL(blob);
   $("#studioExactCard").src=studioCardPreviewUrl;$("#studioExactCardWrap").hidden=false;setStudioPreviewMode("card");$("#studioExactCardWrap").scrollIntoView({behavior:"smooth",block:"nearest"})
 }catch(e){console.error(e);toast("Kártyaelőnézet hiba: "+e.message)}finally{if(!studioImageGenerating)busy(false)}
}
function canvasTextTokens(ctx,text,maxWidth){
 const tokens=[];
 String(text||"").trim().split(/\s+/).filter(Boolean).forEach(word=>{
   const pieces=word.match(/[^-]+-?/g)||[word];
   pieces.forEach((piece,pieceIndex)=>{
     let chunk="",chunkIndex=0;
     [...piece].forEach(ch=>{
       const test=chunk+ch;
       if(chunk&&ctx.measureText(test).width>maxWidth){tokens.push({text:chunk,attach:pieceIndex>0||chunkIndex>0});chunk=ch;chunkIndex++}
       else chunk=test
     });
     if(chunk)tokens.push({text:chunk,attach:pieceIndex>0||chunkIndex>0})
   })
 });
 return tokens
}
function canvasTextLines(ctx,text,maxWidth){
 const lines=[];let line="";
 canvasTextTokens(ctx,text,maxWidth).forEach(token=>{
   const separator=line&&!token.attach?" ":"",test=line+separator+token.text;
   if(line&&ctx.measureText(test).width>maxWidth){lines.push(line);line=token.text}else line=test
 });
 if(line)lines.push(line);return lines
}
function canvasWrap(ctx,text,x,y,maxWidth,lineHeight,maxLines){
 const lines=canvasTextLines(ctx,text,maxWidth),visible=maxLines?lines.slice(0,maxLines):lines;
 visible.forEach(line=>{ctx.fillText(line,x,y);y+=lineHeight});return y
}
function drawGoldenTitle(ctx,text,x,y,maxWidth,maxHeight){
 let size=60,lineHeight=62,lines=[];
 for(;size>=34;size-=2){
   ctx.font=`900 ${size}px Georgia`;lineHeight=Math.round(size*1.04);lines=canvasTextLines(ctx,String(text||"").toUpperCase(),maxWidth);
   if(lines.length<=4&&size+(Math.max(0,lines.length-1)*lineHeight)<=maxHeight)break
 }
 lines.slice(0,4).forEach(line=>{ctx.fillText(line,x,y);y+=lineHeight});return y
}
function roundRectPath(ctx,x,y,w,h,r){
 const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()
}
function fillRound(ctx,x,y,w,h,r,fill){roundRectPath(ctx,x,y,w,h,r);ctx.fillStyle=fill;ctx.fill()}
function strokeRound(ctx,x,y,w,h,r,stroke,width=1){roundRectPath(ctx,x,y,w,h,r);ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}
function canvasChip(ctx,text,x,y,padX=18){
 ctx.font="900 21px Arial";const w=ctx.measureText(text).width+padX*2;fillRound(ctx,x,y-30,w,42,21,"rgba(255,255,255,.90)");ctx.fillStyle="#234637";ctx.fillText(text,x+padX,y);return w
}
function ingredientEmoji(text){
 const n=norm(text||"");
 if(n.includes("brokk"))return"🥦";if(n.includes("cukkini"))return"🥒";if(n.includes("paradics"))return"🍅";
 if(n.includes("paprika"))return"🫑";if(n.includes("hagyma"))return"🧅";if(n.includes("fokhagy"))return"🧄";
 if(n.includes("sajt"))return"🧀";if(n.includes("csirk"))return"🍗";if(n.includes("krumpli")||n.includes("burgonya"))return"🥔";
 if(n.includes("gomba"))return"🍄";if(n.includes("citrom"))return"🍋";if(n.includes("rizs"))return"🍚";
 return"🌿"
}
function drawCover(ctx,bm,x,y,w,h,focusX=.5,focusY=.5){
 const scale=Math.max(w/bm.width,h/bm.height),dw=bm.width*scale,dh=bm.height*scale;
 const dx=x-(dw-w)*focusX,dy=y-(dh-h)*focusY;ctx.drawImage(bm,dx,dy,dw,dh)
}
function magazineStepPhoto(ctx,processBm,heroBm,x,y,w,h,index){
 ctx.save();roundRectPath(ctx,x,y,w,h,18);ctx.clip();
 if(processBm){
  const cols=2,rows=3,cw=processBm.width/cols,ch=processBm.height/rows,sx=(index%cols)*cw,sy=Math.floor(index/cols)*ch;
  ctx.drawImage(processBm,sx,sy,cw,ch,x,y,w,h)
 }
 else if(heroBm){const fx=[.15,.35,.55,.75,.45,.65][index%6],fy=[.25,.45,.65,.35,.55,.75][index%6];drawCover(ctx,heroBm,x,y,w,h,fx,fy)}
 else{const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,"#e3e8db");g.addColorStop(1,"#f1dfc9");ctx.fillStyle=g;ctx.fillRect(x,y,w,h)}
 ctx.restore();strokeRound(ctx,x,y,w,h,18,"#d8d2c6",2)
}
async function studioCardBlob(d){
 const c=document.createElement("canvas");c.width=1200;c.height=1840;const x=c.getContext("2d");
 const cream="#f7f1e5",ink="#2b241f",green="#355f38",green2="#234c2b",line="#cdbda7",muted="#6f6258";
 x.fillStyle=cream;x.fillRect(0,0,c.width,c.height);
 let bm=null,processBm=null;if(studioPhotoBlob)bm=await createImageBitmap(studioPhotoBlob,{imageOrientation:"from-image"});if(studioProcessBlob)processBm=await createImageBitmap(studioProcessBlob,{imageOrientation:"from-image"});

 // FELSŐ MAGAZIN FEJLÉC — a klasszikus Fusilli Golden Standard arányai.
 x.fillStyle="#fffaf0";x.fillRect(0,0,1200,530);
 if(bm){
   x.save();x.beginPath();x.moveTo(600,0);x.quadraticCurveTo(650,130,610,260);x.quadraticCurveTo(570,400,640,530);x.lineTo(1200,530);x.lineTo(1200,0);x.closePath();x.clip();
   drawCover(x,bm,535,-5,690,540,.52,.48);x.restore()
 }else{
   const g=x.createLinearGradient(590,0,1200,530);g.addColorStop(0,"#e2e9d9");g.addColorStop(1,"#d4c39f");x.fillStyle=g;x.fillRect(590,0,610,530)
 }
 x.fillStyle=green;x.font="900 27px Arial";canvasWrap(x,(d.category||"LÉNA RECEPT").toUpperCase(),32,55,535,28,2);
 x.fillStyle=ink;drawGoldenTitle(x,d.title,30,122,535,184);

 // zöld szalag
 const ribbonY=315;fillRound(x,30,ribbonY,535,58,7,green);
 x.fillStyle="#fff";x.font="900 21px Arial";x.fillText("RÉSZLETESEN ILLUSZTRÁLT RECEPT",52,ribbonY+37);
 x.fillStyle="#7d4e3b";x.font="700 17px Arial";x.fillText("LÉNA RECEPTTÁR · GOLDEN STANDARD",32,394);

 // meta ikon sor
 fillRound(x,28,410,540,110,14,"#fffdf8");strokeRound(x,28,410,540,110,14,line,2);
 const metas=[["👥",d.servings||"4 fő","ADAG"],["⏱",d.time||"30 perc","IDŐ"],["🍲",d.difficulty||"Könnyű","FŐZÉS"],["🍳",d.category||"Recept","STÍLUS"]];
 const cellW=540/4;metas.forEach((m,i)=>{
   const cx=28+i*cellW;if(i)x.fillStyle="#d9cec0",x.fillRect(cx,423,2,82);
   x.textAlign="center";x.font="27px serif";x.fillText(m[0],cx+cellW/2,441);
   x.fillStyle=ink;x.font="900 15px Arial";canvasWrap(x,m[1],cx+cellW/2,466,cellW-24,17,2);
   x.fillStyle=muted;x.font="900 11px Arial";x.fillText(m[2],cx+cellW/2,509);x.textAlign="left"
 });

 // ALSÓ RÉSZ 3 OSZLOP: HOZZÁVALÓ / KÉPSOR / LÉPÉSEK
 const top=570,leftX=20,leftW=300,photoX=338,photoW=305,rightX=662,rightW=518,bodyH=970;
 fillRound(x,leftX,top,leftW,bodyH,18,"#fffaf2");strokeRound(x,leftX,top,leftW,bodyH,18,line,2);
 fillRound(x,rightX,top,rightW,bodyH,18,"#fffaf2");strokeRound(x,rightX,top,rightW,bodyH,18,line,2);

 fillRound(x,leftX+14,top-26,205,52,8,green);x.fillStyle="#fff";x.font="900 20px Arial";x.fillText("HOZZÁVALÓK",leftX+32,top+8);
 fillRound(x,rightX+14,top-26,390,52,8,green);x.fillStyle="#fff";x.font="900 20px Arial";x.fillText("ELKÉSZÍTÉS LÉPÉSRŐL LÉPÉSRE",rightX+32,top+8);

 // hozzávalók
 let iy=625;x.font="19px Arial";
 d.ingredients.slice(0,16).forEach(v=>{
   if(iy>1400)return;
   x.fillStyle=green;x.beginPath();x.arc(leftX+26,iy-6,5,0,Math.PI*2);x.fill();
   x.fillStyle=ink;x.font="19px Arial";iy=canvasWrap(x,v,leftX+43,iy,leftW-58,25,2)+6
 });

 // dekoratív alapanyag ikonok
 const deco=d.ingredients.slice(0,4).map(ingredientEmoji);x.font="53px serif";let ex=leftX+26;deco.forEach(e=>{x.fillText(e,ex,1502);ex+=64});

 // középső képsor
 const ph=142,gap=15;for(let i=0;i<6;i++){const py=top+34+i*(ph+gap);magazineStepPhoto(x,processBm,bm,photoX,py,photoW,ph,i)}

 // lépések — hat, a képsorral pontosan egy vonalba rendezett blokk.
 d.steps.slice(0,6).forEach((v,i)=>{
   const sy=top+34+i*(ph+gap);
   fillRound(x,rightX+18,sy+10,38,38,9,green);x.fillStyle="#fff";x.font="900 20px Arial";x.textAlign="center";x.fillText(String(i+1),rightX+37,sy+37);x.textAlign="left";
   x.fillStyle=ink;x.font="19px Arial";canvasWrap(x,v,rightX+70,sy+32,rightW-92,25,4);
   if(i<5){x.fillStyle="#ddcfbd";x.fillRect(rightX+70,sy+ph+7,rightW-92,1)}
 });

 // Golden Standard alsó információs kártyák
 const notes=(d.notes||[]).filter(Boolean);
 const bottomY=1575,bottomH=188,bottoms=[
  {x:20,w:365,title:"💡 LÉNA TIPP",text:notes[0]||"Kóstolás után, közvetlenül tálalás előtt igazítsd véglegesre a fűszerezést."},
  {x:402,w:386,title:"✨ VARIÁCIÓK",text:notes[1]||"A fő alapanyagokat azonos arányban szezonális változatra is cserélheted."},
  {x:805,w:375,title:"🧊 TÁROLÁS",text:notes[2]||"Hűtőben, jól záródó dobozban 2–3 napig tartható. Újramelegítéskor adj hozzá kevés vizet."}
 ];
 bottoms.forEach(b=>{fillRound(x,b.x,bottomY,b.w,bottomH,16,"#fffaf2");strokeRound(x,b.x,bottomY,b.w,bottomH,16,line,2);x.fillStyle=green2;x.font="900 18px Arial";x.fillText(b.title,b.x+18,bottomY+34);x.fillStyle=ink;x.font="17px Arial";canvasWrap(x,b.text,b.x+18,bottomY+69,b.w-36,23,4)});
 x.strokeStyle="#d8cab6";x.lineWidth=2;x.beginPath();x.moveTo(28,1792);x.lineTo(1172,1792);x.stroke();
 x.fillStyle="#9a4b3d";x.font="18px Georgia";x.textAlign="center";x.fillText("♡ Jó étvágyat kívánunk! Léna Recepttár · Golden Standard ♡",600,1822);x.textAlign="left";
 if(bm)bm.close();if(processBm)processBm.close();
 return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("Kártyagenerálási hiba")),"image/jpeg",.95))
}
async function studioFinalize(){
 if(!studioDraft)return;const d=studioPullEditor();if(!d.title||!d.category||!d.ingredients.length||!d.steps.length){alert("A véglegesítéshez kell cím, kategória, hozzávaló és elkészítés.");return}
 const central=$("#studioCentralSync").checked;let cloudOk=false;
 if(central){try{cloudOk=!!(await ensurePuterSignIn())}catch(e){console.warn(e);toast("A recept helyben mentődik; a központi felhőhöz bejelentkezés kell.")}}
 busy(true,"Golden kártya készítése és mentés…");
 try{
   const editing=studioEditingId,previous=editing?await dbGet(editing):null,id=editing||newId(),existingYoutubeId=editing?String(getRecipe(id)?.youtubeId||previous?.youtubeId||""):"",readable={status:"verified",source:"studio_golden_v2",ingredients:d.ingredients,steps:d.steps,notes:[d.servings+" · "+d.time+" · "+d.difficulty].concat(d.notes||[]),updatedAt:new Date().toISOString()};
   const blob=await studioCardBlob(d);
   const wasCentral=!!(editing&&getRecipe(id)?.central);
   await dbPut({id,title:d.title,category:d.category,originalName:d.title+".jpg",blob,heroBlob:studioPhotoBlob||null,processBlob:studioProcessBlob||null,pending:central,localOverride:wasCentral&&!central,createdAt:previous?.createdAt||getRecipe(id)?.createdAt||Date.now(),readable,studio:true,studioData:{title:d.title,category:d.category,servings:d.servings,time:d.time,difficulty:d.difficulty,ingredients:d.ingredients,steps:d.steps,notes:d.notes||[]},youtubeId:existingYoutubeId});
   setReadable(id,readable);const meta=getMeta(id);meta.title=d.title;meta.category=d.category;meta.deleted=false;meta.updatedAt=new Date().toISOString();setMeta(id,meta);await saveRecipeMetaCloud(id,meta);
   if(central&&cloudOk)await syncLocalRecipe(id,{silent:true,refresh:false});
   if(central&&cloudOk)await loadSharedRecipes();await loadCustomRecipes();$("#studioDialog").close();activeCategory="Mind";favoritesOnly=false;
   if(editing){history.replaceState({view:"recipe",id},"","#recipe="+encodeURIComponent(id));openRecipe(id,false);toast("✓ A recept és a Golden kártya frissítve.")}else{showHome(false);toast("✓ Golden Standard recept elmentve.")}
   studioEditingId=null
 }catch(e){console.error(e);alert("A recept mentése nem sikerült: "+e.message)}finally{busy(false)}
}

async function updateCloudStatus(){
 const s=$("#cloudAccountStatus");if(!s)return;
 if(!puterCloudReady()){s.textContent="✕ A Puter felhő nem érhető el.";return}
 if(!puter.auth.isSignedIn()){s.textContent="Nincs bejelentkezve. Ugyanazzal a Puter-fiókkal lépj be minden eszközön.";return}
 const u=await currentPuterUser();s.textContent=u?"✓ Bejelentkezve: "+(u.username||u.email||"Puter felhasználó"):"✓ Bejelentkezve a Puter felhőbe."
}
async function openSyncSettings(){
 if($("#adminDialog").open)$("#adminDialog").close();$("#syncDialog").showModal();await updateCloudStatus();
 if(puterCloudReady()&&puter.auth.isSignedIn()){await syncPendingToCloud();await updateCloudStatus()}
}
async function cloudSignIn(forcePick=false){
 const s=$("#cloudAccountStatus");s.textContent="Bejelentkezés…";
 try{
   await ensurePuterSignIn(forcePick);
   await loadCloudRecipeMeta();await loadCategoryConfig();
   const n=await syncPendingToCloud();
   await refreshSharedRecipes(true);await updateCloudStatus();
   toast(n?"☁ "+n+" helyi recept feltöltve.":"✓ Központi tárhely csatlakoztatva.")
 }catch(e){console.error(e);s.textContent="✕ Bejelentkezés nem sikerült: "+(e.msg||e.message||e)}
}
async function cloudRefresh(){
 const s=$("#cloudAccountStatus");s.textContent="Szinkronizálás…";
 try{
   if(!puter.auth.isSignedIn())await ensurePuterSignIn();
   await loadCloudRecipeMeta();await loadCategoryConfig();
   const n=await syncPendingToCloud();
   await refreshSharedRecipes(true);await updateCloudStatus();
   toast(n?"☁ "+n+" helyi recept feltöltve és frissítve.":"✓ Központi receptek frissítve.")
 }catch(e){console.error(e);s.textContent="✕ Frissítés nem sikerült: "+(e.msg||e.message||e)}
}
async function syncLocalRecipe(id,{silent=false,refresh=true}={}){
 const row=await dbGet(id);if(!row)return false;
 try{
   if(!puterCloudReady())throw new Error("A Puter felhő nem érhető el.");
   if(!puter.auth.isSignedIn())await ensurePuterSignIn();
   if(!silent)busy(true,"Mentés a központi Recepttárba…");
   const base=CLOUD_DIR+"/"+id,cardPath=base+"/card.jpg",heroPath=row.heroBlob?base+"/hero.jpg":null,processPath=row.processBlob?base+"/process.jpg":null;
   await puter.fs.write(cardPath,row.blob,{createMissingParents:true,overwrite:true});
   if(row.heroBlob)await puter.fs.write(heroPath,row.heroBlob,{createMissingParents:true,overwrite:true});
   if(row.processBlob)await puter.fs.write(processPath,row.processBlob,{createMissingParents:true,overwrite:true});
   const entry={id,title:row.title,category:row.category,cardPath,heroPath,processPath,originalName:row.originalName||row.title+".jpg",createdAt:row.createdAt||Date.now(),updatedAt:new Date().toISOString(),readable:row.readable||null,studioData:row.studioData||null,youtubeId:String(row.youtubeId||getMeta(id).youtubeId||"")};
   await puter.kv.set(CLOUD_KEY_PREFIX+id,entry);
   row.pending=false;await dbPut(row);
   if(refresh){await loadSharedRecipes();await loadCustomRecipes();renderHome();renderPending()}
   if(!silent)toast("✓ Központi mentés kész. Másik gépen is megnyitható.");
   return true
 }catch(e){console.error(e);if(!silent)toast("Központi mentési hiba: "+(e.msg||e.message||e));return false}
 finally{if(!silent)busy(false)}
}
async function syncPendingToCloud(){
 if(!puterCloudReady()||!puter.auth.isSignedIn())return 0;
 const rows=(await dbAll()).filter(r=>r.pending);if(!rows.length)return 0;
 let ok=0;for(const row of rows){if(await syncLocalRecipe(row.id,{silent:true,refresh:false}))ok++}
 if(ok){await loadSharedRecipes();await loadCustomRecipes();renderHome();renderPending()}
 return ok
}

function renderPending(){const box=$("#pendingList");box.innerHTML="";const list=customRecipes.slice().sort((a,b)=>a.title.localeCompare(b.title,"hu"));if(!list.length){const e=document.createElement("div");e.className="empty-admin";e.textContent="Nincs csak helyben tárolt új recept.";box.appendChild(e);return}list.forEach(r=>{const row=document.createElement("div");row.className="deleted-item";const main=document.createElement("div");main.className="deleted-main",t=document.createElement("div");t.className="deleted-title";t.textContent=r.title;const c=document.createElement("div");c.className="deleted-cat";c.textContent=r.category+(r.pending?" · szinkronra vár":" · feltöltve, frissítésre vár");main.append(t,c);const b=document.createElement("button");b.className="sync-btn";b.textContent=r.pending?"☁ Feltöltés":"✓ Fent";b.disabled=!r.pending;b.onclick=()=>syncLocalRecipe(r.id);row.append(main,b);box.appendChild(row)})}
function clearRecipeLocalState(id,{keepMeta=false}={}){
 const exact=[keyFav(id),keyText(id),keyReadable(id),feedbackKey(id),nutriLocalKey(id),cookStepKey(id)];
 if(!keepMeta)exact.push(keyMeta(id));
 exact.forEach(k=>localStorage.removeItem(k));
 const prefixes=["lena25:checked:"+id+":","lena25:stepchecked:"+id+":"];
 const remove=[];
 for(let i=0;i<localStorage.length;i++){
   const k=localStorage.key(i);if(k&&prefixes.some(p=>k.startsWith(p)))remove.push(k)
 }
 remove.forEach(k=>localStorage.removeItem(k));
 const history=recentCookHistory().filter(x=>x.id!==id);localStorage.setItem(historyKey(),JSON.stringify(history));
 delete tasteFeedback[id];delete nutritionCache[id]
}
function puterDeleteNotFound(error){
 const code=String(error&&(error.code||error.errorCode||error.error?.code)||"").toLowerCase();
 const message=String(error&&(error.message||error.msg||error.error?.message)||"").toLowerCase();
 return code.includes("not_found")||code.includes("not-found")||message.includes("not found")||message.includes("nem található")
}
async function deleteCloudRecipeData(id){
 if(!puterCloudReady())throw new Error("A Puter felhő nem érhető el.");
 if(!puter.auth.isSignedIn())await ensurePuterSignIn();
 try{await puter.fs.delete(CLOUD_DIR+"/"+id,{recursive:true})}catch(e){if(!puterDeleteNotFound(e))throw e}
 await puter.kv.del(CLOUD_KEY_PREFIX+id);
 await Promise.allSettled([
   puter.kv.del(RECIPE_META_KEY_PREFIX+id),
   puter.kv.del(TASTE_KEY_PREFIX+id),
   puter.kv.del(NUTRI_KEY_PREFIX+id)
 ])
}
async function permanentlyDeleteRecipe(id){
 const r=getRecipe(id);if(!r||!r.deleted)return;
 const builtIn=baseRecipes.some(x=>x.id===id),cloudRecipe=sharedRecipes.some(x=>x.id===id);
 const action=builtIn?"véglegesen elrejted":"véglegesen törlöd";
 if(!confirm("Biztosan "+action+" ezt a receptet?\n\n"+r.title+"\n\nEz a művelet nem vonható vissza."))return;
 const answer=prompt("Biztonsági megerősítésként írd be: TÖRLÉS");
 if(norm(answer)!=="torles"){if(answer!==null)toast("A végleges törlés megszakadt.");return}
 busy(true,builtIn?"Recept végleges elrejtése…":"Recept végleges törlése…");
 try{
   if(cloudRecipe)await deleteCloudRecipeData(id);
   try{await dbDelete(id)}catch(e){console.warn("A helyi receptrekord nem törölhető",e);if(!builtIn&&!cloudRecipe)throw e}
   sharedRecipes.filter(x=>x.id===id).forEach(x=>x._url&&URL.revokeObjectURL(x._url));
   customRecipes.filter(x=>x.id===id).forEach(x=>x._url&&URL.revokeObjectURL(x._url));
   sharedRecipes=sharedRecipes.filter(x=>x.id!==id);customRecipes=customRecipes.filter(x=>x.id!==id);delete sharedReadable[id];
   if(builtIn){
     const m={...getMeta(id),deleted:true,permanentlyDeleted:true,updatedAt:new Date().toISOString()};setMeta(id,m);await saveRecipeMetaCloud(id,m);clearRecipeLocalState(id,{keepMeta:true})
   }else clearRecipeLocalState(id);
   renderDeleted();renderPending();renderHome();toast(builtIn?"Recept véglegesen elrejtve.":"Recept véglegesen törölve.")
 }catch(e){
   console.error("Végleges recepttörlés hiba",e);alert("A végleges törlés nem sikerült. A recept a Kukában maradt.\n\n"+(e.msg||e.message||e))
 }finally{busy(false)}
}
function renderDeleted(){
 const box=$("#deletedList");box.innerHTML="";
 const del=allRecipes().filter(r=>r.deleted&&!getMeta(r.id).permanentlyDeleted).sort((a,b)=>a.title.localeCompare(b.title,"hu"));
 if(!del.length){const e=document.createElement("div");e.className="empty-admin";e.textContent="A kuka üres.";box.appendChild(e);return}
 del.forEach(r=>{
   const row=document.createElement("div");row.className="deleted-item";
   const main=document.createElement("div");main.className="deleted-main";
   const t=document.createElement("div");t.className="deleted-title";t.textContent=r.title;
   const c=document.createElement("div");c.className="deleted-cat";c.textContent=r.category;main.append(t,c);
   const actions=document.createElement("div");actions.className="deleted-actions";
   const restore=document.createElement("button");restore.className="restore-btn";restore.textContent="↩ Vissza";
   restore.onclick=async()=>{const m=getMeta(r.id);m.deleted=false;m.updatedAt=new Date().toISOString();setMeta(r.id,m);await saveRecipeMetaCloud(r.id,m);renderDeleted();renderHome();toast("Recept visszaállítva.")};
   const permanent=document.createElement("button");permanent.className="danger-btn deleted-permanent-btn";permanent.textContent=baseRecipes.some(x=>x.id===r.id)?"Végleges elrejtés":"Végleges törlés";permanent.onclick=()=>permanentlyDeleteRecipe(r.id);
   actions.append(restore,permanent);row.append(main,actions);box.appendChild(row)
 })
}
function openAdmin(){renderPending();renderDeleted();renderCategoryManager();$("#adminDialog").showModal()}


function ingredientCheckKey(id,i){return"lena25:checked:"+id+":"+i}
function stepCheckKey(id,i){return"lena25:stepchecked:"+id+":"+i}
function playCheckClick(checked){
 try{
  const ac=ensureCookAudio();if(!ac)return;
  const sound=()=>{
   const now=ac.currentTime+.008,o=ac.createOscillator(),g=ac.createGain();
   o.type="triangle";o.frequency.setValueAtTime(checked?760:560,now);o.frequency.exponentialRampToValueAtTime(checked?920:460,now+.04);
   g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.045,now+.004);g.gain.exponentialRampToValueAtTime(.0001,now+.045);
   o.connect(g);g.connect(ac.destination);o.start(now);o.stop(now+.05)
  };
  if(ac.state==="suspended")ac.resume().then(sound).catch(()=>{});else sound()
 }catch(e){}
}
function currentReadableFont(){let n=parseInt(localStorage.getItem("lena25:font")||"18",10);if(!Number.isFinite(n))n=18;return Math.max(15,Math.min(26,n))}
function applyReadableFont(){
 const n=currentReadableFont(),box=$("#readableContent");if(box)box.style.setProperty("--readable-size",n+"px");if($("#fontSizeLabel"))$("#fontSizeLabel").textContent=n
}
function renderIngredientList(id,ingredients){
 const box=$("#ingredientsList");box.innerHTML="";
 const rows=ingredients.map((item,i)=>({item,i,checked:localStorage.getItem(ingredientCheckKey(id,i))==="1"}));
 const checked=rows.filter(r=>r.checked),open=rows.filter(r=>!r.checked);
 function group(title,list,done){
  if(!list.length)return;
  if(checked.length&&open.length){const h=document.createElement("div");h.className="ingredient-group-title "+(done?"done":"open");h.textContent=title;box.appendChild(h)}
  list.forEach(r=>{
    const label=document.createElement("label");label.className="ingredient-row"+(r.checked?" checked":"");
    const cb=document.createElement("input");cb.type="checkbox";cb.checked=r.checked;
    const span=document.createElement("span");span.textContent=r.item;
    cb.onchange=()=>{playCheckClick(cb.checked);localStorage.setItem(ingredientCheckKey(id,r.i),cb.checked?"1":"0");renderIngredientList(id,ingredients)};
    label.append(cb,span);box.appendChild(label)
  })
 }
 group("✓ Kipipálva",checked,true);
 group("Még nincs kipipálva",open,false)
}
function renderStepList(id,steps){
 const box=$("#stepsList");box.innerHTML="";
 steps.forEach((step,i)=>{
  const checked=localStorage.getItem(stepCheckKey(id,i))==="1",li=document.createElement("li"),label=document.createElement("label"),cb=document.createElement("input"),span=document.createElement("span");
  li.className=checked?"checked":"";label.className="step-row";cb.type="checkbox";cb.checked=checked;span.className="step-text";span.textContent=step;
  cb.onchange=()=>{playCheckClick(cb.checked);localStorage.setItem(stepCheckKey(id,i),cb.checked?"1":"0");li.classList.toggle("checked",cb.checked)};
  label.append(cb,span);li.appendChild(label);box.appendChild(li)
 })
}
function renderReadableFor(id){
 const d=getReadable(id),info=statusInfo(d.status),badge=$("#readableStatusBadge");
 if(badge){badge.textContent=info[0];badge.className="status-badge "+info[1]}
 const hasData=Array.isArray(d.ingredients)&&d.ingredients.length>0&&Array.isArray(d.steps)&&d.steps.length>0;
 const readable=(d.status==="verified"||d.status==="review")&&hasData;
 const verified=d.status==="verified"&&hasData;
 $("#readableMode").hidden=!readable;
 $("#cookModeBtn").hidden=!verified;
 $("#prepareReadable").textContent=d.status==="unprocessed"?"⚡ Feldolgozás":d.status==="review"?"✏️ Ellenőrzés / javítás":"✏️ Recept javítása";
 $("#prepareReadable").classList.toggle("force-process",d.status==="unprocessed");
 $("#ingredientsList").innerHTML="";$("#stepsList").innerHTML="";$("#notesList").innerHTML="";$("#notesSection").hidden=true;
 if(!readable){setMode("original");return}
 renderIngredientList(id,d.ingredients);
 renderStepList(id,d.steps);
 const notes=Array.isArray(d.notes)?d.notes:[];
 if(notes.length){$("#notesSection").hidden=false;notes.forEach(n=>{const p=document.createElement("p");p.textContent=n;$("#notesList").appendChild(p)})}
 applyReadableFont();renderNutriCard(id)
}
let cookState={id:null,steps:[],index:0,timerSeconds:0,timerRemaining:0,timerEnd:0,timerRunning:false,timerInterval:null,wakeLock:null,audioCtx:null};
function cookStepKey(id){return"lena:cookstep:"+id}
function parseCookDuration(text){
 const s=String(text||"").toLocaleLowerCase("hu").replace(/,/g,".");
 if(/fél\s+ór/.test(s))return{seconds:1800,label:"30 perc"};
 const range=s.match(/(\d+(?:\.\d+)?)\s*[–—-]\s*(\d+(?:\.\d+)?)\s*(másodperc|másodpercig|mp|perc|percig|óra|óráig|órán)/i);
 const one=s.match(/(\d+(?:\.\d+)?)\s*(másodperc|másodpercig|mp|perc|percig|óra|óráig|órán)/i);
 const m=range||one;if(!m)return null;
 const amount=range?Number(m[2]):Number(m[1]),unit=range?m[3]:m[2];if(!Number.isFinite(amount)||amount<=0)return null;
 let seconds=amount;if(/perc/.test(unit))seconds*=60;else if(/ór/.test(unit))seconds*=3600;
 seconds=Math.max(1,Math.round(seconds));
 const label=seconds>=3600&&seconds%3600===0?(seconds/3600)+" óra":seconds>=60&&seconds%60===0?(seconds/60)+" perc":seconds+" mp";
 return{seconds,label}
}
function formatCookTime(sec){
 sec=Math.max(0,Math.ceil(sec));const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
 return h?String(h).padStart(2,"0")+":"+String(m).padStart(2,"0")+":"+String(s).padStart(2,"0"):String(m).padStart(2,"0")+":"+String(s).padStart(2,"0")
}
async function requestCookWakeLock(){
 try{if("wakeLock"in navigator&&document.visibilityState==="visible")cookState.wakeLock=await navigator.wakeLock.request("screen")}catch(e){console.warn("Wake lock nem érhető el",e)}
}
function releaseCookWakeLock(){try{cookState.wakeLock?.release()}catch(e){}cookState.wakeLock=null}
function ensureCookAudio(){
 try{
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  if(!cookState.audioCtx||cookState.audioCtx.state==="closed")cookState.audioCtx=new AC();
  if(cookState.audioCtx.state==="suspended")cookState.audioCtx.resume().catch(()=>{});
  return cookState.audioCtx
 }catch(e){return null}
}
function cookBeep(){
 try{
  const ac=ensureCookAudio();if(ac){
   const now=ac.currentTime+.03;
   [0,.36].forEach((t,i)=>{
    const o=ac.createOscillator(),g=ac.createGain();
    o.type="sine";o.frequency.value=i?1040:880;
    g.gain.setValueAtTime(.0001,now+t);
    g.gain.exponentialRampToValueAtTime(.24,now+t+.025);
    g.gain.exponentialRampToValueAtTime(.0001,now+t+.24);
    o.connect(g);g.connect(ac.destination);o.start(now+t);o.stop(now+t+.26)
   })
  }
 }catch(e){}
 try{navigator.vibrate?.([300,150,420])}catch(e){}
}
function updateCookTimerDial(done=false){
 const dial=$("#cookTimerDial");if(!dial)return;
 const total=Math.max(1,cookState.timerSeconds||cookState.timerRemaining||1);
 const remaining=Math.max(0,cookState.timerRemaining||0);
 const progress=Math.max(0,Math.min(1,1-(remaining/total)));
 dial.style.setProperty("--timer-progress",String(progress));
 dial.classList.toggle("timer-done",!!done);
 $("#cookTimerStateText").textContent=done?"kész, jöhet a következő lépés":cookState.timerRunning?"hátralévő idő":"szünet"
}
function renderCookTimer(){
 const box=$("#cookTimerBox"),start=$("#cookTimerStart"),running=$("#cookTimerRunning"),presets=$("#cookTimerPresets"),det=parseCookDuration(cookState.steps[cookState.index]||"");
 box.hidden=false;
 if(cookState.timerRunning||cookState.timerRemaining>0){
  start.hidden=true;presets.hidden=true;running.hidden=false;
  $("#cookTimerDisplay").textContent=formatCookTime(cookState.timerRemaining);
  $("#cookTimerPause").textContent=cookState.timerRunning?"⏸ Szünet":"▶ Folytatás";
  updateCookTimerDial(false);return
 }
 running.hidden=true;presets.hidden=false;
 if(det){
  start.hidden=false;start.textContent="⏱ "+det.label+" indítása";
  start.dataset.seconds=String(det.seconds);start.dataset.label=det.label
 }else{
  start.hidden=true;start.dataset.seconds="";start.dataset.label=""
 }
}
function renderCookStep(){
 const n=cookState.steps.length,i=Math.max(0,Math.min(cookState.index,n-1));cookState.index=i;
 $("#cookStepCount").textContent=(i+1)+" / "+n+" lépés";$("#cookStepNumber").textContent=i+1;$("#cookStepText").textContent=cookState.steps[i]||"";
 $("#cookProgressBar").style.width=((i+1)/Math.max(1,n)*100)+"%";$("#cookPrev").disabled=i===0;$("#cookNext").textContent=i===n-1?"✓ Kész":"Következő →";
 localStorage.setItem(cookStepKey(cookState.id),String(i));renderCookTimer()
}
async function openCookMode(){
 if(!currentId)return;const d=getReadable(currentId),r=getRecipe(currentId);if(!r||d.status!=="verified"||!d.steps?.length)return;
 cookState.id=currentId;cookState.steps=d.steps.slice();cookState.index=Math.max(0,Math.min(parseInt(localStorage.getItem(cookStepKey(currentId))||"0",10)||0,d.steps.length-1));
 $("#cookRecipeTitle").textContent=r.title;renderCookStep();$("#cookModeDialog").showModal();await requestCookWakeLock()
}
function closeCookMode(){releaseCookWakeLock();if($("#cookModeDialog").open)$("#cookModeDialog").close()}
function cookNext(){
 if(cookState.index<cookState.steps.length-1){cookState.index++;renderCookStep();return}
 localStorage.removeItem(cookStepKey(cookState.id));recordCookedRecipe(cookState.id);closeCookMode();toast("👨‍🍳 Kész. Jó étvágyat!")
}
function cookPrev(){if(cookState.index>0){cookState.index--;renderCookStep()}}
function updateCookTimer(){
 if(!cookState.timerRunning)return;
 cookState.timerRemaining=Math.max(0,Math.ceil((cookState.timerEnd-Date.now())/1000));
 $("#cookTimerDisplay").textContent=formatCookTime(cookState.timerRemaining);updateCookTimerDial(false);
 if(cookState.timerRemaining<=0){
  cookState.timerRunning=false;clearInterval(cookState.timerInterval);cookState.timerInterval=null;
  $("#cookTimerDisplay").textContent="KÉSZ!";$("#cookTimerPause").textContent="▶ Újra";
  updateCookTimerDial(true);cookBeep();toast("🔔 Léna Timer: lejárt az idő.")
 }
}
function startCookTimerSeconds(sec,label="Időzítő"){
 sec=Math.max(1,Math.round(Number(sec)||0));if(!sec)return;
 ensureCookAudio();clearInterval(cookState.timerInterval);
 cookState.timerSeconds=sec;cookState.timerRemaining=sec;cookState.timerEnd=Date.now()+sec*1000;cookState.timerRunning=true;
 $("#cookTimerLabel").textContent=label+" · "+(cookState.index+1)+". lépés";
 $("#cookTimerDial").classList.remove("timer-done");renderCookTimer();updateCookTimer();
 cookState.timerInterval=setInterval(updateCookTimer,250)
}
function startCookTimer(){
 const b=$("#cookTimerStart"),sec=parseInt(b.dataset.seconds||"0",10);if(!sec)return;
 startCookTimerSeconds(sec,b.dataset.label||"Időzítő")
}
function startCookPreset(minutes){
 const m=Math.max(1,Number(minutes)||0);startCookTimerSeconds(m*60,m+" perc")
}
function addCookTimer(seconds){
 if(!(cookState.timerRemaining>0))return;
 cookState.timerRemaining+=seconds;cookState.timerSeconds+=seconds;
 if(cookState.timerRunning)cookState.timerEnd+=seconds*1000;
 $("#cookTimerDisplay").textContent=formatCookTime(cookState.timerRemaining);updateCookTimerDial(false)
}
function pauseCookTimer(){
 if(cookState.timerRunning){
  cookState.timerRemaining=Math.max(0,Math.ceil((cookState.timerEnd-Date.now())/1000));
  cookState.timerRunning=false;clearInterval(cookState.timerInterval);cookState.timerInterval=null
 }else if(cookState.timerRemaining>0){
  ensureCookAudio();cookState.timerEnd=Date.now()+cookState.timerRemaining*1000;cookState.timerRunning=true;
  clearInterval(cookState.timerInterval);cookState.timerInterval=setInterval(updateCookTimer,250)
 }
 renderCookTimer()
}
function resetCookTimer(){
 cookState.timerRunning=false;clearInterval(cookState.timerInterval);cookState.timerInterval=null;
 cookState.timerRemaining=0;cookState.timerSeconds=0;cookState.timerEnd=0;
 $("#cookTimerDial")?.classList.remove("timer-done");renderCookTimer()
}

const GOLDEN_TIMER_KEY="lena25:goldenTimerSeconds";
let goldenTimerState={duration:600,remaining:600,end:0,running:false,interval:null,alarming:false,alarmNodes:[],alarmTimeout:null};
function goldenTimerStoredDuration(){
 const n=parseInt(localStorage.getItem(GOLDEN_TIMER_KEY)||"600",10);return Number.isFinite(n)?Math.max(60,Math.min(10800,n)):600
}
function saveGoldenTimerDuration(){localStorage.setItem(GOLDEN_TIMER_KEY,String(goldenTimerState.duration))}
function renderGoldenTimer(){
 const s=goldenTimerState;
 const displayText=s.alarming?"KÉSZ!":formatCookTime(s.remaining);
 const statusText=s.alarming?"RIASZTÁS":s.running?"FUT":"KÉSZEN";
 const captionText=s.alarming?"lejárt az idő":s.running?"hátralévő idő":s.remaining===0?"válassz új időt":"válassz időt vagy indítsd el";
 const startText=s.running?"⏸ Szünet":s.remaining===0?"▶ Újra":"▶ Indítás";
 const statusClass=s.alarming?" alarm":s.running?" running":"";
 const display=$("#goldenTimerDisplay"),status=$("#goldenTimerStatus"),start=$("#goldenTimerStart");
 if(display)display.textContent=displayText;
 if(status){status.textContent=statusText;status.className="golden-timer-status"+statusClass}
 if($("#goldenTimerCaption"))$("#goldenTimerCaption").textContent=captionText;
 if(start)start.textContent=startText;
 if($("#goldenTimerStopAlarm"))$("#goldenTimerStopAlarm").hidden=!s.alarming;
 $("#goldenTimerPresets")?.querySelectorAll("[data-golden-minutes]").forEach(b=>b.classList.toggle("active",Number(b.dataset.goldenMinutes)*60===s.duration));

 const homeDisplay=$("#homeTimerDisplay"),homeStatus=$("#homeTimerStatus"),homeDial=$("#homeTimerDial");
 if(homeDisplay)homeDisplay.textContent=displayText;
 if(homeStatus){homeStatus.textContent=statusText;homeStatus.className="home-timer-status"+statusClass}
 if($("#homeTimerCaption"))$("#homeTimerCaption").textContent=captionText;
 if($("#homeTimerStart"))$("#homeTimerStart").textContent=startText;
 if($("#homeTimerStopAlarm"))$("#homeTimerStopAlarm").hidden=!s.alarming;
 $("#homeTimerPresets")?.querySelectorAll("[data-home-timer-minutes]").forEach(b=>b.classList.toggle("active",Number(b.dataset.homeTimerMinutes)*60===s.duration));
 if(homeDial){
  const total=Math.max(1,s.duration||s.remaining||1),ratio=Math.max(0,Math.min(1,s.remaining/total)),elapsed=Math.max(0,total-s.remaining);
  homeDial.style.setProperty("--home-timer-progress",(ratio*360)+"deg");
  homeDial.style.setProperty("--home-timer-hand",((elapsed%60)*6)+"deg");
  homeDial.classList.toggle("alarm",s.alarming)
 }
}
function primeGoldenTimerAudio(){
 try{const ac=ensureCookAudio();if(!ac)return;const o=ac.createOscillator(),g=ac.createGain(),now=ac.currentTime;o.connect(g);g.connect(ac.destination);g.gain.value=.0001;o.start(now);o.stop(now+.01)}catch(e){}
}
function stopGoldenTimerAlarm(){
 clearTimeout(goldenTimerState.alarmTimeout);goldenTimerState.alarmTimeout=null;
 goldenTimerState.alarmNodes.forEach(o=>{try{o.stop()}catch(e){}});goldenTimerState.alarmNodes=[];goldenTimerState.alarming=false;renderGoldenTimer()
}
function startGoldenTimerAlarm(){
 stopGoldenTimerAlarm();goldenTimerState.alarming=true;renderGoldenTimer();
 try{
  const ac=ensureCookAudio();if(ac){
   const start=ac.currentTime+.02;
   for(let t=0;t<5;t+=.5){
    [0,.18].forEach((offset,i)=>{
     const o=ac.createOscillator(),g=ac.createGain(),at=start+t+offset;o.type="triangle";o.frequency.value=i?1320:880;
     g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(i?.3:.34,at+.018);g.gain.exponentialRampToValueAtTime(.0001,at+.15);
     o.connect(g);g.connect(ac.destination);o.start(at);o.stop(at+.17);goldenTimerState.alarmNodes.push(o)
    })
   }
  }
 }catch(e){}
 goldenTimerState.alarmTimeout=setTimeout(stopGoldenTimerAlarm,5000);toast("🔔 Léna Golden Timer: lejárt az idő.")
}
function goldenTimerTick(){
 if(!goldenTimerState.running)return;
 goldenTimerState.remaining=Math.max(0,Math.ceil((goldenTimerState.end-Date.now())/1000));renderGoldenTimer();
 if(goldenTimerState.remaining<=0){goldenTimerState.running=false;clearInterval(goldenTimerState.interval);goldenTimerState.interval=null;startGoldenTimerAlarm()}
}
function setGoldenTimer(minutes){
 stopGoldenTimerAlarm();const sec=Math.max(60,Math.min(10800,Math.round(Number(minutes)||10)*60));
 goldenTimerState.running=false;clearInterval(goldenTimerState.interval);goldenTimerState.interval=null;goldenTimerState.duration=sec;goldenTimerState.remaining=sec;goldenTimerState.end=0;saveGoldenTimerDuration();renderGoldenTimer()
}
function adjustGoldenTimer(seconds){
 stopGoldenTimerAlarm();const s=goldenTimerState;
 if(s.running){s.remaining=Math.max(0,Math.min(10800,s.remaining+seconds));s.duration=Math.max(60,Math.min(10800,s.duration+seconds));s.end=Date.now()+s.remaining*1000;saveGoldenTimerDuration();if(s.remaining===0){s.running=false;clearInterval(s.interval);s.interval=null;startGoldenTimerAlarm();return}}
 else{s.remaining=Math.max(0,Math.min(10800,s.remaining+seconds));s.duration=Math.max(60,s.remaining||60);saveGoldenTimerDuration()}
 renderGoldenTimer()
}
function toggleGoldenTimer(){
 stopGoldenTimerAlarm();const s=goldenTimerState;
 if(s.running){s.remaining=Math.max(0,Math.ceil((s.end-Date.now())/1000));s.running=false;clearInterval(s.interval);s.interval=null;renderGoldenTimer();return}
 if(s.remaining<=0)s.remaining=s.duration||600;primeGoldenTimerAudio();s.running=true;s.end=Date.now()+s.remaining*1000;clearInterval(s.interval);s.interval=setInterval(goldenTimerTick,250);renderGoldenTimer()
}
function resetGoldenTimer(){
 stopGoldenTimerAlarm();const s=goldenTimerState;s.running=false;clearInterval(s.interval);s.interval=null;s.remaining=s.duration;s.end=0;renderGoldenTimer()
}
function initGoldenTimer(){goldenTimerState.duration=goldenTimerStoredDuration();goldenTimerState.remaining=goldenTimerState.duration;renderGoldenTimer()}
function openHomeTimer(){renderGoldenTimer();const d=$("#homeTimerDialog");if(d&&!d.open)d.showModal()}
function closeHomeTimer(){const d=$("#homeTimerDialog");if(d?.open)d.close()}


let whatCookIdeas=[];
function whatCookPromptText(userText){
 const catalog=allRecipes().filter(r=>!r.deleted).slice(0,100).map(r=>r.title+" ["+r.category+"]").join("; ");
 return [
  "Te Léna vagy, Zsolt és Mónika digitális receptkönyvének konyhai asszisztense.",
  "Adj pontosan 4, egymástól érdemben különböző vacsora/étel ötletet a felhasználó aktuális kérésére.",
  "Alapértelmezésben 4 főre tervezz. Új ötletnél a prompt mezőben szerepeljen, hogy 4 főre készüljön, kivéve ha a felhasználó más adagszámot kér.",
  "Vedd figyelembe a saját értékeléseket és megjegyzéseket, de ne kezeld őket merev tiltásként. Lehetőleg ne ismételd a közelmúltban főzött ételeket, ha van jó alternatíva.",
  "Ha a meglévő recepttárból ajánlasz valamit, az existingTitle mezőben PONTOSAN a katalógusban szereplő címet add. Új ötletnél existingTitle legyen üres.",
  "A prompt mező legyen rövid magyar mondat, amelyből a Recept Studio teljes receptet tud generálni.",
  "Válasz kizárólag JSON legyen ebben a sémában:",
  '{"ideas":[{"title":"...","why":"...","time":"...","existingTitle":"","prompt":"..."}]}',
  "",
  "AKTUÁLIS KÉRÉS:",
  userText,
  "",
  "SAJÁT ÍZLÉSPROFIL:",
  tasteContextText(),
  "",
  "MOSTANÁBAN FŐZÖTT:",
  recentCookHistoryText(),
  "",
  "MEGLÉVŐ RECEPTTÁR:",
  catalog
 ].join("\n")
}
function cleanWhatCookIdeas(v){
 const a=Array.isArray(v?.ideas)?v.ideas:[];
 return a.slice(0,4).map(x=>({
  title:String(x?.title||"").trim(),
  why:String(x?.why||"").trim(),
  time:String(x?.time||"").trim(),
  existingTitle:String(x?.existingTitle||"").trim(),
  prompt:String(x?.prompt||"").trim()
 })).filter(x=>x.title)
}
function renderWhatCookContext(){
 const rated=Object.values(tasteFeedback).filter(x=>x&&(x.rating||x.note)).length,hist=recentCookHistory().length;
 $("#whatCookContext").textContent="Léna figyelembe veszi: "+rated+" saját értékelés · "+Math.min(hist,6)+" közelmúltbeli főzés · "+allRecipes().filter(r=>!r.deleted).length+" recept a tárban."
}
function openWhatCook(){
 renderWhatCookContext();$("#whatCookResults").innerHTML="";$("#whatCookDialog").showModal();setTimeout(()=>$("#whatCookPrompt").focus(),80)
}
function openWhatCookWith(text=""){
 openWhatCook();
 if(text){$("#whatCookPrompt").value=text;setTimeout(()=>{$("#whatCookPrompt").focus();$("#whatCookPrompt").setSelectionRange($("#whatCookPrompt").value.length,$("#whatCookPrompt").value.length)},100)}
}
function openStudioStock(){
 openStudio();
 setTimeout(()=>{
   const box=document.querySelector(".fridge-scan-box");
   box?.scrollIntoView({behavior:"smooth",block:"start"});
   box?.classList.add("banner-target-pulse");
   setTimeout(()=>box?.classList.remove("banner-target-pulse"),1400);
 },120)
}

function renderWhatCookIdeas(){
 const box=$("#whatCookResults");box.innerHTML="";
 whatCookIdeas.forEach((idea,i)=>{
   const card=document.createElement("article");card.className="what-cook-card";
   const num=document.createElement("div");num.className="what-cook-num";num.textContent=i+1;
   const copy=document.createElement("div");copy.className="what-cook-copy";
   const h=document.createElement("h3");h.textContent=idea.title;
   const why=document.createElement("p");why.textContent=idea.why||"Jó választás a megadott szempontok alapján.";
   const meta=document.createElement("div");meta.className="what-cook-meta";meta.textContent=idea.time?"⏱ "+idea.time:"";
   const btn=document.createElement("button");btn.type="button";btn.className="what-cook-pick";
   const existing=idea.existingTitle?allRecipes().find(r=>norm(r.title)===norm(idea.existingTitle)&&!r.deleted):null;
   btn.textContent=existing?"📖 Megnyitom":"✨ Készítsük el a receptet";
   btn.onclick=()=>{
     $("#whatCookDialog").close();
     if(existing){openRecipe(existing.id,true);return}
     openStudio();const p0=idea.prompt||("Készíts teljes receptet ehhez: "+idea.title+". "+idea.why);$("#studioPrompt").value=/\b\d+\s*(fő|adag|személy)/i.test(p0)?p0:(p0+" 4 főre.");studioGenerate()
   };
   copy.append(h,why,meta,btn);card.append(num,copy);box.appendChild(card)
 })
}
async function generateWhatCook(){
 const q=$("#whatCookPrompt").value.trim();if(!q){alert("Írd le legalább röviden, mire vágytok vagy mi van otthon.");return}
 busy(true,"Léna összerak 4 személyre szabott ötletet…");
 try{
  if(!puterAvailable())throw new Error("A Puter AI nem érhető el.");
  let resp;try{resp=await puter.ai.chat(whatCookPromptText(q),{model:STUDIO_TEXT_MODEL,normalize:true,verbosity:"low"})}catch(e){resp=await puter.ai.chat(whatCookPromptText(q),{normalize:true})}
  whatCookIdeas=cleanWhatCookIdeas(parseRecipeJson(puterText(resp)));if(!whatCookIdeas.length)throw new Error("Nem érkezett használható ötlet.");
  renderWhatCookIdeas()
 }catch(e){console.error(e);$("#whatCookResults").innerHTML='<div class="empty-admin">Most nem sikerült AI-javaslatot kérni. A Recept Studio ettől még működik.</div>'}
 finally{busy(false)}
}


function readableVisionPrompt(r){
 return [
  "Te Léna vagy, a Léna Recepttár receptfeldolgozó asszisztense.",
  "A mellékelt képen egy receptkártya látható. A képen ténylegesen olvasható receptet alakítsd strukturált adattá.",
  "NE találj ki új hozzávalót, mennyiséget vagy elkészítési lépést. Ha egy rész nem olvasható biztosan, inkább hagyd ki.",
  "A hozzávalókat külön sorokban, mennyiséggel együtt add meg. Az elkészítést logikus, számozás nélküli lépésekre bontsd.",
  "A megjegyzésekbe csak a képen szereplő tippek/opciók kerüljenek.",
  "A recept címe kontextusként: "+r.title+".",
  "Válaszolj kizárólag érvényes JSON-nal, markdown nélkül ebben a sémában:",
  '{"ingredients":["..."],"steps":["..."],"notes":["..."]}'
 ].join("\n")
}
async function recipeImageFileForVision(r){
 if(!r||r.mime==="application/pdf")throw new Error("PDF automatikus feldolgozása még nem támogatott.");
 let src=r.file;
 if(r.central&&r.heroUrl)src=r.heroUrl;
 let blob=r._blob instanceof Blob?r._blob:null;
 if(!blob){
   if(!src)throw new Error("Ehhez a recepthez nincs feldolgozható kép.");
   const res=await fetch(src);
   if(!res.ok)throw new Error("A receptkép nem tölthető be.");
   blob=await res.blob()
 }
 if(!blob.type.startsWith("image/"))throw new Error("A receptkártya nem felismerhető képfájl.");
 const ext=(blob.type.split("/")[1]||"jpg").replace("jpeg","jpg").replace(/[^a-z0-9]/gi,"")||"jpg";
 return new File([blob],(r.title||"recept")+"."+ext,{type:blob.type})
}
function cleanReadableVision(v){
 if(!v||typeof v!=="object")throw new Error("A feldolgozás válasza nem értelmezhető.");
 const ingredients=Array.isArray(v.ingredients)?v.ingredients.map(String).map(s=>s.trim()).filter(Boolean):[];
 const steps=Array.isArray(v.steps)?v.steps.map(String).map(s=>s.trim()).filter(Boolean):[];
 const notes=Array.isArray(v.notes)?v.notes.map(String).map(s=>s.trim()).filter(Boolean):[];
 if(ingredients.length<2||steps.length<2)throw new Error("A képről nem sikerült elég receptadatot kiolvasni.");
 return{ingredients,steps,notes}
}
async function forceReadableProcessing(){
 if(!currentId)return;
 const r=getRecipe(currentId);if(!r)return;
 if(r.mime==="application/pdf"){alert("Ehhez most a képes receptfeldolgozás működik. A PDF-ekhez külön feldolgozást teszek majd.");openReadableEditor();return}
 busy(true,"⚡ Léna előkészíti a receptfeldolgozást…");
 try{
   ensurePuterAiSession();busy(true,"⚡ Léna feldolgozza a receptkártyát…");
   const file=await recipeImageFileForVision(r);
   const resp=await puterVisionChat(readableVisionPrompt(r),file);
   const out=cleanReadableVision(parseRecipeJson(puterText(resp)));
   setReadable(currentId,{status:"review",ingredients:out.ingredients,steps:out.steps,notes:out.notes,source:"vision_force_v1",updatedAt:new Date().toISOString()});
   renderReadableFor(currentId);setMode("readable");
   toast("⚡ Feldolgozva. Nézd át, majd jelöld Ellenőrzöttnek.");
 }catch(e){
   console.error("Recept feldolgozás hiba",e);
   const code=String(e&&((e.error||e.code)||"")).toLowerCase();
   const msg=code==="popup_blocked"
     ?"A Puter belépési ablakát blokkolta a böngésző. Engedélyezd a felugró ablakot, majd próbáld újra. Addig megnyitom a kézi szerkesztőt."
     :code==="auth_window_closed"
       ?"A receptfeldolgozáshoz szükséges belépés megszakadt. Próbáld újra, amikor készen állsz; addig megnyitom a kézi szerkesztőt."
       :"A recept automatikus feldolgozása most nem sikerült. Megnyitom a kézi szerkesztőt, így a recept hibakód nélkül javítható.";
   alert(msg);
   openReadableEditor();
 }finally{busy(false)}
}
function handlePrepareReadable(){
 if(!currentId)return;
 const d=getReadable(currentId);
 if((d.status||"unprocessed")==="unprocessed")forceReadableProcessing();
 else openReadableEditor()
}

function openReadableEditor(){
 if(!currentId)return;const d=getReadable(currentId);
 $("#structuredStatus").value=d.status||"unprocessed";
 $("#ingredientsEditor").value=(d.ingredients||[]).join("\n");
 $("#stepsEditor").value=(d.steps||[]).join("\n");
 $("#notesEditor").value=(d.notes||[]).join("\n");
 $("#structuredDialog").showModal()
}
function saveStructuredReadable(){
 if(!currentId)return;
 const status=$("#structuredStatus").value,ingredients=splitLines($("#ingredientsEditor").value),steps=splitLines($("#stepsEditor").value),notes=splitLines($("#notesEditor").value);
 if(status==="verified"&&(!ingredients.length||!steps.length)){alert("Ellenőrzött recepthez kell legalább egy hozzávaló és egy elkészítési lépés.");return}
 setReadable(currentId,{status,ingredients,steps,notes,updatedAt:new Date().toISOString()});
 $("#structuredDialog").close();renderReadableFor(currentId);
 if(status==="verified"){setMode("readable");toast("✓ Olvasható recept ellenőrzöttként elmentve.")}else if(status==="review"){setMode("original");toast("Mentve: ellenőrzésre vár.")}else{setMode("original");toast("Mentve: nincs feldolgozva.")}
}
function resetIngredientChecks(){
 if(!currentId)return;const d=getReadable(currentId);(d.ingredients||[]).forEach((_,i)=>localStorage.removeItem(ingredientCheckKey(currentId,i)));(d.steps||[]).forEach((_,i)=>localStorage.removeItem(stepCheckKey(currentId,i)));renderReadableFor(currentId);toast("Minden pipa törölve.")
}
function changeReadableFont(delta){
 const n=Math.max(15,Math.min(26,currentReadableFont()+delta));localStorage.setItem("lena25:font",String(n));applyReadableFont()
}
function clearStructuredOverride(){
 if(!currentId)return;if(!confirm("Töröljük ezen a recepten a helyi strukturált javítást?"))return;clearReadableLocal(currentId);$("#structuredDialog").close();renderReadableFor(currentId);toast("Helyi javítás törölve.")
}

$("#healthBannerBtn").onclick=openHealth;$("#closeHealth").onclick=()=>$("#healthDialog").close();$("#healthRecipeSelect").onchange=e=>renderHealthResult(e.target.value);$("#healthAnalyzeBtn").onclick=()=>{const id=$("#healthRecipeSelect").value;if(id)estimateNutrition(id)};$("#nutriAnalyzeRecipe").onclick=()=>currentId&&estimateNutrition(currentId);$("#nutriRefreshRecipe").onclick=()=>currentId&&estimateNutrition(currentId);
$("#whatCookBtn").onclick=openWhatCook;
$("#bannerHomeStock").onclick=openStudioStock;
$("#bannerTime").onclick=()=>openWhatCookWith("Kb. 30 percünk van, 4 főre szeretnénk valamit. ");
$("#bannerAvoid").onclick=()=>openWhatCookWith("4 főre főzünk. Ma kerüljük: ");
$("#bannerPersonal").onclick=openWhatCook;
$("#closeWhatCook").onclick=()=>$("#whatCookDialog").close();$("#generateWhatCook").onclick=generateWhatCook;$("#whatCookDialog").querySelectorAll("[data-what]").forEach(b=>b.onclick=()=>{$("#whatCookPrompt").value=b.dataset.what;generateWhatCook()});
$("#feedbackStars").querySelectorAll("button").forEach(b=>b.onclick=()=>setFeedbackRating(Number(b.dataset.rating)));$("#saveFeedback").onclick=saveCurrentFeedback;
$("#search").oninput=renderHome;$("#clearSearch").onclick=()=>{$("#search").value="";renderHome()};$("#favFilter").onclick=()=>{favoritesOnly=!favoritesOnly;renderHome()};
$("#prepareReadable").onclick=handlePrepareReadable;
$("#fontMinus").onclick=()=>changeReadableFont(-1);
$("#fontPlus").onclick=()=>changeReadableFont(1);
$("#resetChecks").onclick=resetIngredientChecks;
$("#cookModeBtn").onclick=openCookMode;$("#closeCookMode").onclick=closeCookMode;$("#cookPrev").onclick=cookPrev;$("#cookNext").onclick=cookNext;$("#cookTimerStart").onclick=startCookTimer;$("#cookTimerPause").onclick=pauseCookTimer;$("#cookTimerReset").onclick=resetCookTimer;
$("#cookTimerPresets").querySelectorAll("[data-cook-minutes]").forEach(b=>b.onclick=()=>startCookPreset(Number(b.dataset.cookMinutes)));
$("#cookTimerPlus1").onclick=()=>addCookTimer(60);$("#cookTimerPlus5").onclick=()=>addCookTimer(300);
$("#cookModeDialog").addEventListener("close",releaseCookWakeLock);
initGoldenTimer();
$("#homeTimerBtn").onclick=openHomeTimer;$("#recipeTimerBtn").onclick=openHomeTimer;$("#closeHomeTimer").onclick=closeHomeTimer;$("#homeTimerStart").onclick=toggleGoldenTimer;$("#homeTimerReset").onclick=resetGoldenTimer;$("#homeTimerStopAlarm").onclick=stopGoldenTimerAlarm;
$("#homeTimerMinus1").onclick=()=>adjustGoldenTimer(-60);$("#homeTimerPlus1").onclick=()=>adjustGoldenTimer(60);$("#homeTimerPlus5").onclick=()=>adjustGoldenTimer(300);
$("#homeTimerPresets").querySelectorAll("[data-home-timer-minutes]").forEach(b=>b.onclick=()=>setGoldenTimer(Number(b.dataset.homeTimerMinutes)));
$("#homeTimerDialog").onclick=e=>{if(e.target===$("#homeTimerDialog"))closeHomeTimer()};
$("#saveStructured").onclick=saveStructuredReadable;
$("#clearStructured").onclick=clearStructuredOverride;
$("#studioBtn").onclick=openStudio;$("#addRecipeBtn").onclick=openAdd;$("#chooseImageBtn").onclick=()=>$("#newImageInput").click();$("#newImageInput").onchange=e=>handleNewImage(e.target.files&&e.target.files[0]);$("#saveNewRecipe").onclick=saveNew;
$("#topHome").onclick=()=>showHome(true);$("#homeBtn").onclick=()=>showHome(true);$("#healthRadarExportBtn").onclick=()=>toast("❤️ HealthRadar export előkészítve. Ezt a funkciót később aktiváljuk.");$("#backBtn").onclick=()=>history.back();$("#shareBtn").onclick=shareCurrentRecipe;$("#editBtn").onclick=openEdit;$("#editRegenerateCard").onclick=openCurrentRecipeInStudio;$("#navHome").onclick=()=>showHome(true);$("#navFav").onclick=()=>{favoritesOnly=true;showHome(true)};$("#navAdmin").onclick=openAdmin;$("#navAsk").onclick=askLena;
$("#closeAdmin").onclick=()=>$("#adminDialog").close();$("#addCategoryBtn").onclick=addManagedCategory;$("#newCategoryName").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addManagedCategory()}});$("#adminStudio").onclick=()=>{$("#adminDialog").close();openStudio()};$("#adminAddRecipe").onclick=()=>{$("#adminDialog").close();openAdd()};$("#syncSettingsBtn").onclick=openSyncSettings;$("#closeSync").onclick=()=>$("#syncDialog").close();$("#cloudSignIn").onclick=()=>cloudSignIn(false);$("#cloudSwitchAccount").onclick=()=>cloudSignIn(true);$("#cloudRefresh").onclick=cloudRefresh;
$("#closeStudio").onclick=()=>$("#studioDialog").close();
$("#recipeImage").onclick=()=>{if(!document.body.classList.contains("original-card-fullscreen"))openRecipePhoto()};$("#closePhotoLightbox").onclick=closeRecipePhoto;$("#photoLightbox").onclick=e=>{if(e.target===$("#photoLightbox"))closeRecipePhoto()};$("#photoLightbox").addEventListener("close",()=>{if(photoLightboxObjectUrl){URL.revokeObjectURL(photoLightboxObjectUrl);photoLightboxObjectUrl=null}});
$("#studioGenerate").onclick=studioGenerate;$("#studioGenerateImage").onclick=studioGenerateImage;$("#studioFridgeCameraBtn").onclick=()=>$("#studioFridgeCamera").click();$("#studioFridgeGalleryBtn").onclick=()=>$("#studioFridgeGallery").click();$("#studioFridgeCamera").onchange=e=>analyzeFridgePhoto(e.target.files&&e.target.files[0]);$("#studioFridgeGallery").onchange=e=>analyzeFridgePhoto(e.target.files&&e.target.files[0]);$("#studioUseInventory").onclick=()=>useFridgeInventory();$("#studioCardTab").onclick=()=>setStudioPreviewMode("card");$("#studioReadableTab").onclick=()=>setStudioPreviewMode("readable");
$("#studioRefine").onclick=studioRefine;
$("#studioRegenerateCard").onclick=()=>{studioPullEditor();renderStudioPreview();studioRenderExactCard()};
$("#studioFinalize").onclick=studioFinalize;
$("#studioChoosePhoto").onclick=()=>$("#studioPhotoInput").click();
$("#studioPhotoInput").onchange=e=>studioHandlePhoto(e.target.files&&e.target.files[0]);
["#studioTitle","#studioCategory","#studioServings","#studioTime","#studioIngredients","#studioSteps","#studioNotes"].forEach(s=>$(s).addEventListener("input",()=>{if(studioDraft)renderStudioPreview()}));
$("#recipeVideoCard").onclick=openYoutubePlayer;$("#closeYoutube").onclick=closeYoutubePlayer;$("#youtubeDialog").onclick=e=>{if(e.target===$("#youtubeDialog"))closeYoutubePlayer()};$("#youtubeDialog").addEventListener("close",()=>$("#youtubePlayer").removeAttribute("src"));
$("#editYoutubeUrl").addEventListener("input",renderEditYoutubePreview);$("#editYoutubeClear").onclick=()=>{$("#editYoutubeUrl").value="";renderEditYoutubePreview();$("#editYoutubeUrl").focus()};
$("#favBtn").onclick=()=>{if(!currentId)return;setFav(currentId,!isFav(currentId));$("#favBtn").textContent=isFav(currentId)?"★":"☆"};$("#originalMode").onclick=toggleOriginalFullscreen;$("#readableMode").onclick=()=>setMode("readable");$("#editReadable").onclick=editText;$("#saveRecipe").onclick=saveEdit;$("#deleteRecipe").onclick=deleteCurrent;$("#resetRecipe").onclick=resetCurrent;
$("#saveText").onclick=()=>{if(!currentId)return;setText(currentId,$("#textEditor").value);$("#textDialog").close();const t=getText(currentId);$("#readableText").textContent=t;$("#readableMode").hidden=!t;if(t){setMode("readable");toast("Javított receptszöveg elmentve.")}else{setMode("original");toast("Olvasható szöveg törölve.")}};
let __lastCentralRefresh=Date.now();
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&Date.now()-__lastCentralRefresh>30000){__lastCentralRefresh=Date.now();refreshSharedRecipes(true);loadTasteFeedback();loadNutritionCache()}if(!document.hidden&&$("#cookModeDialog").open&&!cookState.wakeLock)requestCookWakeLock()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.body.classList.contains("original-card-fullscreen"))setOriginalFullscreen(false)});
window.addEventListener("popstate",e=>{const st=e.state;if(st&&st.view==="recipe"&&st.id){openRecipe(st.id,false);return}showHome(false)});
function openInitialRoute(){
 const match=location.hash.match(/^#recipe=(.+)$/);let id=null;try{id=match?decodeURIComponent(match[1]):null}catch(e){}
 if(id&&getRecipe(id)){history.replaceState({view:"recipe",id},"",location.pathname+location.search+"#recipe="+encodeURIComponent(id));openRecipe(id,false);return}
 history.replaceState({view:"home"},"",location.pathname+location.search+"#home");renderHome()
}
(async()=>{migrateCanonicalBaseState();await loadSharedRecipes();await loadCloudRecipeMeta();await loadCategoryConfig();await loadCustomRecipes();await loadTasteFeedback();await loadNutritionCache();openInitialRoute();updateStudioProviderBadge();if(puterCloudReady()&&puter.auth.isSignedIn())syncPendingToCloud();void 0})().catch(e=>{console.error(e);renderHome()});
