import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        // Proxy /api/agent/* requests to FastAPI backend
        '/api/agent': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        '/api/builder': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        '/health': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-markdown': ['react-markdown', 'rehype-highlight'],
            'vendor-pdf': ['pdfjs-dist', 'jspdf', 'pdfkit'],
            'vendor-office': ['xlsx', 'mammoth'],
            'vendor-ui': ['lucide-react', 'date-fns'],
          }
        }
      }
    }
  };
});
