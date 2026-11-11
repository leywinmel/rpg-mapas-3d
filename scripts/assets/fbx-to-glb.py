# Passa os veículos FBX do pacote "Free Low Poly Vehicles" (Rgsdev, CC0) para .glb, um por pasta.
# O passo seguinte é scripts/assets/convert-vehicle.mjs.
# uso: blender -b --factory-startup -P fbx-to-glb.py -- <pasta do pacote> <pasta de saída>
import bpy, sys, os, glob
src, out = sys.argv[sys.argv.index('--') + 1:]
os.makedirs(out, exist_ok=True)
for fbx in sorted(glob.glob(os.path.join(src, '*', '*.fbx'))):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.fbx(filepath=fbx)
    name = os.path.splitext(os.path.basename(fbx))[0].lower().replace(' ', '-')
    bpy.ops.export_scene.gltf(filepath=os.path.join(out, name + '.glb'), export_format='GLB', export_apply=True)
    tris = sum(len(p.vertices) - 2 for o in bpy.data.objects if o.type == 'MESH' for p in o.data.polygons)
    print('OK', name, 'tris', tris, 'mats', len(bpy.data.materials))
