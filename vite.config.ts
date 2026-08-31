import { sites } from '@openai/sites-vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), sites()],
  server: {
    host: '127.0.0.1',
    // 素材可能在 Photoshop 等软件中被锁定。忽略该目录可避免替换图片时让开发服务退出。
    watch: {
      ignored: [
        '**/public/portfolio-assets/**',
        '**/scripts/_vendor/**',
      ],
    },
  },
});
