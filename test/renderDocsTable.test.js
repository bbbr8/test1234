const { test } = require('node:test');
const assert = require('node:assert');
const { JSDOM } = require('jsdom');
const fs = require('node:fs');
const path = require('node:path');

test('file name with <script> renders as text', async () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost',
    beforeParse(window) {
      window.HTMLElement.prototype.focus = function() {};
      const docs = [{
        id: '1',
        name: '<script>alert(1)</script>.txt',
        displayName: '<script>alert(1)</script>.txt',
        size: 1024,
        type: 'text/plain',
        category: 'Case Document',
        addedAt: Date.now()
      }];
      window.localStorage.setItem('briefly:v1:docs', JSON.stringify(docs));
    }
  });
  // wait for scripts to run
  await new Promise(resolve => dom.window.addEventListener('load', resolve));
  const td = dom.window.document.querySelector('#docsTable tbody td');
  assert.ok(td, 'table cell exists');
  assert.match(td.textContent, /<script>alert\(1\)<\/script>.txt/);
  assert.strictEqual(td.querySelector('script'), null);
});
