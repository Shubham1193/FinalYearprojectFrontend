import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
// import { defineConfig } from 'vite';
import fs from 'fs';
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // server: {
  //   https: {
  //     key: fs.readFileSync('./key.pem'),
  //     cert: fs.readFileSync('./cert.pem'),
  //   },
  // },
})
