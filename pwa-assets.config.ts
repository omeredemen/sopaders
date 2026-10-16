import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

/**
 * Generates PWA icons from public/favicon.svg:  npm run icons
 * Maskable/Apple icons get the brand background instead of white padding.
 */
const brand = { background: '#2563eb' };

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: brand },
    apple: { ...minimal2023Preset.apple, resizeOptions: brand },
  },
  images: ['public/favicon.svg'],
});
