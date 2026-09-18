const baseRecipes=window.LENA_RECIPES||[],baseCategories=window.LENA_CATEGORIES||[],baseReadable=window.LENA_READABLE||{};
const $=s=>document.querySelector(s);
const GH_OWNER="zsoltandmonika-cloud",GH_REPO="berlet-app",GH_BRANCH="feature/recipe-studio-v1",DB_NAME="lena-recepttar-studio-preview",DB_STORE="recipes";
baseRecipes.forEach(r=>{if(r.file&&r.file.startsWith("recipes/"))r.file="../recepttar/"+r.file});
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


let studioDraft=null,studioPhotoBlob=null,studioPhotoUrl=null;

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
 if(/paprikas|lecso|fozelek|rakott krumpli/.test(n))return"Hungarikum";
 return"Egyébb"
}
function studioIngredientCandidates(prompt){
 const raw=(prompt||"").replace(/\n/g,",").split(/[,;]+/).map(x=>x.trim()).filter(Boolean);
 const reject=/^(van|szeretnek|szeretném|legyen|valami|egy|gyors|finom|vacsora|ebed|fozes|fozni)/i;
 const out=[];
 raw.forEach(x=>{if(x.length>2&&!reject.test(norm(x))&&out.length<8)out.push(x.replace(/^és\s+/i,""))});
 const n=norm(prompt);
 const known=[
  ["csirk","500 g csirkemell"],["brokk","1 fej brokkoli"],["tejszin","200 ml főzőtejszín"],["gouda","150 g reszelt Gouda"],
  ["penne","500 g penne"],["cukkini","2 közepes cukkini"],["krumpli","700 g burgonya"],["paradics","400 g paradicsom"],
  ["gomba","250 g gomba"],["rizs","300 g rizs"],["saj","150 g reszelt sajt"]
 ];
 known.forEach(([k,v])=>{if(n.includes(k)&&!out.some(x=>norm(x).includes(k)))out.push(v)});
 if(!out.length)out.push("500 g választott fő hozzávaló");
 if(!out.some(x=>norm(x).includes("olaj")))out.push("2 ek olívaolaj");
 if(!out.some(x=>norm(x).includes("so")))out.push("Só és frissen őrölt bors");
 return out.slice(0,10)
}
function studioTitleFromPrompt(p,ingredients,category){
 const n=norm(p),names=[];
 [["csirk","csirkés"],["brokk","brokkolis"],["cukkini","cukkinis"],["gomba","gombás"],["penne","pennés"],["rizs","rizses"],["krumpli","burgonyás"],["paradics","paradicsomos"]].forEach(([k,v])=>{if(n.includes(k))names.push(v)});
 let base=names.slice(0,2).join(" ");
 if(!base)base=category==="Levesek"?"Krémleves":category==="Tészták"?"Krémes tészta":"Léna serpenyős receptje";
 if(n.includes("tejszin")||n.includes("kremes"))base="Krémes "+base;
 return base.charAt(0).toUpperCase()+base.slice(1)
}
function studioLocalDraft(prompt){
 const category=studioCategoryFromPrompt(prompt),ingredients=studioIngredientCandidates(prompt),title=studioTitleFromPrompt(prompt,ingredients,category);
 const n=norm(prompt),servings=(n.match(/(\d+)\s*(fo|adag)/)||[])[1];
 const steps=[
   "Készítsd elő és darabold fel a fő hozzávalókat.",
   "Egy nagy serpenyőben vagy lábasban hevítsd fel az olívaolajat, majd kezdd el pirítani a fő hozzávalókat.",
   "Add hozzá a többi hozzávalót, ízesítsd, és közepes lángon főzd össze, amíg minden megfelelően megpuhul.",
   "A végén állítsd be a krémességet és a fűszerezést, majd frissen tálald."
 ];
 if(category==="Tészták")steps.splice(0,1,"A tésztát főzd al dentére, és tegyél félre egy kevés főzővizet.");
 if(category==="Levesek"){steps[1]="A hagymás-fűszeres alapon párold át a zöldségeket.";steps[2]="Öntsd fel alaplével, főzd puhára, majd turmixold krémesre."}
 return{title,category,servings:servings?servings+" fő":"4 fő",time:"30–35 perc",difficulty:"Könnyű",ingredients,steps,notes:["Studio V1 helyi prototípus-javaslat. A végleges AI receptmotor bekötése után ugyanezt a struktúrát Léna tölti ki."]}
}
function resetStudio(){
 studioDraft=null;studioPhotoBlob=null;if(studioPhotoUrl){URL.revokeObjectURL(studioPhotoUrl);studioPhotoUrl=null}$("#studioHero").style.backgroundImage="";$("#studioHero").classList.remove("has-photo")
 $("#studioPrompt").value="";$("#studioPreview").hidden=true;$("#studioPhotoPreview").hidden=true;$("#studioPhotoPreview").removeAttribute("src");$("#studioPhotoInput").value="";
 $("#studioStatus").textContent="A V1 már végigviszi a teljes kártya → olvasható recept → mentés folyamatot. Az AI-backend és a HD fotó a következő bekötési pont.";
 $("#studioCentralSync").checked=false
}
function openStudio(){fillCategoryList();resetStudio();$("#studioDialog").showModal()}
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
function renderStudioPreview(){
 const d=studioPullEditor()||studioDraft;if(!d)return;
 $("#studioPreviewTitle").textContent=d.title;$("#studioPreviewCategory").textContent=d.category;
 $("#studioHeroEmoji").textContent=studioIcon(d.category,d.title);
 $("#studioPreviewMeta").innerHTML="";
 [d.servings,d.time,d.difficulty].filter(Boolean).forEach(x=>{const s=document.createElement("span");s.textContent=x;$("#studioPreviewMeta").appendChild(s)});
 $("#studioPreviewIngredients").innerHTML="";d.ingredients.slice(0,8).forEach(x=>{const li=document.createElement("li");li.textContent=x;$("#studioPreviewIngredients").appendChild(li)});
 $("#studioPreviewSteps").innerHTML="";d.steps.slice(0,4).forEach(x=>{const li=document.createElement("li");li.textContent=x;$("#studioPreviewSteps").appendChild(li)})
}
function studioGenerate(){
 const prompt=$("#studioPrompt").value.trim();if(!prompt){alert("Írd le, milyen receptet szeretnél.");return}
 studioDraft=studioLocalDraft(prompt);studioFillEditor();$("#studioPreview").hidden=false;renderStudioPreview();
 $("#studioStatus").textContent="✓ Első javaslat elkészült. Most finomíthatod, majd véglegesítheted és elmentheted.";
 $("#studioPreview").scrollIntoView({behavior:"smooth",block:"start"})
}
function studioRefine(){
 if(!studioDraft)return;studioPullEditor();const q=$("#studioRefineText").value.trim(),n=norm(q);if(!q)return;
 const mult=(n.match(/(\d+)\s*(fo|adag)/)||[])[1];if(mult)studioDraft.servings=mult+" fő";
 if(n.includes("csipos")&&!studioDraft.ingredients.some(x=>norm(x).includes("chili")))studioDraft.ingredients.push("Chilipehely ízlés szerint");
 if(n.includes("laktozmentes"))studioDraft.ingredients=studioDraft.ingredients.map(x=>x.replace(/tejszín/gi,"laktózmentes tejszín").replace(/gouda/gi,"laktózmentes Gouda"));
 const pen=(n.match(/(\d+)\s*g\s*penne/)||[])[1];if(pen){const i=studioDraft.ingredients.findIndex(x=>norm(x).includes("penne"));if(i>=0)studioDraft.ingredients[i]=pen+" g penne";else studioDraft.ingredients.unshift(pen+" g penne")}
 if(n.includes("gyors"))studioDraft.time="20–25 perc";
 studioDraft.notes=(studioDraft.notes||[]).concat("Finomítási kérés: "+q);
 studioFillEditor();renderStudioPreview();$("#studioRefineText").value="";toast("Finomítás alkalmazva.")
}
async function studioHandlePhoto(file){
 if(!file)return;busy(true,"Ételfotó előkészítése…");try{studioPhotoBlob=await processImage(file);if(studioPhotoUrl)URL.revokeObjectURL(studioPhotoUrl);studioPhotoUrl=URL.createObjectURL(studioPhotoBlob);$("#studioPhotoPreview").src=studioPhotoUrl;$("#studioPhotoPreview").hidden=false;$("#studioHero").style.backgroundImage='linear-gradient(rgba(0,0,0,.08),rgba(0,0,0,.42)),url("'+studioPhotoUrl+'")';$("#studioHero").classList.add("has-photo")}catch(e){console.error(e);alert("A kép feldolgozása nem sikerült.")}finally{busy(false)}
}
function canvasWrap(ctx,text,x,y,maxWidth,lineHeight,maxLines){
 const words=String(text||"").split(/\s+/);let line="",lines=0;
 for(let i=0;i<words.length;i++){const test=line?line+" "+words[i]:words[i];if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y);y+=lineHeight;lines++;line=words[i];if(maxLines&&lines>=maxLines)return y}else line=test}
 if(line&&(!maxLines||lines<maxLines)){ctx.fillText(line,x,y);y+=lineHeight}return y
}
async function studioCardBlob(d){
 const c=document.createElement("canvas");c.width=1200;c.height=1600;const x=c.getContext("2d");
 x.fillStyle="#f6f1e7";x.fillRect(0,0,c.width,c.height);
 if(studioPhotoBlob){
   const bm=await createImageBitmap(studioPhotoBlob,{imageOrientation:"from-image"}),box={x:0,y:0,w:1200,h:620},scale=Math.max(box.w/bm.width,box.h/bm.height),w=bm.width*scale,h=bm.height*scale;
   x.drawImage(bm,(1200-w)/2,(620-h)/2,w,h);bm.close();
   const g=x.createLinearGradient(0,430,0,620);g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,"rgba(0,0,0,.55)");x.fillStyle=g;x.fillRect(0,400,1200,220)
 }else{
   const g=x.createLinearGradient(0,0,1200,620);g.addColorStop(0,"#d6e2d8");g.addColorStop(1,"#e9dfcc");x.fillStyle=g;x.fillRect(0,0,1200,620);
   x.font="180px serif";x.textAlign="center";x.fillStyle="#254637";x.fillText(studioIcon(d.category,d.title),600,350);x.textAlign="left"
 }
 x.fillStyle=studioPhotoBlob?"#fff":"#254637";x.font="900 30px Arial";x.fillText("LÉNA RECEPTTÁR",70,500);
 x.font="700 62px Georgia";let ty=canvasWrap(x,d.title,70,565,1060,68,2);
 x.fillStyle="#173a2e";x.fillRect(0,620,1200,980);
 x.fillStyle="#f6f1e7";x.font="900 25px Arial";x.fillText((d.category||"RECEPT").toUpperCase()+"  ·  "+d.servings+"  ·  "+d.time,70,690);
 x.font="700 38px Georgia";x.fillText("Hozzávalók",70,760);x.fillText("Elkészítés",640,760);
 x.font="27px Arial";let y1=815;d.ingredients.slice(0,12).forEach(v=>{x.fillStyle="#f6f1e7";x.fillText("•",70,y1);y1=canvasWrap(x,v,105,y1,465,38,2)+6});
 let y2=815;d.steps.slice(0,7).forEach((v,i)=>{x.fillStyle="#f6f1e7";x.font="900 26px Arial";x.fillText(String(i+1)+".",640,y2);x.font="26px Arial";y2=canvasWrap(x,v,690,y2,440,36,3)+10});
 x.fillStyle="#c7d7ca";x.font="22px Arial";x.fillText("Olvasható recept is automatikusan mentve",70,1540);
 return await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("Kártyagenerálási hiba")),"image/jpeg",.92))
}
async function studioFinalize(){
 if(!studioDraft)return;const d=studioPullEditor();if(!d.title||!d.category||!d.ingredients.length||!d.steps.length){alert("A véglegesítéshez kell cím, kategória, hozzávaló és elkészítés.");return}
 busy(true,"Golden kártya készítése és mentés…");
 try{
   const blob=await studioCardBlob(d),id=newId(),central=$("#studioCentralSync").checked,readable={status:"verified",source:"studio_v1",ingredients:d.ingredients,steps:d.steps,notes:[d.servings+" · "+d.time+" · "+d.difficulty].concat(d.notes||[]),updatedAt:new Date().toISOString()};
   await dbPut({id,title:d.title,category:d.category,originalName:d.title+".jpg",blob,pending:central,createdAt:Date.now(),readable,studio:true});
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
   const fileName="user_"+id+".jpg";await putGithubFile("recepttar/recipes/"+fileName,await blobToBase64(row.blob),"Add recipe image: "+row.title);
   const data=await ghRequest("/contents/recepttar/data.js?ref="+GH_BRANCH),txt=decode64(data.content),rm=txt.match(/window\.LENA_RECIPES\s*=\s*(\[[\s\S]*?\]);/),cm=txt.match(/window\.LENA_CATEGORIES\s*=\s*(\[[\s\S]*?\]);/);
   if(!rm||!cm)throw new Error("A data.js formátuma nem olvasható.");const rs=JSON.parse(rm[1]),cs=JSON.parse(cm[1]);const existing=rs.find(x=>x.id===id);
   if(existing){existing.title=row.title;existing.category=row.category;existing.file="recipes/"+fileName;existing.mime="image/jpeg"}else rs.push({id,title:row.title,category:row.category,file:"recipes/"+fileName,mime:"image/jpeg",originalName:row.originalName||row.title+".jpg"});
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
$("#studioGenerate").onclick=studioGenerate;
$("#studioRefine").onclick=studioRefine;
$("#studioRegenerateCard").onclick=()=>{studioPullEditor();renderStudioPreview();toast("Kártya előnézet frissítve.")};
$("#studioFinalize").onclick=studioFinalize;
$("#studioChoosePhoto").onclick=()=>$("#studioPhotoInput").click();
$("#studioPhotoInput").onchange=e=>studioHandlePhoto(e.target.files&&e.target.files[0]);
["#studioTitle","#studioCategory","#studioServings","#studioTime","#studioIngredients","#studioSteps","#studioNotes"].forEach(s=>$(s).addEventListener("input",()=>{if(studioDraft)renderStudioPreview()}));
$("#favBtn").onclick=()=>{if(!currentId)return;setFav(currentId,!isFav(currentId));$("#favBtn").textContent=isFav(currentId)?"★":"☆"};$("#originalMode").onclick=()=>setMode("original");$("#readableMode").onclick=()=>setMode("readable");$("#editReadable").onclick=editText;$("#saveRecipe").onclick=saveEdit;$("#deleteRecipe").onclick=deleteCurrent;$("#resetRecipe").onclick=resetCurrent;
$("#saveText").onclick=()=>{if(!currentId)return;setText(currentId,$("#textEditor").value);$("#textDialog").close();const t=getText(currentId);$("#readableText").textContent=t;$("#readableMode").hidden=!t;if(t){setMode("readable");toast("Javított receptszöveg elmentve.")}else{setMode("original");toast("Olvasható szöveg törölve.")}};
window.addEventListener("popstate",e=>{const st=e.state;if(st&&st.view==="recipe"&&st.id){openRecipe(st.id,false);return}showHome(false)});
(async()=>{migrateCanonicalBaseState();await loadCustomRecipes();history.replaceState({view:"home"},"","#home");renderHome();void 0})().catch(e=>{console.error(e);renderHome()});