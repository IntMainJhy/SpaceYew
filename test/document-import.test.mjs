import test from 'node:test';
import assert from 'node:assert/strict';
import {importDocument,markdownToHtml,IMPORT_MAX_BYTES} from '../src/lib/document-import.mjs';

test('HTML import strips executable markup and network-bearing embeds before editor rendering without fetching anything',()=>{
 const originalFetch=globalThis.fetch;let fetched=0;globalThis.fetch=()=>{fetched++;throw new Error('Import must never fetch')};
 try{const result=importDocument({name:'My document.html',text:'<!doctype html><html><head><title>Private metadata</title><script>window.__imported=1</script><style>@import url(https://tracker.example/font);</style></head><body onload="alert(1)"><h1>Document heading</h1><p>A readable paragraph with <strong>bold text</strong>.</p><img src="https://tracker.example/pixel" onerror="alert(1)"><iframe src="https://tracker.example/frame">Private embed</iframe><svg onload="alert(1)"></svg><video src="https://tracker.example/movie"></video><a href="javascript:alert(1)" onclick="alert(1)">Invalid link</a><a href="https://example.com/guide">Reference</a></body></html>'});
 assert.equal(result.title,'My document');assert.match(result.bodyHtml,/<h2>Document heading<\/h2>/);assert.match(result.bodyHtml,/<strong>bold text<\/strong>/);assert.ok(!/tracker|script|style|iframe|<img|<svg|<video|onload|onerror|onclick|javascript:|Private metadata|Private embed/.test(result.bodyHtml));assert.match(result.bodyHtml,/href="https:\/\/example.com\/guide"/);assert.match(result.bodyHtml,/rel="noopener noreferrer"/);assert.equal(fetched,0);
 }finally{globalThis.fetch=originalFetch}
});
test('Markdown imports headings, fenced code, ordered and unordered lists, quotes and safe inline links',()=>{
 const result=importDocument({name:'Guide.md',text:'# Getting started\n\nRead **this** and `npm run build`.\n\n- First action\n- Second action\n\n1. Save the file\n2. Run the check\n\n> Keep the original source.\n\n```html\n<img src="https://example.com/x">\n<script>alert(1)</script>\n```\n\n[Source](https://example.com/guide) and ![Image description](https://tracker.example/x.png)'});
 assert.match(result.bodyHtml,/<h2>Getting started<\/h2>/);assert.match(result.bodyHtml,/<strong>this<\/strong>/);assert.match(result.bodyHtml,/<code>npm run build<\/code>/);assert.match(result.bodyHtml,/<ul><li>First action<\/li><li>Second action<\/li><\/ul>/);assert.match(result.bodyHtml,/<ol><li>Save the file<\/li>/);assert.match(result.bodyHtml,/<blockquote>/);assert.match(result.bodyHtml,/<pre><code class="language-html">&lt;img src=/);assert.ok(!result.bodyHtml.includes('<img'));assert.ok(!result.bodyHtml.includes('tracker.example'));assert.match(result.bodyHtml,/Image description/);
});
test('Markdown raw HTML remains escaped text; formatting does not rewrite link attributes and unclosed fences preserve content',()=>{
 const html=markdownToHtml('[bold **label**](https://example.com/**path**)\n\n<script>unsafe()</script>\n\n~~~js\nconst name = "**literal**";');
 const imported=importDocument({name:'guide.md',text:'[bold **label**](https://example.com/**path**)\n\n<script>unsafe()</script>\n\n~~~js\nconst name = "**literal**";'}).bodyHtml;
 assert.match(html,/href="https:\/\/example.com\/\*\*path\*\*"/);assert.match(imported,/&lt;script&gt;unsafe\(\)&lt;\/script&gt;/);assert.match(imported,/const name = "\*\*literal\*\*";/);assert.ok(!imported.includes('<script>'));
});
test('TXT is plain text, invalid formats and empty or oversized UTF-8 documents are rejected',()=>{
 const result=importDocument({name:'notes.txt',text:'# Literal heading\n<script>literal text</script>\n\nNext paragraph'});assert.match(result.bodyHtml,/<p># Literal heading<br \/>&lt;script&gt;literal text&lt;\/script&gt;<\/p>/);
 for(const input of [{name:'bad.exe',text:'Content'},{name:'empty.html',text:'<script>alert(1)</script>'},{name:'empty.md',text:'   '},{name:'too-large.md',text:'a'.repeat(IMPORT_MAX_BYTES+1)},{name:'utf8.md',text:'中'.repeat(Math.ceil(IMPORT_MAX_BYTES/3))}])assert.throws(()=>importDocument(input),error=>error.status===400);
});
