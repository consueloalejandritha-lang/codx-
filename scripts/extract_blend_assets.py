"""Extract packed source bytes and evaluated-scene metadata; never save the source."""
import bpy
import json
import sys
from pathlib import Path

destination = Path(sys.argv[sys.argv.index('--') + 1])
destination.mkdir(parents=True, exist_ok=True)
images = []
for index, image in enumerate(bpy.data.images):
    if not image.packed_file:
        continue
    suffix = Path(image.filepath).suffix or '.bin'
    target = destination / f'{index:03d}{suffix}'
    target.write_bytes(image.packed_file.data)
    images.append({'name': image.name, 'path': str(target), 'original': image.filepath, 'colorSpace': image.colorspace_settings.name})
    print('EXTRACT', index, image.name, target.stat().st_size, flush=True)
(destination / 'images.json').write_text(json.dumps(images, ensure_ascii=False, indent=2), encoding='utf-8')
scene = bpy.context.scene
target_frame = scene.frame_current
for frame in range(scene.frame_start, target_frame + 1):
    scene.frame_set(frame)
    bpy.context.view_layer.update()
depsgraph = bpy.context.evaluated_depsgraph_get()
instances = []
for inst in depsgraph.object_instances:
    ob = inst.object
    if ob.type != 'MESH':
        continue
    corners = [list(inst.matrix_world @ __import__('mathutils').Vector(c)) for c in ob.bound_box]
    instances.append({'name':ob.name,'instance':inst.is_instance,'parent':inst.parent.name if inst.parent else None,'location':list(inst.matrix_world.translation),'bounds':corners,'vertices':len(ob.data.vertices),'materials':[m.name if m else None for m in ob.data.materials]})
info = {'frame': scene.frame_current, 'instances': instances, 'collections':[{'name':c.name,'hideRender':c.hide_render,'objects':[o.name for o in c.objects]} for c in bpy.data.collections], 'cameraMatrix':[list(row) for row in scene.camera.matrix_world], 'cameraLens':scene.camera.data.lens, 'geometryModifiers': [{'name':o.name, 'values':{k:str(v) for m in o.modifiers if m.type=='NODES' for k,v in m.items()}} for o in scene.objects if any(m.type=='NODES' for m in o.modifiers)]}
(destination / 'scene.json').write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding='utf-8')
print('DONE', len(images), len(instances), flush=True)
