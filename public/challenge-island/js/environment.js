// Sea, sky, day/night lighting, clouds and boats. Purely decorative.
import * as THREE from "three";
import { R, mulberry, glow } from "./world.js";

export const WATER_Y = 0;

// minute-of-day keyframes; values are interpolated linearly and wrap at 1440
const KEYS = [
  { m: 0, sky: 0x1b2340, sun: 0x8fa6ff, sunI: 0.35, hemi: 0.35, water: 0x1f3d55, night: 1 },
  { m: 300, sky: 0x26305a, sun: 0x8fa6ff, sunI: 0.35, hemi: 0.38, water: 0x23445e, night: 1 },
  { m: 360, sky: 0xf0b48c, sun: 0xffb37a, sunI: 1.2, hemi: 0.6, water: 0x4a8fa0, night: 0.5 },
  { m: 480, sky: 0xc3e3ea, sun: 0xfff2dc, sunI: 2.2, hemi: 0.9, water: 0x3fa3b5, night: 0 },
  { m: 720, sky: 0xaedcea, sun: 0xffffff, sunI: 2.6, hemi: 1.0, water: 0x3aa0b4, night: 0 },
  { m: 1020, sky: 0xf6cf9a, sun: 0xffc58a, sunI: 2.0, hemi: 0.8, water: 0x4b9aa8, night: 0 },
  { m: 1110, sky: 0xe98f6f, sun: 0xff8a5c, sunI: 1.1, hemi: 0.55, water: 0x3c7488, night: 0.6 },
  { m: 1200, sky: 0x2a2f52, sun: 0x8fa6ff, sunI: 0.4, hemi: 0.38, water: 0x234763, night: 1 },
  { m: 1440, sky: 0x1b2340, sun: 0x8fa6ff, sunI: 0.35, hemi: 0.35, water: 0x1f3d55, night: 1 },
];
const ca = new THREE.Color(),
  cb = new THREE.Color();
function sample(m) {
  m = ((m % 1440) + 1440) % 1440;
  let i = 0;
  while (KEYS[i + 1].m < m) i++;
  const a = KEYS[i],
    b = KEYS[i + 1],
    t = (m - a.m) / (b.m - a.m);
  const mix = (ka) => ca.setHex(a[ka]).lerp(cb.setHex(b[ka]), t).getHex();
  const lerp = (ka) => a[ka] + (b[ka] - a[ka]) * t;
  return { sky: mix("sky"), sun: mix("sun"), water: mix("water"), sunI: lerp("sunI"), hemi: lerp("hemi"), night: lerp("night") };
}

export function createEnvironment(scene, islands, quality) {
  const rng = mulberry(77);
  scene.background = new THREE.Color(0xaedcea);
  scene.fog = new THREE.Fog(0xaedcea, 70, 230);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x6f8a7a, 1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.castShadow = quality !== "low";
  sun.shadow.mapSize.set(quality === "high" ? 2048 : 1024, quality === "high" ? 2048 : 1024);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 90 });
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  // ---- sea: low-poly plane with per-vertex waves
  const seg = quality === "high" ? 90 : 60;
  const waterGeo = new THREE.PlaneGeometry(160, 160, seg, seg);
  waterGeo.rotateX(-Math.PI / 2);
  const base = Float32Array.from(waterGeo.attributes.position.array);
  const waterMat = new THREE.MeshStandardMaterial({ color: 0x3aa0b4, roughness: 0.35, metalness: 0.05, flatShading: true, transparent: true, opacity: 0.93 });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.receiveShadow = true;
  water.position.y = WATER_Y;
  scene.add(water);

  // ---- foam rings hugging each island
  const foams = [];
  for (const isl of islands.values()) {
    const g = new THREE.RingGeometry(R * 0.98, R * 1.14, 6, 1, Math.PI / 2);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }));
    m.position.set(isl.center.x, WATER_Y + 0.03, isl.center.z);
    m.userData.phase = rng() * Math.PI * 2;
    scene.add(m);
    foams.push(m);
  }

  // ---- clouds
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, transparent: true, opacity: 0.85 });
  const clouds = [];
  for (let i = 0; i < 9; i++) {
    const c = new THREE.Group();
    const puffs = 3 + Math.floor(rng() * 3);
    for (let p = 0; p < puffs; p++) {
      const s = new THREE.Mesh(new THREE.IcosahedronGeometry(0.35 + rng() * 0.3, 0), cloudMat);
      s.position.set(p * 0.42 - puffs * 0.21, rng() * 0.2, (rng() - 0.5) * 0.4);
      s.castShadow = true;
      c.add(s);
    }
    c.position.set((rng() - 0.5) * 80, 6.5 + rng() * 2, (rng() - 0.5) * 56);
    c.userData.speed = 0.25 + rng() * 0.35;
    scene.add(c);
    clouds.push(c);
  }

  // ---- boats circling the archipelago
  const boats = [];
  const centroid = new THREE.Vector3();
  for (const isl of islands.values()) centroid.add(isl.center);
  centroid.divideScalar(islands.size);
  const hullColors = [0xdb6a41, 0x3d6fb6, 0xfff8f4, 0xe0a23a];
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.7), new THREE.MeshStandardMaterial({ color: hullColors[i % 4], flatShading: true }));
    hull.position.y = 0.06;
    const sail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.55, 3), new THREE.MeshStandardMaterial({ color: 0xfff8f4, flatShading: true }));
    sail.position.set(0, 0.42, 0.02);
    sail.scale.z = 0.25;
    hull.castShadow = sail.castShadow = true;
    b.add(hull, sail);
    b.userData = { r: 15 + rng() * 9, a: rng() * Math.PI * 2, speed: (0.02 + rng() * 0.03) * (i % 2 ? 1 : -1) };
    scene.add(b);
    boats.push(b);
  }

  let current = sample(720);

  function setTime(minute) {
    const s = (current = sample(minute));
    scene.background.setHex(s.sky);
    scene.fog.color.setHex(s.sky);
    hemi.intensity = s.hemi;
    hemi.color.setHex(s.night > 0.5 ? 0x9fb0ff : 0xffffff);
    sun.color.setHex(s.sun);
    sun.intensity = s.sunI;
    waterMat.color.setHex(s.water);
    // sun travels east→west between 06:00 and 18:00; at night the "sun" plays the moon
    const day = (minute - 360) / 720;
    const ang = day >= 0 && day <= 1 ? day * Math.PI : ((minute + 1440 - 1080) % 1440) / 720 * Math.PI;
    sun.position.set(centroid.x + Math.cos(ang) * 28, Math.max(6, Math.sin(ang) * 30), centroid.z + 14);
    sun.target.position.copy(centroid);
    glow.window.emissiveIntensity = s.night * 1.5;
    glow.lamp.emissiveIntensity = s.night * 2.2;
    glow.neonA.emissiveIntensity = glow.neonB.emissiveIntensity = 0.5 + s.night * 1.6;
    cloudMat.opacity = 0.85 - s.night * 0.4;
    cloudMat.color.setHex(s.night > 0.5 ? 0x9aa3c4 : 0xffffff);
    return s;
  }

  function update(t, dt) {
    const pos = waterGeo.attributes.position;
    const arr = pos.array;
    for (let i = 0; i < arr.length; i += 3) {
      const x = base[i],
        z = base[i + 2];
      arr[i + 1] = Math.sin(x * 0.45 + t * 0.9) * 0.06 + Math.cos(z * 0.38 + t * 0.7) * 0.06 + Math.sin((x + z) * 0.9 + t * 1.6) * 0.025;
    }
    pos.needsUpdate = true;
    waterGeo.computeVertexNormals();
    for (const f of foams) {
      const k = Math.sin(t * 1.2 + f.userData.phase);
      f.scale.setScalar(1 + k * 0.02);
      f.material.opacity = 0.35 + k * 0.15;
    }
    for (const c of clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 45) c.position.x = -45;
    }
    for (const b of boats) {
      const u = b.userData;
      u.a += u.speed * dt;
      b.position.set(centroid.x + Math.cos(u.a) * u.r, Math.sin(t * 2 + u.r) * 0.04, centroid.z + Math.sin(u.a) * u.r * 0.75);
      b.rotation.y = -u.a + (u.speed > 0 ? 0 : Math.PI);
      b.rotation.z = Math.sin(t * 1.7 + u.r) * 0.06;
    }
  }

  return { setTime, update, centroid, get state() { return current; } };
}
