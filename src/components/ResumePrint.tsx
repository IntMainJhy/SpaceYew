'use client';
import {useLocale} from './LocaleProvider';
import {Icon} from './Icons';
export function ResumePrint(){const {t}=useLocale();return <button type="button" className="organic-button is-primary" onClick={()=>window.print()}><Icon name="download"/>{t('打印 / 另存PDF')}</button>}
