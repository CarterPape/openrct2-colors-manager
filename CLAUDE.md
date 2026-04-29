# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OpenRCT2 plugin (TypeScript) that auto-recolors stall items (balloons, umbrellas, hats, t-shirts). Forked from `wisnia74/openrct2-typescript-mod-template`. The README is still mostly the upstream template's README — don't trust it as documentation for this repo specifically.

The build target is a single `iife` bundle at `dist/Colors Manager.js` (prod) or a `commonjs` bundle copied into `${OPENRCT2_PATH}/plugin/` (dev). OpenRCT2 loads the file from its `plugin/` directory at runtime.

## Commands

- `npm run build` — production build (rollup, NODE_ENV=prod)
- `npm run build:dev` — dev build (NODE_ENV=dev, also writes to `${OPENRCT2_PATH}/plugin/` for hot reload)
- `npm run build:watch` / `npm run build:dev:watch` — same, watching `src/`
- `npm test` — Jest via `gulp test` (5 suites, 21 tests across `config/`, `utils/`, `src/`)
- `npm run test:watch`, `npm run test:coverage`
- `npm run lint` — **broken**: ESLint 9 needs flat-config migration; the repo still has `.eslintrc.json`. CI doesn't run lint, so it isn't blocking.

Node is pinned to **23.5.0** (`.nvmrc` and `engines`). CI uses `node-version-file: .nvmrc`, so updating one keeps both in sync.

For dev builds, `config/local-dev.json` must define `OPENRCT2_PATH` — without it, the dev rollup config will fail when it tries to write into the OpenRCT2 plugins directory. The file is gitignored.

## Architecture

The codebase has two distinct halves; treat them differently:

**Scaffolding** (`config/`, `utils/`, `gulp/`, `script/`, `testUtils/`, `rollup.config.*.ts`, `gulpfile.ts`) — well-typed TS, has its own Jest project (`displayName: "scaffolding"`), uses `tsconfig-paths` so root-level imports can use the `~/` alias. `config/Env.ts` is the typed wrapper around the `node-config` library; everything reads env-injected values through it. `rollup-plugin-inject-process-env` bakes `process.env.*` into the bundle at build time so the plugin can read `MOD_NAME` etc. at runtime inside OpenRCT2 (which has no `process`).

**Plugin source** (`src/`) — runs inside OpenRCT2's scripting host. Has a separate Jest project (`displayName: "mod"`) that uses `jest.setup.ts` to stub the OpenRCT2 globals (`map`, `ui`, `context`, etc.). When testing plugin code, mock the globals you need in `jest.setup.ts` the same way `map.getAllEntities` is stubbed.

Entry point chain: `src/index.ts` calls `registerPlugin({...})` → registers `src/main.ts` as the plugin's `main` → `main.ts` imports from `src/colorManager.ts` and wires up the menu item and the `action.execute` subscription.

## `src/colorManager.ts`

The whole plugin lives here: managed-item table, color/randomness state, the window widgets, and the `action.execute` subscription. Module-level singletons (`pluginEnabled`, `pluginWindow`, `actionSubscription`, `colors`, `randomness`) — fine for a plugin this small, but means there's nothing under unit test in `src/` other than the four `utils.ts` helpers.

Three behaviors worth knowing:

- The recolor logic fires on *every* `ridesetsetting` action for a managed stall (price changes included), not just appearance changes. Cheap to recompute, so it isn't worth filtering.
- `findManagedItem` prefers `shopItemSecondary` over `shopItem` — that's deliberate, because the dual-item stalls (e.g. Information Kiosk = map + umbrella) have the colored item in the secondary slot.
- "Stall" is identified by ride-type ID being one of `MANAGED_STALL_RIDE_TYPES` (`[32, 35]`, the stalls that sell the four colored items). Other classifications (`'stall'` for food/drink stalls, `'facility'` for toilets) are ignored.

## The `lib/openrct2.d.ts` gotcha

Tests reference OpenRCT2 ambient types (`Entity`, `Guest`, `Staff`, `GameMap`, etc.) that come from `lib/openrct2.d.ts`. That file is **gitignored** and fetched fresh on every CI run by `script/downloadAndSaveApiDeclarationFile.js` from `https://raw.githubusercontent.com/OpenRCT2/OpenRCT2/develop/distribution/scripting/openrct2.d.ts`.

If you ever see "tests pass locally but fail in CI" (or the reverse) with `Cannot find name 'EntityType'`-style errors, the first thing to check is whether the local file is stale relative to the upstream declaration. The download script rejects on non-200 responses, so silent 404s shouldn't recur — but if OpenRCT2 moves the file again, the script's URL is the place to fix it.

## Dependabot

`.github/dependabot.yml` runs weekly grouped npm updates (`npm-dependencies` group) and weekly github-actions updates. `.github/workflows/dependabot-auto-merge.yml` auto-merges semver-patch updates. Anything more than patch needs human review.

## Project context

Hobby project, archived path (`Developer/archive/OpenRCT/`), low-stakes. The user explicitly OKs destructive ops (force-push, bulk PR closes) when authorized in conversation — don't get extra-cautious about this repo specifically.

The README's banner says "DISCONTINUED, TREAT IT LIKE A MODDERS RESOURCE" — that's accurate. No active users to break.
