# Packed Blender to web model

Read-only source: `J:\作品集\图片整理\手枪blender文件\手枪枪口火焰渲染.blend`.

Working directory: `C:\Users\20521\AppData\Local\Temp\portfolio-pistol-blend`.

The separate Blender5.0 background process uses `--factory-startup --disable-autoexec`. It never saves over the original or changes the user's open Blender session.

## Reproduction order

1. `inspect_blend.py`: inspect scene and node graphs without decoding all packed images.
2. `extract_blend_assets.py`: extract packed image bytes and evaluated scene metadata.
3. `resize_pistol_textures.py`: make working texture copies (Pillow and NumPy); normalize 16-bit grayscale maps instead of clipping.
4. `prepare_pistol_blend.py`, run against the original blend: relink working images, evaluate frame7, realize actual muzzle effects, preserve source coordinates before joining, create WebUV. Writes `prepared.blend` and `source-reference.png`.
5. `bake_pistol_materials.py`, run against `prepared.blend`: bake layered base/alpha, metallic/roughness/transmission, normal, emission. Source UVs remain intact while WebUV is used only as the bake destination. Writes `baked.blend` and a comparison render. Optional `--reuse-bakes` resumes from saved derived images.
6. `export_pistol_web.py`, run against `baked.blend`: export to `public/portfolio-assets/12-models/pistol-blend-baked.glb`, compress geometry, strip local source-path metadata.
7. `node scripts/verify_featured_model.mjs`: decode shipped geometry and check textures, materials, bounds, mouse motion and the archive-only placement. Then run `pnpm build`.

```text
blender --background --factory-startup --disable-autoexec INPUT.blend --python SCRIPT.py -- OUTPUT_PATH_OR_WORKING_DIRECTORY
```

## Presentation

- Location: archive Plasticity01, not featured project03.
- Frame7 static mesh with live pointer rotation; this does not play the Blender shooting animation.
- Actual muzzle flash/smoke, shell, projectile and surface decals are retained. Distant effect-library objects and camera hardware are not presentation objects.
- Render-only volumetric lighting is not exported. View-dependent smoke is approximated by baked surface textures; real-time lighting is not pixel-identical to Cycles.
- The old GLB is not a source for any step.
- Local Draco decoder files are unchanged assets from installed Three.js0.180.0; upstream license is included. No CDN is required.
