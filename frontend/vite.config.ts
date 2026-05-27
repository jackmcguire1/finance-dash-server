import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    optimizeDeps: {
        include: [
            '@emotion/react',
            '@emotion/react/jsx-dev-runtime',
            '@emotion/react/jsx-runtime',
            '@emotion/styled',
            '@mui/material',
            '@mui/icons-material',
        ],
    },
    resolve: {
        dedupe: ['@emotion/react', '@emotion/styled', '@mui/material', '@mui/styles'],
        extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
    },
    server: {
        port: 3000,
        host: '0.0.0.0',
    },
    build: {
        outDir: 'build',
    },
});
