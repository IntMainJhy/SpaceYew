# NASA Moon assets

Credit: NASA's Scientific Visualization Studio; Lunar Reconnaissance Orbiter
(LRO), Lunar Reconnaissance Orbiter Camera (LROC), and Lunar Orbiter Laser
Altimeter (LOLA). CGI Moon Kit visualization by Ernie Wright (USRA).

The Moon in `public/models/spaceyew-moon.glb` and the transparent render in
`public/images/lunar/moon-fallback.png` are SpaceYew derivatives of the
[NASA Scientific Visualization Studio CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/).
They are not a NASA-supplied finished model and do not imply NASA endorsement.

## Source data

Sources were retrieved on 2026-10-31. The accepted v04 material study uses the
2019 color map, rather than the newer 2025 revision on the same NASA page.

| Source | NASA file | SHA-256 |
| --- | --- | --- |
| LROC natural color, 4096 × 2048, sRGB | [lroc_color_poles_4k.tif](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_4k.tif) | `918649a7f8ed2f1329b2cd95bb0d25483befdcb60ae1a66db681a637cc21344f` |
| LOLA elevation, 1440 × 720, unsigned 16-bit | [ldem_4_uint.tif](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_4_uint.tif) | `e6668bec27fc9b8fbb02d198c7ddfb08eedeeb790167b494f95e6b34201da05e` |

NASA describes the unsigned elevation encoding as half-meter units relative
to a radius of 1,727,400 meters; the lunar reference radius is 1,737,400 meters.

## Website derivatives

- The GLB contains only the accepted v04 Moon mesh, centered at its origin.
  Its measured displacement, UV coordinates and surface normals are retained.
  The proxy radius is 12.6 scene units, corresponding to 1,737,400 meters.
- Color retains the full 4096 × 2048 source resolution and is encoded as WebP
  quality 80 without additional grading. The 2048 × 1024 tangent normal is a
  Blender Cycles bake of the accepted v04 LOLA height shader and is encoded as
  lossless WebP. Both textures are embedded using `EXT_texture_webp`, supported
  by the website's Three.js GLTFLoader.
- Material: roughness 0.94, metallic 0, low specular response, no emission.
  The mesh has 65,024 triangles. Its original orientation is preserved in the
  glTF node. There are no station, window or frame objects in this file.
- The 768 × 768 transparent PNG is rendered from that same mesh and material
  with the v04 sunlight direction; it is a fallback when WebGL is unavailable.

NASA media remains subject to
[NASA's Images and Media Usage Guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/),
separately from this repository's license. NASA requests acknowledgment as
the source. NASA identifiers and logos are not included in these assets.
