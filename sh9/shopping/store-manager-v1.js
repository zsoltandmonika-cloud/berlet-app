/* SHO Store Control v1 · toggles and additions always go through family RLS. */
(function(w,d){'use strict';
const reg=w.SHOP_STORE_REGISTRY_V1,$=id=>d.getElementById(id);
const state=$('stateMessage'),rows=$('storeRows'),count=$('storeCount');
let data=[],busy=false,online=false;
function msg(text){state.textContent=text}
function tag(name,cls,content){const e=d.createElement(name);if(cls)e.className=cls;if(content!==undefined)e.textContent=content;return e}
function render(){
 rows.replaceChildren();
 count.textContent='· '+data.filter(x=>x.enabled).length+'/'+data.length;
 for(const shop of data){
  const row=tag('article','store-row');
  const info=tag('div');info.append(tag('strong',null,shop.name),tag('small',null,shop.domain+' · '+shop.cats.join(', ')));
  const button=tag('button',null,shop.enabled?'✓ Aktív':'Kikapcsolva');
  button.type='button';button.setAttribute('aria-pressed',String(shop.enabled));
  button.disabled=busy||!online;
  button.setAttribute('aria-label',shop.name+(shop.enabled?' kikapcsolása':' bekapcsolása'));
  button.addEventListener('click',async()=>{
   if(busy)return;busy=true;button.disabled=true;
   try{data=await reg.save({...shop,store_key:shop.key,store_name:shop.name,store_url:shop.url,categories:shop.cats,enabled:!shop.enabled});
     msg('☁️ '+shop.name+' beállítása mentve a családi felhőbe.');
   }catch(e){msg('Nem sikerült menteni: '+String(e.message||e))}
   finally{busy=false;render()}
  });
  row.append(info,button);rows.append(row);
 }
 $('addStore').disabled=busy||!online;
}
async function load(){
 data=reg.current();render();msg('📱 Helyi áruházlista látható. Felhőszinkron ellenőrzése…');
 try{data=await reg.sync();online=true;msg('☁️ Családi áruházlista friss. Az új beállítások mindkét profilhoz mentődnek.')}
 catch(e){online=false;msg('📱 Helyi másolat · módosításhoz bejelentkezés és internet kell. '+String(e.message||e))}
 render();
}
$('newStore').addEventListener('submit',async e=>{
 e.preventDefault();if(busy||!online)return;
 const name=$('newName').value,url=$('newUrl').value;
 const cats=[...$('newCats').querySelectorAll('input:checked')].map(x=>x.value);
 try{
  const shop=reg.fromInput(name,url,cats);
  if(data.some(x=>x.domain===shop.domain))throw Error('Ez az áruház már szerepel. Kapcsold be a listában!');
  busy=true;render();
  data=await reg.save(shop);
  $('newStore').reset();
  msg('✅ '+shop.store_name+' bekerült a közös Smart Shopping áruházai közé.');
 }catch(err){msg('Nem sikerült hozzáadni: '+String(err.message||err))}
 finally{busy=false;render()}
});
void load();
})(window,document);