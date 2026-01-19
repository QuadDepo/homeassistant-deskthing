import { build as viteBuild } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Custom esbuild config for DeskThing CLI packaging.
 * This adds a plugin that builds the config-ui and copies it to the server folder
 * so it gets included in the package.
 */

const configUiPlugin = {
  name: 'config-ui-builder',
  setup(esbuild) {
    esbuild.onEnd(async (result) => {
      if (result.errors.length > 0) {
        console.log('\x1b[31m%s\x1b[0m', '❌ Server build failed, skipping config-ui build');
        return;
      }

      console.log('\x1b[33m%s\x1b[0m', '🏗️ Building Config UI...');

      try {
        await viteBuild({
          root: './config-ui',
          base: './',
          plugins: [react()],
          build: {
            outDir: '../dist/server/config-ui',
            emptyOutDir: true,
          },
          logLevel: 'warn',
        });

        console.log('\x1b[32m%s\x1b[0m', '✅ Config UI built successfully!');
      } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', '❌ Config UI build failed:', error);
      }
    });
  },
};

export default {
  plugins: [configUiPlugin],
};
