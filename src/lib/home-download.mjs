export function homeDownload(headers,downloads={}){
 const hint=(headers.get('sec-ch-ua-platform')||'').replaceAll('"',''),agent=headers.get('user-agent')||'',system=hint||agent;
 const mobile=/android|ios|mobile|iphone|ipad|ipod/i.test(hint+' '+agent);
 const platform=mobile?null:/windows/i.test(system)?'windows':/macos|macintosh|mac os x/i.test(system)?'macos':null;
 const name=platform==='macos'?'macOS':platform==='windows'?'Windows':'';
 const url=platform?downloads?.[platform]?.url:'';
 return {platform,name,available:Boolean(url),href:url||(platform?'/downloads#download-'+platform:'/downloads')};
}
