/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { buildInfo } from './vite.build-info';

const info = buildInfo();

export default defineConfig({
  base: process.env.LOGIC_BASE ?? '/',
  plugins: [react(), info.plugin],
  define: info.define,
  server: { port: 5192, open: false },
  preview: { port: 5192 },
  build: { target: 'es2020', sourcemap: false },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

