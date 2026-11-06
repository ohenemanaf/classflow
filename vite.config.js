import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** After each build, writes dist/sw.js listing every file the app needs to run offline. */
function offlineServiceWorker() {
  let outDir;
  return {
    name: 'classflow-offline',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const files = readdirSync(outDir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => relative(outDir, join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
        .filter((file) => !file.endsWith('.map') && file !== 'sw.js')
        .sort();
      const hash = createHash('sha256');
      for (const file of files) hash.update(file).update(readFileSync(join(outDir, file)));
      const worker = readFileSync('src/sw-template.js', 'utf8')
        .replace('__VERSION__', hash.digest('hex').slice(0, 12))
        .replace('__FILES__', JSON.stringify(files.map((file) => `/${file}`)));
      writeFileSync(join(outDir, 'sw.js'), worker);
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), offlineServiceWorker()],
  build: { sourcemap: true },
  test: { include: ['tests/**/*.test.js'] },
});
