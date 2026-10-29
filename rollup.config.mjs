import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

const basedir = dirname(fileURLToPath(import.meta.url));

const paths = [['index.mjs']];

const plugins = [nodeResolve(), terser()];

export default [
	...paths.map((p) => ({
		input: join(basedir, 'web', 'script', ...p),
		output: {
			file: join(basedir, 'build', 'static', ...p),
			format: 'esm',
		},
		plugins,
	})),
	{
		input: join(basedir, 'src', 'solver', 'live-solver-worker.mjs'),
		output: {
			file: join(basedir, 'build', 'static', 'live-solver-worker.mjs'),
			format: 'esm',
		},
		plugins,
	},
];
