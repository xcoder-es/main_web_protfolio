import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

import { defineConfig } from 'astro/config';

const requireFromAstro = createRequire(
  createRequire(import.meta.url).resolve('astro/package.json'),
);
const optimizerPackageResolutions = new Map(
  ['aria-query', 'axobject-query', 'html-escaper'].map((name) => [
    name,
    requireFromAstro.resolve(name),
  ]),
);

// Astro's dev-toolbar optimizer entries can fail to resolve relative imports through pnpm junctions
// on Windows. Keep this scoped to Astro's toolbar/audit dependencies.
const optimizerRelativeImportResolver = {
  name: 'optimizer-relative-import-resolver',
  setup(build) {
    build.onResolve({ filter: /^(aria-query|axobject-query|html-escaper)$/ }, (args) => {
      const path = optimizerPackageResolutions.get(args.path);
      return path ? { path } : undefined;
    });

    build.onResolve({ filter: /^\.\.?\// }, (args) => {
      if (
        !args.importer.includes('astro') &&
        !args.importer.includes('aria-query') &&
        !args.importer.includes('axobject-query')
      ) {
        return undefined;
      }

      const resolved = resolve(dirname(args.importer), args.path);
      for (const candidate of [resolved, `${resolved}.js`, join(resolved, 'index.js')]) {
        if (existsSync(candidate)) return { path: candidate };
      }
      return undefined;
    });
  },
};

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL ?? 'http://localhost:4321',
  output: 'static',
  trailingSlash: 'never',
  devToolbar: { enabled: false },
  vite: {
    optimizeDeps: {
      exclude: ['aria-query', 'axobject-query', 'astro > aria-query', 'astro > axobject-query'],
      esbuildOptions: {
        plugins: [optimizerRelativeImportResolver],
      },
    },
  },
});
