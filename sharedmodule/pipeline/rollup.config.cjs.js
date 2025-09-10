import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

export default [
  // CommonJS bundle
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.main,
        format: 'cjs',
        sourcemap: true,
      }
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: true,
      }),
      typescript({
        tsconfig: './tsconfig.rollup.json',
        useTsconfigDeclarationDir: true,
      }),
    ],
    external: [
      'uuid',
      'axios',
    ],
  },
  // ES module bundle
  {
    input: 'src/index.ts',
    output: [
      {
        file: packageJson.module,
        format: 'es',
        sourcemap: true,
      }
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: true,
      }),
      typescript({
        tsconfig: './tsconfig.rollup.json',
        useTsconfigDeclarationDir: true,
      }),
    ],
    external: [
      'uuid',
      'axios',
    ],
  }
];