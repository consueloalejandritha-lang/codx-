"""Export the helmet collection as a self-contained GLB and render its poster.

Run Blender in the background with the source .blend already loaded, followed by
`--python scripts/export_helmet_web.py -- OUTPUT.glb POSTER.jpg`. The source file
is never saved or modified on disk.
"""

from pathlib import Path
import sys

import bpy
from mathutils import Vector


args = sys.argv[sys.argv.index("--") + 1 :]
if len(args) != 2:
    raise SystemExit("Expected output GLB and JPEG paths")
model_path, poster_path = map(Path, args)
model_path.parent.mkdir(parents=True, exist_ok=True)
poster_path.parent.mkdir(parents=True, exist_ok=True)

helmet_collection = bpy.data.collections.get("头盔")
if helmet_collection is None:
    raise RuntimeError("The source project has no 头盔 collection")
helmet_meshes = [obj for obj in helmet_collection.all_objects if obj.type == "MESH"]
if len(helmet_meshes) != 10:
    raise RuntimeError(f"Expected ten helmet meshes, found {len(helmet_meshes)}")

texture_directory = Path(__file__).resolve().parents[1] / "assets" / "helmet-pbr"


def texture_node(tree, name, prefix, color):
    filename = texture_directory / f"{prefix}_{name}.png"
    if not filename.is_file():
        raise RuntimeError(f"Missing generated PBR map: {filename}")
    image = bpy.data.images.load(str(filename), check_existing=True)
    image.colorspace_settings.name = "sRGB" if color else "Non-Color"
    node = tree.nodes.new("ShaderNodeTexImage")
    node.name = f"{prefix}_{name}"
    node.image = image
    node.extension = "REPEAT"
    return node


def pbr_material(name, prefix, coat=0):
    material = bpy.data.materials.get(name)
    if material is None:
        raise RuntimeError(f"Missing helmet material: {name}")
    material.use_nodes = True
    tree = material.node_tree
    tree.nodes.clear()
    output = tree.nodes.new("ShaderNodeOutputMaterial")
    shader = tree.nodes.new("ShaderNodeBsdfPrincipled")
    shader.inputs["Coat Weight"].default_value = coat
    shader.inputs["Coat Roughness"].default_value = 0.12
    tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    for channel, input_name in [
        ("basecolor", "Base Color"),
        ("metallic", "Metallic"),
        ("roughness", "Roughness"),
    ]:
        node = texture_node(tree, channel, prefix, channel == "basecolor")
        tree.links.new(node.outputs["Color"], shader.inputs[input_name])
    normal_texture = texture_node(tree, "normal", prefix, False)
    normal = tree.nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = 0.65 if prefix == "carbon" else 0.45
    tree.links.new(normal_texture.outputs["Color"], normal.inputs["Color"])
    tree.links.new(normal.outputs["Normal"], shader.inputs["Normal"])


for name in ["主体", "迎风罩"]:
    pbr_material(name, "carbon", coat=0.55)
for name in ["蜂窝", "透风"]:
    pbr_material(name, "vent", coat=0.08)

# glTF does not represent Blender's standalone Glass BSDF. Replace it with a
# dark tinted transmissive and clear-coated PBR visor in the exported copy.
visor = bpy.data.materials.get("面罩")
if visor is None:
    raise RuntimeError("Missing helmet visor material")
visor.use_nodes = True
visor.node_tree.nodes.clear()
output = visor.node_tree.nodes.new("ShaderNodeOutputMaterial")
principled = visor.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
principled.inputs["Base Color"].default_value = (0.004, 0.009, 0.012, 1)
principled.inputs["Metallic"].default_value = 0.0
principled.inputs["Roughness"].default_value = 0.07
principled.inputs["Transmission Weight"].default_value = 0.14
principled.inputs["IOR"].default_value = 1.48
principled.inputs["Coat Weight"].default_value = 0.7
principled.inputs["Coat Roughness"].default_value = 0.04
visor.node_tree.links.new(principled.outputs["BSDF"], output.inputs["Surface"])

bpy.ops.object.select_all(action="DESELECT")
for obj in helmet_meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = helmet_meshes[0]
bpy.ops.export_scene.gltf(
    filepath=str(model_path.resolve()),
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_animations=False,
    export_cameras=False,
    export_lights=False,
    export_extras=False,
    export_image_format="AUTO",
    export_yup=True,
)

# Produce a real render of the exported subject for loading/error fallback.
scene = bpy.context.scene
for obj in scene.objects:
    if obj not in helmet_meshes:
        obj.hide_render = True

world = bpy.data.worlds.new("Helmet web studio")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.27, 0.30, 0.35, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8
scene.world = world

target = Vector((0, -0.08, 3.0))
bpy.ops.object.camera_add(location=(7.1, -9.5, 5.5))
camera = bpy.context.object
camera.name = "Helmet web poster camera"
camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 6.8
camera.hide_render = False
scene.camera = camera


def area_light(name, location, energy, size):
    light_data = bpy.data.lights.new(name, "AREA")
    light_data.energy = energy
    light_data.shape = "DISK"
    light_data.size = size
    light_obj = bpy.data.objects.new(name, light_data)
    scene.collection.objects.link(light_obj)
    light_obj.location = location
    light_obj.rotation_euler = (target - light_obj.location).to_track_quat("-Z", "Y").to_euler()
    light_obj.hide_render = False


area_light("Helmet key", (-5, -6, 9), 1500, 6)
area_light("Helmet fill", (6, -3, 5), 1100, 5)
area_light("Helmet rim", (2, 6, 8), 1800, 4)

scene.render.engine = "CYCLES"
scene.cycles.samples = 48
scene.render.resolution_x = 1600
scene.render.resolution_y = 1200
scene.render.resolution_percentage = 100
scene.render.film_transparent = False
scene.render.image_settings.file_format = "JPEG"
scene.render.image_settings.quality = 92
scene.render.filepath = str(poster_path.resolve())
bpy.ops.render.render(write_still=True)

print("HELMET_WEB_EXPORT", {
    "meshes": len(helmet_meshes),
    "model": str(model_path),
    "model_bytes": model_path.stat().st_size,
    "poster": str(poster_path),
    "poster_bytes": poster_path.stat().st_size,
})
