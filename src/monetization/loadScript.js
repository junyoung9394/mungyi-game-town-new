export function loadScript(host, id, url) {
  const existing=host.document.getElementById(id);
  if(existing?.dataset.loaded==='true')return Promise.resolve();
  return new Promise((resolve,reject)=>{
    const script=existing||host.document.createElement('script');
    const cleanup=()=>{clearTimeout(timer);script.removeEventListener('load',loaded);script.removeEventListener('error',failed);};
    const loaded=()=>{script.dataset.loaded='true';cleanup();resolve();};
    const failed=()=>{cleanup();script.remove();reject(new Error('script_unavailable'));};
    const timer=setTimeout(failed,10000);
    script.addEventListener('load',loaded,{once:true});script.addEventListener('error',failed,{once:true});
    if(!existing){script.id=id;script.src=url;script.async=true;host.document.head.append(script);}
  });
}
