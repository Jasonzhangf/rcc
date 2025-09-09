// Rollup configuration for ESM build
import typescript from 'rollup-plugin-typescript2';
import { resolve } from 'path';

const external = [
  'fs-extra',
  'uuid',
  'joi', 
  'lodash',
  'path',
  'os',
  'fs',
  'crypto'
];

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    }
  ],
  external,
  plugins: [
    typescript({
      typescript: require('typescript'),
      tsconfig: resolve(__dirname, 'tsconfig.json'),
      tsconfigOverride: {
        compilerOptions: {
          module: 'ES2015',
          target: 'ES2020',
          declaration: false
        }
      }
    })
  ]
};