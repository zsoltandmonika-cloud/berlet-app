'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('sh9/entertainment/book-studio/index.html');
const js=read('sh9/entertainment/book-studio/book-studio-wood-shelf-v10.js');
const drive=read('sh9/entertainment/book-studio/onedrive-books-v2.js');
const css=read('sh9/entertainment/book-studio/book-studio-library-manage-v13.css');
test('Book Studio exposes accessible management view inside settings, without Graph delete permission',()=>{
 for(const id of ['bshelfMenuManage','bshelfManagePanel','bshelfManageCount','bshelfManageFilter','bshelfManageList'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/Könyvtár szerkesztése/);
 assert.match(html,/Végleges fájltörlést a OneDrive-ban|végleges fájltörlést a OneDrive-ban/i);
 assert.match(html,/book-studio-library-manage-v13\.css/);
 assert.match(css,/data-mode="manage"/);
 assert.doesNotMatch(drive,/Files\.ReadWrite|graph\.microsoft\.com.*DELETE/);
 assert.doesNotMatch(js,/method:\s*['"]DELETE['"]/);
 assert.match(drive,/web_url:item\.webUrl\|\|''/);
 assert.match(drive,/update\(ready\?source:\[\],config\?\.account\|\|'',pid\(\)\)/);
});
class Node{
 constructor(tag='div'){
  this.tagName=tag;this.children=[];this.dataset={};this.listeners={};this.style={setProperty(){}};
  this.hidden=false;this.textContent='';this.value='';this.attributes={};this.className='';
  const classes=new Set();
  this.classList={add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x)};
 }
 setAttribute(k,v){this.attributes[k]=String(v)}
 getAttribute(k){return this.attributes[k]}
 append(...nodes){for(const n of nodes){if(n?.tagName==='#fragment')this.append(...n.children);else this.children.push(n)}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes)}
 addEventListener(k,fn){this.listeners[k]=fn}
 dispatch(k,arg={}){this.listeners[k]?.(arg)}
 focus(){}
 scrollIntoView(){}
 querySelector(sel){
  const all=[...this.children];
  while(all.length){const node=all.shift();if(sel[0]==='.'&&node.className?.split(' ').includes(sel.slice(1)))return node;
   if(node.tagName===sel)return node;all.push(...node.children)}
  return null;
 }
 querySelectorAll(sel){const a=[];const stack=[...this.children];while(stack.length){
  const x=stack.shift();if(sel[0]==='.'&&x.className?.split(' ').includes(sel.slice(1)))a.push(x);stack.push(...x.children)}
  return a;
 }
 contains(n){return this===n||this.children.includes(n)}
}
function env(){
 const ids=['bshelfRows','bshelfSettingsToggle','bshelfFront','bsAdminView','bshelfSettingsMenu',
  'bshelfSearchToggle','bshelfSortToggle','bshelfSortMenu','bshelfSortTitle','bshelfSortTitleDesc',
  'bshelfSortAuthor','bshelfSortFavorites','bshelfSortReading','bshelfSortManual',
  'bshelfSearchBox','bshelfSearch','bshelfEmpty','bshelfStatus','bshelfCount',
  'bshelfAdminTitle','bshelfMenuOneDrive','bshelfMenuCovers','bshelfMenuUploads','bshelfMenuManage',
  'bshelfManagePanel','bshelfManageCount','bshelfManageList','bshelfManageFilter',
  'bshelfSearchClear','bshelfConnectAction','bshelfAdminBack','bookStudioSettings',
  'onedriveBooks','library','profileSwitch'];
 const nodes=new Map(ids.map(id=>[id,new Node()]));
 for(const id of ['bshelfSettingsMenu','bshelfSortMenu','bsAdminView','bshelfSearchBox','bshelfEmpty','bshelfManagePanel'])
  nodes.get(id).hidden=true;
 const connect=new Node('button');nodes.set('bshelfConnectAction',connect);
 nodes.get('bshelfEmpty').append(new Node('strong'),new Node('span'),connect);
 const storage=new Map(),localStorage={
  getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)
 };
 const d={getElementById:id=>nodes.get(id)||null,createElement:t=>new Node(t),
  createDocumentFragment:()=>new Node('#fragment'),addEventListener(){}};
 const w={localStorage,matchMedia:()=>({matches:false}),scrollTo(){},
  requestAnimationFrame:fn=>fn(),addEventListener(){},SH9_BOOK_STUDIO_V1:{openBook:async()=>{}}};
 vm.runInNewContext(js,{window:w,document:d,URL},{timeout:5000});
 return {api:w.SH9_BOOKSHELF_V10,nodes,storage};
}
test('Hide and restore books per Microsoft account and profile, without deleting originals',()=>{
 const {api,nodes,storage}=env();
 const books=['Trónok harca','Tüskevár','A Megmentő'].map((title,i)=>({
  source:'onedrive',id:'od_'+i,drive_item_id:'item'+i,title,author:'Szerző '+i,
  web_url:'https://onedrive.live.com/?id=item'+i
 }));
 api.setConnected(true);api.update(books,'example@outlook.com','monika');
 assert.equal(nodes.get('bshelfRows').children[0].children.length,3);
 nodes.get('bshelfMenuManage').dispatch('click');
 assert.equal(nodes.get('bsAdminView').hidden,false);
 assert.equal(nodes.get('bshelfManagePanel').hidden,false);
 const list=nodes.get('bshelfManageList');
 assert.equal(list.children.length,3);
 const target=list.children.find(row=>row.querySelector('strong').textContent==='Trónok harca');
 assert.ok(target);
 const hide=target.querySelector('.bshelf-hide-action');assert.ok(hide);
 hide.dispatch('click');
 assert.equal(nodes.get('bshelfRows').children[0].children.length,2);
 assert.match(nodes.get('bshelfManageCount').textContent,/2 a polcon · 1 elrejtve/);
 const scope='sh9-book-hidden-v13:example%40outlook.com:monika';
 assert.deepEqual(JSON.parse(storage.get(scope)),['item0']);
 const hiddenRow=nodes.get('bshelfManageList').children.find(row=>row.querySelector('strong').textContent==='Trónok harca');
 assert.equal(hiddenRow.querySelector('.bshelf-hide-action').textContent,'↩ Visszahelyezés');
 assert.equal(hiddenRow.querySelector('.bshelf-drive-link').href,'https://onedrive.live.com/?id=item0');
 // Changing accounts must NOT carry another profile's hidden selection.
 api.update(books,'other@outlook.com','zsolt');
 assert.equal(nodes.get('bshelfRows').children[0].children.length,3);
 // Returning to the original account restores its local shelf decision.
 api.update(books,'example@outlook.com','monika');
 assert.equal(nodes.get('bshelfRows').children[0].children.length,2);
 const restore=nodes.get('bshelfManageList').children.find(row=>row.querySelector('strong').textContent==='Trónok harca');
 restore.querySelector('.bshelf-hide-action').dispatch('click');
 assert.equal(nodes.get('bshelfRows').children[0].children.length,3);
 assert.deepEqual(JSON.parse(storage.get(scope)),[]);
});
test('No unsafe external destinations in OneDrive management, code parses',()=>{
 assert.match(js,/host==='onedrive\.live\.com'/);
 assert.match(js,/host\.endsWith\('\.sharepoint\.com'\)/);
 assert.match(js,/a\.rel='noopener noreferrer'/);
 assert.match(js,/state\.hidden\.add\(key\)/);
 assert.match(js,/state\.hidden\.delete\(key\)/);
 assert.match(js,/w\.localStorage\.setItem\(state\.scope/);
 assert.doesNotThrow(()=>new Function(js));
});


test('V17 reorder UI sorts titles/authors/favorites and saves a personal manual arrangement',()=>{
 const {api,nodes,storage}=env();
 const books=[
  {id:'od3',drive_item_id:'d3',title:'Tüskevár',author:'Fekete István',source:'onedrive',progress_percent:38,is_favorite:false},
  {id:'od1',drive_item_id:'d1',title:'A bankár',author:'Frei Tamás',source:'onedrive',progress_percent:0,is_favorite:true},
  {id:'od2',drive_item_id:'d2',title:'Az aranyláz',author:'Pierre Berton',source:'onedrive',progress_percent:0,is_favorite:false},
  {id:'od4',drive_item_id:'d4',title:'Végállomás',author:'Alex Kava',source:'onedrive',progress_percent:0,is_favorite:false}
 ];
 const titles=()=>nodes.get('bshelfRows').children.flatMap(row=>row.children).map(book=>book.title.split(' · ')[0]);
 api.setConnected(true);api.update(books,'example@outlook.com','monika');
 assert.deepEqual(titles(),['A bankár','Az aranyláz','Tüskevár','Végállomás']);
 nodes.get('bshelfSortToggle').dispatch('click');
 assert.equal(nodes.get('bshelfSortMenu').hidden,false);
 nodes.get('bshelfSortTitleDesc').dispatch('click');
 assert.deepEqual(titles(),['Végállomás','Tüskevár','Az aranyláz','A bankár']);
 nodes.get('bshelfSortToggle').dispatch('click');
 nodes.get('bshelfSortFavorites').dispatch('click');
 assert.equal(titles()[0],'A bankár');
 nodes.get('bshelfSortToggle').dispatch('click');
 nodes.get('bshelfSortReading').dispatch('click');
 assert.equal(titles()[0],'Tüskevár');
 nodes.get('bshelfMenuManage').dispatch('click');
 const rows=nodes.get('bshelfManageList');
 const row=rows.children.find(x=>x.querySelector('strong').textContent==='Tüskevár');
 assert.ok(row);
 const arrow=row.querySelectorAll('.bshelf-order-action')[1];
 assert.equal(arrow.textContent,'↓');
 arrow.dispatch('click');
 assert.equal(titles()[1],'Tüskevár','After moving down, a currently-reading book shifts one position');
 const key='sh9-book-sort-v17:example%40outlook.com:monika';
 assert.equal(JSON.parse(storage.get(key)).mode,'manual');
 assert.ok(JSON.parse(storage.get(key)).order.includes('d3'));
 // Simulate another profile, then return: the manual layout must reappear.
 api.update(books,'example@outlook.com','zsolt');
 assert.deepEqual(titles(),['A bankár','Az aranyláz','Tüskevár','Végállomás']);
 api.update(books,'example@outlook.com','monika');
 assert.equal(titles()[1],'Tüskevár');
 // New books added after manual order have a consistent place and remain movable.
 const added={id:'od5',drive_item_id:'d5',title:'Új könyv',author:'Új szerző',source:'onedrive'};
 api.update([...books,added],'example@outlook.com','monika');
 const newRow=nodes.get('bshelfManageList').children.find(x=>x.querySelector('strong').textContent==='Új könyv');
 assert.ok(newRow);
 newRow.querySelectorAll('.bshelf-order-action')[0].dispatch('click');
 assert.equal(JSON.parse(storage.get(key)).order.includes('d5'),true);
});
test('V17 sort settings are safe: the original OneDrive catalog is never reordered or overwritten',()=>{
 for(const id of ['bshelfSortToggle','bshelfSortMenu','bshelfSortTitle','bshelfSortTitleDesc',
  'bshelfSortAuthor','bshelfSortFavorites','bshelfSortReading','bshelfSortManual'])
  assert.ok(html.includes('id="'+id+'"'),id+' exists');
 assert.match(js,/function sortStorageKey\(hiddenScope\)/);
 assert.match(js,/function sortBooks\(books\)/);
 assert.match(js,/function moveBook\(book,direction\)/);
 assert.match(js,/function ensureManualOrder\(\)/);
 assert.match(js,/state\.sortMode='manual'/);
 assert.doesNotMatch(js,/DELETE|Files\.ReadWrite/);
});
