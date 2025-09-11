import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  input: 'src/index-simple.js',
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
  ],
  external: [
    'rcc-basemodule',
    'rcc-errorhandling',
    'uuid',
    'axios'
  ],
};