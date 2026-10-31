import Link from 'next/link';
import {serverI18n} from '@/lib/server-i18n';
import {legalConsultation as lawyer} from '@/lib/legal-consultation.mjs';
import {ResourceTabs} from './ResourceHub';
import {LegalContact} from './LegalContact';
import {Icon} from './Icons';
import '@/app/legal-consultation.css';

export async function LegalConsultation(){
 const {t}=await serverI18n();
 return <div className="legal-consultation">
  <ResourceTabs active="legal"/>
  <Link className="legal-back" href="/resources"><Icon name="arrow"/>{t('返回资源')}</Link>
  <article className="legal-profile" aria-labelledby="legal-title">
   <div className="legal-portrait"><img src={lawyer.portrait} alt={t('张越律师个人照片')} width={1080} height={1499} fetchPriority="high"/></div>
   <div className="legal-profile-copy">
    <h1 id="legal-title">{t('法律咨询')}</h1>
    <h2>{t(lawyer.name)}<span>{t('律师')}</span></h2>
    <p className="legal-firm">{t(lawyer.firm)}</p>
    <p className="legal-introduction">{t('张越律师自2021年起执业，主要提供民事纠纷相关法律服务。业务涉及借贷、交通事故、婚姻家事、住房及继承等事项。可通过微信沟通具体问题与咨询安排。')}</p>
    <dl className="legal-credentials"><div><dt>{t('执业证号')}</dt><dd>{lawyer.license}</dd></div><div><dt>{t('执业时间')}</dt><dd>{t('2021年至今')}</dd></div></dl>
    <a className="space-btn primary legal-primary" href="#consultation-contact">{t('咨询与联系')}<Icon name="arrow"/></a>
   </div>
  </article>
  <div className="legal-information">
   <section className="legal-practice" aria-labelledby="legal-practice-title">
    <h2 id="legal-practice-title">{t('业务范围')}</h2>
    <p>{t('围绕生活中的民事法律问题，了解相关咨询事项。')}</p>
    <ul className="legal-areas">{lawyer.areas.map(area=><li key={area}>{t(area)}</li>)}</ul>
    <div className="legal-before-contact"><h3>{t('咨询前，可以先准备')}</h3><p>{t('简要的事情经过、关键时间点、已有合同或相关材料，以及你希望解决的问题，便于沟通具体咨询安排。')}</p></div>
   </section>
   <section id="consultation-contact" className="legal-contact" aria-labelledby="legal-contact-title">
    <h2 id="legal-contact-title">{t('咨询与联系')}</h2>
    <div className="legal-price"><span>{t('咨询费用')}</span><p><strong>{lawyer.hourlyRate}</strong><span>{t('元 / 小时')}</span></p><small>{t('具体收费及服务安排，请联系律师确认。')}</small></div>
    <LegalContact wechat={lawyer.wechat}/>
   </section>
  </div>
  <aside className="legal-platform" aria-labelledby="legal-platform-title"><div><h2 id="legal-platform-title">{t('真律咨询 App')}</h2><p>{t('前往华为应用市场，查看应用详情与安装方式。')}</p></div><a className="space-btn" href={lawyer.platformUrl} target="_blank" rel="noopener noreferrer">{t('前往华为应用市场')}<Icon name="arrow"/><span className="community-sr">{t('在新窗口打开')}</span></a></aside>
  <p className="legal-source">{t('本页根据提供的律师介绍资料整理。')}</p>
 </div>;
}
