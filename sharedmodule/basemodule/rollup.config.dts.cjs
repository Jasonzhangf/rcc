const dts = require('rollup-plugin-dts').default;

const packageJson = require('./package.json');

module.exports = {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.d.ts',
      format: 'esm',
    },
  ],
  plugins: [dts()],
  external: [/\.css$/],
};