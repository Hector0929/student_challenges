// 連結相關挑戰的弧線與流動光點
import * as THREE from 'three';
import type { FlowDef } from '../model';
import type { BuildingRef, PickInfo } from './world';

interface FlowRef {
    def: FlowDef;
    curve: THREE.QuadraticBezierCurve3;
    tube: THREE.Mesh;
    mat: THREE.MeshBasicMaterial;
    pulses: THREE.Mesh[];
    pulseMat: THREE.MeshBasicMaterial;
}

export function createFlows(scene: THREE.Object3D, defs: FlowDef[], buildings: Map<string, BuildingRef>) {
    const group = new THREE.Group();
    scene.add(group);
    const flows: FlowRef[] = [];
    const pulseGeo = new THREE.SphereGeometry(0.07, 8, 6);
    for (const f of defs) {
        const A = buildings.get(f.from),
            B = buildings.get(f.to);
        if (!A || !B) continue;
        // height 是建築頂端在島座標的 y（已含地面）
        const a = A.world.clone().setY(A.height + 0.35);
        const b = B.world.clone().setY(B.height + 0.35);
        const mid = a.clone().lerp(b, 0.5);
        mid.y += 1.2 + a.distanceTo(b) * 0.28;
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        const mat = new THREE.MeshBasicMaterial({ color: 0xe58a63, transparent: true, opacity: 0.85, depthWrite: false });
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.035, 6, false), mat);
        tube.userData.pick = { type: 'flow', id: f.id } satisfies PickInfo;
        const pulseMat = new THREE.MeshBasicMaterial({ color: 0xfcea8b, transparent: true });
        const pulses = [0, 0.5].map((o) => {
            const p = new THREE.Mesh(pulseGeo, pulseMat);
            p.userData.offset = o;
            return p;
        });
        group.add(tube, ...pulses);
        flows.push({ def: f, curve, tube, mat, pulses, pulseMat });
    }

    /** 強調指定的連結；null 代表全部一般顯示 */
    function setFocus(ids: Set<string> | null) {
        const focus = ids && ids.size ? ids : null;
        for (const f of flows) {
            const on = !focus || focus.has(f.def.id);
            f.mat.opacity = on ? 0.85 : 0.08;
            f.mat.color.setHex(on && focus ? 0xdb6a41 : 0xe58a63);
            f.pulseMat.opacity = on ? 1 : 0;
        }
    }

    function update(t: number) {
        if (!group.visible) return;
        for (const f of flows) for (const p of f.pulses) p.position.copy(f.curve.getPointAt((t * 0.18 + p.userData.offset) % 1));
    }

    return { group, setFocus, update, pickables: flows.map((f) => f.tube) };
}
