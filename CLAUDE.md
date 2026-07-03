# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OpenRCT2 plugin (TypeScript) that auto-recolors stall items (balloons, umbrellas, hats, t-shirts). Forked from `wisnia74/openrct2-typescript-mod-template`. The README is still mostly the upstream template's README — don't trust it as documentation for this repo specifically.

The build target is a single `iife` bundle at `dist/Colors Manager.js` (prod) or a `commonjs` bundle copied into `${OPENRCT2_PATH}/plugin/` (dev). OpenRCT2 loads the file from its `plugin/` directory at runtime.

The whole toolchain is **esbuild + typescript** — just two dev-dependencies. `build.mjs` (plain Node ESM) drives esbuild; `tsc --noEmit` does typechecking. The old template stack (gulp, rollup + plugins, ts-node, node-config, jest, ESLint, husky, core-js) was cut in favor of this; don't expect any of it.

## Commands

- `npm run build` — production build → `dist/Colors Manager.js` (iife)
- `npm run build:dev` — dev build → `dist/Colors Manager_dev.js` (cjs), also copied into `${OPENRCT2_PATH}/plugin/` for hot reload
- `npm run watch` / `npm run watch:dev` — same as the two above, rebuilding on `src/` changes
- `npm run typecheck` — `tsc --noEmit` against `src/` + `lib/openrct2.d.ts`. This is the only correctness gate (there are no unit tests); CI runs it.

Node floor is **Node ≥ 20** (`engines`); `.nvmrc` pins **22** (LTS) and CI reads `node-version-file: .nvmrc`.

For dev builds, `build.mjs` needs `OPENRCT2_PATH` to know where to copy the plugin: it reads the `OPENRCT2_PATH` env var first, then falls back to a gitignored `config/local-dev.json` (`{ "OPENRCT2_PATH": "…" }`). Without either, a dev build errors out. Prod builds don't need it.

## Architecture

`build.mjs` bundles `src/index.ts` into one self-contained file (no `node_modules` at runtime — OpenRCT2's scripting host has no module system beyond what the bundle inlines). `lib/openrct2.d.ts` supplies the ambient globals (`ui`, `context`, `map`, `registerPlugin`, …) for typechecking only; it emits nothing and is never imported.

Entry point chain: `src/index.ts` calls `registerPlugin({...})` → registers `src/main.ts` as the plugin's `main` → `main.ts` imports from `src/colorManager.ts` and wires up the menu item and the `action.execute` subscription. `src/pluginMeta.ts` holds the `MOD_NAME` / `MOD_AUTHOR` constants (formerly injected via node-config + rollup's inject-process-env; now just hardcoded, since a single plugin doesn't need build-time env injection).

## `src/colorManager.ts`

The whole plugin lives here: managed-item table, color/randomness state, the window widgets, and the `action.execute` subscription. Module-level singletons (`pluginEnabled`, `pluginWindow`, `actionSubscription`, `colors`, `randomness`) — fine for a plugin this small. There are no unit tests; `tsc --noEmit` is the safety net.

Three behaviors worth knowing:

- The recolor logic fires on *every* `ridesetsetting` action for a managed stall (price changes included), not just appearance changes. Cheap to recompute, so it isn't worth filtering.
- `findManagedItem` prefers `shopItemSecondary` over `shopItem` — that's deliberate, because the dual-item stalls (e.g. Information Kiosk = map + umbrella) have the colored item in the secondary slot.
- "Stall" is identified by ride-type ID being one of `MANAGED_STALL_RIDE_TYPES` (`[32, 35]`, the stalls that sell the four colored items). Other classifications (`'stall'` for food/drink stalls, `'facility'` for toilets) are ignored.

## The `lib/openrct2.d.ts` gotcha

The plugin uses OpenRCT2 ambient types (`Ride`, `Window`, `WidgetDesc`, `ColourPickerWidget`, etc.) that come from `lib/openrct2.d.ts`. That file is **gitignored** and fetched fresh on every CI run by `script/downloadAndSaveApiDeclarationFile.js` from `https://raw.githubusercontent.com/OpenRCT2/OpenRCT2/develop/distribution/scripting/openrct2.d.ts`. `tsconfig.json` includes `lib/` so `tsc` picks it up. Locally you must run the download script once before `npm run typecheck` will pass.

If you see `Cannot find name 'EntityType'`-style errors, the first thing to check is whether the local file is stale relative to the upstream declaration. The download script rejects on non-200 responses, so silent 404s shouldn't recur — but if OpenRCT2 moves the file again, the script's URL is the place to fix it.

## Dependabot

`.github/dependabot.yml` runs weekly grouped npm updates (`npm-dependencies` group) and weekly github-actions updates. `.github/workflows/dependabot-auto-merge.yml` auto-merges semver-patch updates. Anything more than patch needs human review.

## Project context

Hobby project, archived path (`Developer/archive/OpenRCT/`), low-stakes. The user explicitly OKs destructive ops (force-push, bulk PR closes) when authorized in conversation — don't get extra-cautious about this repo specifically.

The README's banner says "DISCONTINUED, TREAT IT LIKE A MODDERS RESOURCE" — that's accurate. No active users to break.
