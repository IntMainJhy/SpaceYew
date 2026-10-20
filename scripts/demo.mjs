import {execFileSync,spawn} from 'node:child_process';
execFileSync(process.execPath,['test/seed-x-demo.mjs'],{stdio:'ignore'});
execFileSync(process.execPath,['test/refresh-demo-copy.mjs'],{stdio:'ignore'});
const skipLogin=process.env.DEMO_SKIP_LOGIN!=='false';
console.log('独立演示：http://localhost:3010/community\n'+(skipLogin?'已暂时跳过成员登录，直接进入体验账号。':'成员：demo_member / DemoMember2026!')+'\n站长：demo_admin / DemoOwner2026!\n全部为合成数据，原站3008的数据不会被替换。');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3010'],{stdio:'inherit',env:{...process.env,SITE_DEMO:'true',DEMO_SKIP_LOGIN:skipLogin?'true':'false',MAIL_MODE:'capture',APP_DATA_DIR:'../.site-x-demo-data',PUBLIC_URL:'http://localhost:3010',COOKIE_SECURE:'false'}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code||0;});
