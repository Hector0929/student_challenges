// Arcs linking related challenges, with pulses travelling along them.
import * as THREE from "three";

export function createFlows(scene, data, buildingIndex) {
  const group = new THREE.Group();
  scene.add(group);
  const flows = [];
  const pulseGeo = new THREE.SphereGeometry(0.07, 8, 6);
  for (const f of data.flows) {
    const A = buildingIndex.get(f.from),
      B = buildingIndex.get(f.to);
    if (!A || !B) continue;
    // height is the building's top y in island space (ground included)
    const a = A.world.clone().setY(A.height + 0.35);
    const b = B.world.clone().setY(B.height + 0.35);
    const mid = a.clone().lerp(b, 0.5);
    mid.y += 1.2 + a.distanceTo(b) * 0.28;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const mat = new THREE.MeshBasicMaterial({ color: 0xdb6a41, transparent: true, opacity: 0.75, depthWrite: false });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.035, 6, false), mat);
    tube.userData.pick = { type: "flow", id: f.id };
    const pulseMat = new THREE.MeshBasicMaterial({ color: 0xfcea8b, transparent: true });
    const pulses = [0, 0.5].map((o) => {
      const p = new THREE.Mesh(pulseGeo, pulseMat);
      p.userData.offset = o;
      return p;
    });
    group.add(tube, ...pulses);
    flows.push({ def: f, curve, tube, mat, pulses, pulseMat });
  }

  let focus = null; // set of flow ids to emphasise, or null for all

  function setFocus(ids) {
    focus = ids && ids.size ? ids : null;
    for (const f of flows) {
      const on = !focus || focus.has(f.def.id);
      f.mat.opacity = on ? 0.85 : 0.08;
      f.mat.color.setHex(on && focus ? 0xdb6a41 : 0xe58a63);
      f.pulseMat.opacity = on ? 1 : 0;
      f.tube.scale.setScalar(1);
    }
  }

  function update(t) {
    if (!group.visible) return;
    for (const f of flows) {
      for (const p of f.pulses) p.position.copy(f.curve.getPointAt((t * 0.18 + p.userData.offset) % 1));
    }
  }

  return {
    flows,
    group,
    setFocus,
    update,
    get visible() {
      return group.visible;
    },
    set visible(v) {
      group.visible = v;
    },
    pickables: flows.map((f) => f.tube),
  };
}
