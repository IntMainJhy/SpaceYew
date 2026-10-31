import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';

const element=React.createElement;
const translate=(text,values=[])=>values.reduce((value,item,index)=>value.replaceAll('{'+index+'}',item),text);
const wrapper=({children})=>element('div',null,children);
const empty=()=>null;
const field=({name,label,value})=>element('label',null,label,element('input',{name,defaultValue:value??''}));
function load(name,extra={}){
 const source=ts.transpileModule(readFileSync(new URL('../src/components/'+name+'.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const modules={
  react:React,'react/jsx-runtime':jsxRuntime,'next/link':{default:({href,children,...props})=>element('a',{href,...props},children)},
  './LocaleProvider':{useLocale:()=>({t:translate,locale:'zh'})},
  './AdminApp':{Field:field,useUnsaved(){}},
  '@/lib/client':{api:async()=>({}),post:async()=>({}),bytes:value=>String(value)},
  './ResumeImport':{ResumeImport:empty},'./EmailSettings':{EmailSettings:empty},
  './ContentLanguageTabs':{ContentLanguageTabs:empty},
  './Upload':{FileChoice:({label,mode,value})=>element('label',null,label,element('input',{'data-kind':mode,defaultValue:value??''})),Upload:empty},
  './Icons':{Icon:empty},'./PageResources':{useResource:()=>({})},
  './HomeFlowBackground':{HomeFlowBackground:empty},'./CatalogAdmin':{CatalogAdmin:empty},
  './CaseContentLink':{CaseContentLink:empty},'./SpaceModeration':{SpaceModeration:empty},
  './SiteTools':{SiteTools:empty},'./PageMotion':{PageMotion:wrapper},
  './CommunityCommentsAdmin':{CommunityCommentsAdmin:empty},'./PostCover':{PostCover:empty},
  ...extra
 };
 if(name==='AdminForms')modules['./DesktopDownloadsSettings']=load('DesktopDownloadsSettings',extra);
 const exports={};vm.runInNewContext(source,{exports,Date,require:key=>{if(!(key in modules))throw Error('Unmocked dependency '+key);return modules[key]}});return exports;
}

test('settings only offers controls consumed by the website and retains real download, cover and PDF settings',()=>{
 const {SettingsForm}=load('AdminForms');
 const value={name:'UNUSED_BRAND_VALUE',tagline:'UNUSED_TAGLINE_VALUE',description:'UNUSED_SUMMARY_VALUE',shareImageId:'shared-cover',resumeId:'public-pdf',promotionBar:{enabled:true,items:[{title:'UNRENDERED_PROMOTION',url:'https://example.com',kind:'ad'}]},desktopDownloads:{macos:{url:'https://example.com/app.dmg',version:'1.2'},windows:{url:'https://example.com/app.exe',version:'2.0'}}};
 const html=renderToStaticMarkup(element(SettingsForm,{value,max:10000000,notify(){},refresh(){}}));
 for(const label of ['网站名称','网站简介','默认分享摘要','顶部推广条','添加推广内容','UNRENDERED_PROMOTION','UNUSED_BRAND_VALUE','UNUSED_TAGLINE_VALUE','UNUSED_SUMMARY_VALUE'])assert.ok(!html.includes(label),label+' is not an active public setting');
 for(const value of ['默认分享封面','shared-cover','附加简历 PDF','public-pdf','桌面应用下载','https://example.com/app.dmg','https://example.com/app.exe','保存设置'])assert.ok(html.includes(value),value+' remains functional');
 assert.equal(value.promotionBar.items[0].title,'UNRENDERED_PROMOTION','removing an editor does not delete stored compatibility data');
});

function members({singleOwner=true,history=true}={}){
 const official={id:'official',username:'operator',nickname:'Operator',role:'owner',status:'active',verification:'local_test',created:'2026-01-01'};
 const ordinary={id:'member',username:'member',nickname:'Member',role:'member',status:'active',verification:'pending',created:'2026-01-01'};
 const current={...official,id:singleOwner?'official':'owner',ownerAccount:singleOwner};
 const resources={
  '/api/auth/me':{user:current,access:{registration:true}},
  '/api/community/config':{mode:'local'},
  '/api/admin/community/accounts':{items:[official,ordinary]},
  '/api/admin/community/invites':{items:history?[{id:'historic',label:'Previously shared invitation',expires:Date.now()+600000,created:'2026-01-01',revoked:false}]:[]}
 };
 const ui={useResource:key=>({data:resources[key],refresh(){}}),Badge:({value})=>element('span',null,value),CommunityField:field,CommunityText:empty,Empty:({title,children})=>element('section',null,title,children),Notice:wrapper,Retry:empty,Loading:empty,Logout:empty,primary:'primary',secondary:'secondary',date:String};
 const {CommunityAdmin}=load('CommunityAdmin',{'./CommunityUI':ui});
 return renderToStaticMarkup(element(CommunityAdmin,{path:['accounts']}));
}

test('unique-owner member management removes ineffective role and invitation creation controls while preserving real moderation and revocation',()=>{
 const html=members();
 for(const label of ['创建一次性邀请','生成邀请码','分配社区角色','账号与邀请'])assert.ok(!html.includes(label),label+' is unavailable in the current account model');
 assert.ok(html.includes('成员管理'));assert.ok(html.includes('member-action-member'),'another member can still be moderated');
 assert.ok(!html.includes('member-action-official'),'the current owner is managed through the personal account instead of a form that always returns 403');
 assert.ok(html.includes('href="/workspace/account"'));
 assert.ok(html.includes('Previously shared invitation'));assert.ok(html.includes('撤销邀请'),'previously issued invitations remain revocable');
});

test('the unconfigured legacy administration mode retains real reviewer delegation and an empty invitation history stays out of the page',()=>{
 assert.ok(members({singleOwner:false}).includes('分配社区角色'));
 const html=members({history:false});assert.ok(!html.includes('最近邀请记录（'));assert.ok(html.includes('member-action-member'));
});
