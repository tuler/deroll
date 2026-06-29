import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import { vocs } from 'vocs/vite';

// This package.json is CommonJS ("type" unset), so vite emits the docs ESM
// server entries as .mjs — but waku resolves them as dist/server/*.js
// (`vocs build` fails at the SSG step otherwise). Force .js entry names and
// mark dist/ as ESM so node still loads them as ES modules.
const esmDist: Plugin = {
    name: 'docs:esm-dist',
    apply: 'build',
    writeBundle() {
        fs.mkdirSync('dist', { recursive: true });
        fs.writeFileSync(path.join('dist', 'package.json'), `{ "type": "module" }\n`);
    },
};

// Replicates what `vocs build` does (vocs/dist/cli.js), which cannot be used
// directly because it runs vite with `configFile: false`, ignoring this file.
// Build with `vite build --app` instead (the docs:build script).
export default defineConfig({
    plugins: [react(), vocs(), esmDist],
    environments: {
        rsc: { build: { rolldownOptions: { output: { entryFileNames: '[name].js' } } } },
        ssr: { build: { rolldownOptions: { output: { entryFileNames: '[name].js' } } } },
    },
});
