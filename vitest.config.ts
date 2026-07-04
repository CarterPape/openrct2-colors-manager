import { defineConfig } from 'vitest/config';

// Vitest runs the plugin's test suite. It transforms TS with esbuild — the same engine build.mjs ships the plugin through — so tests exercise the code the way it's bundled, in Node (OpenRCT2's QuickJS runtime is out of scope; the real-game check is the manual openrct2-probe live bridge, since this `type: 'local'` plugin's subscription can't arm headless).
export default defineConfig({
    test: {
        environment: 'node',
        include: ['test/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            // Scope coverage to the pure decision module. The game-coupled glue in colorManager.ts (executeAction, subscribe, ui/window rendering) is verified additively by test/colorManager.behavior.test.ts and by the manual probe — it isn't measured here, so it can't drag the number, and we don't have to mock-render windows to hit a floor.
            include: ['src/recolorLogic.ts'],
            // Hard floor at 100 (lines) — the manual "coverage never decreases" guard, since no TS ratchet convention applies. recolorLogic.ts is entirely pure and coverable, so a drop below 100 ALWAYS means a pure line went untested: the fix is to add a test, never to lower this floor.
            thresholds: { lines: 100 },
        },
    },
});
