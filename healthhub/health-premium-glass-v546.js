/* HealthHub v546 - health profile-only visual theme switch */
(function(root){'use strict';var p=new URLSearchParams(root.location.search);if(p.get('hhhealthglass')==='0')return;
function sync(){var h=document.getElementById('health');if(!h)return;document.documentElement.dataset.hhHealthGlass='on';document.documentElement.dataset.hhHealthProfile=(localStorage.getItem('hh-profile')==='m'?'m':'z')}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
root.addEventListener('storage',function(e){if(e.key==='hh-profile')sync()});document.addEventListener('hh:profile-changed',sync);document.addEventListener('healthhub:profile-changed',sync);
})(window);