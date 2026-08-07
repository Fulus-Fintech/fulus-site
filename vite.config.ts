/// <reference types="vitest/config" />
import { cpSync, existsSync } from 'node:fs';
import { relative } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';

// Resolve paths relative to this config file (the repo root), not the
// process working directory — protects against tools that cd elsewhere.
const fromRoot = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

// Pipeline INPUTS that live under assets/ but are never served. The six
// full-scene cast originals (~1.3 MB each) and their ISNet mattes feed
// tools/isnet_matte.mjs → tools/process_figures.mjs, which write the
// frames the site actually references into assets/images/cast/. Copying
// them would publish ~7.7 MB of unreferenced source art on every deploy.
const PASSTHROUGH_EXCLUDE = ['assets/images/cast-src'];

/** True when a repo-relative path belongs in dist/. Exported for tests. */
export function isPublishedStatic(repoRelativePath: string): boolean {
  const rel = repoRelativePath.replace(/\\/g, '/').replace(/\/+$/, '');
  return !PASSTHROUGH_EXCLUDE.some((dir) => rel === dir || rel.startsWith(`${dir}/`));
}

// Copies files that must exist in dist/ byte-for-byte at stable URLs:
//  - assets/        → the OG image absolute URL, fonts/images fetched at runtime
//  - .well-known/   → app-association files; law: copied verbatim, never edited
//  - site.webmanifest, _headers → must sit at the dist root for Cloudflare
function copyStaticPassthrough(): Plugin {
  const entries = ['assets', '.well-known', 'site.webmanifest', '_headers'];
  const root = fromRoot('.');
  return {
    name: 'fulus:copy-static-passthrough',
    apply: 'build',
    closeBundle() {
      for (const entry of entries) {
        const from = fromRoot(`./${entry}`);
        if (!existsSync(from)) continue;
        cpSync(from, fromRoot(`./dist/${entry}`), {
          recursive: true,
          filter: (src) => isPublishedStatic(relative(root, src)),
        });
      }
    },
  };
}

export default defineConfig({
  build: {
    // The current privacy.html inline module uses top-level await; Vite's
    // default target rejects it. ES2022 is safe for every browser this
    // site supports.
    target: 'es2022',
    rollupOptions: {
      input: {
        index: fromRoot('./index.html'),
        privacy: fromRoot('./privacy.html'),
        // Both are legal requirements, not marketing pages. /terms is linked
        // from inside the shipped app binary (kTermsUrl), and Google Play
        // requires a public account-deletion URL. Omitting either from this
        // input list builds a site where those URLs 404 — which is how /terms
        // came to 404 in the first place.
        terms: fromRoot('./terms.html'),
        'delete-account': fromRoot('./delete-account.html'),
      },
      output: {
        manualChunks: { three: ['three'] },
      },
    },
  },
  plugins: [copyStaticPassthrough()],
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
    passWithNoTests: true,
  },
});
