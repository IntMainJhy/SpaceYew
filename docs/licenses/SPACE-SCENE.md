# SpaceYew space journey assets

The galaxy and asteroid geometry are original SpaceYew assets created in
Blender 5.2.3. They are covered by this repository's existing license.
The Moon uses NASA source data under the separate terms and attribution in
[NASA-MOON.md](NASA-MOON.md).

## Galaxy

`public/models/spaceyew-galaxy.glb` is exported from a native, editable Blender
mesh, rather than a background photograph or a browser-generated replacement.
Its 21,000 vertices form four spiral arms, a central bulge and a sparse outer
stellar field. The original layout uses deterministic seed `813722`.
The mesh preserves its native point attributes: `Color`, `_ASIZE`, `_AALPHA`,
and `_APHASE`. A non-destructive Geometry Nodes modifier displays emissive
spheres in the Blender project; the GLB exports the original unmodified
vertices as a single glTF `POINTS` primitive (`mode: 0`).

The web asset contains `POSITION`, `COLOR_0`, `_ASIZE`, `_AALPHA`, and `_APHASE`.
Positions use the same world coordinates as the website's Moon, rocks and
camera. Native Blender coordinates `(x, -z, y)` convert to glTF Y-up `(x, y, z)`.
The website uses the native vertex positions and colors while its point shader
provides the small, soft stellar appearance; it does not reconstruct the
primary galaxy layout in JavaScript. The galactic disk rotates about its native
tilted axis at 0.026 radians per active second; the outer stellar field stays
fixed. The source Blender scene contains the same point selection and native
Geometry Nodes rotation animation.

## Asteroids

`public/models/spaceyew-asteroids.glb` contains three original asteroid meshes,
sculpted in Blender from subdivided icospheres with multi-scale noise and
crater relief. Albedo, tangent normal and roughness maps are baked from the
native Blender materials and embedded in the GLB. No third-party asteroid
photographs, models or textures are included. The web scene and native project
place 42 copies with shared mesh data around the same camera flight corridor.
Each rock tumbles about its fixed center at 0.075 radians per active second
along its seeded Euler direction; source geometry, placements and the safe
flight corridor are retained. The local Blender project contains matching
editable animation.

## Native source project

The local design archive, outside the website Git repository, retains
`spaceyew-space-journey.blend`, `build-native-scene.py`,
`build-native-asteroids.py`, the storyboard and three native CPU render checks.
The Blender project has editable Galaxy, Asteroid Belt, Moon and Camera Path
collections, packed source textures, and a 241-frame camera animation using
the website's continuous Hermite flight path. Frames 1, 121 and 241 correspond
to the distant view, belt crossing and lunar arrival. The camera advances
102 world units while the Moon remains fixed at `(8, -1, -22)`, radius `5.6`.
Only the optimized web GLBs and this provenance note belong in the website
repository; local `.blend` sources and verification renders remain archived
outside it.
