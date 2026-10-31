"""Build the SpaceYew home glass page.

Run with Blender (5.2+) in background:
  Blender -b --factory-startup -P scripts/build-home-page.py -- \
    --model public/models/spaceyew-page.glb \
    --blend /absolute/private/spaceyew-page.blend

The web asset is a single curved sheet with real thickness, a polished bevel
and a slight twist. The editable .blend source stays outside the repository.
"""
import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--model', default=str(root / 'public/models/spaceyew-page.glb'))
parser.add_argument('--blend')
parser.add_argument('--preview')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])

bpy.ops.wm.read_factory_settings(use_empty=True)

# ---------- curved sheet ----------
W_ARC, H, R = 8.4, 9.6, 6.6
HALF_ANGLE = (W_ARC / R) / 2
NX, NY = 56, 72
verts, faces = [], []
for j in range(NY + 1):
    v = j / NY - 0.5
    for i in range(NX + 1):
        u = i / NX - 0.5
        angle = u * 2 * HALF_ANGLE
        x = R * math.sin(angle)
        y = R * (math.cos(angle) - 1)
        z = v * H
        # bow toward the viewer at mid-height and lean away at the top
        y += 0.55 * math.sin(v * math.pi)
        y -= 1.0 * max(0.0, v) ** 2
        # gentle twist so the bevel carries a changing highlight
        twist = 0.12 * v
        x, z = x * math.cos(twist) - z * math.sin(twist), x * math.sin(twist) + z * math.cos(twist)
        verts.append((x, y, z))
for j in range(NY):
    for i in range(NX):
        a = j * (NX + 1) + i
        faces.append((a, a + 1, a + NX + 2, a + NX + 1))

mesh = bpy.data.meshes.new('SpaceYewPageMesh')
mesh.from_pydata(verts, [], faces)
mesh.update()
page = bpy.data.objects.new('SpaceYew_Page', mesh)
bpy.context.scene.collection.objects.link(page)
bpy.context.view_layer.objects.active = page
page.select_set(True)

solid = page.modifiers.new('Thickness', 'SOLIDIFY')
solid.thickness = 0.22
solid.offset = 0
solid.use_even_offset = True
bevel = page.modifiers.new('Polished edge', 'BEVEL')
bevel.width = 0.024
bevel.segments = 3
bevel.limit_method = 'ANGLE'
bevel.angle_limit = math.radians(24)
for modifier in list(page.modifiers):
    bpy.ops.object.modifier_apply(modifier=modifier.name)
bpy.ops.object.shade_smooth()
try:
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(26))
except Exception:
    pass

# Put the object at the origin and make its bottom the ground plane, so the
# Three.js scene can place it without guessing the bounding box.
bpy.context.view_layer.update()
box = [page.matrix_world @ Vector(corner) for corner in page.bound_box]
center = sum(box, Vector()) / 8
min_z = min(point.z for point in box)
page.location.x -= center.x
page.location.y -= center.y
page.location.z -= min_z
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

material = bpy.data.materials.new('SpaceYew page glass')
material.use_nodes = True
bsdf = material.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (1, 1, 1, 1)
bsdf.inputs['Roughness'].default_value = 0.03
bsdf.inputs['IOR'].default_value = 1.46
for name in ('Transmission Weight', 'Transmission'):
    if name in bsdf.inputs:
        bsdf.inputs[name].default_value = 1.0
        break
page.data.materials.clear()
page.data.materials.append(material)

model_path = Path(args.model)
model_path.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=str(model_path),
    export_format='GLB',
    use_selection=True,
    export_apply=True,
    export_yup=True,
)
print('MODEL', model_path)

if args.blend:
    blend_path = Path(args.blend)
    blend_path.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    print('BLEND', blend_path)
