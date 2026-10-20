// Forwarding headers are trustworthy only when the configured proxy overwrites them.
export function clientIp(req){if(process.env.TRUST_PROXY!=='true')return 'untrusted';const value=req.headers.get('x-real-ip')||'';return value.length<=45&&/^[a-fA-F0-9:.]+$/.test(value)?value:'unknown'}
export function isLoopback(value){return ['127.0.0.1','localhost','[::1]'].includes(value)}
