'use client';

import {useState} from 'react';
import {useLocale} from './LocaleProvider';
import {Icon} from './Icons';

export function LegalContact({wechat}:{wechat:string}){
 const {t}=useLocale(),[status,setStatus]=useState<'idle'|'copied'|'error'>('idle');
 async function copy(){
  try{await navigator.clipboard.writeText(wechat);setStatus('copied');}
  catch{setStatus('error');}
 }
 return <div className="legal-contact-copy">
  <span>{t('微信号')}</span>
  <div><code>{wechat}</code><button type="button" className="space-btn primary" onClick={copy} aria-label={t('复制律师微信号')}><Icon name={status==='copied'?'check':'copy'}/>{status==='copied'?t('已复制'):t('复制微信号')}</button></div>
  <p className={status==='error'?'legal-copy-feedback is-error':'legal-copy-feedback'} role="status" aria-live="polite">{status==='copied'?t('复制成功，添加时请备注法律咨询'):status==='error'?t('复制未成功，请长按或选中上方微信号手动复制。'):t('添加微信时请备注“法律咨询”。')}</p>
 </div>;
}
