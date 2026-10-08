// Queue schema creation before any feature opens the cache on a new browser.
// Existing v1 data is left untouched; this is a cache, not another cloud authority.
(function () {
  'use strict';
  const request = indexedDB.open('healthhub-healthradar-v2', 1);
  request.onupgradeneeded = function () {
    const db = request.result;
    const stores = {meta:'key',profiles:'profile',documents:'id',documentBlobs:'id',measurements:'id',appointments:'id'};
    Object.entries(stores).forEach(([name,keyPath]) => {
      if (db.objectStoreNames.contains(name)) return;
      const store = db.createObjectStore(name,{keyPath});
      if (['documents','measurements','appointments'].includes(name)) store.createIndex('profile','profile',{unique:false});
    });
  };
  request.onsuccess = () => request.result.close();
  request.onerror = () => console.error('HealthHub gyorsítótár nem nyitható meg.',request.error);
})();
