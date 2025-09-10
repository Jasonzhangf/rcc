import dts from 'rollup-plugin-dts';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

export default {
  input: 'src/index.ts',
  output: [{ file: packageJson.types, format: 'esm' }],
  plugins: [dts()],
  external: [/\.css$/],
};