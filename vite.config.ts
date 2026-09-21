import path from "path"
import crypto from "crypto"
import fs from "fs"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

/**
 * The git blob SHA of the content file this bundle was built from.
 *
 * Admin saves write the whole content file back, so a save from a bundle older
 * than the repo silently reverts everything committed in between. Baking the
 * SHA in gives the save something to compare against: same SHA means the page
 * is current and the save is safe, a different one means reload first.
 *
 * Computed the way git does -- sha1("blob <bytes>\0" + contents) -- so it
 * matches the `sha` the GitHub contents API returns for the same file.
 */
function contentBlobSha(): string {
  const file = path.resolve(__dirname, 'src/content/site-content.json');
  const body = fs.readFileSync(file);
  const header = Buffer.from(`blob ${body.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([header, body])).digest('hex');
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __CONTENT_SHA__: JSON.stringify(contentBlobSha()),
  },
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
