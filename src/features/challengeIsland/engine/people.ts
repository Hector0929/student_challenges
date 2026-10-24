// 島上的小夥伴：沿路網走、過橋、在建築門口停下來挑戰
import * as THREE from 'three';
import { mulberry, type GraphNode, type PickInfo } from './world';

const NAMES = [
    '小安', '阿哲', '米米', '小樹', '阿布', '朵朵', '小宇', '皮皮', '安妮', '小傑', '可可', '阿光', '豆豆', '小晴', '奇奇', '小羽',
    '樂樂', '阿德', '妞妞', '小海', '小米', '阿凱', '嘟嘟', '小葵', '阿泰', '圓圓', '小柏', '琪琪', '阿寶', '小蘋', '諾諾', '阿翔',
    '小芸', '糖糖', '阿誠', '小魚', '芽芽', '阿洛', '小棠', '喬喬',
];
export type Role = 'student' | 'explorer' | 'tutor';
export const ROLE_LABEL: Record<Role, string> = { student: '學徒', explorer: '探險家', tutor: '小老師' };
const ROLE_COLOR: Record<Role, number> = { student: 0xdb6a41, explorer: 0x3d6fb6, tutor: 0xe0a23a };
const SHIRTS = [0xfff8f4, 0x8db86f, 0xf2b5c6, 0x9ec9e2, 0xfcea8b, 0xc9a7e0];
const SKIN = [0xf3d2b5, 0xe6b894, 0xc98f6b];

export interface Walker {
    id: number;
    name: string;
    role: Role;
    mesh: THREE.Group;
    body: THREE.Mesh;
    from: string;
    to: string;
    prev: string | null;
    kind: 'path' | 'bridge' | 'leave';
    t: number;
    len: number;
    speed: number;
    wait: number;
    island: string;
    /** 正在挑戰的建築 id */
    busy: string | null;
    solved: number;
    visited: Set<string>;
}

export type WalkerEvent =
    | { type: 'arrive'; walker: Walker; island: string; first: boolean }
    | { type: 'challenge'; walker: Walker; building: string }
    | { type: 'solved'; walker: Walker; building: string };

export function createPeople(scene: THREE.Object3D, nodes: Map<string, GraphNode>, count: number, onEvent: (ev: WalkerEvent) => void) {
    const rng = mulberry(4242);
    const nodeIds = [...nodes.keys()].filter((id) => !id.includes(':b:'));
    const bodyGeo = new THREE.CapsuleGeometry(0.055, 0.1, 3, 6);
    const headGeo = new THREE.SphereGeometry(0.052, 8, 6);
    const packGeo = new THREE.BoxGeometry(0.07, 0.08, 0.04);
    const walkers: Walker[] = [];

    for (let i = 0; i < count && nodeIds.length; i++) {
        const role: Role = i % 5 === 0 ? 'tutor' : i % 3 === 0 ? 'explorer' : 'student';
        const g = new THREE.Group();
        const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: SHIRTS[i % SHIRTS.length], flatShading: true }));
        body.position.y = 0.11;
        const head = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: SKIN[i % SKIN.length], flatShading: true }));
        head.position.y = 0.24;
        const pack = new THREE.Mesh(packGeo, new THREE.MeshStandardMaterial({ color: ROLE_COLOR[role], flatShading: true }));
        pack.position.set(0, 0.13, -0.06);
        for (const m of [body, head, pack]) {
            m.castShadow = true;
            m.userData.pick = { type: 'walker', id: String(i) } satisfies PickInfo;
        }
        g.add(body, head, pack);
        scene.add(g);
        const start = nodeIds[Math.floor(rng() * nodeIds.length)];
        const node = nodes.get(start)!;
        g.position.copy(node.pos);
        walkers.push({
            id: i,
            name: NAMES[i % NAMES.length] + (i >= NAMES.length ? `${Math.floor(i / NAMES.length) + 1}` : ''),
            role,
            mesh: g,
            body,
            from: start,
            to: start,
            prev: null,
            kind: 'path',
            t: 1,
            len: 1,
            speed: 0.45 + rng() * 0.3,
            wait: rng() * 2,
            island: node.island,
            busy: null,
            solved: 0,
            visited: new Set([node.island]),
        });
    }

    function pickNext(w: Walker) {
        const node = nodes.get(w.to)!;
        let options = node.links.filter((l) => l.to !== w.prev);
        if (!options.length) options = node.links;
        // 門口有吸引力、探險家愛過橋、其餘走環道
        const weights = options.map((l) => (nodes.get(l.to)!.building ? 0.7 : l.kind === 'bridge' ? (w.role === 'explorer' ? 1.6 : 0.8) : 1));
        let r = rng() * weights.reduce((a, b) => a + b, 0);
        for (let i = 0; i < options.length; i++) if ((r -= weights[i]) <= 0) return options[i];
        return options[0];
    }

    const tmp = new THREE.Vector3();
    function update(dt: number) {
        for (const w of walkers) {
            if (w.wait > 0) {
                w.wait -= dt;
                w.body.position.y = 0.11;
                if (w.wait <= 0 && w.busy) {
                    w.solved++;
                    onEvent({ type: 'solved', walker: w, building: w.busy });
                    w.busy = null;
                }
                continue;
            }
            const toNode = nodes.get(w.to)!;
            if (!toNode.links.length) continue;
            w.t += (w.speed * dt) / w.len;
            if (w.t >= 1) {
                if (toNode.island !== w.island) {
                    w.island = toNode.island;
                    const first = !w.visited.has(w.island);
                    w.visited.add(w.island);
                    onEvent({ type: 'arrive', walker: w, island: w.island, first });
                }
                if (toNode.building && w.kind !== 'leave') {
                    w.busy = toNode.building;
                    w.wait = 2.5 + rng() * 4;
                    onEvent({ type: 'challenge', walker: w, building: toNode.building });
                }
                const next = pickNext(w);
                w.prev = w.to;
                w.from = w.to;
                w.to = next.to;
                w.kind = toNode.building ? 'leave' : next.kind;
                w.t = 0;
                w.len = Math.max(0.05, nodes.get(w.from)!.pos.distanceTo(nodes.get(w.to)!.pos));
                continue;
            }
            const a = nodes.get(w.from)!.pos,
                b = toNode.pos;
            tmp.copy(a).lerp(b, w.t);
            if (w.kind === 'bridge') tmp.y += Math.sin(w.t * Math.PI) * 0.22 + 0.03;
            w.mesh.position.copy(tmp);
            w.mesh.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
            w.body.position.y = 0.11 + Math.abs(Math.sin(w.t * w.len * 14)) * 0.025;
        }
    }

    return { walkers, update };
}
