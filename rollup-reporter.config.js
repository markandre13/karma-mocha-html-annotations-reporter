import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'src/wrapper.ts',
    output: {
      file: 'dist/reporter.js',
      format: 'iife' // iife (browser), cjs (node), umd (browser+node), system, es, amd
    },
    plugins: [
        nodeResolve(),
        commonjs(),
        typescript({
            tsconfig: false,
            jsx: "react",
            jsxFactory: "MochaHtmlAnnotationsReporter.jsx",
            include: [
                "src/**/*.tsx",
                "src/**/*.ts"
            ]
        })
    ]
}
