import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true,
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
    'rcc-basemodule',
    'rcc-underconstruction',
    'rcc-virtual-model-rules'
  ],
};