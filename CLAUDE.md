# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OpenRCT2 plugin (TypeScript) that auto-recolors stall items (balloons, umbrellas, hats, t-shirts). Forked from `wisnia74/openrct2-typescript-mod-template`. The README is still mostly the upstream template's README — don't trust it as documentation for this repo specifically.

The build target is a single `iife` bundle at `dist/Colors Manager.js` (prod) or a `commonjs` bundle copied into `${OPENRCT2_PATH}/plugin/` (dev). OpenRCT2 loads the file from its `plugin/` directory at runtime.

The whole toolchain is **esbuild + typescript** — just two dev-dependencies. `build.mjs` (plain Node ESM) drives esbuild; `tsc --noEmit` does typechecking. The old template stack (gulp, rollup + plugins, ts-node, node-config, jest, ESLint, husky, core-js) was cut in favor of this; don't expect any of it. That cut was about removing template cruft, **not** a vow of dependency minimalism — purposeful deps for a robust test suite (a runner, OpenRCT2-Mocks, a coverage tool) are explicitly wanted here; see `pape-docs/0002`.

## Commands

- `npm run build` — production build → `dist/Colors Manager.js` (iife)
- `npm run build:dev` — dev build → `dist/Colors Manager_dev.js` (cjs), also copied into `${OPENRCT2_PATH}/plugin/` for hot reload
- `npm run watch` / `npm run watch:dev` — same as the two above, rebuilding on `src/` changes
- `npm run typecheck` — `tsc --noEmit` against `src/` + `lib/openrct2.d.ts`. This is the only correctness gate *today* — no unit tests yet, but a test suite is planned and wanted (`pape-docs/0002`); CI runs it.

Node floor is **Node ≥ 20** (`engines`); `.nvmrc` pins **22** (LTS) and CI reads `node-version-file: .nvmrc`.

For dev builds, `build.mjs` needs `OPENRCT2_PATH` to know where to copy the plugin: it reads the `OPENRCT2_PATH` env var first, then falls back to a gitignored `config/local-dev.json` (`{ "OPENRCT2_PATH": "…" }`). Without either, a dev build errors out. Prod builds don't need it.

## Architecture

`build.mjs` bundles `src/index.ts` into one self-contained file (no `node_modules` at runtime — OpenRCT2's scripting host has no module system beyond what the bundle inlines). `lib/openrct2.d.ts` supplies the ambient globals (`ui`, `context`, `map`, `registerPlugin`, …) for typechecking only; it emits nothing and is never imported.

Entry point chain: `src/index.ts` calls `registerPlugin({...})` → registers `src/main.ts` as the plugin's `main` → `main.ts` imports from `src/colorManager.ts` and wires up the menu item and the `action.execute` subscription. `src/pluginMeta.ts` holds the `MOD_NAME` / `MOD_AUTHOR` constants (formerly injected via node-config + rollup's inject-process-env; now just hardcoded, since a single plugin doesn't need build-time env injection).

## `src/colorManager.ts`

The whole plugin lives here: managed-item table, color/randomness state, the window widgets, and the `action.execute` subscription. Module-level singletons (`pluginEnabled`, `pluginWindow`, `actionSubscription`, `colors`, `randomness`) — fine for a plugin this small. There are no unit tests yet (a suite is planned — `pape-docs/0002`); `tsc --noEmit` is the current safety net.

Three behaviors worth knowing:

- The recolor logic fires on `ridecreate` (a stall was just built — this is what makes "manage new stalls" work) and on *every* `ridesetsetting` action for a managed stall (price changes included), not just appearance changes. The new ride is resolved from `e.result.ride` for `ridecreate` and from `e.args.ride` for `ridesetsetting`. Cheap to recompute, so it isn't worth filtering.
- `findManagedItem` prefers `shopItemSecondary` over `shopItem` — that's deliberate, because the dual-item stalls (e.g. Information Kiosk = map + umbrella) have the colored item in the secondary slot.
- "Stall" is identified by ride-type ID being one of `MANAGED_STALL_RIDE_TYPES` (`[32, 35]`, the stalls that sell the four colored items). Other classifications (`'stall'` for food/drink stalls, `'facility'` for toilets) are ignored.

## OpenRCT2 scripting API reference

The canonical scripting docs live upstream and change over time, so reference them live rather than vendoring a copy: 📖 <https://github.com/OpenRCT2/OpenRCT2/blob/master/distribution/scripting/scripting.md>. The two things worth pulling from there when maintaining this plugin:

- **`targetApiVersion` (in `src/index.ts`).** This declares the API the plugin targets for players, so it tracks the latest *stable* release, not `develop`. The authoritative number is the `kPluginApiVersion` constant in [`src/openrct2/scripting/ScriptEngine.h`](https://github.com/OpenRCT2/OpenRCT2/blob/master/src/openrct2/scripting/ScriptEngine.h) on **`master`** — scripting.md's changelog only lists *breaking* changes, so it lags the real number. Before bumping, skim scripting.md's changelog for breaking entries **above the current value** that touch this plugin's surface (ride settings, shop items, colours, windows, game actions); if none do, the bump is safe. Omitting `targetApiVersion` defaults to v33 and logs a startup error.
- **Hot reload** (the dev workflow this plugin's `build:dev` copy-into-`plugin/` step exists for) is documented in the same guide.

## The `lib/openrct2.d.ts` gotcha

The plugin uses OpenRCT2 ambient types (`Ride`, `Window`, `WidgetDesc`, `ColourPickerWidget`, etc.) that come from `lib/openrct2.d.ts`. That file is **gitignored** and fetched fresh on every CI run by `script/downloadAndSaveApiDeclarationFile.js` from `https://raw.githubusercontent.com/OpenRCT2/OpenRCT2/develop/distribution/scripting/openrct2.d.ts`. It's pinned to the **`develop`** branch (bleeding edge) on purpose: typechecking against tomorrow's API acts as a canary, so if OpenRCT2 breaks an API this plugin uses, CI fails *before* that change ships in a stable release rather than after. (`targetApiVersion` is the opposite concern — see below — and tracks the current *stable* API.) `tsconfig.json` includes `lib/` so `tsc` picks it up. Locally you must run the download script once before `npm run typecheck` will pass.

If you see `Cannot find name 'EntityType'`-style errors, the first thing to check is whether the local file is stale relative to the upstream declaration. The download script rejects on non-200 responses, so silent 404s shouldn't recur — but if OpenRCT2 moves the file again, the script's URL is the place to fix it.

## Dependabot

`.github/dependabot.yml` runs weekly grouped npm updates (`npm-dependencies` group) and weekly github-actions updates. `.github/workflows/dependabot-auto-merge.yml` auto-merges semver-patch updates. Anything more than patch needs human review.

## Runtime debugging: the `openrct2-probe` companion

There are still no unit tests here, so `tsc --noEmit` remains the only in-repo gate — but runtime behavior (does a new stall actually get recolored?) is now observable without a human watching the game, via the **`~/Developer/openrct2-probe`** companion. It's a reusable, plugin-generic harness with three channels (M0–M2 built): a loopback-TCP bridge plugin + CLI client for querying and driving live state, a CLI-screenshot visual channel, and a headless one-shot harness for scripted repro. See the back-pointer `CLAUDE.md` one directory up and the probe repo's own docs.

The `ridecreate` recolor fix (`pape-docs/0001`) was confirmed this way: driving a stall creation over the bridge and watching the plugin's own `ridesetappearance` actions fire in response. Two gotchas that cost real time, worth knowing before you reach for the probe: the plugin is `type: 'local'` (in `src/index.ts`), so its `action.execute` subscription only arms inside a *loaded park* in a headed single-player game — never on the title-screen demo map, and never headless (where `ui` is `undefined`, so `main()` early-returns before `initialize()`). So the live GUI is the only place to exercise the compiled subscription; headless can still confirm the underlying API facts (which action fires, what's populated when) by driving `eval` directly.

## Project context

**Actively maintained, not dead.** The path is `Developer/Archive/maintain/OpenRCT/` — the operative word is `maintain`, not `Archive`. The goal: this plugin keeps working as OpenRCT2 keeps shipping updates, and adding new features later takes little setup. That intent is *why* investing in a test suite (`pape-docs/0002`) and the observation tooling (`~/Developer/openrct2-probe`) is worth it here — treat this as a maintainable codebase, not a throwaway.

Still low-stakes in the narrow sense that there are no live production users, so Carter OKs destructive ops (force-push, bulk PR closes) when authorized in conversation — don't get extra-cautious. But "low-stakes" ≠ "throwaway": prefer correct-and-clean changes that keep it maintainable.
