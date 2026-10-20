import {readFile} from 'node:fs/promises';
import {call} from './client.mjs';
const [operation,file,requestId]=process.argv.slice(2);try{if(!operation)throw new Error('Usage: node request.mjs operation [input.json] [stable-request-id]');const input=file?JSON.parse(await readFile(file,'utf8')):{};console.log(JSON.stringify(await call(operation,input,requestId),null,2))}catch(e){console.error(e.message);process.exitCode=1}
