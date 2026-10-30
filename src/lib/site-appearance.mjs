export const appearanceStorageKey='spaceyew-appearance';
export function appearancePreference(value){return ['light','dark','system'].includes(value)?value:'system'}
export function resolvedAppearance(preference,systemDark){return appearancePreference(preference)==='system'?(systemDark?'dark':'light'):preference}

// Runs in the document head, before the first painted surface. The request CSP
// nonce is attached by RootLayout; storage being unavailable must not block it.
export const appearanceInitScript=`(()=>{let p='system';try{p=localStorage.getItem('${appearanceStorageKey}')||p}catch{}if(!['light','dark','system'].includes(p))p='system';const d=p==='dark'||p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.colorPreference=p;document.documentElement.dataset.colorMode=d?'dark':'light'})()`;
