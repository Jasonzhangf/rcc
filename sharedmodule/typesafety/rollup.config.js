import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';

export default defineConfig([
  // ES Module build
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist',
      format: 'es',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src'
    },
    plugins: [
      nodeResolve({
        preferBuiltins: true,
        exportConditions: ['node', 'import', 'default']
      }),
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist',
        outDir: 'dist'
      }),
      json()
    ],
    external: [
      'zod',
      'fs',
      'fs/promises',
      'path',
      'os',
      'process',
      'child_process',
      'url',
      'uuid',
      'rcc-basemodule',
      'rcc-errorhandling'
    ]
  },
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      dir: 'dist/cjs',
      format: 'cjs',
      sourcemap: true,
      preserveModules: true,
      preserveModulesRoot: 'src'
    },
    plugins: [
      nodeResolve({
        preferBuiltins: true,
        exportConditions: ['node', 'require', 'default']
      }),
      typescript({
        tsconfig: './tsconfig.cjs.json',
        outDir: 'dist/cjs'
      }),
      json()
    ],
    external: [
      'zod',
      'fs',
      'fs/promises',
      'path',
      'os',
      'process',
      'child_process',
      'url',
      'uuid',
      'rcc-basemodule',
      'rcc-errorhandling'
    ]
  }
]);