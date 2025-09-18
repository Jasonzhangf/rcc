const { dts } = require('rollup-plugin-dts');

const packageJson = require('./package.json');

module.exports = {
  input: 'dist/dts/src/index.d.ts',
  output: [{ file: 'dist/index.esm.d.ts', format: 'esm' }],
  plugins: [dts()],
  external: [/\.css$/],
};