"""Original SpaceYew silk hangings and a fine continuous cable.
Run: /Applications/Blender.app/Contents/MacOS/Blender -b -t 1 -P scripts/build-home-wind.py
"""
import bpy
import math
from pathlib import Path

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
COLS, ROWS = 32, 40
COLORS = [(1, .985, .94, 1), (.84, .92, 1, 1), (.94, .89, 1, 1), (.86, .96, .91, 1)]


def silk_point(u, v, panel):
    edge = abs(u - .5) * 2
    corner = max(0, (v - .94) / .06)
    x = (u - .5) * 2.12 - math.copysign(.035 * corner * corner * edge ** 12, u - .5)
    height = 1.28 - v * 2.56 + .045 * edge ** 10 * v ** 10
    height += .026 * math.sin(u * math.pi * 2 + panel * .5) * v ** 4
    # A broad bias fold, smaller diagonal pleats and a lightly turned free edge.
    depth = (.044 * math.sin(u * 7 + v * 2.8 + panel * .7)
             + .018 * math.sin(u * 16 - v * 3 + panel)) * v ** .75
    depth += .058 * edge ** 8 * math.sin(v * math.pi * .82) * v
    return (x, depth, height)


def material(name, color, roughness=.48):
    result = bpy.data.materials.new(name)
    result.diffuse_color = color
    result.use_nodes = True
    bsdf = next((node for node in result.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None) or result.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    output = next((node for node in result.node_tree.nodes if node.type == 'OUTPUT_MATERIAL'), None) or result.node_tree.nodes.new('ShaderNodeOutputMaterial')
    result.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Sheen Weight'].default_value = .7
    bsdf.inputs['Sheen Roughness'].default_value = .36
    return result


for panel in range(4):
    vertices = [silk_point(col / COLS, row / ROWS, panel)
                for row in range(ROWS + 1) for col in range(COLS + 1)]
    faces = []
    for row in range(ROWS):
        for col in range(COLS):
            a = row * (COLS + 1) + col
            faces.append((a, a + COLS + 1, a + COLS + 2, a + 1))
    mesh = bpy.data.meshes.new(f'SilkWeave{panel}')
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    uv = mesh.uv_layers.new(name='SilkUV')
    for polygon in mesh.polygons:
        polygon.use_smooth = True
        for loop_index in polygon.loop_indices:
            vertex = mesh.loops[loop_index].vertex_index
            uv.data[loop_index].uv = ((vertex % (COLS + 1)) / COLS, 1 - (vertex // (COLS + 1)) / ROWS)
    cloth = bpy.data.objects.new(f'WindFabric_{panel}', mesh)
    bpy.context.collection.objects.link(cloth)
    cloth.data.materials.append(material(f'Silk_{panel}', COLORS[panel]))
    cloth['pinned_edge'] = 'top'
    cloth['weave_columns'], cloth['weave_rows'] = COLS, ROWS
    cloth['authorship'] = 'Original SpaceYew bias-fold silk; free corners and sewn rolled hem'
    # A narrow raised ribbon follows all four edges in the same authored surface.
    hem_vertices, hem_faces, hem_uvs = [], [], []
    for edge in range(4):
        count = ROWS if edge < 2 else COLS
        start = len(hem_vertices)
        for step in range(count + 1):
            t = .008 + .984 * step / count
            for inset in (.008, .015):
                u, v = ((inset if edge == 0 else 1 - inset), t) if edge < 2 else (t, inset if edge == 2 else 1 - inset)
                x, depth, height = silk_point(u, v, panel)
                hem_vertices.append((x, depth - .0028, height))
                hem_uvs.append((u, 1 - v))
        for step in range(count):
            a = start + step * 2
            hem_faces.append((a, a + 2, a + 3, a + 1))
    hem_mesh = bpy.data.meshes.new(f'RolledHem{panel}')
    hem_mesh.from_pydata(hem_vertices, [], hem_faces)
    hem_mesh.update()
    uv = hem_mesh.uv_layers.new(name='HemUV')
    for polygon in hem_mesh.polygons:
        polygon.use_smooth = True
        for loop_index in polygon.loop_indices:
            uv.data[loop_index].uv = hem_uvs[hem_mesh.loops[loop_index].vertex_index]
    hem = bpy.data.objects.new(f'WindHem_{panel}', hem_mesh)
    bpy.context.collection.objects.link(hem)
    hem.parent = cloth
    hem.data.materials.append(material(f'SilkHem_{panel}', COLORS[panel], .56))

# The front-end follows this same analytic catenary-inspired path.
def cable_y(x):
    return 1.4 + .30 * math.sin(x * .52 - .2) + .10 * math.sin(x * 1.04 + 1.2)

curve = bpy.data.curves.new('SilkCable', type='CURVE')
curve.dimensions = '3D'
curve.resolution_u = 2
curve.bevel_depth = .006
curve.bevel_resolution = 2
spline = curve.splines.new('POLY')
spline.points.add(400)
for index, point in enumerate(spline.points):
    x = -11 + 22 * index / 400
    point.co = (x, -.065, cable_y(x), 1)
cable = bpy.data.objects.new('WindCable', curve)
bpy.context.collection.objects.link(cable)
thread = material('PaleCobaltFilament', (.32, .49, .69, 1), .3)
next(node for node in thread.node_tree.nodes if node.type == 'BSDF_PRINCIPLED').inputs['Metallic'].default_value = .4
cable.data.materials.append(thread)
cable['authorship'] = 'Original SpaceYew continuous 400-segment silk cable'
bpy.context.view_layer.objects.active = cable
bpy.ops.object.select_all(action='DESELECT')
cable.select_set(True)
bpy.ops.object.convert(target='MESH')

output = Path(__file__).resolve().parents[1] / 'public/models/spaceyew-home-wind.glb'
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', export_extras=True)
print(f'Exported {output}: {output.stat().st_size} bytes')
