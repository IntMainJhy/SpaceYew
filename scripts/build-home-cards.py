"""Original SpaceYew solid optical cards, authored in Blender.

Run: /Applications/Blender.app/Contents/MacOS/Blender -b -t 1 -P scripts/build-home-cards.py
Only the compact, original GLB is shipped; no Blender scene or external assets.
"""
from pathlib import Path
import bpy

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Blender's -Y is the glTF front (+Z). A real six-segment bevel catches the
# studio lights from every angle; this is a solid card, not a bent plane.
bpy.ops.mesh.primitive_cube_add(size=1)
card = bpy.context.object
card.name = 'OpticalCard_0'
card.dimensions = (2.34, .20, 2.94)
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
bevel = card.modifiers.new('Optically rounded edge', 'BEVEL')
bevel.width = .095
bevel.segments = 6
bpy.ops.object.modifier_apply(modifier=bevel.name)
for face in card.data.polygons:
    face.use_smooth = True
normal = card.modifiers.new('Polished broad faces', 'WEIGHTED_NORMAL')
normal.keep_sharp = True
bpy.ops.object.modifier_apply(modifier=normal.name)

glass = bpy.data.materials.new('SpaceYew cobalt optical glass')
glass.use_nodes = True
bsdf = next((node for node in glass.node_tree.nodes if node.type == 'BSDF_PRINCIPLED'), None) or glass.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
output_node = next((node for node in glass.node_tree.nodes if node.type == 'OUTPUT_MATERIAL'), None) or glass.node_tree.nodes.new('ShaderNodeOutputMaterial')
glass.node_tree.links.new(bsdf.outputs['BSDF'], output_node.inputs['Surface'])
bsdf.inputs['Base Color'].default_value = (.64, .80, 1, 1)
bsdf.inputs['Roughness'].default_value = .055
bsdf.inputs['IOR'].default_value = 1.46
bsdf.inputs['Transmission Weight'].default_value = .82
card.data.materials.append(glass)
card['authorship'] = 'Original SpaceYew solid optical card, modelled in Blender'
card['edge_segments'] = 6
card['interaction'] = 'Free yaw and bounded pitch, pointer or keyboard'
for index in range(1, 4):
    linked = card.copy()
    linked.data = card.data
    linked.name = f'OpticalCard_{index}'
    bpy.context.collection.objects.link(linked)

output = Path(__file__).resolve().parents[1] / 'public/models/spaceyew-home-cards.glb'
bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', export_extras=True)
print(f'Exported {output}: {output.stat().st_size} bytes; {len(card.data.vertices)} shared vertices')
