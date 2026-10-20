'use client';
import {useLocale} from './LocaleProvider';
import {Field} from './AdminApp';

type Release={url?:string;version?:string};
export function DesktopDownloadsSettings({value={},onChange}:{value?:Record<string,Release>;onChange:(value:Record<string,Release>)=>void}){
 const {t}=useLocale();
 return <section className="panel form-section"><h3>{t('桌面应用下载')}</h3><p className="small-text">{t('填写正式安装包的 HTTPS 地址，留空显示“即将推出”。')}</p>
  {(['macos','windows'] as const).map(platform=>{const label=platform==='macos'?'macOS':'Windows',release=value[platform]||{};return <fieldset className="desktop-release-fields" key={platform}><legend>{label}</legend>
   <Field name={'desktop-'+platform+'-url'} label={t('{0} 下载地址',[label])} value={release.url||''} onChange={url=>onChange({...value,[platform]:{...release,url}})}/>
   <Field name={'desktop-'+platform+'-version'} label={t('{0} 版本说明（选填）',[label])} value={release.version||''} help={t('版本号、架构或系统要求。')} onChange={version=>onChange({...value,[platform]:{...release,version}})}/>
  </fieldset>})}
 </section>;
}
