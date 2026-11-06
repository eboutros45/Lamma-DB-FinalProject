import {test,expect} from '@playwright/test';
import {createApp} from '../server.js';
let app,base;
test.beforeAll(async()=>{app=await createApp({dataDir:'memory://'});await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${app.server.address().port}`;});
test.afterAll(async()=>{await new Promise(r=>app.server.close(r));await app.store.db.close();});
test('core workflows through the lightweight UI, including a mobile layout',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('400')&&!m.text().includes('401'))errors.push(m.text());});
 await page.setViewportSize({width:1440,height:1000});await page.goto(base);
 await page.getByRole('button',{name:'Continue as Alex'}).click();await expect(page.getByRole('heading',{name:'Hi, Alex'})).toBeVisible();
 await page.getByRole('button',{name:'Send money',exact:true}).click();await page.getByLabel('Recipient phone').fill('+96170000002');await page.getByLabel('Amount (USD)').fill('99999');await page.getByRole('button',{name:'Send money',exact:true}).last().click();await expect(page.getByRole('alert')).toContainText('Insufficient');await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByRole('button',{name:'Create wallet',exact:true}).click();await page.getByLabel('Wallet name').fill('UI test trip');await page.getByLabel('Target amount').fill('100');await page.getByRole('button',{name:'Create wallet',exact:true}).last().click();await expect(page.getByRole('heading',{name:'UI test trip'})).toBeVisible();
 await page.getByRole('button',{name:'Shared wallets',exact:true}).click();const card=page.locator('.wallet-card').filter({has:page.getByRole('heading',{name:'UI test trip'})});await card.getByRole('button',{name:'Add member'}).click();await page.getByLabel('Member phone').fill('+96170000002');await page.getByRole('button',{name:'Add member',exact:true}).last().click();await expect(card).toContainText('2 members');
 await card.getByRole('button',{name:'Add money'}).click();await page.getByLabel('Amount (USD)').fill('10');await page.getByRole('button',{name:'Add money',exact:true}).click();await expect(card).toContainText('$10.00');
 await page.getByRole('button',{name:'Expenses',exact:true}).click();await page.getByRole('button',{name:'Record expense'}).click();await page.getByLabel('Title', {exact:true}).fill('UI train ticket');await page.getByLabel('Amount (USD)').fill('15');await page.getByRole('button',{name:'Record expense',exact:true}).click();await expect(page.getByText('UI train ticket',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Bills & splits',exact:true}).click();await page.getByRole('button',{name:'View bill',exact:true}).first().click();await expect(page.getByRole('dialog')).toContainText('Mezze to share');await page.getByLabel('How would you like to pay?').selectOption('split');await page.getByRole('button',{name:'Confirm',exact:true}).click();await expect(page.getByRole('heading',{name:'Shared wallets',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Overview',exact:true}).click();await page.screenshot({path:'test-results/overview-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await expect(page.getByRole('heading',{name:'Hi, Alex'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/overview-mobile.png',fullPage:true});
 expect(errors).toEqual([]);
});
