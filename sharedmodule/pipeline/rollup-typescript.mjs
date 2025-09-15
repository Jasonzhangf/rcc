import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
    },
    {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true,
    }
  ],
  plugins: [
    nodeResolve({
      preferBuiltins: true,
    }),
    typescript({
      tsconfig: './tsconfig.json',
      useTsconfigDeclarationDir: true,
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts']
    }),
  ],
  external: [
    'rcc-basemodule',
    'rcc-errorhandling',
    'rcc-virtual-model-rules',
    'rcc-configuration',
    'webauto-pipelineframework',
    'uuid',
    'axios'
  ],
};