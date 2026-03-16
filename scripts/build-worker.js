/**
 * Worker 빌드 - body-parser를 스텁으로 대체
 */
import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

await esbuild.build({
  entryPoints: [path.join(root, 'worker.js')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'esnext',
  outfile: path.join(root, 'dist', 'worker.js'),
  alias: {
    'body-parser': './stub/body-parser.cjs',
  },
  external: ['cloudflare:workers', 'cloudflare:node'],
  mainFields: ['module', 'main'],
});
