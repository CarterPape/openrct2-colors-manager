# 🎨 Colors Manager — an OpenRCT2 plugin

Colors Manager auto-recolors the items sold at your park's stalls — **balloons, umbrellas, hats, and t-shirts** — so you don't have to set each stall's colors by hand. Pick a color per item type (or let it randomize per stall), and every new stall you build gets recolored automatically. A one-click button also recolors every stall already in the park.

## What it does

- Adds a **Colors Manager** entry to the map/tools menu that opens a small window.
- For each of the four colored stall items, choose a fixed color **or** check "Random for every stall".
- New stalls are recolored automatically as they're placed (the plugin listens for stall setting changes).
- **Apply to all existing stalls** recolors everything currently in the park in one click.
- A master **Manage item colors for all new stalls** checkbox turns the automatic behavior on and off.

Only the stalls that sell those four items are touched (internally, ride-type IDs `32` and `35`). Food/drink stalls, toilets, and rides are left alone.

## Install (as a player)

1. Grab the built plugin: run `npm run build` to produce `dist/Colors Manager.js` (or use a release artifact if one exists).
2. Copy `Colors Manager.js` into your OpenRCT2 `plugin/` directory:
   - **macOS:** `~/Library/Application Support/OpenRCT2/plugin/`
   - **Windows:** `C:\Users\<you>\Documents\OpenRCT2\plugin\`
   - **Linux:** `~/.config/OpenRCT2/plugin/`
3. Load a park (or start a new one) so OpenRCT2 registers the plugin, then open it from the map menu.

## Develop

The whole toolchain is **esbuild + TypeScript** — two dev-dependencies, no framework. See [`CLAUDE.md`](./CLAUDE.md) for the architecture and gotchas.

```sh
nvm use              # Node 22 (floor is Node ≥ 20)
npm install
node ./script/downloadAndSaveApiDeclarationFile.js   # fetch lib/openrct2.d.ts (gitignored)
npm run typecheck    # tsc --noEmit — the only correctness gate; there are no unit tests
```

Build commands:

| Command | Output | Notes |
| --- | --- | --- |
| `npm run build` | `dist/Colors Manager.js` (iife) | production bundle OpenRCT2 loads for release |
| `npm run build:dev` | `dist/Colors Manager_dev.js` (cjs) | also copied into your game's `plugin/` for [hot reload](https://github.com/OpenRCT2/OpenRCT2/blob/master/distribution/scripting/scripting.md) |
| `npm run watch` / `npm run watch:dev` | same as above | rebuild on `src/` changes |

Dev builds need `OPENRCT2_PATH` to know where to copy the plugin — set the env var, or create a gitignored `config/local-dev.json` (`{ "OPENRCT2_PATH": "…" }`). It's the path to your OpenRCT2 user directory (the parent of `plugin/`). Production builds don't need it.

## Attribution

Forked from [`wisnia74/openrct2-typescript-mod-template`](https://github.com/wisnia74/openrct2-typescript-mod-template). The original template's gulp + rollup + jest + ESLint stack has since been replaced with esbuild. Licensed under [MIT](./LICENSE).

## Useful links

- [OpenRCT2 scripting guide](https://github.com/OpenRCT2/OpenRCT2/blob/master/distribution/scripting/scripting.md)
- [OpenRCT2 plugin examples](https://github.com/OpenRCT2/plugin-samples)
- [OpenRCT2 plugins directory](https://openrct2plugins.org/)
