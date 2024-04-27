import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  output: {
    file: 'lib/huviz.dist.js',
    format: 'esm',
    sourcemap: true
  },
  input: 'src/huviz.js',
  treeshake: false,
  plugins: [nodeResolve()]
}
