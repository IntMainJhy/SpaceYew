"""Build the original Blog Spaces panel in installed Blender, retaining an editable source.

Run: Blender --background --factory-startup --python scripts/build-blog-glass.py --
     --blend /absolute/archive/spaceyew-blog-panel.blend
"""
import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
root = Path(__file__).resolve().parents[1]
parser.add_argument("--model", default=str(root / "public/models/spaceyew-blog-panel.glb"))
parser.add_argument("--blend", required=True)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
model_path, blend_path = Path(args.model), Path(args.blend)
model_path.parent.mkdir(parents=True, exist_ok=True)
blend_path.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_cube_add(size=1)
panel = bpy.context.object
panel.name = "SpaceYew_Blog_Glass_Page"
panel.dimensions = (4.8, 0.24, 3.15)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bevel = panel.modifiers.new("Native polished glass edge", "BEVEL")
bevel.width, bevel.segments = 0.15, 6
bpy.ops.object.modifier_apply(modifier=bevel.name)
for face in panel.data.polygons:
    face.use_smooth = True
normals = panel.modifiers.new("Weighted planar normals", "WEIGHTED_NORMAL")
normals.keep_sharp = True
bpy.ops.object.modifier_apply(modifier=normals.name)
panel["authorship"] = "Original SpaceYew native Blender beveled glass page"

material = bpy.data.materials.new("SpaceYew clear optical glass")
material.use_nodes = True
bsdf = material.node_tree.nodes.get("Principled BSDF")
bsdf.inputs["Base Color"].default_value = (1, 1, 1, 1)
bsdf.inputs["Roughness"].default_value = 0.01
bsdf.inputs["IOR"].default_value = 1.52
bsdf.inputs["Transmission Weight"].default_value = 1
material.diffuse_color = (0.89, 0.95, 1, 1)
panel.data.materials.append(material)

# The source opens as a useful native studio, not a mesh without a camera.
bpy.ops.object.camera_add(location=(0.6, -8.3, 1.0))
camera = bpy.context.object
camera.name = "Blog page review camera"
camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.lens = 48
bpy.context.scene.camera = camera
for name, location, energy, size, color in [
    ("Wide cool softbox", (-4, -5, 4), 800, 4.0, (0.76, 0.89, 1)),
    ("Warm edge strip", (4, -3, 1), 500, 2.0, (1, 0.87, 0.70)),
    ("Top reflection", (0, -2, 5), 650, 3.0, (0.92, 0.97, 1)),
]:
    bpy.ops.object.light_add(type="AREA", location=location)
    light = bpy.context.object
    light.name, light.data.energy, light.data.shape, light.data.size = name, energy, "DISK", size
    light.data.color = color
    light.rotation_euler = (Vector((0, 0, 0)) - light.location).to_track_quat("-Z", "Y").to_euler()
bpy.context.scene.world.color = (0.13, 0.23, 0.42)
bpy.context.scene.render.engine = "CYCLES"
bpy.context.scene.cycles.samples = 32
bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y = 1600, 1000
bpy.context.scene.render.resolution_percentage = 100
bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
bpy.ops.object.select_all(action="DESELECT")
panel.select_set(True)
bpy.context.view_layer.objects.active = panel
bpy.ops.export_scene.gltf(filepath=str(model_path), export_format="GLB", use_selection=True, export_apply=True)
print(f"SpaceYew native source: {blend_path}")
print(f"SpaceYew web model: {model_path}")
