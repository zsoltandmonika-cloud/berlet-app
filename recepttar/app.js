const baseRecipes=window.LENA_RECIPES||[],baseCategories=window.LENA_CATEGORIES||[],baseReadable=window.LENA_READABLE||{};
const $=s=>document.querySelector(s);
const GH_OWNER="zsoltandmonika-cloud",GH_REPO="berlet-app",GH_BRANCH="main",DB_NAME="lena-recepttar-local",DB_STORE="recipes";
let activeCategory="Mind",favoritesOnly=false,currentId=null,customRecipes=[],selectedNewBlob=null,selectedNewPreviewUrl=null;
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
function getReadable(id){try{const local=localStorage.getItem(keyReadable(id));if(local)return JSON.parse(local)}catch(e){}return baseReadable[id]||{status:"unprocessed",ingredients:[],steps:[],notes:[]}}
function setReadable(id,v){localStorage.setItem(keyReadable(id),JSON.stringify(v))}
function clearReadableLocal(id){localStorage.removeItem(keyReadable(id))}
function statusInfo(status){if(status==="verified")return["✅ Ellenőrzött","status-verified"];if(status==="review")return["⚠️ Ellenőrzésre vár","status-review"];return["○ Nincs feldolgozva","status-unprocessed"]}
function splitLines(v){return(v||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}

function isFav(id){return localStorage.getItem(keyFav(id))==="1"}function setFav(id,v){localStorage.setItem(keyFav(id),v?"1":"0")}
function getText(id){return localStorage.getItem(keyText(id))||""}function setText(id,t){t.trim()?localStorage.setItem(keyText(id),t.trim()):localStorage.removeItem(keyText(id))}
function getMeta(id){try{return JSON.parse(localStorage.getItem(keyMeta(id))||"{}")}catch(e){return{}}}function setMeta(id,m){localStorage.setItem(keyMeta(id),JSON.stringify(m))}
function effective(r){const m=getMeta(r.id);return Object.assign({},r,{title:m.title||r.title,category:m.category||r.category,deleted:!!m.deleted})}
function norm(s){return(s||"").toLocaleLowerCase("hu").normalize("NFD").replace(/\p{Diacritic}/gu,"").replace(/\s+/g," ").trim()}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");clearTimeout(window.__tt);window.__tt=setTimeout(()=>e.classList.remove("show"),2200)}
function busy(on,text){$("#busyText").textContent=text||"Feldolgozás…";$("#busyOverlay").hidden=!on}

function openDb(){return new Promise((res,rej)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(DB_STORE))r.result.createObjectStore(DB_STORE,{keyPath:"id"})};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function dbPut(v){const db=await openDb();await new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,"readwrite");tx.objectStore(DB_STORE).put(v);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close()}
async function dbGet(id){const db=await openDb();const v=await new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,"readonly"),r=tx.objectStore(DB_STORE).get(id);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)});db.close();return v}
async function dbAll(){const db=await openDb();const v=await new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,"readonly"),r=tx.objectStore(DB_STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error)});db.close();return v}
async function dbDelete(id){const db=await openDb();await new Promise((res,rej)=>{const tx=db.transaction(DB_STORE,"readwrite");tx.objectStore(DB_STORE).delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});db.close()}

async function loadCustomRecipes(){
 customRecipes.forEach(r=>r._url&&URL.revokeObjectURL(r._url));customRecipes=[];
 const rows=await dbAll();
 for(const row of rows){
   if(baseRecipes.some(x=>x.id===row.id)){await dbDelete(row.id);continue}
   const url=URL.createObjectURL(row.blob);
   customRecipes.push({id:row.id,title:row.title,category:row.category,file:url,mime:"image/jpeg",originalName:row.originalName||row.title+".jpg",localCustom:true,pending:!!row.pending,_url:url,_blob:row.blob});
 }
}
function allRecipes(){return baseRecipes.map(effective).concat(customRecipes.map(effective))}
function getRecipe(id){return allRecipes().find(x=>x.id===id)||null}
function allCategories(){const s=new Set(baseCategories);allRecipes().forEach(r=>r.category&&s.add(r.category));return Array.from(s).sort((a,b)=>a.localeCompare(b,"hu"))}
function fillCategoryList(){const d=$("#categoryList");d.innerHTML="";allCategories().forEach(c=>{const o=document.createElement("option");o.value=c;d.appendChild(o)})}

function renderChips(){const c=$("#chips");c.innerHTML="";["Mind"].concat(allCategories()).forEach(cat=>{const b=document.createElement("button");b.className="chip"+(activeCategory===cat?" active":"");b.textContent=cat;b.onclick=()=>{activeCategory=cat;renderHome()};c.appendChild(b)})}
function visibleRecipes(){const q=norm($("#search").value);return allRecipes().filter(r=>!r.deleted&&(activeCategory==="Mind"||r.category===activeCategory)&&(!favoritesOnly||isFav(r.id))&&(!q||norm(r.title+" "+r.category).includes(q))).sort((a,b)=>a.title.localeCompare(b.title,"hu"))}
function renderHome(){
 renderChips();const list=visibleRecipes();$("#count").textContent=list.length;$("#grid").innerHTML="";$("#favFilter").textContent=(favoritesOnly?"★ ":"☆ ")+"Kedvencek";
 list.forEach(r=>{const a=document.createElement("article");a.className="card";const media=document.createElement("div");media.className="card-media";
 if(r.mime==="application/pdf"){const d=document.createElement("div");d.className="pdf-tile";d.textContent="📄";media.appendChild(d)}else{const im=document.createElement("img");im.loading="lazy";im.src=r.file;im.alt=r.title;media.appendChild(im)}
 media.onclick=()=>openRecipe(r.id,true);const body=document.createElement("div");body.className="card-body";body.innerHTML='<h2 class="card-title"></h2><div class="card-sub"><span class="cat"></span><div class="card-actions"><button class="fav"></button><button class="open">⛶</button></div></div>';
 body.querySelector(".card-title").textContent=r.title;body.querySelector(".cat").textContent="📂 "+r.category+(r.localCustom?" · helyi":"");const fav=body.querySelector(".fav");fav.textContent=isFav(r.id)?"★":"☆";fav.onclick=()=>{setFav(r.id,!isFav(r.id));renderHome()};body.querySelector(".open").onclick=()=>openRecipe(r.id,true);a.append(media,body);$("#grid").appendChild(a)})
}
function showHome(push){currentId=null;$("#recipeView").hidden=true;$("#homeView").hidden=false;if(push)history.pushState({view:"home"},"","#home");window.scrollTo({top:0,behavior:"instant"});renderHome()}
function setMode(mode){const o=mode==="original";$("#originalPanel").hidden=!o;$("#readablePanel").hidden=o;$("#originalMode").classList.toggle("active",o);$("#readableMode").classList.toggle("active",!o)}
function openRecipe(id,push){
 const r=getRecipe(id);if(!r||r.deleted){showHome(push);return}currentId=id;$("#homeView").hidden=true;$("#recipeView").hidden=false;$("#recipeCategory").textContent=r.category+(r.localCustom?" · helyi":"");$("#recipeTitle").textContent=r.title;$("#favBtn").textContent=isFav(id)?"★":"☆";
 renderReadableFor(id);
 if(r.mime==="application/pdf"){$("#recipeImage").hidden=true;$("#recipePdf").hidden=false;$("#recipePdf").src=r.file}else{$("#recipePdf").hidden=true;$("#recipeImage").hidden=false;$("#recipeImage").src=r.file;$("#recipeImage").alt=r.title}
 setMode("original");if(push)history.pushState({view:"recipe",id},"","#recipe="+encodeURIComponent(id));window.scrollTo({top:0,behavior:"instant"})
}
function askLena(){const r=currentId?getRecipe(currentId):null,prefix=r?"Léna, ezt a receptet nézem: "+r.title+". ":"";navigator.clipboard?.writeText(prefix).catch(()=>{});window.open("https://chatgpt.com/","_blank","noopener");if(r)toast("A recept címe a vágólapra került.")}
function editText(){openReadableEditor()}
function openEdit(){if(!currentId)return;const r=getRecipe(currentId);if(!r)return;fillCategoryList();$("#editTitle").value=r.title;$("#editCategory").value=r.category;$("#editDialog").showModal()}
async function saveEdit(){
 if(!currentId)return;const r=getRecipe(currentId);if(!r)return;const title=$("#editTitle").value.trim()||r.title,category=$("#editCategory").value.trim()||r.category;
 if(r.localCustom){const row=await dbGet(r.id);if(row){row.title=title;row.category=category;row.pending=true;await dbPut(row);await loadCustomRecipes()}}
 else{const m=getMeta(currentId);setMeta(currentId,{title,category,deleted:!!m.deleted})}
 $("#editDialog").close();openRecipe(currentId,false);toast("Recept adatai elmentve.")
}
function deleteCurrent(){if(!currentId)return;const r=getRecipe(currentId);if(!r)return;if(!confirm("Biztosan törlöd ezt a receptet?\n\n"+r.title+"\n\nA törlés visszaállítható."))return;const m=getMeta(currentId);m.deleted=true;setMeta(currentId,m);$("#editDialog").close();showHome(true);toast("Recept a kukába került.")}
function resetCurrent(){if(!currentId)return;const m=getMeta(currentId);delete m.title;delete m.category;m.deleted=false;if(Object.keys(m).length)setMeta(currentId,m);else localStorage.removeItem(keyMeta(currentId));const r=getRecipe(currentId);$("#editTitle").value=r.title;$("#editCategory").value=r.category;toast("Alapadatok visszaállítva.")}

function filenameTitle(name){return(name||"").replace(/\.[^.]+$/,"").replace(/[_-]+/g," ").trim()}
async function processImage(file){const bm=await createImageBitmap(file,{imageOrientation:"from-image"}),max=1800,scale=Math.min(1,max/Math.max(bm.width,bm.height)),c=document.createElement("canvas");c.width=Math.max(1,Math.round(bm.width*scale));c.height=Math.max(1,Math.round(bm.height*scale));const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.imageSmoothingEnabled=true;x.imageSmoothingQuality="high";x.drawImage(bm,0,0,c.width,c.height);bm.close();return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("Képfeldolgozási hiba")),"image/jpeg",.9))}
function resetAddForm(){selectedNewBlob=null;if(selectedNewPreviewUrl){URL.revokeObjectURL(selectedNewPreviewUrl);selectedNewPreviewUrl=null}$("#newImageInput").value="";$("#newPreviewWrap").hidden=true;$("#newPreview").removeAttribute("src");$("#newTitle").value="";$("#newCategory").value="";$("#newCentralSync").checked=true}
function openAdd(){fillCategoryList();resetAddForm();$("#addDialog").showModal()}
async function handleNewImage(file){if(!file)return;busy(true,"Kép optimalizálása…");try{selectedNewBlob=await processImage(file);if(selectedNewPreviewUrl)URL.revokeObjectURL(selectedNewPreviewUrl);selectedNewPreviewUrl=URL.createObjectURL(selectedNewBlob);$("#newPreview").src=selectedNewPreviewUrl;$("#newPreviewWrap").hidden=false;if(!$("#newTitle").value.trim())$("#newTitle").value=filenameTitle(file.name)}catch(e){console.error(e);alert("A kép feldolgozása nem sikerült.")}finally{busy(false)}}
function newId(){return"u"+Date.now().toString(36)+Math.random().toString(36).slice(2,8)}
async function saveNew(){
 const title=$("#newTitle").value.trim(),category=$("#newCategory").value.trim();if(!selectedNewBlob){alert("Először válassz vagy fotózz egy receptképet.");return}if(!title){alert("Add meg a recept nevét.");return}if(!category){alert("Add meg a kategóriát.");return}
 const id=newId(),central=$("#newCentralSync").checked;await dbPut({id,title,category,originalName:title+".jpg",blob:selectedNewBlob,pending:central,createdAt:Date.now()});$("#addDialog").close();await loadCustomRecipes();activeCategory="Mind";favoritesOnly=false;showHome(false);toast("Új recept elmentve.");
 if(central){if(getGithubToken())syncLocalRecipe(id);else setTimeout(()=>{openSyncSettings();toast("A recept helyben megvan. A központi szinkronhoz egyszer add meg a GitHub kulcsot.")},350)}
}



const STUDIO_TEXT_MODEL="gpt-5.6-luna";
const STUDIO_IMAGE_MODEL="gpt-image-1-mini";

function puterAvailable(){return !!(window.puter&&puter.ai&&typeof puter.ai.chat==="function"&&typeof puter.ai.txt2img==="function")}
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
function parseRecipeJson(text){
 let s=String(text||"").trim();
 s=s.replace(/^\s*\`\`\`(?:json)?\s*/i,"").replace(/\s*\`\`\`\s*$/,"").trim();
 const first=s.indexOf("{"),last=s.lastIndexOf("}");if(first>=0&&last>first)s=s.slice(first,last+1);
 return JSON.parse(s)
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
 if(x.title.split(/\s+/).length<2||/^(csirkés|sertéses|marhás|zöldséges|tésztás|leves|desszert)$/i.test(x.title))throw new Error("A recept címe túl általános.");
 return x
}
function dataUrlToBlob(url){
 const m=String(url||"").match(/^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.*)$/);
 if(!m)throw new Error("A képgenerátor nem data URL képet adott vissza.");
 const bin=atob(m[2]),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);
 return new Blob([a],{type:m[1]||"image/png"})
}
function studioAiPrompt(userText,currentRecipe=null){
 const categories=allCategories().join(", ");
 const schema='{"title":"...","category":"...","servings":"4 fő","time":"30 perc","difficulty":"Könnyű","ingredients":["..."],"steps":["..."],"notes":["..."]}';
 let p="Te Léna vagy, a Léna Recepttár magyar receptasszisztense. Készíts pontos, hétköznapi konyhában megbízhatóan elkészíthető receptet. Tartsd meg a felhasználó által megadott mennyiségeket, adagokat és korlátozásokat. A mennyiségek legyenek konkrétak, az elkészítés sorrendhelyes, 4–9 lépés. A recept CÍME legyen étvágygerjesztő, konkrét és 3–7 szavas: nevezze meg a fő alapanyagot ÉS az ízvilágot/elkészítést/mártást. Tilos az egyszavas vagy semmitmondó cím, például: 'Csirkés', 'Zöldséges', 'Tésztás'. Jó cím például: 'Magyaros tejfölös-paprikás csirkemellragu', 'Krémes fokhagymás-gombás penne'. Válaszolj KIZÁRÓLAG érvényes JSON objektummal, markdown nélkül. Séma: "+schema+". Kategória lehetőleg ezek közül: "+categories+".\n\n";
 if(currentRecipe)p+="Jelenlegi recept:\n"+JSON.stringify(currentRecipe)+"\n\nMódosítási kérés:\n"+userText+"\n\nA teljes frissített receptet add vissza.";
 else p+="Felhasználói kérés:\n"+userText;
 return p
}
async function puterRecipe(prompt,currentRecipe=null){
 if(!puterAvailable())throw new Error("A Puter AI könyvtár nem töltődött be.");
 const req=studioAiPrompt(prompt,currentRecipe);
 let resp;
 try{resp=await puter.ai.chat(req,{model:STUDIO_TEXT_MODEL,normalize:true,verbosity:"low"})}
 catch(first){console.warn("Studio primary text model fallback",first);resp=await puter.ai.chat(req,{normalize:true})}
 return normalizeStudioDraft(parseRecipeJson(puterText(resp)))
}
async function puterFoodImage(recipe){
 if(!puterAvailable())throw new Error("A Puter képgenerátor nem érhető el.");
 const prompt=[
   "Photorealistic premium editorial food photography for a modern Hungarian recipe card.",
   "Dish: "+recipe.title+".",
   "Key ingredients: "+recipe.ingredients.slice(0,8).join(", ")+".",
   "Finished dish only, appetizing and realistic, natural proportions, warm natural side light, elegant home dining setting, shallow depth of field.",
   "Vertical 4:5 composition with useful negative space, no text, no lettering, no labels, no watermark, no hands, no people."
 ].join(" ");
 let img;
 try{img=await puter.ai.txt2img(prompt,{model:STUDIO_IMAGE_MODEL,ratio:{w:4,h:5},quality:"low"})}
 catch(first){console.warn("Studio primary image model fallback",first);img=await puter.ai.txt2img(prompt,{ratio:{w:4,h:5}})}
 if(!img||!img.src)throw new Error("A képgenerátor nem adott vissza képet.");
 return dataUrlToBlob(img.src)
}

let studioDraft=null,studioPhotoBlob=null,studioPhotoUrl=null,studioCardPreviewUrl=null;

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
 studioDraft=null;studioPhotoBlob=null;if(studioPhotoUrl){URL.revokeObjectURL(studioPhotoUrl);studioPhotoUrl=null}$("#studioHero").style.backgroundImage="";$("#studioHero").classList.remove("has-photo")
 $("#studioPrompt").value="";$("#studioPreview").hidden=true;$("#studioPhotoPreview").hidden=true;$("#studioPhotoPreview").removeAttribute("src");$("#studioPhotoInput").value="";$("#studioExactCardWrap").hidden=true;$("#studioExactCard").removeAttribute("src");setStudioPreviewMode("card");
 $("#studioStatus").textContent="A Studio AI-receptet és ételfotót készít fizetős API-kulcs nélkül.";
 $("#studioCentralSync").checked=true
}
function openStudio(){fillCategoryList();resetStudio();updateStudioProviderBadge();$("#studioDialog").showModal()}
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
 if(!studioDraft)return;studioPullEditor();busy(true,"AI ételfotó generálása…");
 try{
   const raw=await puterFoodImage(studioDraft);studioPhotoBlob=await processImage(raw);
   if(studioPhotoUrl)URL.revokeObjectURL(studioPhotoUrl);studioPhotoUrl=URL.createObjectURL(studioPhotoBlob);
   $("#studioPhotoPreview").src=studioPhotoUrl;$("#studioPhotoPreview").hidden=false;
   $("#studioHero").style.backgroundImage='linear-gradient(rgba(0,0,0,.08),rgba(0,0,0,.42)),url("'+studioPhotoUrl+'")';$("#studioHero").classList.add("has-photo");
   await studioRenderExactCard();toast("✓ Ételfotó és kártyaelőnézet elkészült.")
 }catch(e){console.error(e);alert("A képgenerálás nem sikerült: "+e.message)}finally{busy(false)}
}
async function studioHandlePhoto(file){
 if(!file)return;busy(true,"Ételfotó előkészítése…");try{studioPhotoBlob=await processImage(file);if(studioPhotoUrl)URL.revokeObjectURL(studioPhotoUrl);studioPhotoUrl=URL.createObjectURL(studioPhotoBlob);$("#studioPhotoPreview").src=studioPhotoUrl;$("#studioPhotoPreview").hidden=false;$("#studioHero").style.backgroundImage='linear-gradient(rgba(0,0,0,.08),rgba(0,0,0,.42)),url("'+studioPhotoUrl+'")';$("#studioHero").classList.add("has-photo")}catch(e){console.error(e);alert("A kép feldolgozása nem sikerült.");busy(false);return}busy(false);await studioRenderExactCard()
}
async function studioRenderExactCard(){
 if(!studioDraft)return;const d=studioPullEditor();busy(true,"Golden kártya előnézet készítése…");
 try{
   const blob=await studioCardBlob(d);if(studioCardPreviewUrl)URL.revokeObjectURL(studioCardPreviewUrl);studioCardPreviewUrl=URL.createObjectURL(blob);
   $("#studioExactCard").src=studioCardPreviewUrl;$("#studioExactCardWrap").hidden=false;setStudioPreviewMode("card");$("#studioExactCardWrap").scrollIntoView({behavior:"smooth",block:"nearest"})
 }catch(e){console.error(e);toast("Kártyaelőnézet hiba: "+e.message)}finally{busy(false)}
}
function canvasWrap(ctx,text,x,y,maxWidth,lineHeight,maxLines){
 const words=String(text||"").split(/\s+/);let line="",lines=0;
 for(let i=0;i<words.length;i++){const test=line?line+" "+words[i]:words[i];if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y);y+=lineHeight;lines++;line=words[i];if(maxLines&&lines>=maxLines)return y}else line=test}
 if(line&&(!maxLines||lines<maxLines)){ctx.fillText(line,x,y);y+=lineHeight}return y
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
function magazineStepPhoto(ctx,bm,x,y,w,h,index){
 ctx.save();roundRectPath(ctx,x,y,w,h,18);ctx.clip();
 if(bm){const fx=[.25,.55,.75,.4][index%4],fy=[.45,.55,.35,.65][index%4];drawCover(ctx,bm,x,y,w,h,fx,fy)}
 else{const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,"#e3e8db");g.addColorStop(1,"#f1dfc9");ctx.fillStyle=g;ctx.fillRect(x,y,w,h)}
 ctx.restore();strokeRound(ctx,x,y,w,h,18,"#d8d2c6",2)
}
async function studioCardBlob(d){
 const c=document.createElement("canvas");c.width=1200;c.height=1600;const x=c.getContext("2d");
 const cream="#f7f1e5",ink="#2b241f",green="#355f38",green2="#234c2b",line="#cdbda7",muted="#6f6258";
 x.fillStyle=cream;x.fillRect(0,0,c.width,c.height);
 let bm=null;if(studioPhotoBlob)bm=await createImageBitmap(studioPhotoBlob,{imageOrientation:"from-image"});

 // FELSŐ MAGAZIN FEJLÉC
 x.fillStyle="#fffaf0";x.fillRect(0,0,1200,660);
 if(bm){
   x.save();x.beginPath();x.moveTo(610,0);x.quadraticCurveTo(655,165,615,330);x.quadraticCurveTo(575,505,635,660);x.lineTo(1200,660);x.lineTo(1200,0);x.closePath();x.clip();
   drawCover(x,bm,545,-5,680,665,.52,.48);x.restore()
 }else{
   const g=x.createLinearGradient(600,0,1200,660);g.addColorStop(0,"#e2e9d9");g.addColorStop(1,"#d4c39f");x.fillStyle=g;x.fillRect(600,0,600,660)
 }
 x.fillStyle=green;x.font="900 25px Arial";x.fillText((d.category||"LÉNA RECEPT").toUpperCase(),42,65);
 x.fillStyle=ink;x.font="900 66px Georgia";canvasWrap(x,String(d.title||"").toUpperCase(),42,140,535,72,3);

 // zöld szalag
 const ribbonY=330;fillRound(x,40,ribbonY,505,66,9,green);
 x.fillStyle="#fff";x.font="900 22px Arial";x.fillText("LÉNA RECEPTTÁR · GOLDEN KÁRTYA",64,ribbonY+42);
 x.fillStyle="#7d4e3b";x.font="700 19px Arial";x.fillText("HÁZIAS • ÍZLETES • KÖNNYEN KÖVETHETŐ",44,430);

 // meta ikon sor
 fillRound(x,38,462,522,142,16,"#fffdf8");strokeRound(x,38,462,522,142,16,line,2);
 const metas=[["👥",d.servings||"4 fő","ADAG"],["⏱",d.time||"30 perc","IDŐ"],["🍲",d.difficulty||"Könnyű","NEHÉZSÉG"],["🍳",d.category||"Recept","STÍLUS"]];
 const cellW=522/4;metas.forEach((m,i)=>{
   const cx=38+i*cellW;if(i)x.fillStyle="#d9cec0",x.fillRect(cx,485,2,95);
   x.textAlign="center";x.font="32px serif";x.fillText(m[0],cx+cellW/2,505);
   x.fillStyle=ink;x.font="900 18px Arial";canvasWrap(x,m[1],cx+14,548,cellW-28,20,2);
   x.fillStyle=muted;x.font="900 12px Arial";x.fillText(m[2],cx+cellW/2,584);x.textAlign="left"
 });

 // ALSÓ RÉSZ 3 OSZLOP: HOZZÁVALÓ / KÉPSOR / LÉPÉSEK
 const top=700,leftX=30,leftW=300,photoX=348,photoW=292,rightX=660,rightW=510;
 fillRound(x,leftX,top,leftW,820,18,"#fffaf2");strokeRound(x,leftX,top,leftW,820,18,line,2);
 fillRound(x,rightX,top,rightW,820,18,"#fffaf2");strokeRound(x,rightX,top,rightW,820,18,line,2);

 fillRound(x,leftX+14,top-24,205,54,8,green);x.fillStyle="#fff";x.font="900 21px Arial";x.fillText("HOZZÁVALÓK",leftX+32,top+11);
 fillRound(x,rightX+14,top-24,390,54,8,green);x.fillStyle="#fff";x.font="900 21px Arial";x.fillText("ELKÉSZÍTÉS LÉPÉSRŐL LÉPÉSRE",rightX+32,top+11);

 // hozzávalók
 let iy=760;x.font="21px Arial";
 d.ingredients.slice(0,14).forEach((v,i)=>{
   if(iy>1435)return;
   x.fillStyle=green;x.beginPath();x.arc(leftX+26,iy-6,5,0,Math.PI*2);x.fill();
   x.fillStyle=ink;x.font="21px Arial";iy=canvasWrap(x,v,leftX+43,iy,leftW-58,28,2)+8
 });

 // dekoratív alapanyag ikonok
 const deco=d.ingredients.slice(0,4).map(ingredientEmoji);x.font="54px serif";let ex=leftX+28;deco.forEach(e=>{x.fillText(e,ex,1490);ex+=60});

 // középső képsor
 const ph=182,gap=16;for(let i=0;i<4;i++){const py=top+40+i*(ph+gap);magazineStepPhoto(x,bm,photoX,py,photoW,ph,i)}

 // lépések
 let sy=760;
 d.steps.slice(0,7).forEach((v,i)=>{
   if(sy>1440)return;
   fillRound(x,rightX+18,sy-25,38,38,9,green);x.fillStyle="#fff";x.font="900 20px Arial";x.textAlign="center";x.fillText(String(i+1),rightX+37,sy+2);x.textAlign="left";
   x.fillStyle=ink;x.font="21px Arial";sy=canvasWrap(x,v,rightX+72,sy,rightW-94,29,4)+18;
   x.fillStyle="#ddcfbd";x.fillRect(rightX+72,sy-7,rightW-96,1)
 });

 // tip / footer
 const notes=(d.notes||[]).filter(Boolean);
 if(notes.length){fillRound(x,rightX+20,1460,rightW-40,46,12,"#eef3e9");x.fillStyle=green2;x.font="900 15px Arial";x.fillText("LÉNA TIPP",rightX+35,1488);x.fillStyle=muted;x.font="16px Arial";canvasWrap(x,notes[0],rightX+125,1488,rightW-165,20,1)}
 x.fillStyle="#9a8977";x.font="15px Arial";x.fillText("Léna Recepttár · Zsolt & Mónika",38,1570);
 x.textAlign="right";x.fillText("📖 Olvasható recept mellékelve",1162,1570);x.textAlign="left";
 if(bm)bm.close();
 return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("Kártyagenerálási hiba")),"image/jpeg",.95))
}
async function studioFinalize(){
 if(!studioDraft)return;const d=studioPullEditor();if(!d.title||!d.category||!d.ingredients.length||!d.steps.length){alert("A véglegesítéshez kell cím, kategória, hozzávaló és elkészítés.");return}
 busy(true,"Golden kártya készítése és mentés…");
 try{
   const blob=await studioCardBlob(d),id=newId(),central=$("#studioCentralSync").checked,readable={status:"verified",source:"studio_v1",ingredients:d.ingredients,steps:d.steps,notes:[d.servings+" · "+d.time+" · "+d.difficulty].concat(d.notes||[]),updatedAt:new Date().toISOString()};
   await dbPut({id,title:d.title,category:d.category,originalName:d.title+".jpg",blob,heroBlob:studioPhotoBlob||null,pending:central,createdAt:Date.now(),readable,studio:true,studioData:{title:d.title,category:d.category,servings:d.servings,time:d.time,difficulty:d.difficulty,ingredients:d.ingredients,steps:d.steps,notes:d.notes||[]}});
   setReadable(id,readable);$("#studioDialog").close();await loadCustomRecipes();activeCategory="Mind";favoritesOnly=false;showHome(false);toast("✓ Studio recept elmentve.");
   if(central){if(getGithubToken())syncLocalRecipe(id);else setTimeout(()=>{openSyncSettings();toast("A recept helyben kész. A központi mentéshez add meg a GitHub kulcsot.")},350)}
 }catch(e){console.error(e);alert("A recept mentése nem sikerült: "+e.message)}finally{busy(false)}
}

function getGithubToken(){return sessionStorage.getItem("lena23:ghToken")||localStorage.getItem("lena23:ghToken")||""}
function openSyncSettings(){const t=getGithubToken();$("#githubToken").value=t;$("#rememberToken").checked=!!localStorage.getItem("lena23:ghToken");$("#tokenStatus").hidden=true;if($("#adminDialog").open)$("#adminDialog").close();$("#syncDialog").showModal()}
function saveGithubToken(){const t=$("#githubToken").value.trim();sessionStorage.removeItem("lena23:ghToken");localStorage.removeItem("lena23:ghToken");if(t){($("#rememberToken").checked?localStorage:sessionStorage).setItem("lena23:ghToken",t)}$("#syncDialog").close();toast(t?"GitHub kulcs elmentve.":"GitHub kulcs törölve.")}
async function testGithubToken(){const t=$("#githubToken").value.trim(),s=$("#tokenStatus");s.hidden=false;s.textContent="Kapcsolat ellenőrzése…";if(!t){s.textContent="Nincs megadva token.";return}try{const r=await fetch("https://api.github.com/repos/"+GH_OWNER+"/"+GH_REPO,{headers:{"Accept":"application/vnd.github+json","Authorization":"Bearer "+t,"X-GitHub-Api-Version":"2022-11-28"}});if(!r.ok)throw new Error("GitHub HTTP "+r.status);const d=await r.json();s.textContent=d.permissions&&d.permissions.push?"✓ Kapcsolat rendben, írási jogosultság elérhető.":"⚠ Kapcsolat van, de írási jogosultság nem látszik. Contents: Read and write kell."}catch(e){s.textContent="✕ A kapcsolat nem sikerült: "+e.message}}
function blobToBase64(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]);r.onerror=()=>rej(r.error);r.readAsDataURL(blob)})}
function decode64(s){const bin=atob((s||"").replace(/\n/g,"")),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new TextDecoder().decode(a)}
function encode64(s){const a=new TextEncoder().encode(s);let bin="";for(let i=0;i<a.length;i+=32768)bin+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(bin)}
async function ghRequest(path,opts={}){const token=getGithubToken();if(!token)throw new Error("Nincs GitHub kulcs beállítva.");const r=await fetch("https://api.github.com/repos/"+GH_OWNER+"/"+GH_REPO+path,{...opts,headers:{"Accept":"application/vnd.github+json","Authorization":"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28",...(opts.headers||{})}});if(!r.ok){let msg="GitHub HTTP "+r.status;try{const j=await r.json();if(j.message)msg+=" · "+j.message}catch(e){}throw new Error(msg)}return r.status===204?null:r.json()}
async function putGithubFile(path,b64,message){let sha=null;try{const e=await ghRequest("/contents/"+path+"?ref="+GH_BRANCH);sha=e.sha}catch(err){if(!String(err.message).includes("404"))throw err}const body={message,content:b64,branch:GH_BRANCH};if(sha)body.sha=sha;return ghRequest("/contents/"+path,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})}
async function syncLocalRecipe(id){
 const row=await dbGet(id);if(!row)return;if(!getGithubToken()){openSyncSettings();return}busy(true,"Feltöltés a központi Recepttárba…");
 try{
   const fileName="user_"+id+".jpg";await putGithubFile("recepttar/recipes/"+fileName,await blobToBase64(row.blob),"Add recipe card: "+row.title);
   let heroFile=null;if(row.heroBlob){heroFile="recipes/user_"+id+"_hero.jpg";await putGithubFile("recepttar/"+heroFile,await blobToBase64(row.heroBlob),"Add recipe hero image: "+row.title)}
   const data=await ghRequest("/contents/recepttar/data.js?ref="+GH_BRANCH),txt=decode64(data.content),rm=txt.match(/window\.LENA_RECIPES\s*=\s*(\[[\s\S]*?\]);/),cm=txt.match(/window\.LENA_CATEGORIES\s*=\s*(\[[\s\S]*?\]);/);
   if(!rm||!cm)throw new Error("A data.js formátuma nem olvasható.");const rs=JSON.parse(rm[1]),cs=JSON.parse(cm[1]);const existing=rs.find(x=>x.id===id);
   if(existing){existing.title=row.title;existing.category=row.category;existing.file="recipes/"+fileName;existing.mime="image/jpeg";if(heroFile)existing.heroFile=heroFile}else rs.push({id,title:row.title,category:row.category,file:"recipes/"+fileName,mime:"image/jpeg",originalName:row.originalName||row.title+".jpg",...(heroFile?{heroFile}:{})});
   if(!cs.includes(row.category))cs.push(row.category);cs.sort((a,b)=>a.localeCompare(b,"hu"));
   const out="window.LENA_RECIPES = "+JSON.stringify(rs,null,2)+";\nwindow.LENA_CATEGORIES = "+JSON.stringify(cs,null,2)+";\n";
   await ghRequest("/contents/recepttar/data.js",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"Add recipe: "+row.title,content:encode64(out),sha:data.sha,branch:GH_BRANCH})});
   if(row.readable){
     const rd=await ghRequest("/contents/recepttar/readable-data.js?ref="+GH_BRANCH),rtxt=decode64(rd.content),mm=rtxt.match(/window\.LENA_READABLE\s*=\s*(\{[\s\S]*\});\s*$/);
     if(!mm)throw new Error("A readable-data.js formátuma nem olvasható.");
     const ro=Function('"use strict";return ('+mm[1]+')')();ro[id]=row.readable;
     const rout="window.LENA_READABLE = "+JSON.stringify(ro,null,2)+";\n";
     await ghRequest("/contents/recepttar/readable-data.js",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"Add readable recipe: "+row.title,content:encode64(rout),sha:rd.sha,branch:GH_BRANCH})});
   }
   row.pending=false;await dbPut(row);await loadCustomRecipes();renderHome();renderPending();toast("✓ Központi feltöltés kész. Kártya és olvasható recept is mentve.")
 }catch(e){console.error(e);toast("Szinkron hiba: "+e.message)}finally{busy(false)}
}

function renderPending(){const box=$("#pendingList");box.innerHTML="";const list=customRecipes.slice().sort((a,b)=>a.title.localeCompare(b.title,"hu"));if(!list.length){const e=document.createElement("div");e.className="empty-admin";e.textContent="Nincs csak helyben tárolt új recept.";box.appendChild(e);return}list.forEach(r=>{const row=document.createElement("div");row.className="deleted-item";const main=document.createElement("div");main.className="deleted-main",t=document.createElement("div");t.className="deleted-title";t.textContent=r.title;const c=document.createElement("div");c.className="deleted-cat";c.textContent=r.category+(r.pending?" · szinkronra vár":" · feltöltve, frissítésre vár");main.append(t,c);const b=document.createElement("button");b.className="sync-btn";b.textContent=r.pending?"☁ Feltöltés":"✓ Fent";b.disabled=!r.pending;b.onclick=()=>syncLocalRecipe(r.id);row.append(main,b);box.appendChild(row)})}
function renderDeleted(){const box=$("#deletedList");box.innerHTML="";const del=allRecipes().filter(r=>r.deleted).sort((a,b)=>a.title.localeCompare(b.title,"hu"));if(!del.length){const e=document.createElement("div");e.className="empty-admin";e.textContent="A kuka üres.";box.appendChild(e);return}del.forEach(r=>{const row=document.createElement("div");row.className="deleted-item";const main=document.createElement("div");main.className="deleted-main",t=document.createElement("div");t.className="deleted-title";t.textContent=r.title;const c=document.createElement("div");c.className="deleted-cat";c.textContent=r.category;main.append(t,c);const b=document.createElement("button");b.className="restore-btn";b.textContent="↩ Vissza";b.onclick=()=>{const m=getMeta(r.id);m.deleted=false;setMeta(r.id,m);renderDeleted();renderHome();toast("Recept visszaállítva.")};row.append(main,b);box.appendChild(row)})}
function openAdmin(){renderPending();renderDeleted();$("#adminDialog").showModal()}


function ingredientCheckKey(id,i){return"lena25:checked:"+id+":"+i}
function currentReadableFont(){let n=parseInt(localStorage.getItem("lena25:font")||"18",10);if(!Number.isFinite(n))n=18;return Math.max(15,Math.min(26,n))}
function applyReadableFont(){
 const n=currentReadableFont(),box=$("#readableContent");if(box)box.style.setProperty("--readable-size",n+"px");if($("#fontSizeLabel"))$("#fontSizeLabel").textContent=n
}
function renderReadableFor(id){
 const d=getReadable(id),info=statusInfo(d.status),badge=$("#readableStatusBadge");
 if(badge){badge.textContent=info[0];badge.className="status-badge "+info[1]}
 const valid=d.status==="verified"&&Array.isArray(d.ingredients)&&d.ingredients.length>0&&Array.isArray(d.steps)&&d.steps.length>0;
 $("#readableMode").hidden=!valid;
 $("#prepareReadable").textContent=valid?"✏️ Olvasható recept javítása":"✏️ Strukturált recept";
 $("#ingredientsList").innerHTML="";$("#stepsList").innerHTML="";$("#notesList").innerHTML="";$("#notesSection").hidden=true;
 if(!valid){setMode("original");return}
 d.ingredients.forEach((item,i)=>{
   const label=document.createElement("label");label.className="ingredient-row";
   const cb=document.createElement("input");cb.type="checkbox";cb.checked=localStorage.getItem(ingredientCheckKey(id,i))==="1";
   const span=document.createElement("span");span.textContent=item;label.classList.toggle("checked",cb.checked);
   cb.onchange=()=>{localStorage.setItem(ingredientCheckKey(id,i),cb.checked?"1":"0");label.classList.toggle("checked",cb.checked)};
   label.append(cb,span);$("#ingredientsList").appendChild(label)
 });
 d.steps.forEach(step=>{const li=document.createElement("li");li.textContent=step;$("#stepsList").appendChild(li)});
 const notes=Array.isArray(d.notes)?d.notes:[];
 if(notes.length){$("#notesSection").hidden=false;notes.forEach(n=>{const p=document.createElement("p");p.textContent=n;$("#notesList").appendChild(p)})}
 applyReadableFont()
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
 if(!currentId)return;const d=getReadable(currentId);(d.ingredients||[]).forEach((_,i)=>localStorage.removeItem(ingredientCheckKey(currentId,i)));renderReadableFor(currentId);toast("Hozzávaló-pipák törölve.")
}
function changeReadableFont(delta){
 const n=Math.max(15,Math.min(26,currentReadableFont()+delta));localStorage.setItem("lena25:font",String(n));applyReadableFont()
}
function clearStructuredOverride(){
 if(!currentId)return;if(!confirm("Töröljük ezen a recepten a helyi strukturált javítást?"))return;clearReadableLocal(currentId);$("#structuredDialog").close();renderReadableFor(currentId);toast("Helyi javítás törölve.")
}

$("#search").oninput=renderHome;$("#clearSearch").onclick=()=>{$("#search").value="";renderHome()};$("#favFilter").onclick=()=>{favoritesOnly=!favoritesOnly;renderHome()};
$("#prepareReadable").onclick=openReadableEditor;
$("#fontMinus").onclick=()=>changeReadableFont(-1);
$("#fontPlus").onclick=()=>changeReadableFont(1);
$("#resetChecks").onclick=resetIngredientChecks;
$("#saveStructured").onclick=saveStructuredReadable;
$("#clearStructured").onclick=clearStructuredOverride;
$("#studioBtn").onclick=openStudio;$("#addRecipeBtn").onclick=openAdd;$("#chooseImageBtn").onclick=()=>$("#newImageInput").click();$("#newImageInput").onchange=e=>handleNewImage(e.target.files&&e.target.files[0]);$("#saveNewRecipe").onclick=saveNew;
$("#topHome").onclick=()=>showHome(true);$("#homeBtn").onclick=()=>showHome(true);$("#backBtn").onclick=()=>history.back();$("#editBtn").onclick=openEdit;$("#navHome").onclick=()=>showHome(true);$("#navFav").onclick=()=>{favoritesOnly=true;showHome(true)};$("#navAdmin").onclick=openAdmin;$("#navAsk").onclick=askLena;
$("#closeAdmin").onclick=()=>$("#adminDialog").close();$("#adminStudio").onclick=()=>{$("#adminDialog").close();openStudio()};$("#adminAddRecipe").onclick=()=>{$("#adminDialog").close();openAdd()};$("#syncSettingsBtn").onclick=openSyncSettings;$("#closeSync").onclick=()=>$("#syncDialog").close();$("#testToken").onclick=testGithubToken;$("#saveToken").onclick=saveGithubToken;
$("#closeStudio").onclick=()=>$("#studioDialog").close();
$("#studioGenerate").onclick=studioGenerate;$("#studioGenerateImage").onclick=studioGenerateImage;$("#studioCardTab").onclick=()=>setStudioPreviewMode("card");$("#studioReadableTab").onclick=()=>setStudioPreviewMode("readable");
$("#studioRefine").onclick=studioRefine;
$("#studioRegenerateCard").onclick=()=>{studioPullEditor();renderStudioPreview();studioRenderExactCard()};
$("#studioFinalize").onclick=studioFinalize;
$("#studioChoosePhoto").onclick=()=>$("#studioPhotoInput").click();
$("#studioPhotoInput").onchange=e=>studioHandlePhoto(e.target.files&&e.target.files[0]);
["#studioTitle","#studioCategory","#studioServings","#studioTime","#studioIngredients","#studioSteps","#studioNotes"].forEach(s=>$(s).addEventListener("input",()=>{if(studioDraft)renderStudioPreview()}));
$("#favBtn").onclick=()=>{if(!currentId)return;setFav(currentId,!isFav(currentId));$("#favBtn").textContent=isFav(currentId)?"★":"☆"};$("#originalMode").onclick=()=>setMode("original");$("#readableMode").onclick=()=>setMode("readable");$("#editReadable").onclick=editText;$("#saveRecipe").onclick=saveEdit;$("#deleteRecipe").onclick=deleteCurrent;$("#resetRecipe").onclick=resetCurrent;
$("#saveText").onclick=()=>{if(!currentId)return;setText(currentId,$("#textEditor").value);$("#textDialog").close();const t=getText(currentId);$("#readableText").textContent=t;$("#readableMode").hidden=!t;if(t){setMode("readable");toast("Javított receptszöveg elmentve.")}else{setMode("original");toast("Olvasható szöveg törölve.")}};
window.addEventListener("popstate",e=>{const st=e.state;if(st&&st.view==="recipe"&&st.id){openRecipe(st.id,false);return}showHome(false)});
(async()=>{migrateCanonicalBaseState();await loadCustomRecipes();history.replaceState({view:"home"},"","#home");renderHome();updateStudioProviderBadge();if("serviceWorker"in navigator&&location.protocol.startsWith("http"))navigator.serviceWorker.register("./sw.js?v=35").catch(()=>{})})().catch(e=>{console.error(e);renderHome()});