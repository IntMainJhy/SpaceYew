// Read-only checks against the running local site; no content or account changes.
import assert from 'node:assert/strict';

const base = process.env.THEME_TEST_URL || 'http://127.0.0.1:3008';
for (const theme of ['', 'natural-organic', 'monochrome', 'editorial', 'x-social', 'unrecognized']) {
  for (const route of ['/', '/community', '/report', '/admin', '/admin/community/reports']) {
    const response = await fetch(base + route, {headers: {cookie: `${theme ? `site-ui=${theme}; ` : ''}site-locale=zh`}});
    assert.equal(response.status, 200, route);
    const html = await response.text();
    assert.ok(html.includes('data-ui="x-social"'), `${route}: always render the shared appearance, including legacy preferences`);
    assert.ok(!html.includes('class="theme-dropdown"'), `${route}: no theme switcher`);
    assert.ok(!html.includes('theme-name-full'), `${route}: no theme name`);
    if (!route.startsWith('/admin')) {
      assert.ok(html.includes('界面语言'), `${route}: retain the language selector`);
    }
  }
}
const protectedResponse = await fetch(base + '/api/admin/community/accounts', {headers: {cookie: 'site-ui=monochrome'}});
assert.ok([401,403].includes(protectedResponse.status), 'A legacy theme preference must never grant authentication');
console.log('PASS: 30 routes use one appearance, no theme switch or name, language selection retained, legacy cookie grants no privileges.');
