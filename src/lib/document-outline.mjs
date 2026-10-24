export function documentOutline(html=''){
 const headings=[];
 const body=String(html).replace(/<h([234])(?:\s[^>]*)?>([\s\S]*?)<\/h\1>/gi,(_,level,content)=>{const id='doc-section-'+headings.length;const text=content.replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&nbsp;/g,' ');headings.push({id,text,level:Number(level)});return `<h${level} id="${id}">${content}</h${level}>`});
 return {body,headings};
}
