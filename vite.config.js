import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { WIDGET_TEMPLATE } from './src/widget/core.js';

/**
 * After each build: writes the widget template, then dist/sw.js listing every file the app
 * needs offline, with the shared widget code inlined (service workers can't use imports).
 */
function offlineServiceWorker() {
  let outDir;
  return {
    name: 'classflow-offline',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      mkdirSync(join(outDir, 'widget'), { recursive: true });
      writeFileSync(join(outDir, 'widget', 'template.json'), JSON.stringify(WIDGET_TEMPLATE));

      const files = readdirSync(outDir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => relative(outDir, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
        .filter((file) => !file.endsWith('.map') && file !== 'sw.js')
        .sort();
      const widgetCore = readFileSync('src/widget/core.js', 'utf8').replace(/^export /gm, '');
      const hash = createHash('sha256').update(widgetCore);
      for (const file of files) hash.update(file).update(readFileSync(join(outDir, file)));
      const worker = readFileSync('src/sw-template.js', 'utf8')
        .replace('__VERSION__', hash.digest('hex').slice(0, 12))
        .replace('__FILES__', JSON.stringify(files.map((file) => `/${file}`)))
        .replace('__WIDGET_CORE__', () => widgetCore);
      writeFileSync(join(outDir, 'sw.js'), worker);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), offlineServiceWorker()],
  build: { sourcemap: true },
  test: { include: ['tests/**/*.test.js'] },
});
