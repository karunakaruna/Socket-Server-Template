// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // replace with your backend server address
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // ... other configurations
});
