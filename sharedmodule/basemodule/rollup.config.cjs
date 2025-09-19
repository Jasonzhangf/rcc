const typescript = require('rollup-plugin-typescript2');
const dts = require('rollup-plugin-dts');
const { nodeResolve } = require('@rollup/plugin-node-resolve');

const packageJson = require('./package.json');

module.exports = {
  input: 'src/index.ts',
  output: [
    {
      file: packageJson.main,
      format: 'esm',
      sourcemap: true,
    },
    {
      file: packageJson.module,
      format: 'esm',
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
  ],
};