"""Original woven-glass mobile for the interactive homepage.
Run with Blender: blender -b -t 1 -P scripts/build-home-kinetic.py
"""
import bpy
import math
from pathlib import Path

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def glass(name, color):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    node = next((item for item in material.node_tree.nodes if item.type == 'BSDF_PRINCIPLED'), None) or material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    output = next((item for item in material.node_tree.nodes if item.type == 'OUTPUT_MATERIAL'), None) or material.node_tree.nodes.new('ShaderNodeOutputMaterial')
    material.node_tree.links.new(node.outputs['BSDF'], output.inputs['Surface'])
    node.inputs['Base Color'].default_value = (*color, 1)
    node.inputs['Roughness'].default_value = .055
    node.inputs['Transmission Weight'].default_value = 1
    node.inputs['IOR'].default_value = 1.46
    return material

materials = [glass('Glacier', (.72, .88, .98)), glass('Lilac', (.83, .79, .98)), glass('ClearIce', (.91, .96, 1))]
for ribbon in range(3):
    vertices, faces = [], []
    segments, bands = 120, 4
    phase = ribbon * math.tau / 3
    for step in range(segments):
        angle = step / segments * math.tau
        radius = 1.52 + .16 * math.sin(angle * 3 + phase)
        twist = angle + phase
        for band in range(bands + 1):
            width = (band / bands - .5) * .34
            x = (radius + width * math.cos(twist)) * math.cos(angle)
            y = (radius + width * math.cos(twist)) * math.sin(angle) * .78
            z = .36 * math.sin(angle * 2 + phase) + width * math.sin(twist)
            # Blender Z-up -> glTF Y-up; the source is authored in display coordinates.
            vertices.append((x, -z, y))
    for step in range(segments):
        nxt = (step + 1) % segments
        for band in range(bands):
            a, b = step * (bands + 1) + band, nxt * (bands + 1) + band
            faces.append((a, b, b + 1, a + 1))
    mesh = bpy.data.meshes.new('SculptedRibbon')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new('PrismArc_' + str(ribbon), mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(materials[ribbon])
    bpy.context.view_layer.objects.active = obj
    solid = obj.modifiers.new('Optical volume', 'SOLIDIFY')
    solid.thickness = .065
    bpy.ops.object.modifier_apply(modifier=solid.name)
    bevel = obj.modifiers.new('Polished edges', 'BEVEL')
    bevel.width, bevel.segments = .022, 3
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    obj['role'] = 'closed_refractive_ribbon'

for index in range(3):
    angle = index * math.tau / 3 + .3
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=.22, location=(2.14 * math.cos(angle), -.12, 1.76 * math.sin(angle)))
    obj = bpy.context.object
    obj.name = 'DiscoveryNode_' + str(index)
    obj.data.materials.append(materials[index])
    for polygon in obj.data.polygons:
        polygon.use_smooth = True

output = Path(__file__).resolve().parents[1] / 'public/models/spaceyew-home-kinetic.glb'
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', export_extras=True)
print(f'Exported {output.stat().st_size} bytes')
