# MoonCat VOX Lab

MoonCat VOX Lab is a standalone viewer for comparing and tuning how MoonCat 3D VOX models are rendered.

The main goal is to help with **ChainStation issue #176**: the 3D MoonCat previews can look more muted than the original 2D MoonCat images. A good renderer should keep enough light and shadow to make the model feel three-dimensional, while allowing fully lit surfaces to stay close to the MoonCat's familiar colors.

The viewer places the original 2D MoonCat in the corner for reference, provides several useful rendering presets, and lets you share an exact set of adjustments for review. It does not require a wallet or backend.

## Using the viewer

1. Enter a MoonCat **Rescue ID** and select **Load**.
2. Choose a **Pose** when the VOX file contains more than one supported posture.
3. Start with a preset, usually **Issue #176 MR**.
4. Drag the model to orbit it and scroll or pinch to zoom.
5. Compare the model with the 2D reference image in the corner.
6. Adjust one or two settings at a time.
7. Test the same adjustment on several different MoonCats.
8. Select **Copy Share Link** to preserve the current Rescue ID, pose, preset, and settings in the URL.

**Reset Defaults** returns the viewer to the exact Issue #176 MR baseline.

## What is issue #176?

Issue #176 focuses on improving the appearance of MoonCat VOX previews in ChainStation.

The problem is not simply that the models need to be brighter. A completely unlit model can show the stored palette clearly, but it loses the shadows that communicate its shape. The target is a useful balance:

- fully lit faces should stay close to the canonical MoonCat colors;
- shadowed faces should remain recognizable rather than becoming dull or muddy;
- the model should still have enough contrast to read as a 3D object;
- the result should work across dark, pale, saturated, multi-colored, and genesis MoonCats.

The original issue suggested experimenting with Three.js toon shading, a programmable light gradient, bloom, and emissive color. This lab keeps those experiments separate from the main ChainStation site so that results can be compared and shared more easily.

## Presets

| Preset | Purpose |
| --- | --- |
| **Issue #176 MR** | The submitted issue #176 rendering baseline. Use this as the main starting point when proposing small improvements. |
| **ChainStation legacy** | The older ChainStation rendering. Useful for seeing what changed and for checking whether an adjustment accidentally recreates an old problem. |
| **Neutral game lighting** | Shows the model with conventional, neutral 3D lighting. Useful as a reference for how the VOX might look in a game rather than as a close match to the 2D image. |
| **2D-biased** | Uses softer, brighter toon shading intended to move closer to the 2D MoonCat while keeping visible 3D form. |
| **Palette reference — unlit** | Shows the corrected VOX palette without light-based darkening. This is a technical color reference, not a recommended final presentation. |
| **Custom** | Appears automatically after a preset setting is changed. |

The exact Issue #176 and legacy presets are comparison baselines. Avoid changing their stored values when experimenting; create a Custom state instead.

## Settings explained

### Model

- **Rescue ID** loads that MoonCat's VOX file and 2D reference image.
- **Pose** switches between supported posture layers already contained in the loaded VOX. Changing pose does not download the file again.

### Look

- **Preset** loads a complete group of material, lighting, and background settings.
- **Toon lit** uses lighting bands to create clear voxel-style shading.
- **Unlit palette** removes light-based shading and is mainly useful as a color reference.

#### Toon ramp

The toon ramp divides the lighting into three brightness levels:

- **Shadow** controls the darkest band.
- **Midtone** controls the middle band.
- **Highlight** controls the brightest band.

Higher values make that band brighter. Keeping the highlight at full brightness helps fully lit faces stay close to the source palette. Raising the shadow and midtone values makes the model flatter and brighter; lowering them increases contrast and depth.

#### Shadow color retention

This moves shaded toon bands back toward each voxel's own base color.

- `0` leaves the normal toon lighting unchanged.
- Middle values gently preserve more color in shaded faces.
- `1` removes most of the toon ramp's darkening and approaches the palette reference.

The effect can be subtle, especially on already bright faces. It only applies to corrected-color toon rendering, not the legacy, neutral game, or unlit materials.

- **Background** changes the viewer background. Background color can strongly affect how bright or saturated the same MoonCat appears, so compare settings against the intended ChainStation background as well as neutral backgrounds.

### Lighting

- **Hemisphere** is broad light from the environment. Raising it brightens much of the model and softens contrast.
- **Key light** is the main directional light. It creates the strongest sense of shape and determines which faces reach the brightest toon band.
- **Fill light** shines from the opposite direction and prevents the darker side of the model from becoming too deep.

A high ambient or fill value can make colors easier to see, but too much will flatten the model. Strong key lighting can improve shape, but may make one side overly bright and the other too dark.

### Bloom

Bloom adds a soft glow around sufficiently bright pixels.

- **Strength** controls how visible the glow is.
- **Threshold** controls how bright a pixel must be before it glows. Lower values affect more of the model.
- **Radius** controls how widely the glow spreads.

Bloom may help luminous MoonCats or create an outer glow, but it can also blur details, wash out pale cats, and make color comparisons less reliable. Tune the base material and lighting first, then evaluate bloom separately.

## Making a useful adjustment

A setting that looks good on one MoonCat may look poor on another. For a useful comparison:

1. Begin with **Issue #176 MR** unless testing a clearly different rendering direction.
2. Change one setting at a time so the cause of the improvement is clear.
3. Keep the same camera angle when comparing before and after.
4. Test several MoonCats, including:
   - a dark or Genesis cat;
   - a pale cat;
   - a strongly saturated cat;
   - a cat with several contrasting colors;
   - a glow-heavy cat when evaluating bloom;
   - more than one pose when possible.
5. Check that eyes, markings, shadows, and small details remain distinct.
6. Compare against the 2D reference, but do not expect every shaded face to match a flat 2D sprite exactly.

The most useful adjustment is usually a modest one that improves several different MoonCats without introducing a new problem elsewhere.

## Submitting an adjustment

Use **Copy Share Link** after choosing the Rescue ID, pose, and settings. On a deployed copy of the lab, the link should reproduce the same state directly. When testing on `localhost`, also include the exact values because another person cannot open your local address.

Post the proposal in the issue #176 discussion or its related merge request with:

- the starting preset;
- the share link;
- the Rescue IDs and poses tested;
- the settings changed;
- what looks better;
- any tradeoffs or cats that still look poor;
- before-and-after screenshots when helpful.

Suggested format:

```md
### VOX rendering adjustment

Starting preset: Issue #176 MR
Share link: <link>

Tested:
- Rescue <id>, <pose>
- Rescue <id>, <pose>
- Rescue <id>, <pose>

Changed:
- Shadow color retention: 0 → 0.25
- Midtone: 190 → 205

Improvement:
- <what is closer to the 2D reference or easier to read>

Tradeoffs:
- <anything that became flatter, brighter, duller, or less detailed>
```

## Running locally

```sh
npm install
npm run dev
```

To test from another device on the local network:

```sh
npm run dev -- --host
```

Build the deployable static site with:

```sh
npm run build
```

Vite writes the static output to `dist/`.

## VOX loading

The viewer first checks for a local file at:

```text
public/vox/<rescue-id>.vox
```

For example, `public/vox/1234.vox` is loaded by entering `1234`.

When a local file is unavailable, the viewer tries public IPFS gateways for the MoonCat VOX collection. The fetched VOX is parsed once, and pose changes reuse the parsed file.

Supported named posture layers are:

| VOX layer | Viewer label |
| --- | --- |
| `Posture` | Standing |
| `Posture2` | Sleeping |
| `Posture3` | Pouncing |
| `Posture4` | Stalking |

This repository intentionally does not include binary VOX samples.

## Technical details

- Built with Vite and Three.js `0.169.0`.
- The renderer outputs to sRGB and uses `NoToneMapping`.
- Corrected-color pipelines convert VOX palette colors from sRGB to linear once, then use the linear vertex-color attribute for lighting.
- The legacy pipeline intentionally retains ChainStation's historical raw-color behavior for comparison.
- The 2D reference image is requested remotely and is not stored in this repository.
- Share URLs preserve the rescue ID, pose, preset, material mode, toon ramp, lighting, background, shadow color retention, and bloom settings.
- VOX files are loaded locally first, then from public IPFS gateways using CID `bafybeifxqtzf635xy3q3lrp2cygrz2vatregvtnfe2dsl4jskjyuneexzu`.

### Issue #176 MR baseline

- `MeshToonMaterial` with corrected linear vertex colors
- three-step `RedFormat` gradient texture: `[75, 190, 255]`
- hemisphere light: white / `0x111111`, intensity `0.5`
- key light: white, intensity `1.6`, position `[1.5, 3, 2.5]`
- reverse fill: white, intensity `0.15`, position `[-1.5, -3, -2.5]`
- background: `#202226`
- bloom off
- shadow color retention `0`

### ChainStation legacy baseline

- `MeshStandardMaterial` with raw normalized palette values
- hemisphere light: `0xcccccc` / `0x444444`, intensity `2.5`
- key light: white, intensity `1.25`
- reverse light: white, intensity `0.5`
- background: `#111111`
- no tone mapping

### Additional rendering experiments

- **Neutral game lighting** uses corrected linear vertex colors with `MeshStandardMaterial`, `metalness: 0`, and high roughness.
- **2D-biased** uses a brighter toon ramp, softer neutral lighting, and a conservative nonzero shadow color retention value.
- **Shadow color retention** patches the Three.js toon gradient shader through `MeshToonMaterial.onBeforeCompile`. It raises the lighting factor toward `1.0` before the model's per-voxel corrected vertex color is applied, avoiding one global emissive tint across every palette color.
- **Bloom** uses `UnrealBloomPass` and remains optional because it changes perceived brightness as well as adding glow.
