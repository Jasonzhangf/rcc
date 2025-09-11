import resolve from '@rollup/plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/index.esm.js',
    format: 'es',
    sourcemap: true
  },
  external: ['rcc-basemodule', 'uuid', 'minimist', 'glob', 'chokidar', 'fs', 'path', 'os', 'child_process', 'util'],
  plugins: [
    resolve({
      preferBuiltins: true
    }),
    typescript({

      tsconfig: './tsconfig.json',
      clean: true
    })
  ]
};