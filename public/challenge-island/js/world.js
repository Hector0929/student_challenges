// Hex islands, procedural buildings, bridges and the walker graph.
import * as THREE from "three";

export const R = 3.2; // hex circumradius (pointy-top, vertex toward ±z)
export const SP = 3.7; // axial spacing
export const TOP = 0.5; // top of the sand rim
export const GROUND_Y = TOP + 0.09; // walkable surface
export const PATH_R = 2.1; // walker ring, measured to edge midpoints
export const SLOT_R = 1.25; // building ring
const SQ3 = Math.sqrt(3);
export const NEIGHBORS = [
  [1, 0],
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
];

export function mulberry(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function axialToWorld(q, r) {
  return new THREE.Vector3(SP * SQ3 * (q + r / 2), 0, SP * 1.5 * r);
}

// Direction (radians, x→z plane, measured so that Vector3(cos, 0, sin)) toward a neighbor.
export function dirAngle(dq, dr) {
  const v = axialToWorld(dq, dr);
  return Math.atan2(v.z, v.x);
}

const polar = (a, r, y = GROUND_Y) => new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);

// ---------- materials ----------
const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0, flatShading: true, ...opts }));
  }
  return matCache.get(key);
}
// Shared night-glow materials; environment.js drives their emissiveIntensity.
export const glow = {
  window: new THREE.MeshStandardMaterial({ color: 0x5b5048, emissive: 0xffd27a, emissiveIntensity: 0, roughness: 0.4, flatShading: true }),
  lamp: new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffc861, emissiveIntensity: 0, flatShading: true }),
  neonA: new THREE.MeshStandardMaterial({ color: 0xff5fae, emissive: 0xff3d9a, emissiveIntensity: 0.6, flatShading: true }),
  neonB: new THREE.MeshStandardMaterial({ color: 0x5fe3ff, emissive: 0x2fd5ff, emissiveIntensity: 0.6, flatShading: true }),
};

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
const box = (w, h, d, c, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), typeof c === "object" ? c : mat(c), x, y + h / 2, z);
const cyl = (rt, rb, h, c, x, y, z, seg = 10, opts) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1, false, 0, Math.PI * 2), typeof c === "object" ? c : mat(c, opts), x, y + h / 2, z);
const cone = (r, h, c, x, y, z, seg = 10) => mesh(new THREE.ConeGeometry(r, h, seg), typeof c === "object" ? c : mat(c), x, y + h / 2, z);
const ball = (r, c, x, y, z, ws = 10, hs = 8) => mesh(new THREE.SphereGeometry(r, ws, hs), typeof c === "object" ? c : mat(c), x, y, z);

function gable(w, h, d, c) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(w / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  g.translate(0, 0, -d / 2);
  return mesh(g, mat(c));
}
// Window strip on the +z face of a box of width w, starting at height y.
function windows(group, w, d, y, rows = 1, cols = 2, h = 0.09) {
  const gap = w / (cols + 1);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const m = mesh(new THREE.BoxGeometry(gap * 0.55, h, 0.02), glow.window, -w / 2 + gap * (c + 1), y + r * (h * 2.2) + h / 2, d / 2 + 0.005);
      m.castShadow = false;
      group.add(m);
    }
}

// ---------- building styles ----------
// Each returns a Group whose origin sits on the ground; footprint stays within ~0.5 radius.
const STYLES = {
  library(accent, rng, i) {
    const g = new THREE.Group();
    const h = 0.45 + rng() * 0.35;
    g.add(box(0.72, h, 0.6, 0xf3e7d3, 0, 0, 0));
    windows(g, 0.72, 0.6, 0.12, Math.max(1, Math.round(h / 0.25)), 3);
    const roof = gable(0.86, 0.32, 0.7, accent);
    roof.position.y = h;
    g.add(roof);
    g.add(box(0.16, 0.22, 0.04, 0x7a5236, 0, 0, 0.31));
    if (i % 2 === 0) g.add(cyl(0.05, 0.05, 0.25, 0xa8673f, 0.22, h + 0.05, -0.12, 6));
    return g;
  },
  temple(accent, rng) {
    const g = new THREE.Group();
    let y = 0;
    g.add(box(0.8, 0.1, 0.8, 0xd9cbb0, 0, 0, 0));
    y = 0.1;
    const tiers = 2 + Math.floor(rng() * 2);
    for (let t = 0; t < tiers; t++) {
      const s = 0.6 - t * 0.14,
        h = 0.26;
      g.add(box(s, h, s, 0xf1e4cf, 0, y, 0));
      windows(g, s, s, y + 0.08, 1, 2);
      y += h;
      const roof = cone(s * 0.95, 0.18, accent, 0, y, 0, 4);
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
      y += 0.1;
    }
    g.add(cyl(0.02, 0.02, 0.18, 0xe8b04a, 0, y + 0.06, 0, 5));
    return g;
  },
  tower(accent, rng, i) {
    const g = new THREE.Group();
    const h = 0.6 + rng() * 0.5 + (i === 0 ? 0.4 : 0);
    g.add(cyl(0.26, 0.3, h, 0xf3ead8, 0, 0, 0, 8));
    for (let y = 0.15; y < h - 0.1; y += 0.25) {
      const w = mesh(new THREE.BoxGeometry(0.1, 0.09, 0.02), glow.window, 0, y, 0.29);
      g.add(w);
    }
    g.add(cone(0.36, 0.42, accent, 0, h, 0, 8));
    if (i === 0) {
      const face = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 16), mat(0xfff8f4), 0, h - 0.18, 0.28);
      face.rotation.x = Math.PI / 2;
      g.add(face);
      const hand = mesh(new THREE.BoxGeometry(0.015, 0.1, 0.01), mat(0x211d1d), 0, h - 0.15, 0.3);
      g.add(hand);
    }
    return g;
  },
  bakery(accent, rng) {
    // Layered cake with a missing slice — fractions made visible.
    const g = new THREE.Group();
    const missing = (1 + Math.floor(rng() * 3)) / 8;
    const layers = [
      [0.42, 0.22, 0xf7e2c6],
      [0.32, 0.2, 0xffffff],
      [0.22, 0.18, 0xf7e2c6],
    ];
    let y = 0;
    for (const [r, h, c] of layers) {
      const geo = new THREE.CylinderGeometry(r, r, h, 20, 1, false, 0, Math.PI * 2 * (1 - missing));
      const m = mesh(geo, mat(c, { side: THREE.DoubleSide }), 0, y + h / 2, 0);
      g.add(m);
      const icing = mesh(new THREE.CylinderGeometry(r + 0.01, r + 0.01, 0.04, 20, 1, false, 0, Math.PI * 2 * (1 - missing)), mat(accent, { side: THREE.DoubleSide }), 0, y + h - 0.01, 0);
      g.add(icing);
      y += h;
    }
    g.add(ball(0.06, 0xc8283c, 0, y + 0.05, 0));
    g.rotation.y = rng() * Math.PI * 2;
    return g;
  },
  blocks(accent, rng, i) {
    const g = new THREE.Group();
    const palette = [0xe0a23a, 0x5a9bd8, 0xe36b5d, 0x6db37a, 0xf2f0e6];
    const pick = (k) => palette[(i + k) % palette.length];
    g.add(box(0.42, 0.42, 0.42, pick(0), -0.12, 0, 0.05));
    const pyr = cone(0.26, 0.4, pick(1), -0.12, 0.42, 0.05, 4);
    pyr.rotation.y = Math.PI / 4;
    g.add(pyr);
    g.add(cyl(0.14, 0.14, 0.5 + rng() * 0.3, pick(2), 0.22, 0, -0.1, 14));
    g.add(ball(0.12, pick(3), 0.22, 0.12, 0.25, 12, 10));
    windows(g, 0.42, 0.42, 0.14, 1, 2);
    g.children.at(-1).position.x -= 0.12;
    g.children.at(-2).position.x -= 0.12;
    return g;
  },
  observatory(accent, rng) {
    const g = new THREE.Group();
    g.add(cyl(0.36, 0.4, 0.42, 0xe9e6dd, 0, 0, 0, 12));
    windows(g, 0.5, 0.74, 0.16, 1, 2);
    const dome = mesh(new THREE.SphereGeometry(0.34, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xcfd6dc, { metalness: 0.3, roughness: 0.4 }), 0, 0.42, 0);
    g.add(dome);
    const slit = mesh(new THREE.BoxGeometry(0.08, 0.3, 0.36), mat(accent), 0, 0.6, 0.02);
    g.add(slit);
    const scope = mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.5, 8), mat(0x3b3f5c), 0, 0.72, 0.18);
    scope.rotation.x = Math.PI / 3.2;
    g.add(scope);
    g.rotation.y = rng() * Math.PI * 2;
    return g;
  },
  castle(accent, rng, i) {
    const g = new THREE.Group();
    const h = 0.5 + rng() * 0.25;
    g.add(box(0.5, h, 0.5, 0xd8d2c4, 0, 0, 0));
    windows(g, 0.5, 0.5, h * 0.45, 1, 2);
    for (const [x, z] of [
      [-0.25, -0.25],
      [0.25, -0.25],
      [-0.25, 0.25],
      [0.25, 0.25],
    ]) {
      g.add(cyl(0.09, 0.09, h + 0.18, 0xcac3b3, x, 0, z, 8));
      g.add(cone(0.12, 0.2, accent, x, h + 0.18, z, 8));
    }
    // checkered banner
    const pole = cyl(0.012, 0.012, 0.32, 0x5b5f6b, 0, h, 0, 5);
    g.add(pole);
    const flag = mesh(new THREE.PlaneGeometry(0.18, 0.11), mat(i % 2 ? 0x211d1d : 0xfff8f4, { side: THREE.DoubleSide }), 0.09, h + 0.26, 0);
    g.add(flag);
    return g;
  },
  hall(accent) {
    // Civic hall: stepped base, a row of columns and a low pediment.
    const g = new THREE.Group();
    g.add(box(0.8, 0.08, 0.62, 0xd9cbb0, 0, 0, 0));
    g.add(box(0.7, 0.06, 0.54, 0xe8dcc6, 0, 0.08, 0));
    g.add(box(0.6, 0.36, 0.36, 0xf3e7d3, 0, 0.14, -0.06));
    windows(g, 0.6, 0.36, 0.26, 1, 3);
    g.children.at(-1).position.z -= 0.06;
    g.children.at(-2).position.z -= 0.06;
    g.children.at(-3).position.z -= 0.06;
    for (let k = 0; k < 4; k++) g.add(cyl(0.035, 0.035, 0.36, 0xfff8f4, -0.24 + k * 0.16, 0.14, 0.2, 8));
    g.add(box(0.72, 0.06, 0.56, 0xe8dcc6, 0, 0.5, 0));
    const roof = gable(0.76, 0.18, 0.6, accent);
    roof.position.y = 0.56;
    g.add(roof);
    return g;
  },
  arcade(accent, rng, i) {
    const g = new THREE.Group();
    const h = 0.42 + rng() * 0.2;
    g.add(box(0.7, h, 0.5, i % 2 ? 0x3a3550 : 0x2e3a4f, 0, 0, 0));
    const strip = mesh(new THREE.BoxGeometry(0.72, 0.04, 0.52), i % 2 ? glow.neonA : glow.neonB, 0, h - 0.06, 0);
    g.add(strip);
    const sign = mesh(new THREE.BoxGeometry(0.46, 0.18, 0.04), i % 2 ? glow.neonB : glow.neonA, 0, h + 0.14, 0.1);
    g.add(sign);
    g.add(cyl(0.015, 0.015, 0.1, 0x211d1d, -0.15, h, 0.1, 4));
    g.add(cyl(0.015, 0.015, 0.1, 0x211d1d, 0.15, h, 0.1, 4));
    g.add(box(0.22, 0.24, 0.03, glow.window, 0, 0, 0.255));
    return g;
  },
};

// ---------- decor ----------
function tree(rng, x, z) {
  const g = new THREE.Group();
  const h = 0.12 + rng() * 0.1;
  g.add(cyl(0.03, 0.04, h, 0x8a6446, 0, 0, 0, 5));
  if (rng() < 0.5) {
    g.add(cone(0.16 + rng() * 0.05, 0.38 + rng() * 0.2, [0x5f8f52, 0x6f9c5a, 0x4f7f4a][Math.floor(rng() * 3)], 0, h, 0, 6));
  } else {
    g.add(ball(0.17 + rng() * 0.06, [0x7aa65e, 0x8db86f, 0x6a9a58][Math.floor(rng() * 3)], 0, h + 0.14, 0, 7, 5));
  }
  g.position.set(x, GROUND_Y, z);
  return g;
}
function lamp(x, z) {
  const g = new THREE.Group();
  g.add(cyl(0.012, 0.016, 0.3, 0x3d3a38, 0, 0, 0, 5));
  const bulb = mesh(new THREE.SphereGeometry(0.035, 6, 5), glow.lamp, 0, 0.32, 0);
  bulb.castShadow = false;
  g.add(bulb);
  g.position.set(x, GROUND_Y, z);
  return g;
}

// Hex "radius" measured to edge midpoints (pointy-top hex, edges face the neighbor directions).
function hexDist(x, z) {
  let m = 0;
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    m = Math.max(m, x * Math.cos(a) + z * Math.sin(a));
  }
  return m;
}

// ---------- islands ----------
export function buildIslands(data, scene) {
  const islands = new Map();
  const pickables = [];
  data.islands.forEach((def, idx) => {
    const rng = mulberry(1000 + idx * 97);
    const group = new THREE.Group();
    const center = axialToWorld(def.axial[0], def.axial[1]);
    group.position.copy(center);
    scene.add(group);

    const cliff = mesh(new THREE.CylinderGeometry(R * 0.97, R * 0.82, 1.6, 6), mat(0xc4ab8c), 0, TOP - 0.16 - 0.8, 0);
    const sand = mesh(new THREE.CylinderGeometry(R, R * 0.98, 0.16, 6), mat(0xeedcb8), 0, TOP - 0.08, 0);
    const top = mesh(new THREE.CylinderGeometry(R * 0.92, R * 0.93, 0.1, 6), mat(def.ground), 0, TOP + 0.04, 0);
    cliff.castShadow = false;
    group.add(cliff, sand, top);
    top.userData.pick = { type: "island", id: def.id };
    sand.userData.pick = { type: "island", id: def.id };
    pickables.push(top, sand);

    // walking path ring
    const ringGeo = new THREE.RingGeometry((PATH_R - 0.13) / Math.cos(Math.PI / 6), (PATH_R + 0.13) / Math.cos(Math.PI / 6), 6, 1, Math.PI / 6);
    ringGeo.rotateX(-Math.PI / 2);
    const ring = new THREE.Mesh(ringGeo, mat(0xf2e6cf));
    ring.position.y = GROUND_Y + 0.003;
    ring.receiveShadow = true;
    group.add(ring);

    // buildings: slot 0 is the center, slots 1..6 sit between path nodes
    const slots = [new THREE.Vector3(0, GROUND_Y, 0)];
    for (let k = 0; k < 6; k++) slots.push(polar(Math.PI / 6 + (k * Math.PI) / 3, SLOT_R));
    const order = [0, 2, 5, 1, 4, 3, 6];
    const buildings = [];
    const accent = new THREE.Color(def.accent).getHex();
    def.challenges.forEach((ch, i) => {
      const slot = order[i % order.length];
      const style = STYLES[ch.style || def.style] || STYLES.library;
      const b = style(accent, rng, i);
      b.position.copy(slots[slot]);
      // face outward toward the path ring (the center building faces +x, where its door spur leaves)
      b.rotation.y += slot > 0 ? Math.PI / 2 - Math.atan2(slots[slot].z, slots[slot].x) : Math.PI / 2;
      b.traverse((o) => {
        if (o.isMesh) {
          o.userData.pick = { type: "building", id: ch.id };
          pickables.push(o);
        }
      });
      group.add(b);
      const box3 = new THREE.Box3().setFromObject(b);
      const height = box3.max.y - group.position.y;
      const door =
        slot === 0 ? polar(0, 0.62) : polar(Math.atan2(slots[slot].z, slots[slot].x), SLOT_R + 0.55);
      buildings.push({ id: ch.id, def: ch, island: def.id, group: b, slot, height, door, local: slots[slot].clone() });
    });

    // decor: trees avoid slots and the path ring
    let placed = 0,
      tries = 0;
    const trees = [];
    while (placed < 11 && tries++ < 300) {
      const a = rng() * Math.PI * 2,
        r = rng() * 2.6;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      const hd = hexDist(x, z);
      if (hd > 2.55) continue;
      if (Math.abs(hd - PATH_R) < 0.24) continue;
      if (slots.some((s) => Math.hypot(s.x - x, s.z - z) < 0.62)) continue;
      if (trees.some((t) => Math.hypot(t.x - x, t.z - z) < 0.32)) continue;
      // keep clear of door spurs
      if (hd < PATH_R && buildings.some((b) => Math.hypot(b.door.x - x, b.door.z - z) < 0.35)) continue;
      trees.push({ x, z });
      group.add(tree(rng, x, z));
      placed++;
    }
    for (let k = 0; k < 6; k += 2) group.add(lamp(Math.cos((k * Math.PI) / 3 + 0.3) * (PATH_R + 0.24), Math.sin((k * Math.PI) / 3 + 0.3) * (PATH_R + 0.24)));

    // completion flag (hidden until every challenge on the island is done)
    const flag = new THREE.Group();
    flag.add(cyl(0.02, 0.02, 0.9, 0xfff8f4, 0, 0, 0, 6));
    const cloth = mesh(new THREE.PlaneGeometry(0.42, 0.26), mat(accent, { side: THREE.DoubleSide }), 0.21, 0.74, 0);
    flag.add(cloth);
    flag.position.copy(polar(-Math.PI / 2 - 0.35, 2.45));
    flag.visible = false;
    flag.userData.cloth = cloth;
    group.add(flag);

    islands.set(def.id, { id: def.id, def, group, center, buildings, flag, top });
  });
  return { islands, pickables };
}

// ---------- bridges & graph ----------
export function buildBridges(data, islands, scene) {
  const byAxial = new Map(data.islands.map((d) => [d.axial.join(","), d.id]));
  const pairs = [];
  data.islands.forEach((d) => {
    NEIGHBORS.forEach(([dq, dr], k) => {
      const other = byAxial.get([d.axial[0] + dq, d.axial[1] + dr].join(","));
      if (other && d.id < other) pairs.push({ a: d.id, b: other, k });
    });
  });
  const deck = [mat(0xb48560), mat(0xa77a55)];
  const rail = mat(0xfff8f4);
  for (const p of pairs) {
    const A = islands.get(p.a),
      B = islands.get(p.b);
    const dir = B.center.clone().sub(A.center).normalize();
    const start = A.center.clone().addScaledVector(dir, PATH_R + 0.2);
    const end = B.center.clone().addScaledVector(dir, -(PATH_R + 0.2));
    const len = start.distanceTo(end);
    const n = 9;
    const g = new THREE.Group();
    const yaw = Math.atan2(dir.x, dir.z);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const pos = start.clone().lerp(end, t);
      pos.y = GROUND_Y + Math.sin(t * Math.PI) * 0.22;
      const plank = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.05, len / n + 0.02), deck[i % 2]);
      plank.position.copy(pos);
      plank.rotation.order = "YXZ";
      plank.rotation.y = yaw;
      plank.rotation.x = -Math.cos(t * Math.PI) * 0.22 * (Math.PI / len) * 1.0;
      plank.castShadow = plank.receiveShadow = true;
      g.add(plank);
      if (i % 2 === 0) {
        for (const side of [-1, 1]) {
          const off = new THREE.Vector3(dir.z, 0, -dir.x).multiplyScalar(0.22 * side);
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 5), rail);
          post.position.copy(pos).add(off);
          post.position.y += 0.08;
          post.castShadow = true;
          g.add(post);
        }
      }
    }
    // pillars into the water
    for (const t of [0.3, 0.7]) {
      const pos = start.clone().lerp(end, t);
      const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.8, 6), mat(0x8a6a4e));
      pil.position.set(pos.x, GROUND_Y - 0.3, pos.z);
      g.add(pil);
    }
    scene.add(g);
    p.start = start;
    p.end = end;
  }
  return pairs;
}

// Nodes: `${island}:${k}` ring nodes at edge midpoints, `${island}:b:${id}` building doors.
export function buildGraph(islands, bridges) {
  const nodes = new Map();
  const add = (id, pos, island, extra = {}) => nodes.set(id, { id, pos, island, links: [], ...extra });
  const link = (a, b, kind = "path") => {
    nodes.get(a).links.push({ to: b, kind });
    nodes.get(b).links.push({ to: a, kind });
  };
  for (const isl of islands.values()) {
    for (let k = 0; k < 6; k++) {
      const a = dirAngle(...NEIGHBORS[k]);
      add(`${isl.id}:${k}`, isl.center.clone().add(polar(a, PATH_R)), isl.id);
    }
    for (let k = 0; k < 6; k++) link(`${isl.id}:${k}`, `${isl.id}:${(k + 1) % 6}`);
    for (const b of isl.buildings) {
      const id = `${isl.id}:b:${b.id}`;
      add(id, isl.center.clone().add(b.door), isl.id, { building: b.id });
      if (b.slot === 0) link(id, `${isl.id}:0`);
      else {
        // door sits between the two ring nodes bracketing the slot angle
        const ang = Math.atan2(b.local.z, b.local.x);
        const nearest = [...Array(6).keys()]
          .map((k) => ({ k, d: Math.abs(Math.atan2(Math.sin(dirAngle(...NEIGHBORS[k]) - ang), Math.cos(dirAngle(...NEIGHBORS[k]) - ang))) }))
          .sort((x, y) => x.d - y.d)
          .slice(0, 2);
        nearest.forEach(({ k }) => link(id, `${isl.id}:${k}`));
      }
    }
  }
  for (const p of bridges) {
    const kOpp = (p.k + 3) % 6;
    link(`${p.a}:${p.k}`, `${p.b}:${kOpp}`, "bridge");
  }
  return nodes;
}
