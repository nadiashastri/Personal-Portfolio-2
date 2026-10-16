"""
Builds detailed architectural ornaments for the Quad scene and exports them
as GLB files. Run headless (no manual Blender work needed):

    npm run assets

Every asset is modelled at unit scale and later instanced and scaled in
three.js. Blender is Z-up; the glTF exporter converts to three's Y-up, so
Blender -Y becomes three.js +Z (the "front" of each ornament).

Ambient occlusion is baked into vertex colours with Cycles, which gives the
deep scroll crevices soft contact shading that real-time lighting can't.
"""

import math
import sys

import bmesh
import bpy

OUT_DIR = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "public/models"


# ---------------------------------------------------------------- helpers


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def select_only(objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]


def join(objs, name):
    select_only(objs)
    bpy.ops.object.convert(target="MESH")
    bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def lathe(profile, segments=48, name="lathe"):
    """Revolve (radius, z) points around Z."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    for i in range(segments):
        a = 2 * math.pi * i / segments
        rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for r, z in profile])
    for i in range(segments):
        a, b = rings[i], rings[(i + 1) % segments]
        for k in range(len(profile) - 1):
            bm.faces.new((a[k], b[k], b[k + 1], a[k + 1]))
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def cube(size, location, name="box"):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    obj.scale = size
    obj.name = name
    return obj


def spiral_curve(centre, plane_y, r0, r1, turns, thickness, name):
    """Volute spiral in the XZ plane at depth plane_y, bevelled into a round moulding."""
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = thickness
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    steps = int(64 * turns)
    spline.points.add(steps - 1)
    k = math.log(r0 / r1) / (2 * math.pi * turns)
    for i in range(steps):
        t = (i / (steps - 1)) * 2 * math.pi * turns
        r = r0 * math.exp(-k * t)
        # Start at the top of the volute and wind outward-down, inward.
        a = math.pi / 2 + t * (1 if centre[0] < 0 else -1)
        spline.points[i].co = (centre[0] + r * math.cos(a), plane_y, centre[1] + r * math.sin(a), 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    return obj


def bake_ao(obj, samples=96, distance=1.0):
    """Bake ambient occlusion into a vertex colour attribute (exported as COLOR_0)."""
    scene = bpy.context.scene
    if scene.world is None:
        scene.world = bpy.data.worlds.new("world")
    scene.world.light_settings.distance = distance
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    mesh = obj.data
    attr = mesh.color_attributes.new(name="Col", type="BYTE_COLOR", domain="POINT")
    mesh.color_attributes.active_color = attr
    if not mesh.materials:
        mesh.materials.append(bpy.data.materials.new("ao"))
    select_only([obj])
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    # Lift the floor so AO reads as soft shading, not grime.
    for d in attr.data:
        c = d.color
        v = 0.35 + 0.65 * c[0]
        d.color = (v, v, v, 1.0)


def finish(obj, smooth_angle=40):
    select_only([obj])
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(smooth_angle))
    # Weld coincident vertices left by joins.
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bm.to_mesh(obj.data)
    bm.free()


def export(obj, filename):
    select_only([obj])
    bpy.ops.export_scene.gltf(
        filepath=f"{OUT_DIR}/{filename}",
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_vertex_color="ACTIVE",
        export_materials="NONE",
        export_normals=True,
        export_texcoords=True,
    )
    print(f"exported {filename}: {len(obj.data.polygons)} faces")


def export_parts(objs, filename, ao_distance=1.0, samples=64):
    """
    Export several joined objects in one GLB. Each object's name is the
    three.js material key it should use (e.g. "ironBlack", "lampGlass"); AO is
    baked per object with the others present, so they shade each other.
    """
    for o in objs:
        finish(o)
    for o in objs:
        bake_ao(o, samples, ao_distance)
    select_only(objs)
    bpy.ops.export_scene.gltf(
        filepath=f"{OUT_DIR}/{filename}",
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_vertex_color="ACTIVE",
        export_materials="NONE",
        export_normals=True,
        export_texcoords=True,
    )
    print(f"exported {filename}: " + ", ".join(f"{o.name} {len(o.data.polygons)}" for o in objs))


def part(objs, key):
    """Join objects into one part named after its material key."""
    obj = join(objs, key)
    obj.name = key
    obj.data.name = key
    return obj


def extrude_profile(profile, length, name="profile"):
    """Extrude a closed (y, z) cross-section along X, centred, with end caps."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    ends = []
    for x in (-length / 2, length / 2):
        ends.append([bm.verts.new((x, y, z)) for y, z in profile])
    n = len(profile)
    for k in range(n):
        bm.faces.new((ends[0][k], ends[0][(k + 1) % n], ends[1][(k + 1) % n], ends[1][k]))
    bm.faces.new(list(reversed(ends[0])))
    bm.faces.new(ends[1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def lathe_closed(profile, segments, name="lathe"):
    """Lathe with its first and last points pinched to the axis, so it is watertight."""
    pts = [(0.0, profile[0][1])] + list(profile) + [(0.0, profile[-1][1])]
    return lathe(pts, segments, name)


def poly_curve(points, thickness, name, resolution=3):
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = thickness
    curve.bevel_resolution = resolution
    curve.use_fill_caps = True
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for i, p in enumerate(points):
        spline.points[i].co = (*p, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    return obj


# ---------------------------------------------------------------- assets


def ionic_capital():
    """
    Ionic capital for a shaft of top radius 1, sitting on z = 0, height ~0.85.
    Astragal ring, egg-and-dart echinus, the volute band with spiral scrolls on
    the front and back, cushion-shaped bolsters on the sides, and a moulded abacus.
    """
    parts = []
    # Astragal (bead) and echinus (quarter-round flare).
    parts.append(lathe([(1.0, 0.0), (1.07, 0.03), (1.08, 0.07), (1.02, 0.11), (1.0, 0.12)], 64, "astragal"))
    parts.append(lathe([(1.0, 0.12), (1.1, 0.16), (1.18, 0.24), (1.2, 0.32), (1.14, 0.38), (0.0, 0.38)], 64, "echinus"))
    # Egg-and-dart: eggs around the echinus.
    for i in range(20):
        a = 2 * math.pi * i / 20
        bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=1, location=(1.16 * math.cos(a), 1.16 * math.sin(a), 0.25))
        egg = bpy.context.active_object
        egg.scale = (0.06, 0.11, 0.09)
        egg.rotation_euler = (0, 0, a)
        parts.append(egg)

    # Volute band (canalis) with a gently sagging underside.
    band = cube((2.7, 2.0, 0.3), (0, 0, 0.53), "band")
    parts.append(band)

    for side in (-1, 1):
        cx = side * 1.32
        cz = 0.3
        # Bolster: the side cushion, pinched in the middle by a belt.
        bolster = lathe(
            [(0.0, -1.0), (0.4, -1.0), (0.42, -0.85), (0.36, -0.4), (0.3, -0.12), (0.34, 0.0),
             (0.3, 0.12), (0.36, 0.4), (0.42, 0.85), (0.4, 1.0), (0.0, 1.0)],
            32,
            "bolster",
        )
        bolster.rotation_euler = (math.pi / 2, 0, 0)
        bolster.location = (cx, 0, cz)
        parts.append(bolster)
        # Spiral scrolls on the front (−Y → three +Z) and back faces, with a raised eye.
        for face_y in (-1.03, 1.03):
            parts.append(spiral_curve((cx, cz), face_y, 0.4, 0.07, 2.3, 0.045, "volute"))
            bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.09, depth=0.08, location=(cx, face_y, cz), rotation=(math.pi / 2, 0, 0))
            parts.append(bpy.context.active_object)

    # Abacus: thin moulded slab.
    parts.append(cube((2.75, 2.75, 0.08), (0, 0, 0.72), "abacus_low"))
    parts.append(cube((2.85, 2.85, 0.07), (0, 0, 0.795), "abacus_top"))

    obj = join(parts, "IonicCapital")
    finish(obj)
    bake_ao(obj)
    export(obj, "ionic_capital.glb")


def anthemion():
    """
    Palmette cresting ornament (copper), ~0.8 tall, ~0.6 wide, thin. A fan of
    curling petals springing from a pair of small scrolls.
    """
    parts = []
    petals = 9
    for i in range(petals):
        f = (i / (petals - 1)) * 2 - 1  # -1 … 1 across the fan
        angle = f * 1.05
        length = 0.62 - abs(f) * 0.2
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=1)
        petal = bpy.context.active_object
        petal.scale = (0.055, 0.03, length / 2)
        # Lean outward, with a slight forward curl at the tips.
        petal.rotation_euler = (0.18 * (1 - abs(f)), angle, 0)
        petal.location = (math.sin(angle) * length / 2, 0, 0.16 + math.cos(angle) * length / 2)
        parts.append(petal)
    for side in (-1, 1):
        parts.append(spiral_curve((side * 0.13, 0.12), 0.0, 0.11, 0.025, 1.6, 0.03, "scroll"))
    parts.append(cube((0.42, 0.08, 0.08), (0, 0, 0.04), "base"))
    obj = join(parts, "Anthemion")
    finish(obj, 60)
    bake_ao(obj, 64)
    export(obj, "anthemion.glb")


# Classical baluster: square plinth, double-swell vase, neck rings, square cap. 0.70 tall.
BALUSTER_PROFILE = [
    (0.068, 0.06), (0.074, 0.075), (0.074, 0.09), (0.058, 0.105), (0.05, 0.13), (0.058, 0.17),
    (0.074, 0.22), (0.087, 0.29), (0.087, 0.34), (0.078, 0.4), (0.058, 0.46), (0.043, 0.515),
    (0.04, 0.54), (0.05, 0.555), (0.062, 0.57), (0.062, 0.585), (0.046, 0.6), (0.05, 0.615), (0.068, 0.635), (0.07, 0.64),
]


def baluster(x, base_z):
    parts = [
        cube((0.17, 0.17, 0.06), (x, 0, base_z + 0.03)),
        lathe_closed([(r, z + base_z) for r, z in BALUSTER_PROFILE], 20, "baluster"),
        cube((0.15, 0.15, 0.06), (x, 0, base_z + 0.67)),
    ]
    parts[1].location.x = x
    return parts


# Rail cross-sections (y, z), closed loops. The top rail overhangs with a rounded nosing.
TOP_RAIL = [(-0.16, 0.0), (0.16, 0.0), (0.16, 0.03), (0.19, 0.05), (0.205, 0.08), (0.21, 0.11), (0.2, 0.14), (0.18, 0.16),
            (-0.18, 0.16), (-0.2, 0.14), (-0.21, 0.11), (-0.205, 0.08), (-0.19, 0.05), (-0.16, 0.03)]
BOTTOM_RAIL = [(-0.2, 0.0), (0.2, 0.0), (0.2, 0.05), (0.18, 0.07), (0.16, 0.1), (0.155, 0.14), (-0.155, 0.14), (-0.16, 0.1), (-0.18, 0.07), (-0.2, 0.05)]


def balustrade_bay():
    """
    One bay of stone balustrade, 2.4 m post-centre to post-centre, 1.0 m tall,
    running along X: moulded base rail, six turned balusters, overhanging top rail.
    """
    stone = [extrude_profile(BOTTOM_RAIL, 2.0, "base_rail")]
    for x in (-0.75, -0.45, -0.15, 0.15, 0.45, 0.75):
        stone += baluster(x, 0.14)
    top = extrude_profile(TOP_RAIL, 2.0, "top_rail")
    top.location.z = 0.84
    stone.append(top)
    export_parts([part(stone, "stoneTrim")], "balustrade_bay.glb", ao_distance=0.4)


def pier(width, height, name_parts):
    """Square stone pier: moulded plinth, panelled shaft, moulded cap. Base at z = 0."""
    w = width
    shaft = cube((w, w, height - 0.34), (0, 0, 0.17 + (height - 0.34) / 2))
    # Subdivide the big faces: baked AO is stored per vertex, so large quads
    # need interior vertices or their shading is just their (shadowed) corners.
    sub = shaft.modifiers.new("subdivide", "SUBSURF")
    sub.subdivision_type = "SIMPLE"
    sub.levels = sub.render_levels = 3
    objs = [
        cube((w + 0.08, w + 0.08, 0.12), (0, 0, 0.06)),
        cube((w + 0.03, w + 0.03, 0.05), (0, 0, 0.145)),
        shaft,
        cube((w + 0.05, w + 0.05, 0.05), (0, 0, height - 0.145)),
        cube((w + 0.12, w + 0.12, 0.07), (0, 0, height - 0.085)),
        cube((w + 0.16, w + 0.16, 0.05), (0, 0, height - 0.025)),
    ]
    # Raised panel frames on all four faces.
    ph = height - 0.65
    for ax in range(4):
        a = ax * math.pi / 2
        nx, ny = round(math.cos(a)), round(math.sin(a))  # exact 0 / ±1, not 6e-17
        for dz in (-ph / 2, ph / 2):
            o = cube((w * 0.72 if nx == 0 else 0.03, w * 0.72 if ny == 0 else 0.03, 0.04), (nx * (w / 2 + 0.01), ny * (w / 2 + 0.01), 0.17 + 0.15 + ph / 2 + dz))
            objs.append(o)
        for dt in (-w * 0.34, w * 0.34):
            o = cube((0.03 if nx != 0 else 0.04, 0.04 if nx != 0 else 0.03, ph), (nx * (w / 2 + 0.01) + (dt if nx == 0 else 0), ny * (w / 2 + 0.01) + (dt if ny == 0 else 0), 0.17 + 0.15 + ph / 2))
            objs.append(o)
    name_parts.extend(objs)


def single_baluster():
    """One baluster with its square plinth and cap (0.73 m), for placing individually along curves."""
    export_parts([part(baluster(0.0, 0.0), "stoneTrim")], "baluster.glb", ao_distance=0.25)


def balustrade_post():
    objs = []
    pier(0.42, 1.0, objs)
    export_parts([part(objs, "stoneTrim")], "balustrade_post.glb", ao_distance=0.3)


def stair_pedestal():
    """The big piers where Foellinger's terrace balustrade meets the steps: 1.2 m square, 2.95 m tall."""
    objs = []
    pier(1.2, 2.95, objs)
    export_parts([part(objs, "stoneTrim")], "stair_pedestal.glb", ao_distance=0.6)


def lamp_twin_globe():
    """
    Ornate cast-iron lamppost with two globes on scrolled arms (Foellinger's
    terrace, reference 12). 4.4 m tall; base at z = 0; arms along X.
    """
    iron = [
        lathe_closed([(0.3, 0.0), (0.3, 0.1), (0.26, 0.14), (0.25, 0.42), (0.2, 0.5), (0.2, 0.56), (0.15, 0.66), (0.11, 0.82), (0.09, 0.9)], 8, "base"),
        lathe_closed([(0.085, 0.9), (0.075, 2.0), (0.065, 3.25)], 16, "shaft"),
    ]
    # Decorative collars up the shaft.
    for z in (0.95, 1.9, 3.2):
        iron.append(lathe_closed([(0.1, z), (0.12, z + 0.04), (0.12, z + 0.08), (0.09, z + 0.12)], 16, "collar"))
    iron.append(lathe_closed([(0.11, 3.3), (0.14, 3.36), (0.14, 3.42), (0.1, 3.48)], 16, "capital"))
    for side in (-1, 1):
        # Arm: rises then sweeps out to the globe holder.
        pts = []
        for i in range(25):
            t = i / 24
            pts.append((side * 0.62 * t, 0, 3.4 + 0.42 * math.sin(t * math.pi / 2) ** 1.4))
        iron.append(poly_curve(pts, 0.032, "arm"))
        # Scroll curling under the arm.
        iron.append(spiral_curve((side * 0.3, 3.36), 0.0, 0.13, 0.03, 1.4, 0.022, "scroll"))
        # Globe holder cup.
        cup = lathe_closed([(0.03, 3.78), (0.06, 3.8), (0.1, 3.86), (0.13, 3.9)], 16, "cup")
        cup.location.x = side * 0.62
        iron.append(cup)
    iron.append(lathe_closed([(0.05, 3.48), (0.07, 3.62), (0.04, 3.76), (0.012, 4.05)], 12, "finial"))
    glass = []
    for side in (-1, 1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=14, radius=0.25, location=(side * 0.62, 0, 4.12))
        glass.append(bpy.context.active_object)
    export_parts([part(iron, "ironBlack"), part(glass, "lampGlass")], "lamp_twin_globe.glb", ao_distance=0.4)


def lamp_lantern():
    """
    Campus lamppost along the exit walks (reference 10): slender black post
    with a ladder-rest bar and a hexagonal glass lantern under a flared cap.
    """
    iron = [
        lathe_closed([(0.2, 0.0), (0.2, 0.08), (0.16, 0.12), (0.15, 0.4), (0.1, 0.5), (0.075, 0.6)], 8, "base"),
        lathe_closed([(0.07, 0.6), (0.058, 2.2), (0.05, 3.72)], 16, "shaft"),
        lathe_closed([(0.085, 0.62), (0.095, 0.66), (0.085, 0.7)], 16, "collar"),
        lathe_closed([(0.07, 3.55), (0.085, 3.6), (0.07, 3.65)], 16, "collar2"),
        cube((0.55, 0.035, 0.035), (0, 0, 3.4), "ladder_rest"),
        lathe_closed([(0.05, 3.72), (0.1, 3.8), (0.14, 3.87), (0.15, 3.92)], 6, "lantern_base"),
        lathe_closed([(0.2, 4.4), (0.23, 4.43), (0.22, 4.46)], 6, "lantern_top"),
        lathe_closed([(0.27, 4.46), (0.24, 4.51), (0.17, 4.59), (0.1, 4.67), (0.06, 4.73), (0.05, 4.77)], 6, "cap"),
        lathe_closed([(0.045, 4.77), (0.055, 4.81), (0.025, 4.87), (0.005, 4.99)], 8, "finial"),
    ]
    for i in range(6):
        a = i * math.pi / 3
        iron.append(poly_curve([(0.15 * math.cos(a), 0.15 * math.sin(a), 3.92), (0.205 * math.cos(a), 0.205 * math.sin(a), 4.42)], 0.014, "frame"))
    glass = [lathe_closed([(0.14, 3.92), (0.2, 4.41)], 6, "glass")]
    for o in glass + iron[5:9]:
        o.rotation_euler.z = math.pi / 6
    export_parts([part(iron, "ironBlack"), part(glass, "lampGlass")], "lamp_lantern.glb", ao_distance=0.3)


# Foellinger dome dimensions (match src/scene/architecture/Foellinger.tsx).
DOME_R = 16.8
DOME_H = 10.8
SKIRT_H = 1.5
RIBS = 24


def dome_profile(t):
    return DOME_R * math.cos(t), SKIRT_H + DOME_H * math.sin(t) ** 0.92


def foellinger_dome():
    """
    Foellinger's dome from the top of the drum up: a skirt pierced by oval
    windows in copper frames, the standing-seam shell (24 slightly dished
    panels between raised seams), a horizontal band, and a columned lantern.
    Origin = top of the drum, centred.
    """
    t_max = math.acos(3.4 / DOME_R)
    metal, ribs, copper, lead = [], [], [], []

    metal.append(lathe_closed([(DOME_R + 0.12, 0.0), (DOME_R, 0.06), (DOME_R, SKIRT_H - 0.05), (DOME_R + 0.1, SKIRT_H)], 96, "skirt"))
    for i in range(RIBS):
        a = 2 * math.pi * (i + 0.5) / RIBS
        x, y = (DOME_R + 0.02) * math.cos(a), (DOME_R + 0.02) * math.sin(a)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.36, minor_radius=0.07, major_segments=16, minor_segments=6, location=(x, y, SKIRT_H / 2))
        frame = bpy.context.active_object
        frame.scale = (1, 1, 1.0)
        frame.rotation_euler = (math.pi / 2, 0, a + math.pi / 2)
        frame.scale = (1.0, 1.3, 1.0)
        copper.append(frame)
        bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.34, depth=0.06, location=(x, y, SKIRT_H / 2), rotation=(math.pi / 2, 0, a + math.pi / 2))
        win = bpy.context.active_object
        win.scale = (1.0, 1.3, 1.0)
        lead.append(win)
    ribs.append(lathe_closed([(DOME_R + 0.15, SKIRT_H), (DOME_R + 0.22, SKIRT_H + 0.12), (DOME_R + 0.05, SKIRT_H + 0.26)], 96, "base_ring"))

    # Shell: lathe, then dish each panel slightly between the seams.
    steps = 28
    shell = lathe([dome_profile(t_max * k / steps) for k in range(steps + 1)], 120, "shell")
    for v in shell.data.vertices:
        theta = math.atan2(v.co.y, v.co.x)
        f = 1 - 0.006 * math.sin(RIBS / 2 * theta) ** 2
        v.co.x *= f
        v.co.y *= f
    metal.append(shell)

    # Raised standing seams along the curve, and a horizontal band low on the shell.
    for i in range(RIBS):
        a = 2 * math.pi * i / RIBS
        pts = []
        for k in range(21):
            r, z = dome_profile(t_max * k / 20)
            pts.append(((r + 0.05) * math.cos(a), (r + 0.05) * math.sin(a), z + 0.02))
        ribs.append(poly_curve(pts, 0.1, "seam", 1))
    band_r, band_z = dome_profile(0.32)
    ribs.append(lathe_closed([(band_r + 0.02, band_z - 0.12), (band_r + 0.14, band_z), (band_r - 0.02, band_z + 0.14)], 96, "band"))

    # Lantern: ring, open drum of 12 columns around a dark core, cornice, cap, finial.
    zc = dome_profile(t_max)[1] - 0.1
    ribs.append(lathe_closed([(3.7, zc), (3.75, zc + 0.25), (3.3, zc + 0.45)], 48, "lantern_ring"))
    lead.append(lathe_closed([(2.3, zc + 0.4), (2.3, zc + 2.0)], 32, "lantern_core"))
    for i in range(12):
        a = 2 * math.pi * i / 12
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.13, depth=1.5, location=(2.6 * math.cos(a), 2.6 * math.sin(a), zc + 1.2))
        ribs.append(bpy.context.active_object)
    ribs.append(lathe_closed([(2.85, zc + 1.95), (2.95, zc + 2.1), (2.95, zc + 2.25), (2.75, zc + 2.35)], 48, "lantern_cornice"))
    metal.append(lathe_closed([(2.8, zc + 2.35), (2.5, zc + 2.8), (1.8, zc + 3.2), (0.9, zc + 3.45), (0.3, zc + 3.55)], 48, "lantern_cap"))
    ribs.append(lathe_closed([(0.22, zc + 3.55), (0.3, zc + 3.75), (0.2, zc + 3.95), (0.04, zc + 4.6)], 16, "finial"))

    export_parts(
        [part(metal, "domeMetal"), part(ribs, "domeRib"), part(copper, "copper"), part(lead, "lead")],
        "foellinger_dome.glb",
        ao_distance=2.5,
        samples=48,
    )


def union_cupola():
    """
    Illini Union cupola (references 4, 9). Origin = base centre on the roof
    ridge. Square clock stage with corner pilasters and panelled faces, an
    arcaded octagonal belfry, a bell-shaped dome, ball finial and weathervane.
    """
    white, lead, clock, iron = [], [], [], []
    W = 5.6
    body = cube((W - 0.4, W - 0.4, 4.6), (0, 0, 2.3), "stage")
    sub = body.modifiers.new("subdivide", "SUBSURF")
    sub.subdivision_type = "SIMPLE"
    sub.levels = sub.render_levels = 3
    white += [body, cube((W + 0.2, W + 0.2, 0.3), (0, 0, 0.15), "plinth")]
    for sx in (-1, 1):
        for sy in (-1, 1):
            white.append(cube((0.6, 0.6, 4.3), (sx * (W / 2 - 0.3), sy * (W / 2 - 0.3), 2.45), "pilaster"))
            white.append(cube((0.72, 0.72, 0.2), (sx * (W / 2 - 0.3), sy * (W / 2 - 0.3), 4.35), "pilaster_cap"))
    white += [cube((W + 0.3, W + 0.3, 0.25), (0, 0, 4.72), "cornice1"), cube((W + 0.7, W + 0.7, 0.22), (0, 0, 4.95), "cornice2")]

    # Clock on each face: dial, rim, hour marks, hands, square surround.
    for k in range(4):
        a = k * math.pi / 2
        nx, ny = round(math.cos(a)), round(math.sin(a))
        d = (W - 0.4) / 2
        cz = 2.6

        def at(off, u=0.0, v=0.0):
            # Point on face k: `off` outward, u along the face, v up.
            return (nx * (d + off) - ny * u, ny * (d + off) + nx * u, cz + v)

        rot = (math.pi / 2, 0, a + math.pi / 2)
        bpy.ops.mesh.primitive_cylinder_add(vertices=40, radius=1.05, depth=0.06, location=at(0.03), rotation=rot)
        clock.append(bpy.context.active_object)
        bpy.ops.mesh.primitive_torus_add(major_radius=1.1, minor_radius=0.06, major_segments=40, minor_segments=8, location=at(0.06), rotation=rot)
        iron.append(bpy.context.active_object)
        for h in range(12):
            ang = h * math.pi / 6
            mark = cube((0.06, 0.04, 0.18), at(0.08, 0.86 * math.sin(ang), 0.86 * math.cos(ang)), "mark")
            mark.rotation_euler = (0, 0, a + math.pi / 2)
            mark.rotation_mode = "XYZ"
            iron.append(mark)
        for length, ang, wdt in ((0.75, 0.6, 0.07), (0.5, 3.0, 0.09)):
            hand = cube((wdt, 0.03, length), at(0.1, 0.5 * length * math.sin(ang), 0.5 * length * math.cos(ang)), "hand")
            hand.rotation_euler = (0, 0, a + math.pi / 2)
            iron.append(hand)
        for u, v, sw, sh in ((0, 1.35, 2.9, 0.12), (0, -1.35, 2.9, 0.12), (1.4, 0, 0.12, 2.8), (-1.4, 0, 0.12, 2.8)):
            bar = cube((sw if nx == 0 else 0.08, sw if ny == 0 else 0.08, sh), at(0.04, u, v), "surround")
            white.append(bar)

    # Octagonal belfry with arched openings and corner pilasters.
    oy = 5.05
    oct_r = 2.1
    octo = lathe_closed([(oct_r, oy), (oct_r, oy + 4.2)], 8, "belfry")
    octo.rotation_euler.z = math.pi / 8
    white.append(octo)
    apothem = oct_r * math.cos(math.pi / 8)
    for i in range(8):
        a = i * math.pi / 4
        cx, cy = math.cos(a), math.sin(a)
        # Dark arched opening, slightly proud of the face.
        op = cube((0.05, 1.0, 2.2), ((apothem + 0.02) * cx, (apothem + 0.02) * cy, oy + 0.6 + 1.1), "opening")
        op.rotation_euler.z = a
        lead.append(op)
        bpy.ops.mesh.primitive_cylinder_add(vertices=16, radius=0.5, depth=0.05, location=((apothem + 0.02) * cx, (apothem + 0.02) * cy, oy + 2.8), rotation=(0, math.pi / 2, a))
        lead.append(bpy.context.active_object)
        # Archivolt around the arch.
        pts = [((apothem + 0.06) * cx - 0.62 * math.cos(t) * cy, (apothem + 0.06) * cy + 0.62 * math.cos(t) * cx, oy + 2.8 + 0.62 * math.sin(t)) for t in [math.pi * j / 16 for j in range(17)]]
        white.append(poly_curve(pts, 0.07, "archivolt", 2))
        # Corner pilaster at the octagon's vertices.
        va = a + math.pi / 8
        pil = cube((0.3, 0.3, 4.2), (oct_r * math.cos(va), oct_r * math.sin(va), oy + 2.1), "oct_pilaster")
        pil.rotation_euler.z = va
        white.append(pil)
    white.append(lathe_closed([(oct_r + 0.15, oy + 4.2), (oct_r + 0.35, oy + 4.35), (oct_r + 0.4, oy + 4.55)], 8, "oct_cornice"))
    white[-1].rotation_euler.z = math.pi / 8

    # Bell dome, ball finial, spire and weathervane.
    lead.append(lathe_closed([(2.25, oy + 4.55), (2.2, oy + 4.85), (2.0, oy + 5.4), (1.65, oy + 6.0), (1.15, oy + 6.5), (0.65, oy + 6.85), (0.3, oy + 7.05), (0.12, oy + 7.2)], 32, "dome"))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.26, location=(0, 0, oy + 7.42))
    white.append(bpy.context.active_object)
    iron.append(lathe_closed([(0.06, oy + 7.6), (0.04, oy + 9.3), (0.01, oy + 9.6)], 8, "spire"))
    for ang in (0, math.pi / 2):
        arm = cube((1.1, 0.04, 0.04), (0, 0, oy + 8.2), "compass")
        arm.rotation_euler.z = ang
        iron.append(arm)
    iron.append(cube((1.4, 0.03, 0.06), (0.1, 0, oy + 8.9), "arrow_shaft"))
    head = cube((0.25, 0.03, 0.25), (0.82, 0, oy + 8.9), "arrow_head")
    head.rotation_euler.y = math.pi / 4
    iron.append(head)
    iron.append(cube((0.35, 0.03, 0.4), (-0.55, 0, oy + 8.95), "arrow_tail"))

    export_parts(
        [part(white, "whitePaint"), part(lead, "lead"), part(clock, "clockFace"), part(iron, "ironBlack")],
        "union_cupola.glb",
        ao_distance=0.8,
        samples=48,
    )


FONT_PATH = "blender/fonts/LilitaOne-Regular.ttf"


def title_lettering():
    """
    The opening title: "Nadia" over "Shastri" as chunky extruded, bevelled
    letters (Lilita One, SIL OFL). Each letter is its own object so it can be
    animated individually; faces and extruded sides get separate materials
    ("face" / "side") so they can be lit and coloured differently in three.js.
    Letters stand upright facing three.js +Z; each origin is the bottom-centre
    of its glyph on the baseline.
    """
    font = bpy.data.fonts.load(FONT_PATH)
    face = bpy.data.materials.new("face")
    side = bpy.data.materials.new("side")
    lines = [("Nadia", 0.92), ("Shastri", 0.0)]
    letters = []
    for word, baseline in lines:
        curve = bpy.data.curves.new(word, type="FONT")
        curve.body = word
        curve.font = font
        curve.size = 1.0
        curve.space_character = 1.04
        curve.extrude = 0.13
        curve.bevel_depth = 0.035
        curve.bevel_resolution = 2
        curve.resolution_u = 5
        obj = bpy.data.objects.new(word, curve)
        bpy.context.collection.objects.link(obj)
        obj.location.y = baseline
        select_only([obj])
        bpy.ops.object.convert(target="MESH")
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

        # Faces facing the viewer (and most of the front bevel) → "face"; the rest → "side".
        mesh = obj.data
        mesh.materials.append(face)
        mesh.materials.append(side)
        for poly in mesh.polygons:
            poly.material_index = 0 if poly.normal.z > 0.45 else 1

        # Split into loose parts, then regroup parts that share a column (an i and its dot).
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="SELECT")
        bpy.ops.mesh.separate(type="LOOSE")
        bpy.ops.object.mode_set(mode="OBJECT")
        parts = [o for o in bpy.context.selected_objects]

        def x_range(o):
            xs = [(o.matrix_world @ v.co).x for v in o.data.vertices]
            return min(xs), max(xs)

        parts.sort(key=lambda o: x_range(o)[0])
        groups = []
        for o in parts:
            lo, hi = x_range(o)
            if groups:
                glo, ghi = groups[-1]["range"]
                overlap = min(hi, ghi) - max(lo, glo)
                if overlap > 0.4 * min(hi - lo, ghi - glo):
                    groups[-1]["objs"].append(o)
                    groups[-1]["range"] = (min(lo, glo), max(hi, ghi))
                    continue
            groups.append({"objs": [o], "range": (lo, hi)})
        if len(groups) != len(word):
            raise RuntimeError(f"{word}: found {len(groups)} letter groups, expected {len(word)}")

        for i, g in enumerate(groups):
            select_only(g["objs"])
            if len(g["objs"]) > 1:
                bpy.ops.object.join()
            letter = bpy.context.view_layer.objects.active
            letter.name = f"{word}_{i}_{word[i]}"
            # Origin at the bottom-centre of the glyph on its baseline.
            lo, hi = g["range"]
            bpy.context.scene.cursor.location = ((lo + hi) / 2, baseline, 0)
            bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
            letters.append(letter)

    # Stand the letters up: Blender XY text plane → facing Blender -Y (three.js +Z).
    for letter in letters:
        loc = letter.location.copy()
        letter.location = (loc.x, 0, loc.y)
        letter.rotation_euler = (math.pi / 2, 0, 0)
        select_only([letter])
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))

    select_only(letters)
    bpy.ops.export_scene.gltf(
        filepath=f"{OUT_DIR}/title.glb",
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
        export_normals=True,
        export_texcoords=False,
    )
    print("exported title.glb: " + ", ".join(f"{l.name} {len(l.data.polygons)}" for l in letters))


if __name__ == "__main__":
    reset_scene()
    ionic_capital()
    reset_scene()
    anthemion()
    for build in (title_lettering, single_baluster, balustrade_bay, balustrade_post, stair_pedestal, lamp_twin_globe, lamp_lantern, foellinger_dome, union_cupola):
        reset_scene()
        build()
