import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../nullpoga_server/static', // ここでビルド先のパスを指定します
    emptyOutDir: true, // ビルド前に出力ディレクトリを空にする
  },
});
