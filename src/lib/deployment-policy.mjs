import {isLoopback} from './request-security.mjs';

// Local tests remain local; production access is a separate, explicit decision.
export function localRequest(req){try{return isLoopback(new URL(req.url).hostname)&&isLoopback(new URL('http://'+(req.headers.get('host')||new URL(req.url).host)).hostname)&&(!process.env.PUBLIC_URL||isLoopback(new URL(process.env.PUBLIC_URL).hostname))}catch{return false}}

export function serviceRequest(req){
 if(localRequest(req))return true;
 if(process.env.PUBLIC_FEATURES_ENABLED!=='true')return false;
 try{
  const configured=new URL(process.env.PUBLIC_URL),url=new URL(req.url),host=req.headers.get('host'),source=req.headers.get('origin');
  if(configured.protocol!=='https:'||configured.username||configured.password||configured.pathname!=='/'||configured.search||configured.hash||isLoopback(configured.hostname))return false;
  if(!host||host.toLowerCase()!==configured.host||source&&source!==configured.origin)return false;
  if(url.origin===configured.origin)return true;
  // Next receives an HTTP loopback request behind Nginx. Only a proxy that
  // overwrites Host and X-Forwarded-Proto may supply the external origin.
  return process.env.TRUST_PROXY==='true'&&url.protocol==='http:'&&(isLoopback(url.hostname)||url.host===configured.host)&&req.headers.get('x-forwarded-proto')==='https';
 }catch{return false}
}

// An email address or the historical local-test flag is not identity verification.
// A production verification is recorded separately by an authorized administrator.
export function publishingQualified(user,req){return !!user&&user.status==='active'&&!!req&&serviceRequest(req)&&(user.role==='owner'||user.verification==='verified'||localRequest(req)&&user.verification==='local_test')}
