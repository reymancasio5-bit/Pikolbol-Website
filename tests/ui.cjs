const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
let browser, server, base;
before(async () => {
  server = http.createServer((req, res) => {
    const file = path.join(process.cwd(), decodeURIComponent(req.url.split('?')[0] === '/' ? '/index.html' : req.url.split('?')[0]));
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
    fs.readFile(file, (err, data) => { res.writeHead(err ? 404 : 200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' }); res.end(err ? 'Not found' : data); });
  }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined), headless: true });
});
after(async () => { await browser?.close(); server?.close(); });
async function pageAt(name, width = 1280) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/${name}.html`);
  await page.locator('#loader').waitFor({ state: 'hidden' });
  assert.deepEqual(errors, [], `${name} should initialize without JavaScript errors`);
  return page;
}
test('mobile menu closes with Escape and restores its toggle state', async () => {
  const p = await pageAt('index', 390);
  await p.locator('#burger').click();
  await p.keyboard.press('Escape');
  assert.equal(await p.locator('#burger').getAttribute('aria-expanded'), 'false');
  await p.close();
});

test('mobile menu fully covers the footer logo when opened near the bottom', async () => {
  const p = await pageAt('about', 390);
  await p.evaluate(() => scrollTo(0, document.querySelector('footer').offsetTop - 160));
  await p.locator('#burger').click();
  const covered = await p.screenshot();
  await p.locator('footer .brand').evaluate(el => { el.style.visibility = 'hidden'; });
  const hidden = await p.screenshot();
  assert.equal(covered.equals(hidden), true, 'footer logo must already be hidden behind the menu');
  await p.locator('footer .brand').evaluate(el => { el.style.visibility = ''; });
  await p.screenshot({ path: path.join(require('node:os').tmpdir(), 'apc-footer-menu-layering.png') });
  await p.close();
});

test('mobile menu remains safe through rapid toggles and viewport changes', async () => {
  const p = await browser.newPage({ viewport: { width: 390, height: 900 } });
  await p.goto(base + '/about.html');
  await p.locator('#burger').click();
  await p.locator('#burger').click();
  assert.equal(await p.locator('#menu').evaluate(el => el.inert), true, 'closing links cannot receive focus during animation');
  await p.locator('#burger').click();
  await p.keyboard.press('Tab');
  assert.equal(await p.locator('#menu a').first().evaluate(el => el === document.activeElement), true);
  await p.waitForTimeout(450);
  await p.screenshot({ path: path.join(require('node:os').tmpdir(), 'apc-mobile-navigation.png') });
  await p.setViewportSize({ width: 1280, height: 900 });
  assert.equal(await p.locator('#main').evaluate(el => el.inert), false);
  assert.equal(await p.locator('#menu').evaluate(el => el.inert), false);
  await p.close();
});

test('page links fade out and Back restores an interactive page', async () => {
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(base + '/about.html');
  await p.locator('#menu a[href="contact.html"]').evaluate(el => el.click());
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('page-leaving')), true);
  await p.waitForURL('**/contact.html');
  assert.equal(await p.locator('#menu a[aria-current="page"]').textContent(), 'Contact');
  await p.goBack();
  await p.waitForURL('**/about.html');
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('page-leaving')), false);
  assert.equal(await p.locator('#main').evaluate(el => el.inert), false);
  assert.equal(await p.locator('#menu a[aria-current="page"]').textContent(), 'About');
  await p.close();
});

test('navigation preserves anchor links and opening a page in a new tab', async () => {
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(base + '/about.html');
  await p.locator('footer a[href="about.html#rules"]').click();
  assert.ok(p.url().endsWith('#rules'));
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('page-leaving')), false);
  const popupPromise = p.context().waitForEvent('page');
  await p.locator('#menu a[href="contact.html"]').click({ modifiers: ['Control'] });
  const popup = await popupPromise;
  await popup.waitForLoadState();
  assert.ok(popup.url().endsWith('/contact.html'));
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('page-leaving')), false);
  await popup.close(); await p.close();
});

test('reservation dialog moves focus inside and returns it on dismissal', async () => {
  const p = await pageAt('schedule');
  const trigger = p.locator('[data-reserve]').first();
  await trigger.click();
  assert.equal(await p.evaluate(() => document.querySelector('#resModal').contains(document.activeElement)), true);
  await p.keyboard.press('Escape');
  assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
  await p.close();
});

test('mobile booking remains usable after the page entrance animation', async () => {
  const p = await browser.newPage({ viewport: { width: 390, height: 568 } });
  await p.goto(base + '/schedule.html');
  await p.waitForTimeout(700);
  await p.locator('[data-reserve]').first().evaluate(el => el.click());
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(require('node:os').tmpdir(), 'apc-mobile-dialog.png') });
  await p.locator('#resModal .x').click();
  await p.locator('#burger').click();
  assert.equal(await p.locator('#burger').getAttribute('aria-expanded'), 'true');
  await p.close();
});
test('empty contact submission does not save a message', async () => {
  const p = await pageAt('contact');
  await p.locator('#cForm button').click();
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('apc_demo_messages') || '[]').length), 0);
  await p.close();
});
test('reduced motion still displays final statistics', async () => {
  const p = await pageAt('index');
  assert.equal(await p.locator('[data-count]').first().textContent(), '120+');
  await p.close();
});

test('all six pages fit phone, tablet and desktop viewports', async () => {
  const output = path.join(require('node:os').tmpdir(), 'apc-ui-review');
  fs.mkdirSync(output, { recursive: true });
  for (const name of ['index', 'about', 'schedule', 'announcements', 'contact', 'admin']) {
    const p = await pageAt(name);
    const errors = []; p.on('pageerror', e => errors.push(e.message));
    for (const width of [320, 390, 768, 1440]) {
      await p.setViewportSize({ width, height: 900 });
      await p.evaluate(() => document.fonts.ready);
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${name} overflows at ${width}px`);
      const overflow = await p.evaluate(() => Array.from(document.querySelectorAll('main h1, main h2, main .card, main input, main .btn')).filter(e => e.getClientRects().length && !e.closest('.modal') && !e.classList.contains('hp') && (e.getBoundingClientRect().right > innerWidth + 1 || e.getBoundingClientRect().left < -1)).map(e => e.className || e.tagName));
      if (overflow.length) {
        await p.screenshot({ path: path.join(output, `${name}-issue-${width}.png`), fullPage: true });
        console.log(await p.evaluate(() => ({ fonts: document.fonts.status, headings: [...document.querySelectorAll('h1,.hero-copy,.hero .cta,.hero .cta .btn')].map(e => ({ tag:e.tagName, cls:e.className, width:e.getBoundingClientRect().width, left:e.getBoundingClientRect().left, font:getComputedStyle(e).fontFamily })) })));
      }
      assert.deepEqual(overflow, [], `${name}: clipped content at ${width}px`);
      if (width === 390 || width === 1440) {
        await p.screenshot({ path: path.join(output, `${name}-${width}.png`), fullPage: true });
        await p.screenshot({ path: path.join(output, `${name}-${width}-top.png`) });
      }
    }
    assert.deepEqual(errors, []);
    await p.close();
  }
  console.log('Visual review screenshots:', output);
});

test('booking validates, submits in demo mode, and traps keyboard focus', async () => {
  const p = await pageAt('schedule');
  assert.equal(await p.evaluate(() => APCApi.demo), true, 'Only run submission checks against demo data');
  await p.locator('[data-reserve]').first().click();
  await p.keyboard.press('Shift+Tab');
  assert.equal(await p.locator('#resForm button[type=submit]').evaluate(el => el === document.activeElement), true);
  await p.locator('#resForm button[type=submit]').click();
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('apc_demo_reservations') || '[]').length), 0);
  await p.locator('#resForm [name=name]').fill('UI Test Player');
  await p.locator('#resForm [name=phone]').fill('09000000000');
  await p.locator('#resForm button[type=submit]').click();
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('apc_demo_reservations') || '[]').length), 1);
  await p.close();
});

test('news search handles empty results and opens a keyboard accessible article', async () => {
  const p = await pageAt('announcements');
  await p.locator('#newsSearch').fill('no-such-announcement-2393');
  assert.equal(await p.locator('[data-news]').count(), 0);
  await p.locator('#newsSearch').fill('');
  await p.locator('[data-news]').first().focus();
  await p.keyboard.press('Enter');
  assert.equal(await p.locator('#newsModal').getAttribute('aria-hidden'), 'false');
  await p.keyboard.press('Escape');
  assert.equal(await p.locator('[data-news]').first().evaluate(el => el === document.activeElement), true);
  await p.close();
});

test('contact and admin workflows remain usable', async () => {
  const p = await pageAt('contact');
  assert.equal(await p.evaluate(() => APCApi.demo), true);
  await p.locator('[name=name]').fill('UI Test');
  await p.locator('[name=email]').fill('test@example.com');
  await p.locator('[name=message]').fill('Local browser verification.');
  await p.locator('#cForm button').click();
  assert.equal(await p.evaluate(() => JSON.parse(localStorage.getItem('apc_demo_messages') || '[]').length), 1);
  await p.goto(base + '/admin.html');
  await p.locator('[name=pass]').fill('demo-test');
  await p.locator('#loginForm button').click();
  await p.locator('#panel').waitFor({ state: 'visible' });
  await p.locator('#newBtn').click();
  await p.locator('#editForm [name=title]').fill('UI verification session');
  await p.locator('#editForm button[type=submit]').click();
  await p.locator('#editModal').waitFor({ state: 'hidden' });
  assert.equal(await p.locator('#tbody').getByText('UI verification session').count(), 1);
  await p.locator('#logout').click();
  assert.equal(await p.locator('#panel').isVisible(), false);
  await p.close();
});

test('court rally animates without scrolling and respects reduced motion', async () => {
  const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; p.on('pageerror', e => errors.push(e.message));
  await p.goto(base + '/index.html');
  await p.waitForFunction(() => window.APCScene?.state.ready);
  await p.waitForTimeout(1200);
  assert.equal(await p.locator('.scene-toggle').count(), 0);
  const snapshot = async () => p.screenshot({ clip: await p.locator('#scene').boundingBox() });
  const before = await snapshot();
  await p.waitForTimeout(600);
  const after = await snapshot();
  assert.equal(before.equals(after), false, 'players and ball keep rallying without scroll');
  assert.equal(await p.evaluate(() => scrollY), 0);
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.waitForTimeout(200);
  const still = await snapshot();
  await p.waitForTimeout(500);
  assert.equal(still.equals(await snapshot()), true, 'reduced motion shows a static court');
  await p.screenshot({ path: path.join(require('node:os').tmpdir(), 'apc-rally-desktop.png') });
  assert.deepEqual(errors, []);
  await p.close();
});

test('scroll reveals leave text visible after their animation finishes', async () => {
  const p = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto(base + '/about.html');
  const target = p.locator('[data-r]').first();
  await target.scrollIntoViewIfNeeded();
  await p.waitForTimeout(1100);
  assert.equal(await target.evaluate(el => Number(getComputedStyle(el).opacity)), 1);
  await p.close();
});
