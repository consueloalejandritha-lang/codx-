"""Inspect a helmet Blender project without modifying the source file."""

import bpy
from mathutils import Vector
from pathlib import Path


def describe_image(image):
    return {
        "name": image.name,
        "size": list(image.size),
        "packed": image.packed_file is not None,
        "filepath": image.filepath,
        "source": image.source,
    }


scene = bpy.context.scene
meshes = [obj for obj in scene.objects if obj.type == "MESH"]
print("HELMET_SCENE", {
    "objects": len(scene.objects),
    "meshes": len(meshes),
    "visible_meshes": sum(not obj.hide_render for obj in meshes),
    "triangles": sum(len(obj.data.loop_triangles) for obj in meshes),
    "mesh_names": [obj.name for obj in meshes],
    "materials": [material.name for material in bpy.data.materials],
    "images": [describe_image(image) for image in bpy.data.images],
    "cameras": [obj.name for obj in scene.objects if obj.type == "CAMERA"],
})
for obj in meshes:
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    bounds = [
        [round(min(point[axis] for point in corners), 3), round(max(point[axis] for point in corners), 3)]
        for axis in range(3)
    ]
    print("HELMET_MESH", {
        "name": obj.name,
        "triangles": len(obj.data.loop_triangles),
        "bounds": bounds,
        "materials": [slot.material.name if slot.material else None for slot in obj.material_slots],
        "uv_layers": [layer.name for layer in obj.data.uv_layers],
        "hide_render": obj.hide_render,
        "collections": [collection.name for collection in obj.users_collection],
    })
for material_name in ["主体", "面罩", "迎风罩", "透风", "蜂窝"]:
    material = bpy.data.materials.get(material_name)
    if material is None or material.node_tree is None:
        continue
    print("HELMET_MATERIAL", {
        "name": material_name,
        "nodes": [(node.name, node.type) for node in material.node_tree.nodes],
        "links": [
            (link.from_node.name, link.from_socket.name, link.to_node.name, link.to_socket.name)
            for link in material.node_tree.links
        ],
    })
for image in bpy.data.images:
    if image.source == "FILE" and image.packed_file is None:
        resolved = bpy.path.abspath(image.filepath)
        print("HELMET_IMAGE_PATH", image.name, resolved, Path(resolved).exists())
