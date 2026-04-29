import path from 'path';
import type { RollupOptions } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import injectProcessEnv from 'rollup-plugin-inject-process-env';
import config from './config';
import { paths } from './utils';

export default <RollupOptions>{
    input: path.join(paths.src, 'index.ts'),
    output: [
        {
            file: path.join(paths.dist, `${config.getString('MOD_NAME')}.js`),
            format: 'iife',
        },
    ],
    plugins: [
        json({ compact: true }),
        injectProcessEnv(config.getEnvConfigObject()),
        typescript({ target: 'es5' }),
    ],
};
