import {execFile} from 'node:child_process';
import path from 'node:path';
import {FILES,fileInfo,limited} from './db.mjs';
import {HttpError,requireValue,resumeData} from './content.mjs';
const headings=new Map([['个人简介','summary'],['个人简历','summary'],['简历','summary'],['Resume','summary'],['Résumé','summary'],['个人优势','summary'],['Profile','summary'],['Summary','summary'],['教育经历','education'],['教育背景','education'],['Education','education'],['专业技能','skills'],['技能专长','skills'],['Skills','skills'],['工作经验','work'],['工作经历','work'],['实习经历','work'],['经历与实践','work'],['开发与实习经历','work'],['实习与开发经历','work'],['Work Experience','work'],['项目经历','projects'],['项目实践','projects'],['代表项目','projects'],['Selected projects','projects'],['Projects','projects'],['开源贡献','opensource'],['社区代码贡献','opensource'],['Open Source','opensource'],['证书与荣誉','awards'],['荣誉奖项','awards'],['认证与荣誉','awards'],['Certifications','awards'],['Awards','awards'],['技术分享','speaking'],['技术写作','writing'],['技术写作与分享','writing'],['技术写作与社区分享','writing'],['Writing and community','writing'],['Certifications and recognition','awards'],['其他经历','activities']]);
export function privateResumeText(source){
 requireValue(typeof source==='string'&&source.trim().length>=20&&source.length<=150000,'请提供20至150000字的简历文字');
 return source.replace(/\r\n?/g,'\n').split('\n').filter(line=>!/(?:政治面貌|共青团员|中共党员|出生日期|出生年月|出生时间|生日|身份证|证件号|学号|手机号码|手机号|联系电话|电话号码|家庭住址|date of birth|\bDOB\b|\b(?:mobile|phone|gender|passport|national id)\s*[:：]|性别\s*[:：])/i.test(line)).map(line=>line.replace(/(?<!\d)\d{17}[\dXx](?!\d)/g,'').replace(/(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/g,'')).join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
export function parseResume(source){
 const text=privateResumeText(source),lines=text.split('\n').map(x=>x.trim()).filter(x=>x&&!/^--\s*\d+\s*of\s*\d+\s*--$/i.test(x)&&!/^PAGE\s+\d+$/i.test(x)&&!/^更新于\s*\d{4}[.\/-]\d{2}[.\/-]\d{2}\s*[·|]\s*\d+$/.test(x));let key='summary',blocks=new Map([['summary',[]]]),titles=new Map();
 for(const line of lines){const clean=line.replace(/^#{1,3}\s*/,'').replace(/[：:]$/,'').trim(),found=[...headings].find(([title])=>title.replace(/\s+/g,'').toLowerCase()===clean.replace(/\s+/g,'').toLowerCase());if(found){key=found[1];if(!blocks.has(key))blocks.set(key,[]);titles.set(key,found[0]);}else blocks.get(key).push(line)}
 const header=blocks.get('summary')||[],first=header.find(x=>/^[\p{L}· .-]{2,40}$/u.test(x)&&!headings.has(x)),name=first||'',email=text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]||'',githubMatch=text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[A-Za-z0-9_-]+\/?/i)?.[0]||'',github=githubMatch?(githubMatch.startsWith('http')?githubMatch:'https://'+githubMatch):'';
 const intro=header.filter(x=>x!==name&&!x.includes('@')&&!/https?:\/\/|github\.com\//i.test(x)).join('\n').slice(0,3000),skills=(blocks.get('skills')||[]).flatMap(x=>x.replace(/^[•●·-]\s*/,'').split(/[，,、;；|｜]/)).map(x=>x.trim()).filter(x=>x&&x.length<=60).slice(0,30),sections=[];
 for(const [id,content]of blocks){if(['summary','skills'].includes(id)||!content.length)continue;const title=content[0].length<=200?content[0].replace(/^[•●·-]\s*/,''):'',body=title?content.slice(1):content,chunks=[];for(const line of body){for(let start=0;start<line.length;start+=3900){const part=line.slice(start,start+3900);if(!chunks.length||chunks.at(-1).length+part.length+1>4000)chunks.push(part);else chunks[chunks.length-1]+='\n'+part}}requireValue(chunks.length<=20,'单个栏目内容过多，请精简后重试');sections.push({id,title:titles.get(id)||id,items:(chunks.length?chunks:['']).map((description,i)=>({title:i?'':title,description}))})}
 if(!sections.length&&intro)sections.push({id:'experience',title:'经历与作品',items:[{title:'简历内容',description:intro}]});
 const app=text.match(/(?:累计(?:独立)?(?:开发并)?(?:上架)?(?:应用)?\s*[:：]?\s*)?(\d+\+?)\s*款\s*(?:HarmonyOS|鸿蒙|原生|手机|PC|已上架|应用)/i),metrics=app?[{label:'累计上架应用',value:app[1],note:'来源：本次上传的简历，请核对统计口径。'}]:[];
 return {text,profile:{name,alias:'',intro,email,github,skills,resume:resumeData({updated:new Date().toISOString().slice(0,10),metrics,sections})},notices:['请核对姓名、经历、日期和数量；未明确的信息不会自动补写。','已尝试隐藏手机号和身份字段，请再次检查；原始文件不会自动公开。']};
}
// ponytail: bounded local extraction with heading rules; external OCR/AI can be added when configured.
let active=0;
export async function importResumeFile(id,actor){
 requireValue(typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id),'简历文件标识无效');const file=fileInfo(id);requireValue(file,'简历文件不存在',404);requireValue(file.size>0&&file.size<=8*1024*1024,'简历文件请控制在8MB以内');
 const format=path.extname(file.name).slice(1).toLowerCase();requireValue(['pdf','docx','txt','md'].includes(format),'支持 PDF、DOCX、TXT 或 Markdown 简历');requireValue(format!=='pdf'||file.mime==='application/pdf','请选择有效的 PDF 文件');
 requireValue(!limited('resume-import:'+actor.id,20,3600000),'导入次数过多，请稍后再试',429);requireValue(active<2,'正在处理其他简历，请稍后重试',429);active++;
 try{
  const value=await new Promise((resolve,reject)=>execFile(process.execPath,['--max-old-space-size=256',path.join(process.cwd(),'src/lib/resume-extract-worker.mjs'),path.join(FILES,file.id),format],{timeout:20000,maxBuffer:1024*1024,windowsHide:true},(error,stdout)=>{try{const result=JSON.parse(stdout);if(result.error)return reject(new HttpError(422,result.error));if(error)return reject(new HttpError(422,'简历处理超时或内容过于复杂，请改用文本格式。'));resolve(result)}catch{reject(new HttpError(422,'无法读取简历，请上传可选中文字的 PDF、DOCX 或文本；扫描件请先做文字识别。'))}}));
  const result=parseResume(value.text);return {...result,sourceName:file.name};
 }finally{active--}
}
