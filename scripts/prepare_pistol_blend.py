"""Prepare a derived baking scene from the user's packed blend. Source is read-only.

Run using Blender --background --factory-startup --disable-autoexec source.blend
--python scripts/prepare_pistol_blend.py -- TEMP_ASSET_DIRECTORY.
"""
import bpy
import json
import sys
import numpy as np
from mathutils import Vector
from pathlib import Path

directory = Path(sys.argv[sys.argv.index('--') + 1])
scene = bpy.context.scene
source_path = bpy.data.filepath
records = json.loads((directory / 'working-images.json').read_text(encoding='utf-8'))
for item in records:
    old = bpy.data.images.get(item['name'])
    if not old:
        continue
    image = bpy.data.images.load(item.get('working', item['path']), check_existing=True)
    image.colorspace_settings.name = item['colorSpace']
    old.user_remap(image)
    bpy.data.images.remove(old)
    image.name = item['name']
print('TEXTURES_RELINKED', flush=True)

# Realize the actual node-generated fire/smoke, including their named attributes.
effect = bpy.data.objects['枪口火焰中']
group = next(m.node_group for m in effect.modifiers if m.type == 'NODES')
output = next(n for n in group.nodes if n.type == 'GROUP_OUTPUT' and n.is_active_output)
connection = output.inputs['Geometry'].links[0].from_socket
realize = group.nodes.new('GeometryNodeRealizeInstances')
group.links.new(connection, realize.inputs['Geometry'])
group.links.new(realize.outputs['Geometry'], output.inputs['Geometry'])
target_frame = scene.frame_current
for frame in range(scene.frame_start, target_frame + 1):
    scene.frame_set(frame)
    bpy.context.view_layer.update()

source_collections = ['手枪', '白色', '子弹', 'Info', 'Subset']
sources = {ob for name in source_collections for ob in bpy.data.collections[name].objects if ob.type == 'MESH'}
sources.add(effect)
sources.add(bpy.data.objects['wRing.001'])
collection = bpy.data.collections.new('Web presentation - baked copy')
scene.collection.children.link(collection)
copies = []
depsgraph = bpy.context.evaluated_depsgraph_get()
for source in sorted(sources, key=lambda ob: ob.name):
    mesh = bpy.data.meshes.new_from_object(source.evaluated_get(depsgraph), preserve_all_data_layers=True, depsgraph=depsgraph)
    if not mesh.vertices:
        continue
    ob = bpy.data.objects.new('WEB_' + source.name, mesh)
    collection.objects.link(ob)
    ob.matrix_world = source.matrix_world.copy()
    # Preserve the original local texture coordinates when objects are joined.
    coords = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
    mesh.vertices.foreach_get('co', coords)
    coords = coords.reshape((-1, 3))
    minimum, maximum = coords.min(axis=0), coords.max(axis=0)
    generated = (coords - minimum) / np.maximum(maximum - minimum, 1e-8)
    for name, values in [('source_object', coords), ('source_generated', generated)]:
        attribute = mesh.attributes.new(name=name, type='FLOAT_VECTOR', domain='POINT')
        attribute.data.foreach_set('vector', values.flatten())
    if 'UVMap' not in mesh.uv_layers:
        mesh.uv_layers.new(name='UVMap')
    mesh.uv_layers.new(name='WebUV')
    mesh.uv_layers.active = mesh.uv_layers['WebUV']
    mesh.uv_layers['UVMap'].active_render = True
    copies.append(ob)

def preserve_coordinates(tree):
    for node in list(tree.nodes):
        if node.type == 'GROUP' and node.node_tree:
            preserve_coordinates(node.node_tree)
        elif node.type == 'TEX_COORD':
            for socket_name, attribute_name in [('Object', 'source_object'), ('Generated', 'source_generated')]:
                if socket_name == 'Object' and node.object:
                    raise RuntimeError('Explicit mapping object requires a separate coordinate transform')
                attribute = tree.nodes.new('ShaderNodeAttribute')
                attribute.attribute_name = attribute_name
                for link in list(node.outputs[socket_name].links):
                    tree.links.new(attribute.outputs['Vector'], link.to_socket)

for material in {m for ob in copies for m in ob.data.materials if m}:
    if material.node_tree:
        preserve_coordinates(material.node_tree)
for ob in list(scene.objects):
    ob.select_set(False)
    if ob.type in {'MESH', 'CURVE', 'VOLUME'} and ob not in copies:
        ob.hide_render = True
for ob in copies:
    ob.select_set(True)
bpy.context.view_layer.objects.active = copies[0]
bpy.ops.object.join()
body = bpy.context.object
body.name = 'Pistol with realized muzzle fire and smoke'
print('GEOMETRY', len(body.data.vertices), len(body.data.polygons), len(body.data.materials), flush=True)
body.data.uv_layers.active = body.data.uv_layers['WebUV']
bpy.ops.object.mode_set(mode='EDIT')
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.smart_project(angle_limit=1.151917, island_margin=0.004, area_weight=1.0, correct_aspect=True)
bpy.ops.object.mode_set(mode='OBJECT')
body.data.uv_layers['UVMap'].active_render = True
print('UV_READY', flush=True)

# A neutral reference view for verifying the conversion, not a new site layout.
camera_data = bpy.data.cameras.new('Web reference camera')
camera = bpy.data.objects.new('Web reference camera', camera_data)
collection.objects.link(camera)
scene.camera = camera
camera.location = (5, -23, 6)
camera.rotation_euler = (Vector((5, 0, 2.6)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 15
scene.render.engine = 'CYCLES'
scene.cycles.samples = 12
scene.cycles.use_denoising = True
scene.cycles.device = 'CPU'
scene.render.resolution_x = 1100
scene.render.resolution_y = 550
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.use_compositing = False
scene.render.use_sequencer = False
scene.render.filepath = str(directory / 'source-reference.png')
scene.render.bake.margin = 8
scene['source_file_read_only'] = source_path
scene['web_bake_object'] = body.name
# Purge only unreferenced data in this disposable in-memory copy, then pack working images.
bpy.data.orphans_purge(do_recursive=True)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(directory / 'prepared.blend'))
print('PREPARED', flush=True)
bpy.ops.render.render(write_still=True)
