import {db,DATA} from '../src/lib/db.mjs';
import {existsSync} from 'node:fs';
import path from 'node:path';
db();
console.log('数据库已就绪。持久数据目录：'+DATA);
console.log(existsSync(path.join(DATA,'initial-admin.txt'))?'首次管理员凭据已保存到该目录的 initial-admin.txt（仅本机用户可读）。':'管理员账号已存在，未覆盖密码。');
