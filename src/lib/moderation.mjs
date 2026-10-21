import {db,getConfig} from './db.mjs';
// Local triage only. A matched expression is a review signal, never a legal conclusion.
const rules=[
 ['sexual','涉嫌色情或性交易内容',/色情|成人视频|裸聊|约炮|卖淫|嫖娼|未成年.{0,8}(裸|性)|child\s*porn|pornography|sex\s*trade/i],
 ['gambling','涉嫌赌博或赌博引流',/赌博|博彩|赌场|网赌|百家乐|老虎机|买球|casino|betting\s*(bonus|odds)|gambling/i],
 ['drugs','涉嫌违禁药品或毒品内容',/毒品|海洛因|冰毒|可卡因|摇头丸|迷奸|贩毒|制毒|heroin|cocaine|methamphetamine/i],
 ['harm','涉嫌暴力、仇恨或犯罪招揽',/恐怖主义|制造炸弹|买卖枪支|杀人教程|人肉搜索|报复社会|terrorist\s*recruit|kill\s*all/i],
 ['fraud','涉嫌诈骗、盗版或凭据交易',/洗钱|跑分平台|诈骗教程|盗号|账号出售|银行卡四件套|勒索软件|钓鱼登录|破解激活|盗版下载|出售个人信息|stolen\s*(accounts|credentials)/i],
 ['regulated','需要人工核对服务范围',/新闻时政|投资荐股|保证收益|医疗诊断|代开处方|内幕消息/i],
 ['privacy','可能包含敏感身份信息或密钥',/\b(?:sk|ghp|gho)_[a-z0-9]{20,}|-----BEGIN.{0,30}PRIVATE KEY|\b\d{17}[0-9x]\b|\b1[3-9]\d{9}\b/i]
];
export function moderationSettings(){const row=db().prepare("SELECT value FROM config WHERE key='moderation'").get();if(!row)return{mode:'automatic'};try{return{mode:JSON.parse(row.value)?.mode==='automatic'?'automatic':'manual'}}catch{return{mode:'manual'}}}
export function screenContent(text,{media=false,external=false,executable=false,mode=moderationSettings().mode}={}){
 const normalized=String(text||'').replace(/<[^>]*>/g,'').replace(/&#(x[0-9a-f]+|[0-9]+);?/gi,(_,entity)=>{const value=entity[0].toLowerCase()==='x'?parseInt(entity.slice(1),16):Number(entity);return value>0&&value<=0x10ffff?String.fromCodePoint(value):''}).replace(/&(?:nbsp|ZeroWidthSpace);/gi,' ').normalize('NFKC').replace(/[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g,'');
 const compact=normalized.replace(/[\s\p{P}\p{S}]+/gu,'');
 const signals=rules.filter(([, ,pattern])=>pattern.test(normalized)||pattern.test(compact)).map(([code,reason])=>({code,reason}));
 if(media)signals.push({code:'media',reason:'图片需要人工核对画面及使用权'});
 if(external||/https?:\/\//i.test(normalized))signals.push({code:'external',reason:'外部来源与链接需要人工核查'});
 if(executable)signals.push({code:'executable',reason:'安装命令与可执行内容需要人工核查'});
 if(mode==='manual')signals.push({code:'manual',reason:'管理员已启用人工审核'});
 if(getConfig('community').paused)signals.push({code:'paused',reason:'社区暂停新发布'});
 return{decision:signals.length?'pending':'approved',engine:'local-rules-v1',signals,reason:signals.length?signals.map(s=>s.reason).join('；'):'本地自动检查未发现风险信号',checkedAt:new Date().toISOString()};
}
