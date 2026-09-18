const baseRecipes = window.LENA_RECIPES || [];
const baseCategories = window.LENA_CATEGORIES || [];
const $ = s => document.querySelector(s);
let activeCategory="Mind", favoritesOnly=false, currentId=null;

function keyFav(id){return "lena21:fav:"+id}
function keyText(id){return "lena21:text:"+id}
function keyMeta(id){return "lena22:meta:"+id}
function isFav(id){return localStorage.getItem(keyFav(id))==="1"}
function setFav(id,v){localStorage.setItem(keyFav(id),v?"1":"0")}
function getText(id){return localStorage.getItem(keyText(id))||""}
function setText(id,t){if(t.trim())localStorage.setItem(keyText(id),t.trim());else localStorage.removeItem(keyText(id))}
function getMeta(id){try{return JSON.parse(localStorage.getItem(keyMeta(id))||"{}")}catch(e){return {}}}
function setMeta(id,m){localStorage.setItem(keyMeta(id),JSON.stringify(m))}
function effective(r){const m=getMeta(r.id);return Object.assign({},r,{title:m.title||r.title,category:m.category||r.category,deleted:!!m.deleted})}
function getRecipe(id){const r=baseRecipes.find(x=>x.id===id);return r?effective(r):null}
function allRecipes(){return baseRecipes.map(effective)}
function norm(s){return (s||"").toLocaleLowerCase("hu").normalize("NFD").replace(/\p{Diacritic}/gu,"").replace(/\s+/g," ").trim()}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");clearTimeout(window.__tt);window.__tt=setTimeout(()=>e.classList.remove("show"),1800)}
function allCategories(){
 const s=new Set(baseCategories);
 allRecipes().forEach(r=>{if(r.category)s.add(r.category)});
 return Array.from(s).sort((a,b)=>a.localeCompare(b,"hu"));
}

function renderChips(){
 const c=$("#chips");c.innerHTML="";
 ["Mind"].concat(allCategories()).forEach(cat=>{
   const b=document.createElement("button");
   b.className="chip"+(activeCategory===cat?" active":"");
   b.textContent=cat;
   b.onclick=()=>{activeCategory=cat;renderHome()};
   c.appendChild(b);
 });
}
function visibleRecipes(){
 const q=norm($("#search").value);
 return allRecipes().filter(r=>{
   if(r.deleted)return false;
   if(activeCategory!=="Mind"&&r.category!==activeCategory)return false;
   if(favoritesOnly&&!isFav(r.id))return false;
   if(!q)return true;
   return norm(r.title+" "+r.category).includes(q);
 }).sort((a,b)=>a.title.localeCompare(b.title,"hu"));
}
function renderHome(){
 renderChips();
 const list=visibleRecipes();
 $("#count").textContent=list.length;
 $("#grid").innerHTML="";
 $("#favFilter").textContent=(favoritesOnly?"★ ":"☆ ")+"Kedvencek";
 list.forEach(r=>{
   const a=document.createElement("article");a.className="card";
   const media=document.createElement("div");media.className="card-media";
   if(r.mime==="application/pdf"){const d=document.createElement("div");d.className="pdf-tile";d.textContent="📄";media.appendChild(d)}
   else{const im=document.createElement("img");im.loading="lazy";im.src=r.file;im.alt=r.title;media.appendChild(im)}
   media.onclick=()=>openRecipe(r.id,true);
   const body=document.createElement("div");body.className="card-body";
   body.innerHTML='<h2 class="card-title"></h2><div class="card-sub"><span class="cat"></span><div class="card-actions"><button class="fav"></button><button class="open">⛶</button></div></div>';
   body.querySelector(".card-title").textContent=r.title;
   body.querySelector(".cat").textContent="📂 "+r.category;
   const fav=body.querySelector(".fav");
   fav.textContent=isFav(r.id)?"★":"☆";
   fav.onclick=()=>{setFav(r.id,!isFav(r.id));renderHome()};
   body.querySelector(".open").onclick=()=>openRecipe(r.id,true);
   a.append(media,body);$("#grid").appendChild(a);
 });
}
function showHome(push){
 currentId=null;$("#recipeView").hidden=true;$("#homeView").hidden=false;$("#topHome").hidden=false;
 if(push)history.pushState({view:"home"},"","#home");
 window.scrollTo({top:0,behavior:"instant"});renderHome();
}
function setMode(mode){
 const original=mode==="original";
 $("#originalPanel").hidden=!original;$("#readablePanel").hidden=original;
 $("#originalMode").classList.toggle("active",original);$("#readableMode").classList.toggle("active",!original);
}
function openRecipe(id,push){
 const r=getRecipe(id);if(!r||r.deleted){showHome(push);return}
 currentId=id;$("#homeView").hidden=true;$("#recipeView").hidden=false;$("#topHome").hidden=false;
 $("#recipeCategory").textContent=r.category;$("#recipeTitle").textContent=r.title;
 $("#favBtn").textContent=isFav(id)?"★":"☆";
 const txt=getText(id),readable=$("#readableMode");
 readable.hidden=!txt;$("#readableText").textContent=txt;
 if(r.mime==="application/pdf"){
   $("#recipeImage").hidden=true;$("#recipePdf").hidden=false;$("#recipePdf").src=r.file;
 }else{
   $("#recipePdf").hidden=true;$("#recipeImage").hidden=false;$("#recipeImage").src=r.file;$("#recipeImage").alt=r.title;
 }
 setMode("original");
 if(push)history.pushState({view:"recipe",id:id},"","#recipe="+encodeURIComponent(id));
 window.scrollTo({top:0,behavior:"instant"});
}
function askLena(){
 const r=currentId?getRecipe(currentId):null;
 const prefix=r?"Léna, ezt a receptet nézem: "+r.title+". ":"";
 navigator.clipboard?.writeText(prefix).catch(()=>{});
 window.open("https://chatgpt.com/","_blank","noopener");
 if(r)toast("A recept címe a vágólapra került.");
}
function editText(){
 if(!currentId)return;$("#textEditor").value=getText(currentId);$("#textDialog").showModal();
}
function fillCategoryList(){
 const d=$("#categoryList");d.innerHTML="";
 allCategories().forEach(c=>{const o=document.createElement("option");o.value=c;d.appendChild(o)});
}
function openEdit(){
 if(!currentId)return;
 const r=getRecipe(currentId);if(!r)return;
 fillCategoryList();$("#editTitle").value=r.title;$("#editCategory").value=r.category;$("#editDialog").showModal();
}
function saveEdit(){
 if(!currentId)return;
 const base=baseRecipes.find(x=>x.id===currentId);if(!base)return;
 const old=getMeta(currentId);
 const title=$("#editTitle").value.trim()||base.title;
 const category=$("#editCategory").value.trim()||base.category;
 setMeta(currentId,{title:title,category:category,deleted:!!old.deleted});
 $("#editDialog").close();openRecipe(currentId,false);toast("Recept adatai elmentve.");
}
function deleteCurrent(){
 if(!currentId)return;
 const r=getRecipe(currentId);if(!r)return;
 if(!confirm("Biztosan törlöd ezt a receptet?\n\n"+r.title+"\n\nA törlés visszaállítható."))return;
 const m=getMeta(currentId);m.deleted=true;setMeta(currentId,m);
 $("#editDialog").close();showHome(true);toast("Recept a kukába került.");
}
function resetCurrent(){
 if(!currentId)return;
 const m=getMeta(currentId);delete m.title;delete m.category;m.deleted=false;
 if(Object.keys(m).length)setMeta(currentId,m);else localStorage.removeItem(keyMeta(currentId));
 const r=getRecipe(currentId);$("#editTitle").value=r.title;$("#editCategory").value=r.category;
 toast("Alapadatok visszaállítva.");
}
function renderDeleted(){
 const box=$("#deletedList");box.innerHTML="";
 const del=allRecipes().filter(r=>r.deleted).sort((a,b)=>a.title.localeCompare(b.title,"hu"));
 if(!del.length){const e=document.createElement("div");e.className="empty-admin";e.textContent="A kuka üres.";box.appendChild(e);return}
 del.forEach(r=>{
   const row=document.createElement("div");row.className="deleted-item";
   const main=document.createElement("div");main.className="deleted-main";
   const t=document.createElement("div");t.className="deleted-title";t.textContent=r.title;
   const c=document.createElement("div");c.className="deleted-cat";c.textContent=r.category;
   main.append(t,c);
   const b=document.createElement("button");b.className="restore-btn";b.textContent="↩ Vissza";
   b.onclick=()=>{const m=getMeta(r.id);m.deleted=false;setMeta(r.id,m);renderDeleted();renderHome();toast("Recept visszaállítva.")};
   row.append(main,b);box.appendChild(row);
 });
}
function openAdmin(){renderDeleted();$("#adminDialog").showModal()}

$("#search").oninput=renderHome;
$("#clearSearch").onclick=()=>{$("#search").value="";renderHome()};
$("#favFilter").onclick=()=>{favoritesOnly=!favoritesOnly;renderHome()};
$("#topHome").onclick=()=>showHome(true);
$("#homeBtn").onclick=()=>showHome(true);
$("#backBtn").onclick=()=>history.back();
$("#editBtn").onclick=openEdit;
$("#navHome").onclick=()=>showHome(true);
$("#navFav").onclick=()=>{favoritesOnly=true;showHome(true)};
$("#navAdmin").onclick=openAdmin;
$("#navAsk").onclick=askLena;
$("#closeAdmin").onclick=()=>$("#adminDialog").close();
$("#favBtn").onclick=()=>{if(!currentId)return;setFav(currentId,!isFav(currentId));$("#favBtn").textContent=isFav(currentId)?"★":"☆"};
$("#originalMode").onclick=()=>setMode("original");
$("#readableMode").onclick=()=>setMode("readable");
$("#editReadable").onclick=editText;
$("#saveRecipe").onclick=saveEdit;
$("#deleteRecipe").onclick=deleteCurrent;
$("#resetRecipe").onclick=resetCurrent;
$("#saveText").onclick=()=>{
 if(!currentId)return;setText(currentId,$("#textEditor").value);$("#textDialog").close();
 const t=getText(currentId);$("#readableText").textContent=t;$("#readableMode").hidden=!t;
 if(t){setMode("readable");toast("Javított receptszöveg elmentve.")}else{setMode("original");toast("Olvasható szöveg törölve.")}
};
window.addEventListener("popstate",e=>{
 const st=e.state;
 if(st&&st.view==="recipe"&&st.id){openRecipe(st.id,false);return}
 showHome(false);
});
history.replaceState({view:"home"},"","#home");
renderHome();
if("serviceWorker" in navigator&&location.protocol.startsWith("http")){
 navigator.serviceWorker.register("./sw.js?v=22").catch(()=>{});
}
