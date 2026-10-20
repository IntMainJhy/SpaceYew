'use client';
import {useLocale} from './LocaleProvider';
export type ContentLanguage='original'|'en'|'zh'|'ja';
export function ContentLanguageTabs({value,onChange,disabled=false}:{value:ContentLanguage;onChange:(value:ContentLanguage)=>void;disabled?:boolean}){
 const {t}=useLocale();
 return <div className="content-language-switch"><div className="content-language-options" role="group" aria-label={t('内容编辑语言')}>
 {(['original','en','zh','ja'] as const).map(language=><button className={'btn small'+(value===language?' primary':'')} type="button" key={language} aria-pressed={value===language} disabled={disabled} onClick={()=>onChange(language)}>{language==='original'?t('原文'):({en:'English',zh:'中文',ja:'日本語'})[language]}</button>)}
 </div><p className="small-text">{t('仅切换内容编辑语言。翻译字段留空时显示原文；封面、附件、链接和分类共用。保存会保留所有语言版本。')}</p></div>;
}
