import {cookies} from 'next/headers';
import {normalizeLocale,translate} from './i18n.mjs';
export async function serverI18n(){const locale=normalizeLocale((await cookies()).get('site-locale')?.value);return {locale,t:(text:string,values:unknown[]=[])=>translate(locale,text,values)};}
