
const recipes = window.LENA_RECIPES || [];
const categories = window.LENA_CATEGORIES || [];
const $ = s => document.querySelector(s);
let activeCategory="Mind", favoritesOnly=false, currentId=null;

function keyFav(id){return "lena21:fav:"+id}
function keyText(id){return "lena21:text:"+id}
function isFav(id){return localStorage.getItem(keyFav(id))==="1"}
function setFav(id,v){localStorage.setItem(keyFav(id),v?"1":"0")}
function getText(id){return localStorage.getItem(keyText(id))||""}
function setText(id,t){ if(t.trim()) localStorage.setItem(keyText(id),t.trim()); else localStorage.removeItem(keyText(id));}
function norm(s){return (s||"").toLocaleLowerCase("hu").normalize("NFD").replace(/\p{Diacritic}/gu,"").replace(/\s+/g," ").trim()}
function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");clearTimeout(window.__tt);window.__tt=setTimeout(()=>e.classList.remove("show"),1800)}

function renderChips(){
 const c=$("#chips"); c.innerHTML="";
 ["Mind",...categories].forEach(cat=>{
   const b=document.createElement("button");b.className="chip"+(activeCategory===cat?" active":"");b.textContent=cat;
   b.onclick=()=>{activeCategory=cat;renderHome()};c.appendChild(b);
 });
}
function visibleRecipes(){
 const q=norm($("#search").value);
 return recipes.filter(r=>{
   if(activeCategory!=="Mind"&&r.category!==activeCategory)return false;
   if(favoritesOnly&&!isFav(r.id))return false;
   if(!q)return true;
   return norm(r.title+" "+r.category).includes(q);
 }).sort((a,b)=>a.title.localeCompare(b.title,"hu"));
}
function renderHome(){
 renderChips();
 const list=visibleRecipes();$("#count").textContent=list.length;$("#grid").innerHTML="";
 $("#favFilter").textContent=(favoritesOnly?"★ ":"☆ ")+"Kedvencek";
 list.forEach(r=>{
   const a=document.createElement("article");a.className="card";
   const media=document.createElement("div");media.className="card-media";
   if(r.mime==="application/pdf"){const d=document.createElement("div");d.className="pdf-tile";d.textContent="📄";media.appendChild(d);}
   else{const im=document.createElement("img");im.loading="lazy";im.src=r.file;im.alt=r.title;media.appendChild(im);}
   media.onclick=()=>openRecipe(r.id,true);
   const body=document.createElement("div");body.className="card-body";
   body.innerHTML='<h2 class="card-title"></h2><div class="card-sub"><span class="cat"></span><div class="card-actions"><button class="fav"></button><button class="open">⛶</button></div></div>';
   body.querySelector(".card-title").textContent=r.title;body.querySelector(".cat").textContent="📂 "+r.category;
   const fav=body.querySelector(".fav");fav.textContent=isFav(r.id)?"★":"☆";fav.onclick=()=>{setFav(r.id,!isFav(r.id));renderHome()};
   body.querySelector(".open").onclick=()=>openRecipe(r.id,true);
   a.append(media,body);$("#grid").appendChild(a);
 });
}
function showHome(push=false){
 currentId=null;$("#recipeView").hidden=true;$("#homeView").hidden=false;$("#topHome").hidden=false;
 if(push) history.pushState({view:"home"},"","#home");
 window.scrollTo({top:0,behavior:"instant"});renderHome();
}
function setMode(mode){
 const original=mode==="original";
 $("#originalPanel").hidden=!original;$("#readablePanel").hidden=original;
 $("#originalMode").classList.toggle("active",original);$("#readableMode").classList.toggle("active",!original);
}
function openRecipe(id,push){
 const r=recipes.find(x=>x.id===id);if(!r)return;
 currentId=id;$("#homeView").hidden=true;$("#recipeView").hidden=false;$("#topHome").hidden=false;
 $("#recipeCategory").textContent=r.category;$("#recipeTitle").textContent=r.title;
 $("#favBtn").textContent=isFav(id)?"★":"☆";
 const txt=getText(id), readable=$("#readableMode");
 readable.hidden=!txt;
 $("#readableText").textContent=txt;
 if(r.mime==="application/pdf"){
   $("#recipeImage").hidden=true;$("#recipePdf").hidden=false;$("#recipePdf").src=r.file;
 }else{
   $("#recipePdf").hidden=true;$("#recipeImage").hidden=false;$("#recipeImage").src=r.file;$("#recipeImage").alt=r.title;
 }
 setMode("original"); // Original card is ALWAYS the safe/default view.
 if(push)history.pushState({view:"recipe",id},"","#recipe="+encodeURIComponent(id));
 window.scrollTo({top:0,behavior:"instant"});
}
function askLena(){
 const r=currentId?recipes.find(x=>x.id===currentId):null;
 const prefix=r?`Léna, ezt a receptet nézem: ${r.title}. `:"";
 navigator.clipboard?.writeText(prefix).catch(()=>{});
 window.open("https://chatgpt.com/","_blank","noopener");
 if(r)toast("A recept címe a vágólapra került.");
}
function editText(){
 if(!currentId)return;$("#textEditor").value=getText(currentId);$("#textDialog").showModal();
}

$("#search").oninput=renderHome;
$("#clearSearch").onclick=()=>{$("#search").value="";renderHome()};
$("#favFilter").onclick=()=>{favoritesOnly=!favoritesOnly;renderHome()};
$("#topHome").onclick=()=>showHome(true);
$("#homeBtn").onclick=()=>showHome(true);
$("#backBtn").onclick=()=>history.back();
$("#navHome").onclick=()=>showHome(true);
$("#navFav").onclick=()=>{favoritesOnly=true;showHome(true)};
$("#navAsk").onclick=askLena;
$("#favBtn").onclick=()=>{if(!currentId)return;setFav(currentId,!isFav(currentId));$("#favBtn").textContent=isFav(currentId)?"★":"☆"};
$("#originalMode").onclick=()=>setMode("original");
$("#readableMode").onclick=()=>setMode("readable");
$("#editReadable").onclick=editText;
$("#saveText").onclick=()=>{
 if(!currentId)return;setText(currentId,$("#textEditor").value);$("#textDialog").close();
 const t=getText(currentId);$("#readableText").textContent=t;$("#readableMode").hidden=!t;
 if(t){setMode("readable");toast("Javított receptszöveg elmentve.");} else {setMode("original");toast("Olvasható szöveg törölve.");}
};

window.addEventListener("popstate",e=>{
 const st=e.state;
 if(st?.view==="recipe"&&st.id){openRecipe(st.id,false);return}
 showHome(false);
});

// Initial state ensures first Back from a recipe returns home instead of closing the app.
history.replaceState({view:"home"},"","#home");
renderHome();

if("serviceWorker" in navigator && location.protocol.startsWith("http")){
 navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
