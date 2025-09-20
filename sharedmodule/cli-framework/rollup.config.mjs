import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import { createRequire } from 'module';
import commonjs from '@rollup/plugin-commonjs';

const require = createRequire(import.meta.url);
const packageJson = require('./package.json');

export default defineConfig({
  input: 'src/index.ts',
  output: [
    {
      file: packageJson.main,
      format: 'esm',
      sourcemap: true,
      exports: 'named',
    },
  ],
  external: [
    'rcc-basemodule',
    'glob',
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {})
  ],
  plugins: [
    nodeResolve({
      preferBuiltins: false,
    }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      module: 'ESNext',
      moduleResolution: 'node',
    }),
    {
      name: 'replace-__dirname',
      resolveId(id) {
        if (id === '__dirname' || id === '__filename') {
          return id;
        }
        return null;
      },
      load(id) {
        if (id === '__dirname') {
          return 'export default import.meta.url;';
        }
        if (id === '__filename') {
          return 'export default import.meta.url;';
        }
        return null;
      }
    }
  ],
});