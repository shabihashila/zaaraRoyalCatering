// Read-only modal checks; credentials come from local environment variables.
const { chromium } = require(process.env.ZRC_PLAYWRIGHT_MODULE || 'playwright');
const assert = (value, message) => { if (!value) throw new Error(message); };
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext();
    const login = await context.request.post('http://localhost:5289/api/v1/auth/login', {
      data: { emailOrPhone: process.env.ZRC_TEST_EMAIL || 'owner@zaararoyal.local', password: process.env.ZRC_TEST_PASSWORD },
    });
    assert(login.ok(), 'Login failed');
    const session = await login.json();
    await context.addInitScript(token => localStorage.setItem('zrc_access_token', token), session.accessToken);
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const routes = [
      ['/admin/catalog/categories', 'Add category'], ['/admin/catalog/items', 'Add menu item'],
      ['/admin/catalog/addons', 'Add add-on'], ['/admin/orders', 'New booking'],
      ['/admin/customers', 'Add customer'], ['/admin/engagement/reviews', 'Add review'],
      ['/admin/content', 'Add content'], ['/admin/users', 'Add staff'],
      ['/admin/menu', 'Add menu item'], ['/admin/catalog/costing', 'Bulk price adjustment'],
    ];
    const results = [];
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [route, button] of routes) {
        console.log('Checking', width, route);
        await page.goto('http://localhost:4200' + route, { waitUntil: 'networkidle' });
        const trigger = page.getByRole('button', { name: button, exact: true });
        await trigger.click();
        const dialog = page.locator('dialog[open]');
        await dialog.waitFor({ timeout: 10000 }).catch(async error => {
          console.error(route, errors, await page.locator('zrc-admin-modal').count(), await page.locator('h1').textContent(), await page.evaluate(() => { const c=window.ng?.getComponent(document.querySelector('zrc-customers')); return c ? {editor:c.editor(), permission:c.auth.hasPermission('customers.manage')} : null; }));
          throw error;
        });
        assert(await dialog.evaluate(d => { const r = d.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && d.contains(document.activeElement); }), route + ' modal position/focus');
        await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
        assert(await trigger.evaluate(b => document.activeElement === b), route + ' focus return');
        results.push({ width, route, modal: true });
      }
    }
    assert(!errors.length, errors.join('\n'));
    console.log(JSON.stringify({ results, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
