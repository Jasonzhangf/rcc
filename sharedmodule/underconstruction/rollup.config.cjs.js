import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const packageJson = require('./package.json');

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true,
    },
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
    'uuid',
    'rcc-basemodule'
  ],
};