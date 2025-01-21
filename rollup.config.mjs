import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default {
    input: 'main.js',
    output: [
        {
            file: 'dist/js/index.js',
            format: 'esm',
        },
        {
            file: 'dist/js/index.min.js',
            format: 'esm',
            plugins: [terser()],
        }
    ],
    plugins: [
        nodeResolve(),
        commonjs(),
    ]
};
