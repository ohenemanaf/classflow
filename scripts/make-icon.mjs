// Renders public/favicon.svg to the PNG icons used for install and notifications.
// The artwork stays in the middle of the canvas so Android's round masks can't clip it.
// Run after changing the icon: node scripts/make-icon.mjs
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const svg = readFileSync('public/favicon.svg', 'utf8')
  .replace(/<\?xml[^>]*\?>/, '')
  .replace(/<!--.*?-->/s, '')
  .replace('fill:#010002', 'fill:#0066cc');

const browser = await chromium.launch({ channel: 'chrome' });
for (const size of [192, 512]) {
  const art = Math.round(size * 0.52);
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<body style="margin:0;background:#ffffff;display:grid;place-items:center;height:${size}px">
      <div style="width:${art}px;height:${art}px">${svg.replace('height="800px" width="800px"', `width="${art}" height="${art}"`)}</div>
    </body>`,
  );
  await page.screenshot({ path: `public/icon-${size}.png` });
  await page.close();
}
await browser.close();
