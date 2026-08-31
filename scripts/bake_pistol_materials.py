"""Bake layered source shaders into glTF PBR textures in a derived scene.

Run against prepared.blend with --disable-autoexec. Never writes the source file.
"""
import bpy
import json
import sys
import numpy as np
from pathlib import Path

directory = Path(sys.argv[sys.argv.index('--') + 1])
scene = bpy.context.scene
body = bpy.data.objects[scene['web_bake_object']]
originals = list(body.data.materials)
size = 2048
emission_gain = 16.0
scene.render.engine = 'CYCLES'
scene.cycles.samples = 1
scene.cycles.use_denoising = False
scene.cycles.device = 'CPU'
scene.render.bake.use_selected_to_active = False
scene.render.bake.margin = 6
scene.render.bake.margin_type = 'EXTEND'
for ob in scene.objects:
    ob.select_set(ob == body)
bpy.context.view_layer.objects.active = body
body.data.uv_layers.active = body.data.uv_layers['WebUV']
body.data.uv_layers['UVMap'].active_render = True

def connect(tree, source, target, fallback=0.0):
    if source and source.is_linked:
        tree.links.new(source.links[0].from_socket, target)
    else:
        value = source.default_value if source and hasattr(source, 'default_value') else fallback
        if target.type == 'RGBA' and isinstance(value, (int, float)):
            value = (value, value, value, 1)
        target.default_value = value

def flatten_channel(tree, channel, visited):
    for node in list(tree.nodes):
        if node.type == 'GROUP' and node.node_tree:
            source_group = node.node_tree
            if source_group not in visited:
                visited[source_group] = source_group.copy()
                flatten_channel(visited[source_group], channel, visited)
            node.node_tree = visited[source_group]
        elif node.type == 'LIGHT_PATH':
            # Export the appearance seen by the presentation camera.
            for socket in node.outputs:
                if not socket.is_linked:
                    continue
                constant = tree.nodes.new('ShaderNodeValue')
                constant.outputs[0].default_value = float(socket.name == 'Is Camera Ray')
                for link in list(socket.links):
                    tree.links.new(constant.outputs[0], link.to_socket)
        elif node.type.startswith('BSDF_') or node.type == 'EMISSION':
            emission = tree.nodes.new('ShaderNodeEmission')
            emission.inputs['Strength'].default_value = 1
            principled = node.type == 'BSDF_PRINCIPLED'
            transparent = node.type == 'BSDF_TRANSPARENT'
            if channel == 'base':
                connect(tree, node.inputs.get('Base Color') if principled else node.inputs.get('Color') if node.type != 'EMISSION' else None, emission.inputs['Color'])
            elif channel == 'alpha':
                connect(tree, node.inputs.get('Alpha') if principled else None, emission.inputs['Color'], 0.0 if transparent else 1.0)
            elif channel == 'orm':
                combine = tree.nodes.new('ShaderNodeCombineColor')
                connect(tree, node.inputs.get('Transmission Weight') if principled else None, combine.inputs['Red'])
                connect(tree, node.inputs.get('Roughness'), combine.inputs['Green'], 1.0)
                connect(tree, node.inputs.get('Metallic') if principled else None, combine.inputs['Blue'])
                tree.links.new(combine.outputs[0], emission.inputs['Color'])
            elif channel == 'emission':
                connect(tree, node.inputs.get('Emission Color') if principled else node.inputs.get('Color') if node.type == 'EMISSION' else None, emission.inputs['Color'])
                strength = tree.nodes.new('ShaderNodeMath')
                strength.operation = 'DIVIDE'
                connect(tree, node.inputs.get('Emission Strength') if principled else node.inputs.get('Strength') if node.type == 'EMISSION' else None, strength.inputs[0])
                strength.inputs[1].default_value = emission_gain
                tree.links.new(strength.outputs[0], emission.inputs['Strength'])
            for output in node.outputs:
                if output.type == 'SHADER':
                    for link in list(output.links):
                        tree.links.new(emission.outputs[0], link.to_socket)

images = {}
for channel in ['base', 'orm', 'normal', 'emission', 'alpha']:
    cached = directory / f'baked-{channel}.png'
    if '--reuse-bakes' in sys.argv and cached.exists():
        image = bpy.data.images.load(str(cached), check_existing=False)
        image.colorspace_settings.name = 'sRGB' if channel in ('base', 'emission') else 'Non-Color'
        images[channel] = image
        continue
    image = bpy.data.images.new('Pistol baked ' + channel, width=size, height=size, alpha=True, float_buffer=True)
    image.colorspace_settings.name = 'sRGB' if channel in ('base', 'emission') else 'Non-Color'
    image.filepath_raw = str(directory / f'baked-{channel}.png')
    image.file_format = 'PNG'
    images[channel] = image
    materials = []
    groups = {}
    for index, original in enumerate(originals):
        material = original.copy()
        material.name = original.name + ' / bake ' + channel
        if channel != 'normal':
            flatten_channel(material.node_tree, channel, groups)
        node = material.node_tree.nodes.new('ShaderNodeTexImage')
        node.image = image
        material.node_tree.nodes.active = node
        body.data.materials[index] = material
        materials.append(material)
    print('BAKE_START', channel, flush=True)
    bpy.ops.object.bake(type='NORMAL' if channel == 'normal' else 'EMIT', uv_layer='WebUV', use_clear=True)
    image.save()
    print('BAKE_SAVED', channel, flush=True)
    for index, original in enumerate(originals):
        body.data.materials[index] = original
    for material in materials:
        bpy.data.materials.remove(material)
    for group in list(groups.values()):
        if group.users == 0:
            bpy.data.node_groups.remove(group)

# Pack coverage into base color alpha; data channels stay linear.
base = np.empty(size * size * 4, dtype=np.float32)
alpha = np.empty_like(base)
images['base'].pixels.foreach_get(base)
images['alpha'].pixels.foreach_get(alpha)
base[3::4] = alpha[0::4]
images['base'].pixels.foreach_set(base)
images['base'].save()

def image_node(tree, image):
    node = tree.nodes.new('ShaderNodeTexImage')
    node.image = image
    return node

# All source surfaces retain a material slot, but share one compact texture atlas.
for index, original in enumerate(originals):
    material = bpy.data.materials.new(original.name + ' / web baked')
    material.use_nodes = True
    material.use_backface_culling = False
    tree = material.node_tree
    principled = tree.nodes.get('Principled BSDF')
    color = image_node(tree, images['base'])
    tree.links.new(color.outputs['Color'], principled.inputs['Base Color'])
    tree.links.new(color.outputs['Alpha'], principled.inputs['Alpha'])
    orm = image_node(tree, images['orm'])
    separate = tree.nodes.new('ShaderNodeSeparateColor')
    tree.links.new(orm.outputs['Color'], separate.inputs['Color'])
    tree.links.new(separate.outputs['Red'], principled.inputs['Transmission Weight'])
    tree.links.new(separate.outputs['Green'], principled.inputs['Roughness'])
    tree.links.new(separate.outputs['Blue'], principled.inputs['Metallic'])
    normal = image_node(tree, images['normal'])
    normal_map = tree.nodes.new('ShaderNodeNormalMap')
    tree.links.new(normal.outputs['Color'], normal_map.inputs['Color'])
    tree.links.new(normal_map.outputs['Normal'], principled.inputs['Normal'])
    emission = image_node(tree, images['emission'])
    tree.links.new(emission.outputs['Color'], principled.inputs['Emission Color'])
    principled.inputs['Emission Strength'].default_value = emission_gain
    for name in ('IOR', 'Coat Weight', 'Coat Roughness', 'Specular IOR Level'):
        source = next((n for n in original.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if source and not source.inputs[name].is_linked:
            principled.inputs[name].default_value = source.inputs[name].default_value
    body.data.materials[index] = material

for name in list(body.data.uv_layers.keys()):
    if name != 'WebUV':
        body.data.uv_layers.remove(body.data.uv_layers[name])
body.data.uv_layers['WebUV'].active_render = True
# glTF exports a lightweight, static frame; mouse rotation remains live in the site.
body['source'] = 'Packed Blender project, frame ' + str(scene.frame_current)
body['effects'] = 'Realized original muzzle flash and smoke; preserved ejected shell and projectile'
body['baked_materials'] = True
for image in images.values():
    image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(directory / 'baked.blend'))
bpy.ops.export_scene.gltf(filepath=str(directory / 'pistol-blend-baked.glb'), export_format='GLB', use_selection=True, export_apply=True, export_animations=False, export_cameras=False, export_lights=False, export_extras=True, export_image_format='AUTO', export_yup=True)
scene.render.filepath = str(directory / 'baked-reference.png')
scene.cycles.samples = 12
scene.cycles.use_denoising = True
bpy.ops.render.render(write_still=True)
print('BAKE_COMPLETE', flush=True)
