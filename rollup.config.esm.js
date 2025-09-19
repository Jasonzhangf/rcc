import { dts } from 'rollup-plugin-dts';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const packageJson = require('./package.json');

export default {
  input: 'dist/dts/src/index.d.ts',
  output: [{ file: 'dist/index.esm.d.ts', format: 'esm' }],
  plugins: [dts()],
  external: [/\.css$/],
};