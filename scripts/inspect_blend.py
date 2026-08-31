"""Read a Blender project without changing it. Run with --disable-autoexec."""
import bpy
import json
import sys
from pathlib import Path

output = Path(sys.argv[sys.argv.index('--') + 1])

def socket_value(socket):
    if not hasattr(socket, 'default_value'):
        return None
    value = socket.default_value
    if isinstance(value, (str, int, float, bool)):
        return value
    try:
        return list(value)
    except TypeError:
        return str(value)

def tree_info(tree):
    if not tree:
        return []
    return [{
        'name': n.name, 'type': n.bl_idname,
        'image': n.image.name if n.type == 'TEX_IMAGE' and n.image else None,
        'group': n.node_tree.name if n.type == 'GROUP' and n.node_tree else None,
        'inputs': {s.name: {'value': socket_value(s), 'links': [l.from_node.name + ':' + l.from_socket.name for l in s.links]} for s in n.inputs if s.is_linked or hasattr(s, 'default_value')},
    } for n in tree.nodes]

report = {
    'version': bpy.app.version_string, 'file': bpy.data.filepath,
    'frame': bpy.context.scene.frame_current, 'engine': bpy.context.scene.render.engine,
    'camera': bpy.context.scene.camera.name if bpy.context.scene.camera else None,
    'colorManagement': {'view': bpy.context.scene.view_settings.view_transform, 'look': bpy.context.scene.view_settings.look, 'exposure': bpy.context.scene.view_settings.exposure},
    'images': [{'name': im.name, 'path': im.filepath, 'packed': bool(im.packed_file or len(im.packed_files)), 'source': im.source} for im in bpy.data.images],
    'objects': [{'name': ob.name, 'type': ob.type, 'hideRender': ob.hide_render, 'hideViewport': ob.hide_viewport, 'visible': ob.visible_get(), 'location': list(ob.matrix_world.translation), 'dimensions': list(ob.dimensions), 'materials': [m.name if m else None for m in ob.data.materials] if hasattr(ob.data, 'materials') else [], 'modifiers': [{'type': mod.type, 'name': mod.name, 'group': mod.node_group.name if mod.type == 'NODES' and mod.node_group else None} for mod in ob.modifiers], 'uv': list(ob.data.uv_layers.keys()) if ob.type == 'MESH' else [], 'parent': ob.parent.name if ob.parent else None} for ob in bpy.context.scene.objects],
    'materials': [{'name': m.name, 'nodes': tree_info(m.node_tree)} for m in bpy.data.materials],
    'groups': [{'name': g.name, 'type': g.bl_idname, 'nodes': tree_info(g)} for g in bpy.data.node_groups],
}
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(report, ensure_ascii=False, indent=2, default=str), encoding='utf-8')
print('BLEND_REPORT', json.dumps({'images':len(report['images']), 'packedImages': sum(i['packed'] for i in report['images']), 'objects':len(report['objects']), 'materials':len(report['materials']), 'groups':len(report['groups']), 'frame':report['frame'], 'camera':report['camera']}, ensure_ascii=False))
