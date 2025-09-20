import { defineConfig } from 'rollup';
import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import dts from 'rollup-plugin-dts';

import { readFileSync } from 'fs';
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

export default [
  // ESM build
  defineConfig({
    input: 'index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'esm',
        sourcemap: true,
      },
    ],
    external: [
      'rcc-basemodule',
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.peerDependencies || {})
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: false,
      }),
      typescript({
        tsconfig: './tsconfig.json',
        useTsconfigDeclarationDir: false,
        declaration: false,
        declarationDir: undefined,
      }),
    ],
  }),

  // Type definitions
  defineConfig({
    input: './dist/index.d.ts',
    output: [{ file: './dist/index.d.ts', format: 'esm' }],
    plugins: [dts()],
    external: [/\.ts$/],
  }),
];