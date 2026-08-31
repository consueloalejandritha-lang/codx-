"""Export the baked source as a small, self-contained Draco GLB."""
import bpy
import sys
from pathlib import Path

destination = Path(sys.argv[sys.argv.index('--') + 1])
scene = bpy.context.scene
body = bpy.data.objects[scene['web_bake_object']]
for ob in scene.objects:
    ob.select_set(ob == body)
bpy.context.view_layer.objects.active = body
for key in ('source_file_read_only', 'web_bake_object'):
    if key in scene:
        del scene[key]
# Use blend mode only where the original surface needs alpha.
for material in body.data.materials:
    original_name = material.name.removesuffix(' / web baked')
    principled = material.node_tree.nodes.get('Principled BSDF')
    if not (original_name.startswith('.') or 'MuzzleFlash' in original_name or 'Glass' in original_name):
        for link in list(principled.inputs['Alpha'].links):
            material.node_tree.links.remove(link)
        principled.inputs['Alpha'].default_value = 1
    # Ordinary metals have no transmission. Avoid unnecessary refraction passes.
    if not ('Glass' in original_name or 'Translucent' in original_name):
        for link in list(principled.inputs['Transmission Weight'].links):
            material.node_tree.links.remove(link)
        principled.inputs['Transmission Weight'].default_value = 0
destination.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(destination), export_format='GLB', use_selection=True, export_apply=True, export_animations=False, export_cameras=False, export_lights=False, export_extras=True, export_image_format='AUTO', export_yup=True, export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=6, export_draco_position_quantization=16, export_draco_normal_quantization=12, export_draco_texcoord_quantization=14)
print('WEB_MODEL', destination.stat().st_size, flush=True)
