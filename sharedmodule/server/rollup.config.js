import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: [
    {
      dir: 'dist',
      format: 'es',
      sourcemap: true,
      entryFileNames: '[name].js',
      chunkFileNames: '[name]-[hash].js'
    }
  ],
  plugins: [
    nodeResolve({
      preferBuiltins: false,
    }),
    typescript({
      tsconfig: './tsconfig.json',
      useTsconfigDeclarationDir: true,
      declaration: true,
      declarationDir: 'dist',
    }),
  ],
  external: [
    'express',
    'cors',
    'helmet',
    'compression',
    'body-parser',
    'uuid',
    'rcc-underconstruction',
    'rcc-dynamic-routing-classification',
    'axios',
    'form-data',
    'http',
    'https',
    'util',
    'stream',
    'zlib',
    'events',
    'url',
    'fs',
    'path',
    'crypto',
    'os',
    'node:fs/promises',
    'node:process',
    'node:buffer',
    'node:url',
    'node:path',
    'node:util',
    'node:child_process',
    'node:fs',
    'node:os'
  ],
};