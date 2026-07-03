// esbuild build for the Colors Manager plugin. Replaces the old gulp + rollup (+ 5 rollup plugins) + ts-node + node-config stack with one script.
//
// Prod  → dist/Colors Manager.js       (iife, what OpenRCT2 loads for release)
// Dev   → dist/Colors Manager_dev.js   (cjs) + a copy into the game's plugin dir
//
// Target es2018: OpenRCT2 (well past v0.5.0) runs modern JS, but the one >ES2015 bit of source is the optional chain `actionSubscription?.dispose()`. es2018 makes esbuild lower that, so the bundle needs no `?.` support at runtime. esbuild can't emit ES5, but this plugin doesn't need pre-0.5.0 compatibility. 🎢

import esbuild from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const MOD_NAME = 'Colors Manager';

const dev = process.argv.includes('--dev');
const watch = process.argv.includes('--watch');

const outFile = join('dist', dev ? `${MOD_NAME}_dev.js` : `${MOD_NAME}.js`);

// Where to drop the dev bundle for OpenRCT2 hot-reload: env var wins, else the gitignored config/local-dev.json (plain JSON.parse replaces node-config). 📁
function openrct2PluginDir() {
    if (process.env.OPENRCT2_PATH) return join(process.env.OPENRCT2_PATH, 'plugin');
    if (existsSync('config/local-dev.json')) {
        const { OPENRCT2_PATH } = JSON.parse(readFileSync('config/local-dev.json', 'utf8'));
        if (OPENRCT2_PATH) return join(OPENRCT2_PATH, 'plugin');
    }
    throw new Error(
        'Dev build needs OPENRCT2_PATH (env var or config/local-dev.json) to know where to copy the plugin.',
    );
}

// Mirror each successful dev build into the game's plugin dir. 📦
const copyToGamePlugin = {
    name: 'copy-to-openrct2',
    setup(build) {
        const dest = join(openrct2PluginDir(), `${MOD_NAME}_dev.js`);
        build.onEnd((result) => {
            if (result.errors.length) return;
            mkdirSync(dirname(dest), { recursive: true });
            copyFileSync(outFile, dest);
            console.log(`📦 copied → ${dest}`);
        });
    },
};

/** @type {import('esbuild').BuildOptions} */
const options = {
    entryPoints: ['src/index.ts'],
    outfile: outFile,
    bundle: true,
    format: dev ? 'cjs' : 'iife',
    target: 'es2018',
    logLevel: 'info',
    plugins: dev ? [copyToGamePlugin] : [],
};

if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log(`👀 watching ${dev ? 'dev (cjs)' : 'prod (iife)'}…`);
} else {
    await esbuild.build(options);
}
