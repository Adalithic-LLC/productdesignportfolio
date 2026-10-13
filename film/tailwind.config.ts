// The site's Tailwind config, scanning the film and the site views it reuses.
import base from '../tailwind.config.js';

export default {
  ...base,
  content: [
    './film/index.html',
    './film/src/**/*.{ts,tsx}',
    './src/components/ArcatextViews.tsx',
    './src/lib/arcatextTheme.tsx',
  ],
};
