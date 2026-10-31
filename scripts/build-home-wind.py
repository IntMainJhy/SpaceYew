"""Blender source for the homepage's four pinned, woven fabric panels.
Run: /Applications/Blender.app/Contents/MacOS/Blender -b -t 1 -P scripts/build-home-wind.py
"""
import bpy
import math
from pathlib import Path

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

colors = [(0.94, 0.92, 0.86, 1), (0.69, 0.81, 0.96, 1), (0.83, 0.80, 0.93, 1), (0.88, 0.92, 0.85, 1)]
for panel in range(4):
    vertices, faces = [], []
    cols, rows = 32, 40
    for row in range(rows + 1):
        v = row / rows
        for col in range(cols + 1):
            u = col / cols
            x = (u - 0.5) * 2.12
            # Fine folds are baked; the browser adds slow wind and local pointer pressure.
            depth = (0.055 * math.sin(u * math.pi * 7 + panel * 0.8) + 0.08 * math.sin(u * 5 + v * 5)) * (v ** 0.6)
            height = 1.28 - v * 2.56 + 0.055 * math.sin(u * math.pi * 2 + panel) * v * v
            vertices.append((x, depth, height))
    for row in range(rows):
        for col in range(cols):
            a = row * (cols + 1) + col
            faces.append((a, a + cols + 1, a + cols + 2, a + 1))
    mesh = bpy.data.meshes.new(f'FabricWeave{panel}')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new(name='FabricUV')
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        for loop_index in polygon.loop_indices:
            index = mesh.loops[loop_index].vertex_index
            uv.data[loop_index].uv = ((index % (cols + 1)) / cols, 1 - (index // (cols + 1)) / rows)
    obj = bpy.data.objects.new(f'WindFabric_{panel}', mesh)
    bpy.context.collection.objects.link(obj)
    material = bpy.data.materials.new(f'WovenFabric_{panel}')
    material.diffuse_color = colors[panel]
    material.use_nodes = True
    bsdf = next((node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None) or material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    output_node = next((node for node in material.node_tree.nodes if node.type == 'OUTPUT_MATERIAL'), None) or material.node_tree.nodes.new('ShaderNodeOutputMaterial')
    material.node_tree.links.new(bsdf.outputs['BSDF'], output_node.inputs['Surface'])
    bsdf.inputs['Base Color'].default_value = colors[panel]
    bsdf.inputs['Roughness'].default_value = 0.88
    bsdf.inputs['Sheen Weight'].default_value = 0.35
    obj.data.materials.append(material)
    obj['pinned_edge'] = 'top'
    obj['weave_columns'] = cols
    obj['weave_rows'] = rows

curve = bpy.data.curves.new('WindingCable', type='CURVE')
curve.dimensions = '3D'
curve.resolution_u = 24
curve.bevel_depth = 0.014
curve.bevel_resolution = 3
spline = curve.splines.new('BEZIER')
points = [(-6.6, 0.05, 2.15), (-4.2, 0, 1.96), (-1.4, 0.04, 1.26), (1.4, 0, 1.86), (4.2, 0.04, 1.18), (6.7, 0.12, 1.85)]
spline.bezier_points.add(len(points) - 1)
for point, position in zip(spline.bezier_points, points):
    point.co = position
    point.handle_left_type = 'AUTO'
    point.handle_right_type = 'AUTO'
cable = bpy.data.objects.new('WindCable', curve)
bpy.context.collection.objects.link(cable)
material = bpy.data.materials.new('CobaltThread')
material.diffuse_color = (0.12, 0.29, 0.63, 1)
material.use_nodes = True
bsdf = next((node for node in material.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None) or material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
output_node = next((node for node in material.node_tree.nodes if node.type == 'OUTPUT_MATERIAL'), None) or material.node_tree.nodes.new('ShaderNodeOutputMaterial')
material.node_tree.links.new(bsdf.outputs['BSDF'], output_node.inputs['Surface'])
bsdf.inputs['Base Color'].default_value = (0.12, 0.29, 0.63, 1)
bsdf.inputs['Metallic'].default_value = 0.35
bsdf.inputs['Roughness'].default_value = 0.45
cable.data.materials.append(material)
bpy.context.view_layer.objects.active = cable
cable.select_set(True)
bpy.ops.object.convert(target='MESH')

output = Path(__file__).resolve().parents[1] / 'public/models/spaceyew-home-wind.glb'
output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', export_extras=True)
print(f'Exported {output}: {output.stat().st_size} bytes')
