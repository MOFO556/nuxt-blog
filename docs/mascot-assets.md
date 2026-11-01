# Mascot assets

The app runs with a placeholder body until `light.glb` and `dark.glb` exist.

## Contract

| File | Role |
|------|------|
| `public/mascot/light.glb` | Light-theme body. Runner uses `Walk` or `Run`, plus `Jump` and `Duck` |
| `public/mascot/dark.glb` | Dark-theme body. Runner uses `Run` or `Walk`, plus `Jump` and `Duck` |
| `public/mascot/portrait-light.png` | Assistant portrait, light |
| `public/mascot/portrait-dark.png` | Assistant portrait, dark |
| `public/runner/stones.glb` | Ground stones in the runner, sized to the hit box |
| `public/runner/kunai.glb` | Airborne kunai in the runner, sized to the hit box |

Clips: `Arrive`, `Idle`, `Walk` or `Run`, `Notice`, `Jump`, `Duck`. Bone: `hand.R`. The stage shades meshes with `MeshToonMaterial`. The runner plays locomotion, jump, and duck in place and moves the figure itself. A held duck plays `Duck` once and stays in the crouch.