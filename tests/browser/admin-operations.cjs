// Browser QA uses an isolated API/database, never production business data.
const { chromium } = require(process.env.ZRC_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs');
const path = require('path');
const api = process.env.ZRC_TEST_API || 'http://localhost:5290';
const web = process.env.ZRC_TEST_WEB || 'http://localhost:4200';
const output = process.env.ZRC_REVIEW_OUTPUT || path.join(process.env.TEMP, 'zrc-browser-review');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function login(context, email, password) {
  const response = await context.request.post(api + '/api/v1/auth/login', {data:{emailOrPhone:email,password}});
  assert(response.ok(), 'Test account login failed: ' + response.status());
  const session = await response.json();
  await context.addInitScript(token => localStorage.setItem('zrc_access_token', token), session.accessToken);
  return session.accessToken;
}
async function redirectApi(context) {
  await context.route('http://localhost:5289/**', async route => {
    const response = await route.fetch({url:route.request().url().replace('http://localhost:5289',api)});
    await route.fulfill({response});
  });
}
(async()=>{
  assert(process.env.ZRC_TEST_PASSWORD, 'Set ZRC_TEST_PASSWORD for the isolated seeded owner.');
  fs.mkdirSync(output,{recursive:true});
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    await redirectApi(context);
    const token = await login(context, process.env.ZRC_TEST_EMAIL || 'owner@zaararoyal.local', process.env.ZRC_TEST_PASSWORD);
    const page = await context.newPage(); const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    const routes=['/admin/orders','/admin/orders/calendar','/admin/orders/kitchen','/admin/customers','/admin/engagement/reviews','/admin/engagement/requests','/admin/content','/admin/reports'];
    const results=[];
    for(const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      for(const route of routes) {
        await page.goto(web+route);await page.locator('h1').waitFor();await page.waitForTimeout(300);
        const state=await page.evaluate(()=>({url:location.pathname,heading:document.querySelector('h1')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth}));
        results.push({width,route,...state});assert(state.url===route,'Wrong route '+route);assert(!state.overflow,'Page overflow '+route);
        if(['/admin/orders','/admin/orders/calendar','/admin/engagement/reviews','/admin/reports'].includes(route)) await page.screenshot({path:path.join(output,'operations-'+width+'-'+route.split('/').at(-1)+'.png'),fullPage:true});
      }
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.goto(web+'/admin');await page.locator('h1').waitFor();
    assert(await page.locator('.admin-nav-disabled').count()===0,'Seeded menu still has planned destinations');
    await page.goto(web+'/admin/orders');await page.getByRole('button',{name:'New booking',exact:true}).click();
    const packages=await context.request.get(api+'/api/v1/public/catalog/packages');const catalog=await packages.json();
    const kacchi=catalog.find(p=>p.slug==='lunch-royal-kacchi');const mutton=kacchi.variants.find(v=>v.name.includes('Mutton'));
    await page.locator('select[formcontrolname="packageId"] option').filter({hasText:'Royal Kacchi'}).waitFor({state:'attached'});
    await page.locator('select[formcontrolname="packageId"]').selectOption(kacchi.id);
    await page.locator('select[formcontrolname="variantId"]').selectOption(mutton.id);
    await page.locator('input[formcontrolname="guests"]').fill('60');
    const date=new Date();date.setDate(date.getDate()+10);const eventDate=date.toISOString().slice(0,10);
    await page.locator('input[formcontrolname="eventDate"]').fill(eventDate);
    await page.locator('input[formcontrolname="eventType"]').fill('Browser verification wedding');
    await page.locator('textarea[formcontrolname="venueAddress"]').fill('Dhaka test venue');
    await page.locator('input[formcontrolname="contactName"]').fill('Browser verification customer');
    await page.locator('input[formcontrolname="contactPhone"]').fill('01712345678');
    await page.locator('.ops-summary b').filter({hasText:'34,800'}).waitFor();
    await page.getByRole('button',{name:'Create booking',exact:true}).click();await page.waitForURL(/\/admin\/orders\/[a-f0-9-]+$/);
    await page.getByText('Grand total',{exact:true}).waitFor();const id=page.url().split('/').at(-1);
    assert((await page.locator('.ops-invoice').textContent()).includes('34,800'),'Wrong saved booking price');
    await page.locator('.ops-no-print').getByLabel('Next status').selectOption('Confirmed');
    await page.getByRole('button',{name:'Confirm status change',exact:true}).click();await page.getByText('Order status updated.',{exact:true}).waitFor();
    await page.getByLabel('Amount (BDT)',{exact:true}).fill('1000');
    await page.getByRole('button',{name:'Record payment',exact:true}).click();await page.getByText('Payment recorded.',{exact:true}).waitFor();
    await page.waitForFunction(()=>document.querySelector('.ops-invoice')?.textContent.includes('33,800'));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path:path.join(output,'operations-booking-detail.png'),fullPage:true});
    await page.emulateMedia({media:'print'});
    const printWidth=await page.locator('.admin-content').evaluate(e=>e.getBoundingClientRect().width);
    assert(printWidth>1300,'Print layout squeezed into sidebar column');
    assert(!await page.locator('.admin-sidebar').isVisible(),'Sidebar appears on invoice');await page.emulateMedia({media:'screen'});
    await page.goto(web+'/admin/orders/kitchen');await page.getByLabel('Service date').fill(eventDate);
    await page.locator('table tbody tr').filter({hasText:'Mutton'}).first().waitFor();
    const kitchenText=await page.locator('main').textContent();assert(!/৳|BDT|34,800|price|balance/i.test(kitchenText),'Money leaked into kitchen sheet');
    const headers={Authorization:'Bearer '+token};const unique=Date.now();
    const contentResponse=await context.request.post(api+'/api/v1/admin/content',{headers,data:{kind:'FAQ',key:'browser-'+unique,title:'Browser FAQ '+unique,body:'A published answer for browser verification.',sortOrder:0,isPublished:true}});assert(contentResponse.ok(),'CMS write failed');
    await page.goto(web+'/faqs');await page.getByText('Browser FAQ '+unique,{exact:true}).waitFor();
    await page.goto(web+'/contact');await page.getByLabel('Your name',{exact:true}).fill('Browser inquiry '+unique);await page.locator('input[formcontrolname="phone"]').fill('01712345678');await page.getByLabel('Message',{exact:true}).fill('Please discuss my browser verification event.');await page.getByRole('button',{name:'Send message',exact:true}).click();await page.getByRole('status').filter({hasText:'Your message has been received'}).waitFor();
    await page.goto(web+'/admin/engagement/requests');await page.getByText('Browser inquiry '+unique,{exact:true}).waitFor();
    const email='kitchen-'+unique+'@test.local';const password='Browser_test_123!';const staff=await context.request.post(api+'/api/v1/admin/users',{headers,data:{email,password,displayName:'Kitchen verification',roles:['Kitchen']}});assert(staff.ok(),'Kitchen test account creation failed');
    const restricted=await browser.newContext({viewport:{width:390,height:1000}});await redirectApi(restricted);await login(restricted,email,password);const kp=await restricted.newPage();await kp.goto(web+'/admin/orders/'+id);await kp.locator('h1').waitFor();
    const text=await kp.locator('main').textContent();assert(!/Grand total|Payments|৳|BDT|34,800|balance/i.test(text),'Money leaked into kitchen order detail');assert(await kp.getByRole('button',{name:'Print invoice'}).count()===0,'Kitchen invoice action is visible');
    await kp.goto(web+'/admin/reports');await kp.waitForURL('**/admin');
    assert(errors.length===0,'Browser JavaScript errors: '+errors.join('; '));
    const result={routes:results,errors,checks:{seededMenusAvailable:true,muttonBooking34800:true,statusConfirmation:true,paymentBalance33800:true,moneyFreeKitchen:true,moneyFreeKitchenOrderDetail:true,publishedFaqVisible:true,contactStoredInInbox:true,printLayout:true,restrictedReportsDenied:true},database:'ZRC_OperationsTests'};
    fs.writeFileSync(path.join(output,'operations-browser-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1);});
