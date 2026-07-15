# MoonCat VOX Lab

Standalone Vite + Three.js tuning site for the MoonCat VOX renderer. It has no wallet or backend dependency. The viewer starts in the issue #176 MR toon-lit configuration and keeps the selected rescue ID and controls in the URL.

## Run locally

```sh
npm install
npm run dev
```

To test from another device on the local network:

```sh
npm run dev -- --host
```

Build the deployable static site with `npm run build`. The output is written by Vite to `dist/`.

## Sample VOX files

This repository intentionally does not include binary sample assets. Add files using the convention below:

```text
public/vox/<rescue-id>.vox
```

For example, `public/vox/1234.vox` is loaded by entering `1234` in the Rescue ID field. The app remains usable without samples and shows the expected path when a file is missing. A sample may contain a standard VOX model or a MoonCat scene graph; when named posture layers are present, the default `Posture` layer is shown.

## Controls

The named `Issue #176 MR` preset matches the submitted MR using Three.js `0.169.0`, no tone mapping, linearized vertex colors, and a RedFormat toon ramp. `ChainStation legacy` restores the pre-MR `MeshStandardMaterial` path with raw normalized sRGB colors and the old light setup. `Unlit palette` is a corrected linear-color comparison. Lighting, toon ramp values, background, and optional `UnrealBloomPass` settings update live. Reset Defaults restores the issue #176 MR defaults; Copy Share Link copies a URL that reproduces the current state.

The Model section also shows the current rescue's canonical 2D image from the remote MoonCat API. The image is not downloaded or committed; an unavailable remote response is shown as a small status state.
