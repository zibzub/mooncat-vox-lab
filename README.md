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

The five purposeful presets are: `Issue #176 MR` for the submitted MR baseline; `ChainStation legacy` for the pre-MR raw-color baseline; `Neutral game lighting` for a conventional corrected-linear `MeshStandardMaterial` scene; `2D-biased` for a brighter, softer dimensional toon comparison against the OG sprite; and `Palette reference — unlit` for a corrected-linear technical color check. The MR baseline uses Three.js `0.169.0`, no tone mapping, and a RedFormat toon ramp. Lighting, toon ramp values, background, and optional `UnrealBloomPass` settings update live. Reset Defaults restores the issue #176 MR defaults; Copy Share Link copies a URL that reproduces the current state.

The VOX preview shows the current rescue's canonical 2D image as a larger, pixel-sharp, non-interactive `OG 2D` corner overlay. The image is not downloaded or committed; an unavailable remote response is shown as a small status state.

VOX loading is local-first from `public/vox/<rescue-id>.vox`. If the local file is unavailable, the app tries the configured public IPFS gateways for CID `bafybeifxqtzf635xy3q3lrp2cygrz2vatregvtnfe2dsl4jskjyuneexzu` with short per-gateway timeouts. A fetched VOX is parsed once, then the Pose selector switches among the supported `Posture` (Standing), `Posture2` (Sleeping), `Posture3` (Pouncing), and `Posture4` (Stalking) layers without another request.
