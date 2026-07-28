/// <reference types="vitest/config" />
import { cpSync, existsSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vitest/config';

// Resolve paths relative to this config file (the repo root), not the
// process working directory — protects against tools that cd elsewhere.
const fromRoot = (p: string): string => fileURLToPath(new URL(p, import.meta.url));

// Copies files that must exist in dist/ byte-for-byte at stable URLs:
//  - assets/        → the OG image absolute URL, fonts/images fetched at runtime
//  - .well-known/   → app-association files; law: copied verbatim, never edited
//  - site.webmanifest, _headers → must sit at the dist root for Cloudflare
function copyStaticPassthrough(): Plugin {
  const entries = ['assets', '.well-known', 'site.webmanifest', '_headers'];
  return {
    name: 'fulus:copy-static-passthrough',
    apply: 'build',
    closeBundle() {
      for (const entry of entries) {
        const from = fromRoot(`./${entry}`);
        if (!existsSync(from)) continue;
        cpSync(from, fromRoot(`./dist/${entry}`), { recursive: true });
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
