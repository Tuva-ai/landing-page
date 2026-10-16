// Records the demo: real Tuva 0.1.15 renderer + mock bridge, scripted mouse, 2x CDP screencast.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('frames');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);

const browser = await chromium.launch({ channel: 'chrome', args: ['--window-size=1440,987', '--hide-scrollbars', '--force-device-scale-factor=2'] });
const page = await browser.newPage({ viewport: null });
page.on('pageerror', (e) => console.log('pageerror', e.message));

await page.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.id = '__cursor';
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2 L4 19 L8.5 14.8 L11.6 21.6 L14.4 20.4 L11.3 13.7 L17.4 13.4 Z" fill="#111" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: 2147483647, pointerEvents: 'none', transform: 'translate(720px, 520px)', filter: 'drop-shadow(0 1px 1.5px rgba(0,0,0,.35))' });
    document.body.appendChild(c);
    addEventListener('mousemove', (e) => { c.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 2}px)`; }, true);
    addEventListener('mousedown', () => { c.style.scale = '0.85'; }, true);
    addEventListener('mouseup', () => { c.style.scale = '1'; }, true);
  });
});

await page.goto('http://localhost:8790/');
await page.evaluate(() => Object.assign(window.__demo, { thinkMs: 500, chunkMs: 9, runMs: 3200, ccMs: 600 }));
await page.waitForTimeout(3000);

const sleep = (ms) => page.waitForTimeout(ms);
let mx = 720, my = 520;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
async function moveTo(x, y, ms = 650) {
  const steps = Math.max(8, Math.round(ms / 16));
  const sx = mx, sy = my;
  for (let i = 1; i <= steps; i++) {
    const k = ease(i / steps);
    await page.mouse.move(sx + (x - sx) * k, sy + (y - sy) * k);
    await sleep(ms / steps);
  }
  mx = x; my = y;
}
async function at(locator) {
  await locator.scrollIntoViewIfNeeded();
  const b = await locator.boundingBox();
  if (!b) throw new Error('no box for ' + locator);
  return [b.x + b.width / 2, b.y + b.height / 2];
}
async function click(locator, { ms = 650, hold = 100 } = {}) {
  const [x, y] = await at(locator);
  await moveTo(x, y, ms);
  await sleep(hold);
  await page.mouse.down();
  await sleep(70);
  await page.mouse.up();
}
async function scrollBy(dy, ms = 900) {
  const steps = Math.round(ms / 16);
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await sleep(16); }
}
let tseed = 11;
const trand = () => ((tseed = (tseed * 9301 + 49297) % 233280) / 233280);
async function humanType(text) {
  const slipAt = text.indexOf('finding') + 3;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (i === slipAt) {
      await page.keyboard.type('q'); await sleep(110 + trand() * 60);
      await page.keyboard.press('Backspace'); await sleep(70 + trand() * 40);
    }
    await page.keyboard.type(ch);
    let d = 32 + trand() * 46;
    if (ch === ' ') d += 25 + trand() * 70;
    if (trand() < 0.04) d += 160;
    await sleep(d * 0.7);
  }
}
const nav = (label) => page.getByText(label, { exact: true }).first();

const cdp = await page.context().newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  const file = path.join(OUT, `f${String(frames.length).padStart(5, '0')}.jpg`);
  fs.writeFileSync(file, Buffer.from(data, 'base64'));
  frames.push({ file, t: metadata.timestamp });
  try { await cdp.send('Page.screencastFrameAck', { sessionId }); } catch {}
});
const dims = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
if (dims.join() !== '1440,900,2') throw new Error('bad viewport ' + dims);
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 96, maxWidth: 2880, maxHeight: 1800, everyNthFrame: 1 });
const t0 = Date.now();
const mark = (s) => console.log(((Date.now() - t0) / 1000).toFixed(1).padStart(5), s);

// 1 — The digest: a paper Rao found on its own, and why it fits.
mark('digest');
await sleep(400);
await click(nav('Digest'), { ms: 700 });
await sleep(800);
{
  const why = page.getByText('Why this', { exact: false }).first();
  const b = await why.boundingBox();
  await moveTo(b.x + 40, b.y + 28, 500);
  await moveTo(b.x + 520, b.y + 60, 1600);
}
await sleep(500);

// 2 — Hand it to an agent: one short request, approve, it works in the background.
mark('chat');
await click(nav('Chats'), { ms: 600 });
await sleep(350);
await click(page.locator('textarea').first(), { ms: 500 });
await humanType("Test the Okafor 2026 paper's finding on my rewatering data");
await sleep(250);
await page.keyboard.press('Enter');
const launch = page.getByRole('button', { name: 'Launch', exact: true });
await launch.waitFor({ timeout: 15000 });
await moveTo(900, 640, 500);
await sleep(1300);
mark('launch');
await click(launch, { ms: 600 });
await page.getByText('Agent launched').first().waitFor({ timeout: 10000 });
await sleep(400);
await moveTo(330, 162, 700); // glance at the "1 running" pill
await sleep(700);
await moveTo(820, 470, 700);
await page.getByText('Agent completed').first().waitFor({ timeout: 20000 });
mark('completed');
await sleep(1200);
await click(page.locator('button[title="Open the agent"]').last(), { ms: 700 });
await sleep(900);
await moveTo(820, 560, 400);
await scrollBy(260, 700);
await sleep(2200);

// 3 — It remembers: the agent's finding lands in research memory.
mark('memory');
await click(nav('Research memory'), { ms: 650 });
await sleep(900);
const row = (name) => page.locator('button.state-tr-head').filter({ hasText: name }).first();
await click(row('Key results'), { ms: 550 });
await sleep(1500);
await click(row('Recent work'), { ms: 500 });
await sleep(400);
await scrollBy(260, 600);
await sleep(1800);
mark('end');

await cdp.send('Page.stopScreencast');
await sleep(300);
fs.writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify(frames));
console.log('frames', frames.length);
await browser.close();
