// Renders public/widget/screenshot.png, the picture Windows shows in its widget picker.
// Run after changing the widget design: node scripts/make-widget-screenshot.mjs
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

mkdirSync('public/widget', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 600, height: 400 } });
await page.setContent(`
  <body style="margin:0;height:400px;display:grid;place-items:center;font-family:'Segoe UI',system-ui,sans-serif;
               background:linear-gradient(165deg,#dce6ff,#e1f5eb)">
    <div style="width:520px;border-radius:28px;padding:28px 32px;background:rgba(255,255,255,.72);
                box-shadow:inset 0 1px 0 #fff,0 10px 30px rgba(0,0,0,.08);color:#1d1d1f">
      <div style="color:#0066cc;font-weight:700;font-size:18px">Now, until 12:00</div>
      <div style="font-weight:800;font-size:32px;margin-top:6px">Network Security Fundamentals</div>
      <div style="color:#6e6e73;font-size:18px">CSNS 242 in Lab 2</div>
      <div style="border-top:1px solid rgba(60,60,67,.13);margin-top:18px;padding-top:14px;font-size:18px;line-height:1.7">
        <div><b style="display:inline-block;width:110px">13:00</b>Discrete Mathematics</div>
        <div><b style="display:inline-block;width:110px">15:30</b>Database Systems</div>
      </div>
      <div style="color:#d70015;font-weight:600;font-size:17px;margin-top:12px">Due 6 Nov, 09:00: Chapter 1-4 Test</div>
    </div>
  </body>`);
await page.screenshot({ path: 'public/widget/screenshot.png' });
await browser.close();
