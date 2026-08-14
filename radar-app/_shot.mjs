import { chromium } from '@playwright/test';
const EXE = 'C:/Users/zhangc257/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe';
const browser = await chromium.launch({ executablePath: EXE });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
for (const [name, url] of [
  ['today', 'http://localhost:3000/'],
  ['event', 'http://localhost:3000/events/evt_3fa3c097c8f1'],
  ['settings', 'http://localhost:3000/settings'],
]) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `D:/radar/radar-app/_shot-${name}.png`, fullPage: true });
  console.log('shot', name);
}
await browser.close();
