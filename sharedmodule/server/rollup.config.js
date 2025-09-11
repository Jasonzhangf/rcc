import { defineConfig } from 'rollup';
import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import dts from 'rollup-plugin-dts';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const packageJson = require('./package.json');

export default [
  // ESM build
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'esm',
        sourcemap: true,
        exports: 'named'
      }
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: false,
        browser: false
      }),
      typescript({
        tsconfig: './tsconfig.json',
        useTsconfigDeclarationDir: true,
        declaration: false,
        declarationDir: null
      })
    ],
    external: [
      'express',
      'cors',
      'helmet',
      'compression',
      'body-parser',
      'uuid',
      'rcc-basemodule',
      'rcc-underconstruction',
      'rcc-virtual-model-rules'
    ]
  },
  // Type definitions
  {
    input: 'src/index.ts',
    output: [{ file: 'dist/index.d.ts', format: 'esm' }],
    plugins: [
      dts({
        respectExternal: true,
        compilerOptions: {
          baseUrl: '.',
          paths: {
            '@/*': ['src/*']
          }
        }
      })
    ],
    external: [
      'express',
      'cors',
      'helmet',
      'compression',
      'body-parser',
      'uuid',
      'rcc-basemodule',
      'rcc-underconstruction',
      'rcc-virtual-model-rules'
    ]
  }
];