import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1100, height: 600 }, deviceScaleFactor: 2 });
await page.goto('file://' + process.cwd() + '/fig.html');
await page.locator('#f').screenshot({ path: 'fig.png' });
await browser.close();
