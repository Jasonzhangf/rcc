import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.js',
    format: 'cjs',
    exports: 'auto',
    sourcemap: true
  },
  external: [
    'rcc-basemodule',
    'uuid',
    'ajv',
    'chokidar',
    'fs-extra',
    'lodash'
  ],
  plugins: [
    nodeResolve({
      preferBuiltins: true
    }),
    typescript({
      typescript: require('typescript'),
      tsconfig: './tsconfig.json',
      clean: true,
      exclude: ['**/__test__/**', '**/*.test.ts']
    })
  ]
};