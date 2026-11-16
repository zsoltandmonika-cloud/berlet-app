/* SHO merchant brand assets v2. ALDI & Allegro use user-supplied optimized local icons.
   Images are display-only, not proof of retailer offers or endorsement. */
(function(w){'use strict';
const registry=Object.freeze({
 tesco:{url:'https://www.google.com/s2/favicons?domain=tesco.com&sz=128',label:'Tesco logó'},
 aldi:{url:'./assets/aldi-shop-logo-v1.svg',label:'ALDI logó'},
 allegro:{url:'./assets/allegro-shop-logo-v1.svg',label:'Allegro narancssárga táska logó'},
 shein:{url:'https://img.iconpusher.com/com.zzkko/14.9.4.png',label:'SHEIN arculati ikon'}
});
function byKey(key,domain){
 const special=registry[String(key||'').toLowerCase()];
 return special||{url:'https://www.google.com/s2/favicons?domain='+encodeURIComponent(String(domain||''))+'&sz=128',label:String(key||'Áruház')+' ikon'};
}
w.SHOP_MERCHANT_BRAND_ICONS_V1=Object.freeze({byKey});
})(window);
