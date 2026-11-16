/* SHO merchant brand assets v1. Official storefront/favicon or existing HH app-icon asset.
   These are display-only images, never proof of retailer availability or endorsement. */
(function(w){'use strict';
const registry=Object.freeze({
 tesco:{url:'https://www.google.com/s2/favicons?domain=tesco.com&sz=128',label:'Tesco logó'},
 aldi:{url:'https://www.google.com/s2/favicons?domain=aldi.hu&sz=128',label:'ALDI Magyarország (ALDI SÜD) logó'},
 shein:{url:'https://img.iconpusher.com/com.zzkko/14.9.4.png',label:'SHEIN arculati ikon'}
});
function byKey(key,domain){
 const special=registry[String(key||'').toLowerCase()];
 return special||{url:'https://www.google.com/s2/favicons?domain='+encodeURIComponent(String(domain||''))+'&sz=128',label:String(key||'Áruház')+' ikon'};
}
w.SHOP_MERCHANT_BRAND_ICONS_V1=Object.freeze({byKey});
})(window);
