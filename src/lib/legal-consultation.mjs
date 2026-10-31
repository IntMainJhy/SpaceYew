import {translate} from './i18n.mjs';

export const LEGAL_CONSULTATION_PATH='/resources/legal-consultation';
export const legalConsultation={
 name:'张越',
 firm:'上海君典律师事务所',
 license:'13101202110385084',
 since:'2021',
 wechat:'shzhangyuelvshi',
 hourlyRate:100,
 portrait:'/images/legal/zhang-yue.webp',
 platformUrl:'https://appgallery.huawei.com/app/detail?id=zy.zhenlvfalvzixun.law&channelId=SHARE&source=appshare',
 areas:['民间借贷','交通事故','离婚纠纷','抚养费','租房纠纷','房屋买卖','遗产继承','遗嘱见证','律师函','人身伤害'],
};

export function legalConsultationResource(locale){
 return {id:'spaceyew-legal-consultation',title:translate(locale,'法律咨询 · 张越律师'),summary:translate(locale,'了解律师背景、民事纠纷业务范围与咨询方式。'),category:'法律咨询',authorName:translate(locale,legalConsultation.firm),url:LEGAL_CONSULTATION_PATH};
}
