import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tailwind from 'tailwindcss';
import autoprefixer from 'autoprefixer';

/**
 * The marketing film's own Vite app. It reuses the site's drawn Arcatext views
 * (src/components/ArcatextViews.tsx) and palette, but is never part of the
 * site build: `npm run build` only bundles ../index.html.
 */
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, '../src') } },
  css: { postcss: { plugins: [tailwind({ config: path.resolve(__dirname, 'tailwind.config.ts') }), autoprefixer()] } },
  server: { port: 5199, strictPort: true, fs: { allow: [path.resolve(__dirname, '..')] } },
});
