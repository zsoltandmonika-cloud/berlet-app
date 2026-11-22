/* SHO TV-re floating button temporarily disabled globally.
 * Keep this compatibility stub for stale module loaders only.
 * It removes an already-mounted small TV shortcut; it never inserts one.
 * Full-size Media Center and other module content are unaffected.
 */
(function(w,d){
 'use strict';
 function moduleForPath(path){
  if(typeof path!=='string'||path.indexOf('/berlet-app/')!==0)return '';
  var p=path.slice('/berlet-app/'.length);
  if(p.indexOf('healthhub/guardian/')===0)return 'guard';
  if(p.indexOf('healthhub/')===0)return 'health';
  if(p.indexOf('sh9/entertainment/')===0)return 'media';
  if(p.indexOf('sh9/smart-travel/')===0)return 'travel';
  if(p.indexOf('sh9/shopping/')===0)return 'shop';
  if(p.indexOf('sh9/sport/')===0)return 'sports';
  if(p.indexOf('sh9/family-hub/')===0)return 'guard';
  if(p.indexOf('sh9/')===0||p==='sh9')return 'home';
  return '';
 }
 function remove(){
  var el=d.getElementById&&d.getElementById('shoTvShortcutV1');
  if(el&&el.parentNode&&el.parentNode.removeChild)el.parentNode.removeChild(el);
 }
 if(d.readyState==='loading'&&d.addEventListener)d.addEventListener('DOMContentLoaded',remove,{once:true});else remove();
 if(w.addEventListener)w.addEventListener('pageshow',remove);
 w.SHO_TV_SHORTCUT_V1=Object.freeze({moduleForPath:moduleForPath,mount:remove,disabled:true});
})(window,document);
