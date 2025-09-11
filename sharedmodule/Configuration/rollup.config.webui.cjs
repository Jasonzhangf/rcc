import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/webui/main.ts',
  output: {
    file: 'dist/webui/main.js',
    format: 'esm',
    sourcemap: true
  },
  external: [
    'express',
    'fs',
    'fs/promises',
    'path',
    'url',
    'rcc-basemodule'
  ],
  plugins: [
    nodeResolve({
      preferBuiltins: true
    }),
    commonjs(),
    typescript({
      typescript: require('typescript'),
      tsconfig: './tsconfig.json',
      clean: true,
      exclude: ['**/__test__/**', '**/*.test.ts']
    })
  ]
};