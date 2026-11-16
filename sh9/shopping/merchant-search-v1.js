/* SHO Merchant Search v1 · official store result pages or labeled site:-search fallback.
   No guessed SKU, price, availability, checkout, or hidden scraping. */
(function(w){'use strict';
function url(key,store,term){
 const q=String(term||'').trim().slice(0,160),x=encodeURIComponent(q);
 switch(key){
  case 'tesco':return 'https://bevasarlas.tesco.hu/shop/hu-HU/search?query='+x;
  case 'auchan':return 'https://auchan.hu/shop/search?q%5B%5D='+encodeURIComponent(x);
  case 'kifli':return 'https://www.kifli.hu/kereses?q='+x+'&companyId=1';
  case 'dm':return 'https://www.dm.hu/search?query='+x+'&searchType=product';
  case 'rossmann':return 'https://shop.rossmann.hu/talalatok?q='+x;
  case 'emag':return 'https://www.emag.hu/search/'+x;
  case 'alza':return 'https://www.alza.hu/search.htm?exps='+x;
  case 'allegro':return 'https://allegro.hu/kereses?string='+x;
  case 'temu':return 'https://www.temu.com/hu/search_result.html?search_key='+x;
  case 'shein':return 'https://hu.shein.com/pdsearch/'+x+'/';
 }
 if(!store||!/^[a-z0-9.-]+$/.test(store.domain||''))return '';
 return 'https://www.google.com/search?q='+encodeURIComponent('site:'+store.domain+' '+q);
}
function native(key){return ['tesco','auchan','kifli','dm','rossmann','emag','alza','allegro','temu','shein'].includes(key)}
w.SHOP_MERCHANT_SEARCH_V1=Object.freeze({url,native});
})(window);