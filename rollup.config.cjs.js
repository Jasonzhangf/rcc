const typescript = require('rollup-plugin-typescript2');
const dts = require('rollup-plugin-dts');
const { nodeResolve } = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');

const packageJson = require('./package.json');

module.exports = {
  input: 'src/index.ts',
  output: [
    {
      file: packageJson.main,
      format: 'cjs',
      sourcemap: true,
      inlineDynamicImports: true,
    },
    {
      file: packageJson.module,
      format: 'esm',
      sourcemap: true,
      inlineDynamicImports: true,
    },
  ],
  plugins: [
    json(),
    nodeResolve({
      preferBuiltins: true,
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      useTsconfigDeclarationDir: true,
    }),
  ],
  external: [
    'uuid',
    'axios',
    'commander',
    'rcc-errorhandling',
    'rcc-pipeline',
    'rcc-basemodule',
    'rcc-server',
    'rcc-config-parser',
    'rcc-underconstruction',
    'rcc-virtual-model-rules',
  ],
};