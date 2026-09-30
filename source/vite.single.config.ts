/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { buildInfo } from './vite.build-info';

const info = buildInfo();

/** Single-file build: everything (JS, CSS, fonts) inlined into dist-single/index.html. */
export default defineConfig({
  plugins: [react(), viteSingleFile()],
  define: info.define,
  build: { outDir: 'dist-single', target: 'es2020', assetsInlineLimit: 1e9, cssCodeSplit: false, sourcemap: false },
});

