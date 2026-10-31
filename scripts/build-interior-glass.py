"""Build three original Blender glass sculptures for SpaceYew interior routes.

Blender --background --factory-startup --python scripts/build-interior-glass.py -- \
  --source-dir /private/local/spaceyew-interior-sources

Only the compact web models are exported into public/models. Editable .blend
sources are optional and belong in a private local directory outside the repo.
"""
import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument("--output-dir", default=str(root / "public/models"))
parser.add_argument("--source-dir")
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
output = Path(args.output_dir)
output.mkdir(parents=True, exist_ok=True)
source = Path(args.source_dir) if args.source_dir else None
if source:
    source.mkdir(parents=True, exist_ok=True)


def glass():
    material = bpy.data.materials.new("SpaceYew ice optical glass")
    material.use_nodes = True
    node = material.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value = (0.94, 0.98, 1, 1)
    node.inputs["Roughness"].default_value = 0.045
    node.inputs["IOR"].default_value = 1.46
    node.inputs["Transmission Weight"].default_value = 1
    material.diffuse_color = (0.84, 0.94, 1, 1)
    return material


def polish(obj, material, radius=0.04):
    bpy.context.view_layer.objects.active = obj
    obj.data.materials.append(material)
    bevel = obj.modifiers.new("Polished optical edge", "BEVEL")
    bevel.width, bevel.segments = radius, 4
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    normals = obj.modifiers.new("Weighted planar normals", "WEIGHTED_NORMAL")
    normals.keep_sharp = True
    bpy.ops.object.modifier_apply(modifier=normals.name)
    obj["authorship"] = "Original SpaceYew interior sculpture, generated in native Blender"
    return obj


def ribbon(name, radius, width, start, end, depth, material, steps=72):
    # A closed, genuine volume with a broad curved face and polished edges.
    vertices, faces = [], []
    for index in range(steps + 1):
        angle = start + (end - start) * index / steps
        for z in [-depth / 2, depth / 2]:
            for radial in [radius - width / 2, radius + width / 2]:
                vertices.append((math.cos(angle) * radial, math.sin(angle) * radial, z))
    for index in range(steps):
        a, b = index * 4, (index + 1) * 4
        faces.extend([(a, b, b + 1, a + 1), (a + 2, a + 3, b + 3, b + 2),
                      (a, a + 2, b + 2, b), (a + 1, b + 1, b + 3, a + 3)])
    faces.extend([(0, 1, 3, 2), (steps * 4, steps * 4 + 2, steps * 4 + 3, steps * 4 + 1)])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return polish(obj, material, 0.035)


def pane(name, size, location, rotation, material):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.rotation_euler = rotation
    return polish(obj, material, 0.07)


def studio(name):
    bpy.ops.object.camera_add(location=(0, -8.5, -0.2))
    camera = bpy.context.object
    camera.name = name + " native review camera"
    camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.lens = 48
    bpy.context.scene.camera = camera
    for location, energy, size in [((-4, -5, 3), 800, 4), ((4, -3, 1), 600, 2), ((0, -2, -3), 450, 3)]:
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = "Interior studio softbox"
        light.data.energy, light.data.size = energy, size
        light.rotation_euler = (-light.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.world.color = (0.48, 0.67, 0.82)
    bpy.context.scene.render.engine = "CYCLES"
    bpy.context.scene.cycles.samples = 32
    bpy.context.scene.render.resolution_x = 1200
    bpy.context.scene.render.resolution_y = 1000
    bpy.context.scene.render.resolution_percentage = 100


for scene in ["community", "resources", "login"]:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    material = glass()
    if scene == "community":
        first = ribbon("Community meeting arc A", 1.45, 0.42, -0.25, math.pi * 1.45, 0.22, material)
        first.rotation_euler = (0.32, -0.37, -0.38)
        first.location = (-0.52, 0.24, -0.12)
        second = ribbon("Community meeting arc B", 1.2, 0.36, -0.5, math.pi * 1.45, 0.2, material)
        second.rotation_euler = (-0.27, 0.36, math.pi + 0.18)
        second.location = (0.65, -0.31, 0.3)
    elif scene == "resources":
        for index in range(3):
            pane("Resource crystal page " + str(index + 1), (2.38, 3.14, 0.19),
                 ((index - 1) * 0.58, (index - 1) * 0.24, (index - 1) * 0.31),
                 (0.08, (index - 1) * 0.18 - 0.25, (index - 1) * 0.12 - 0.14), material)
    else:
        # Open arch instead of an enclosed logo: passage, not another brand mark.
        arch = ribbon("Login clear portal crown", 1.38, 0.40, 0, math.pi, 0.24, material)
        arch.location.y = 0.15
        for side in [-1, 1]:
            pane("Login portal upright " + str(side), (0.4, 1.85, 0.24),
                 (side * 1.38, -0.77, 0), (0, 0, 0), material)
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    # Author in the Blender X/Z front plane so glTF Y-up preserves the sculpture.
    for obj in meshes:
        obj.matrix_world = Matrix.Rotation(math.pi / 2, 4, "X") @ obj.matrix_world
    studio(scene)
    if source:
        bpy.ops.wm.save_as_mainfile(filepath=str(source / ("spaceyew-" + scene + ".blend")))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    target = output / ("spaceyew-" + scene + ".glb")
    bpy.ops.export_scene.gltf(filepath=str(target), export_format="GLB", use_selection=True,
                              export_apply=True, export_extras=True, export_cameras=False,
                              export_lights=False)
    print("Original SpaceYew interior model: " + str(target))
