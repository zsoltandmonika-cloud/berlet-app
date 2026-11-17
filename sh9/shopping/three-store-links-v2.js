/* SHO 3 Store Search Bridge V2 · URL contract.
 * Only verified Tesco/Auchan native search pages and official SPAR/Wolt venue list.
 * This module NEVER quotes merchant prices, checks inventory or moves goods to carts.
 */
(function(root){
 'use strict';
 const SPAR_URL='https://wolt.com/hu/hun/budapest/brand/spar';
 const allowed=Object.freeze(['tesco','auchan','spar']);
 const normalizeQuery=input=>String(input||'').trim().replace(/\s+/g,' ').slice(0,140);
 // A merchant SEARCH needs category/product words, not a complete catalogue
 // sentence. 1 l, 1.5% or 1 kg remain visible in the SHO input and MUST be
 // checked again on the store page. Do not silently select an alleged match.
 function browseTerms(raw){
  const term=normalizeQuery(raw);
  const reduced=term
   .replace(/(?:^|\s)\d+(?:[.,]\d+)?\s*%(?=\s|$)/g,' ')
   .replace(/(?:^|\s)\d+(?:[.,]\d+)?\s*(?:kg|g|ml|cl|l|liter)(?=\s|$)/gi,' ')
   .replace(/\s+/g,' ').trim();
  return reduced.length>=3?reduced:term;
 }
 const SPAR_INDEX='site:wolt.com/hu/hun/budapest/venue/spar';
 function destination(store,raw){
  const term=normalizeQuery(raw);
  if(!allowed.includes(store)||term.length<2)return '';
  if(store==='tesco')return 'https://bevasarlas.tesco.hu/shop/hu-HU/search?query='+encodeURIComponent(term);
  const keywords=browseTerms(term);
  if(store==='spar'){
   // No verified Wolt deeplink that transfers a product into a SPAR venue.
   // A clearly labelled public WEB search returns indexed Wolt SPAR product
   // pages; the user must confirm the shop, current stock and price on Wolt.
   return 'https://www.google.com/search?q='+encodeURIComponent(SPAR_INDEX+' '+keywords);
  }
  // Keep the user's confirmed Auchan bracket-array URL and its double
  // encoding, but avoid over-constraining the text with size/fat percentages.
  return 'https://auchan.hu/shop/search?q%5B%5D='+encodeURIComponent(encodeURIComponent(keywords));
 }
 const stores=Object.freeze([
  Object.freeze({key:'tesco',name:'Tesco',type:'native',domain:'bevasarlas.tesco.hu',note:'Teljes Tesco találati lista · termék- és árkiválasztás a bolt oldalán'}),
  Object.freeze({key:'auchan',name:'Auchan',type:'native',domain:'auchan.hu',note:'Szélesebb áruházi keresés · ellenőrizd a kiszerelést és az összetételt'}),
  Object.freeze({key:'spar',name:'SPAR / INTERSPAR',type:'indexed',domain:'wolt.com',note:'Google webes találatok, kizárólag Wolt SPAR-oldalakból · nem élő bolti kereső'})
 ]);
 const api=Object.freeze({normalizeQuery,browseTerms,destination,stores,SPAR_URL});
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.SHOP_THREE_STORE_LINKS_V2=api;
})(typeof window!=='undefined'?window:null);
