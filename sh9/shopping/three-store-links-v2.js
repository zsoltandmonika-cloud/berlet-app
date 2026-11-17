/* SHO 3 Store Search Bridge V2 · URL contract.
 * Only verified Tesco/Auchan native search pages and official SPAR/Wolt venue list.
 * This module NEVER quotes merchant prices, checks inventory or moves goods to carts.
 */
(function(root){
 'use strict';
 const SPAR_URL='https://wolt.com/hu/hun/budapest/brand/spar';
 const allowed=Object.freeze(['tesco','auchan','spar']);
 const normalizeQuery=input=>String(input||'').trim().replace(/\s+/g,' ').slice(0,140);
 function destination(store,raw){
  const term=normalizeQuery(raw),enc=encodeURIComponent(term);
  if(!allowed.includes(store))return '';
  if(store==='spar')return SPAR_URL; // user chooses a specific SPAR/INTERSPAR venue on Wolt
  if(term.length<2)return '';
  if(store==='tesco')return 'https://bevasarlas.tesco.hu/shop/hu-HU/search?query='+enc;
  // Auchan uses a double-encoded bracket-array query string, tested in user's browser.
  return 'https://auchan.hu/shop/search?q%5B%5D='+encodeURIComponent(enc);
 }
 const stores=Object.freeze([
  Object.freeze({key:'tesco',name:'Tesco',type:'native',domain:'bevasarlas.tesco.hu',note:'Teljes Tesco találati lista · termék- és árkiválasztás a bolt oldalán'}),
  Object.freeze({key:'auchan',name:'Auchan',type:'native',domain:'auchan.hu',note:'Teljes Auchan találati lista · nem választunk ki önkényesen egy SKU-t'}),
  Object.freeze({key:'spar',name:'SPAR / INTERSPAR',type:'venue',domain:'wolt.com',note:'SPAR a Wolton · előbb válassz áruházat, utána keresd a terméket'})
 ]);
 const api=Object.freeze({normalizeQuery,destination,stores,SPAR_URL});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SHOP_THREE_STORE_LINKS_V2=api;
})(typeof window!=='undefined'?window:null);
