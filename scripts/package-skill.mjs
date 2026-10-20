import {mkdirSync,copyFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=new URL('../',import.meta.url);
mkdirSync(new URL('public/skills/',root),{recursive:true});
execFileSync('tar',['-czf',fileURLToPath(new URL('public/skills/spaceyew-post.tar.gz',root)),'-C',fileURLToPath(new URL('integrations/',root)),
 'spaceyew-post/SKILL.md','spaceyew-post/references/api.md','spaceyew-post/scripts/client.mjs','spaceyew-post/scripts/request.mjs'
],{env:{...process.env,COPYFILE_DISABLE:'1'}});
// Keep previously copied install commands working; both archives install SpaceYew.
copyFileSync(new URL('public/skills/spaceyew-post.tar.gz',root),new URL('public/skills/ergathia-post.tar.gz',root));
