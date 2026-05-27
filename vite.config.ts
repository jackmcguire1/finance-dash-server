import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        react({
            include: '**/*.{jsx,js}',
        }),
    ],
    esbuild: {
        loader: 'jsx',
        include: /src\/.*\.js$/,
        exclude: [],
    },
    optimizeDeps: {
        esbuildOptions: {
            loader: { '.js': 'jsx' },
        },
        include: ['@emotion/react', '@emotion/styled', '@mui/material', '@mui/styles'],
    },
    resolve: {
        dedupe: ['@emotion/react', '@emotion/styled', '@mui/material', '@mui/styles'],
    },
    server: {
        port: 3000,
        host: '0.0.0.0',
    },
    build: {
        outDir: 'build',
    },
});
