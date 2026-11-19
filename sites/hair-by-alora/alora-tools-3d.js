(() => {
  const hero = document.querySelector('.hero--alora');
  const media = hero?.querySelector('.hero__media');
  if (!hero || !media || matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(max-width:679px)').matches) return;
  import('./vendor/three.module.js').then(async THREE => {
    const gltf = await new Promise((resolve,reject)=>new THREE.GLTFLoader ? reject(new Error('loader unavailable')) : reject(new Error('loader unavailable')));
  }).catch(()=>{});
})();
