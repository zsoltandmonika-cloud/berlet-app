/* Direct navigation only. The legacy personal media browser is deliberately not loaded. */
(function(w,d){
'use strict';
function updateTileArt(){
 var names={homecinema:'sho-tile-homecinema-v2.webp',photos:'sho-tile-photos-v2.webp',
  videos:'sho-tile-homevideos-approved-v3.webp',music:'sho-tile-music-v2.webp'};
 for(let slug in names){
  let tile=d.querySelector(slug==='homecinema'?'.tile.cinema':'.tile[data-library="'+slug+'"]');
  if(!tile)continue;
  let link=new URL('./assets/'+names[slug],d.baseURI).href;
  var art=new Image();
  art.onload=function(){
   tile.style.setProperty('--image','url("'+link.replace(/"/g,'%22')+'")');
   if(slug==='videos')tile.classList.add('tile-art-baked-v4');
  };
  art.src=link;
 }
}

updateTileArt();
const button=d.getElementById('mediaFullScreen');
if(button)button.onclick=async function(){
 try{
  const surface=d.querySelector('.page');
  if(d.fullscreenElement){if(d.exitFullscreen)await d.exitFullscreen();return;}
  if(surface&&surface.requestFullscreen)await surface.requestFullscreen();
  if(w.screen.orientation&&w.screen.orientation.lock)await w.screen.orientation.lock('landscape').catch(function(){});
 }catch(_){/* Native navigation stays available on browsers without fullscreen. */}
};
})(window,document);
