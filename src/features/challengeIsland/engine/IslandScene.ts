// 3D 場景引擎：渲染、標籤、點選、鏡頭、日夜與今日回顧的時間推進。
// React 端握有狀態並下指令；引擎只透過 callbacks 回報。
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { IslandModel } from '../model';
import { toTaipei, tourEnd } from '../model';
import { buildBridges, buildGraph, buildIslands, GROUND_Y, R, type BuildingRef, type IslandRef, type PickInfo } from './world';
import { createEnvironment, type Quality } from './environment';
import { createPeople, ROLE_LABEL, type Walker, type WalkerEvent } from './people';
import { createFlows } from './flows';

export type Selection = PickInfo;

export interface IslandSceneCallbacks {
    onPick: (sel: Selection) => void;
    onWalkerEvent: (ev: WalkerEvent) => void;
    onMinute: (minute: number) => void;
    onTourStep: (index: number) => void;
    onTourEnd: () => void;
}

export interface TourStep {
    minute: number;
    challengeId: string;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export class IslandScene {
    private renderer: THREE.WebGLRenderer;
    private labels: CSS2DRenderer;
    private scene = new THREE.Scene();
    private camera = new THREE.PerspectiveCamera(32, 1, 0.5, 300);
    private controls: OrbitControls;
    private islands: Map<string, IslandRef>;
    private buildings = new Map<string, BuildingRef>();
    private pickables: THREE.Object3D[];
    private env: ReturnType<typeof createEnvironment>;
    private people: ReturnType<typeof createPeople>;
    private flows: ReturnType<typeof createFlows>;
    private walkerMeshes: THREE.Object3D[];
    private lockSprites: THREE.Object3D[] = [];
    private islandLabels = new Map<string, HTMLButtonElement>();
    private buildingLabels = new Map<string, HTMLButtonElement>();
    private coins = new Map<string, THREE.Mesh>();
    private hourglasses = new Map<string, THREE.Mesh>();
    private walkerTag: CSS2DObject;
    private selRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
    private tip: HTMLDivElement;
    private resizeObserver: ResizeObserver;
    private ray = new THREE.Raycaster();
    private ndc = new THREE.Vector2();

    private simT = 0;
    private lastFrame = 0;
    private labelTimer = 0;
    private shownMinute = -1;
    private minute: number;
    private liveTime = true;
    private paused = false;
    private names = true;
    private selected: Selection | null = null;
    private hover: Selection | null = null;
    private hoverEvent: PointerEvent | null = null;
    private down: { x: number; y: number } | null = null;
    private follow: Walker | null = null;
    private fly: { t: number; dur: number; fromPos: THREE.Vector3; toPos: THREE.Vector3; fromTarget: THREE.Vector3; toTarget: THREE.Vector3 } | null = null;
    private tour: { steps: TourStep[]; idx: number; hold: number; playing: boolean; end: number } | null = null;
    private camDelta = new THREE.Vector3();
    private container: HTMLElement;
    private cb: IslandSceneCallbacks;
    private reduced: boolean;

    constructor(container: HTMLElement, model: IslandModel, cb: IslandSceneCallbacks, opts: { quality: Quality; reducedMotion: boolean }) {
        this.container = container;
        this.cb = cb;
        this.reduced = opts.reducedMotion;
        this.minute = toTaipei(Date.now()).minute;

        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, opts.quality === 'high' ? 2 : 1.5));
        this.renderer.shadowMap.enabled = opts.quality !== 'low';
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.05;
        this.renderer.domElement.className = 'ci-canvas';
        container.appendChild(this.renderer.domElement);
        this.labels = new CSS2DRenderer();
        this.labels.domElement.className = 'ci-label-layer';
        container.appendChild(this.labels.domElement);
        this.tip = document.createElement('div');
        this.tip.className = 'ci-tip';
        this.tip.hidden = true;
        container.appendChild(this.tip);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 5, maxDistance: 85, maxPolarAngle: 1.25, minPolarAngle: 0.2, screenSpacePanning: false });

        const built = buildIslands(model.islands, this.scene);
        this.islands = built.islands;
        this.pickables = built.pickables;
        const bridges = buildBridges(model.islands, this.islands, this.scene);
        const nodes = buildGraph(this.islands, bridges);
        this.env = createEnvironment(this.scene, this.islands, opts.quality);
        for (const isl of this.islands.values()) for (const b of isl.buildings) this.buildings.set(b.id, b);
        this.flows = createFlows(this.scene, model.flows, this.buildings);
        this.people = createPeople(this.scene, nodes, opts.quality === 'high' ? 40 : 26, (ev) => cb.onWalkerEvent(ev));
        this.walkerMeshes = this.people.walkers.flatMap((w) => w.mesh.children);

        this.scene.traverse((o) => {
            if (o.userData.lockSprite || o.userData.barrier) this.lockSprites.push(o);
        });
        this.buildMarkers();
        this.buildLabels(model);
        const walkerEl = document.createElement('div');
        walkerEl.className = 'ci-lbl-walker';
        this.walkerTag = new CSS2DObject(walkerEl);
        this.walkerTag.visible = false;
        this.scene.add(this.walkerTag);

        const ringGeo = new THREE.RingGeometry(0.5, 0.62, 32);
        ringGeo.rotateX(-Math.PI / 2);
        this.selRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xdb6a41, transparent: true, depthWrite: false }));
        this.selRing.visible = false;
        this.scene.add(this.selRing);

        this.setStatuses(model);
        this.bindInput();
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
        this.resize();

        // 從高空滑進全景
        this.camera.position.copy(this.env.centroid).add(new THREE.Vector3(0, 70, 40));
        this.controls.target.copy(this.env.centroid);
        this.home();
        this.renderer.setAnimationLoop((now) => this.frame(now));
    }

    // ---------- 建置 ----------
    private buildMarkers() {
        const coinGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.035, 18);
        coinGeo.rotateX(Math.PI / 2);
        const coinMat = new THREE.MeshStandardMaterial({ color: 0xf4c542, emissive: 0x6b4a00, emissiveIntensity: 0.4, metalness: 0.5, roughness: 0.35 });
        const glassGeo = new THREE.OctahedronGeometry(0.11, 0);
        const glassMat = new THREE.MeshStandardMaterial({ color: 0xfcea8b, emissive: 0xc98a00, emissiveIntensity: 0.5, flatShading: true });
        for (const b of this.buildings.values()) {
            const parent = this.islands.get(b.island)!.group;
            const coin = new THREE.Mesh(coinGeo, coinMat);
            coin.position.set(b.local.x, b.height + 0.2, b.local.z);
            coin.visible = false;
            const glass = new THREE.Mesh(glassGeo, glassMat);
            glass.position.copy(coin.position);
            glass.visible = false;
            parent.add(coin, glass);
            this.coins.set(b.id, coin);
            this.hourglasses.set(b.id, glass);
        }
    }

    private buildLabels(model: IslandModel) {
        for (const isl of this.islands.values()) {
            const el = document.createElement('button');
            el.type = 'button';
            el.className = 'ci-lbl-island';
            el.addEventListener('click', () => this.cb.onPick({ type: 'island', id: isl.id }));
            const obj = new CSS2DObject(el);
            obj.position.set(0, GROUND_Y + 0.3, R * 0.98);
            isl.group.add(obj);
            this.islandLabels.set(isl.id, el);
        }
        const defs = new Map(model.islands.flatMap((i) => i.challenges.map((c) => [c.id, c])));
        for (const b of this.buildings.values()) {
            const c = defs.get(b.id)!;
            const el = document.createElement('button');
            el.type = 'button';
            el.className = 'ci-lbl-b';
            el.textContent = `${c.icon} ${c.name}`;
            el.addEventListener('click', () => this.cb.onPick({ type: 'building', id: b.id }));
            const obj = new CSS2DObject(el);
            obj.position.set(b.local.x, b.height + 0.5, b.local.z);
            this.islands.get(b.island)!.group.add(obj);
            this.buildingLabels.set(b.id, el);
        }
    }

    /** 只更新完成狀態（金幣、沙漏、旗子、名牌），不重建場景 */
    setStatuses(model: IslandModel) {
        for (const def of model.islands) {
            const isl = this.islands.get(def.id);
            if (!isl) continue;
            const n = def.challenges.length;
            const k = def.challenges.filter((c) => c.status !== 'todo').length;
            const el = this.islandLabels.get(def.id)!;
            el.replaceChildren();
            const icon = document.createElement('span');
            icon.textContent = def.icon;
            el.append(icon, def.name);
            // 冒險港不算進度；封島顯示「今日任務完成數 / 開島門檻」
            if (!def.hub) {
                const prog = document.createElement('small');
                prog.textContent = def.locked ? `🔒 任務 ${model.stats.questsDone}/${model.stats.questTarget}` : `${k}/${n}`;
                el.append(prog);
            }
            const full = !def.hub && !def.locked && n > 0 && k === n;
            el.classList.toggle('full', full);
            el.classList.toggle('locked', !!def.locked);
            isl.flag.visible = full;
            for (const c of def.challenges) {
                const coin = this.coins.get(c.id),
                    glass = this.hourglasses.get(c.id);
                if (coin) coin.visible = c.status === 'done';
                if (glass) glass.visible = c.status === 'submitted';
                const lbl = this.buildingLabels.get(c.id);
                lbl?.classList.toggle('done', c.status === 'done');
                lbl?.classList.toggle('wait', c.status === 'submitted');
            }
        }
    }

    // ---------- 指令 ----------
    select(sel: Selection | null, { fly = true, focusFlows }: { fly?: boolean; focusFlows?: Set<string> | null } = {}) {
        this.selected = sel;
        this.follow = null;
        this.walkerTag.visible = false;
        this.selRing.visible = false;
        for (const [id, el] of this.buildingLabels) el.classList.toggle('sel', sel?.type === 'building' && sel.id === id);
        this.flows.setFocus(focusFlows ?? null);
        if (!sel) return;
        if (sel.type === 'building') {
            const b = this.buildings.get(sel.id);
            if (!b) return;
            this.selRing.position.set(b.world.x, GROUND_Y + 0.02, b.world.z);
            this.selRing.scale.setScalar(b.plaza ? 0.7 : 1);
            this.selRing.visible = true;
            if (fly) this.flyTo(new THREE.Vector3(b.world.x, GROUND_Y + 0.4, b.world.z), this.isNarrow() ? 14 : 12, 0.88);
        } else if (sel.type === 'island') {
            const isl = this.islands.get(sel.id);
            if (isl && fly) this.flyTo(new THREE.Vector3(isl.center.x, GROUND_Y, isl.center.z), this.isNarrow() ? 17 : 14, 0.85);
        } else if (sel.type === 'walker') {
            const w = this.people.walkers[Number(sel.id)];
            if (!w) return;
            this.follow = w;
            (this.walkerTag.element as HTMLElement).textContent = w.name;
            this.walkerTag.visible = true;
            if (fly) this.flyTo(w.mesh.position.clone(), 7, 0.9);
        }
    }

    /** 讓鏡頭看向兩棟建築的中間（連結卡片用） */
    lookBetween(a: string, b: string) {
        const A = this.buildings.get(a),
            B = this.buildings.get(b);
        if (!A || !B) return;
        this.flyTo(A.world.clone().lerp(B.world, 0.5), Math.max(11, A.world.distanceTo(B.world) * 1.6), 0.8);
    }

    home() {
        this.flyTo(this.env.centroid, this.overviewDistance(), 0.78);
    }

    setNames(on: boolean) {
        this.names = on;
        this.labelTimer = 0;
    }
    setFlowsVisible(on: boolean) {
        this.flows.group.visible = on;
    }
    setPaused(on: boolean) {
        this.paused = on;
    }
    /** 指定時間（null = 回到現在的台北時間） */
    setMinute(minute: number | null) {
        this.liveTime = minute == null;
        if (minute != null) this.minute = minute;
    }

    startTour(steps: TourStep[], startMinute = 360) {
        this.tour = { steps: [...steps].sort((a, b) => a.minute - b.minute), idx: 0, hold: 0, playing: true, end: tourEnd(steps) };
        this.liveTime = false;
        this.minute = Math.min(startMinute, steps[0]?.minute ?? startMinute);
        this.paused = false;
        this.home();
    }
    pauseTour(paused: boolean) {
        if (this.tour) this.tour.playing = !paused;
    }
    stopTour() {
        this.tour = null;
        this.liveTime = true;
    }
    get tourState() {
        return this.tour ? { idx: this.tour.idx, total: this.tour.steps.length, playing: this.tour.playing, minute: this.minute, ended: this.minute >= this.tour.end } : null;
    }

    getWalker(id: number) {
        const w = this.people.walkers[id];
        if (!w) return null;
        return { name: w.name, role: ROLE_LABEL[w.role], busy: w.busy, island: w.island, solved: w.solved, visited: w.visited.size };
    }
    busyCount(buildingId: string) {
        return this.people.walkers.filter((w) => w.busy === buildingId).length;
    }

    dispose() {
        this.renderer.setAnimationLoop(null);
        this.resizeObserver.disconnect();
        this.controls.dispose();
        const geos = new Set<THREE.BufferGeometry>();
        const mats = new Set<THREE.Material>();
        this.scene.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.geometry) geos.add(m.geometry);
            if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => mats.add(x));
        });
        geos.forEach((g) => g.dispose());
        mats.forEach((m) => m.dispose());
        this.renderer.dispose();
        this.renderer.domElement.remove();
        this.labels.domElement.remove();
        this.tip.remove();
    }

    // ---------- 內部 ----------
    private isNarrow() {
        return this.container.clientWidth < 700;
    }
    private overviewDistance() {
        const fit = 17 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
        return (fit / Math.min(1.3, Math.max(0.52, this.camera.aspect))) * 0.85;
    }
    private flyTo(target: THREE.Vector3, dist: number, polar: number) {
        const offset = new THREE.Vector3().setFromSphericalCoords(dist, polar, this.controls.getAzimuthalAngle());
        this.fly = {
            t: 0,
            dur: this.reduced ? 0.01 : 1.2,
            fromPos: this.camera.position.clone(),
            fromTarget: this.controls.target.clone(),
            toTarget: target.clone(),
            toPos: target.clone().add(offset),
        };
    }
    private resize() {
        const w = this.container.clientWidth,
            h = this.container.clientHeight;
        if (!w || !h) return;
        this.renderer.setSize(w, h);
        this.labels.setSize(w, h);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }

    private pick(e: PointerEvent): Selection | null {
        const r = this.renderer.domElement.getBoundingClientRect();
        this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        this.ray.setFromCamera(this.ndc, this.camera);
        const targets = this.flows.group.visible ? [...this.walkerMeshes, ...this.pickables, ...this.flows.pickables] : [...this.walkerMeshes, ...this.pickables];
        for (const h of this.ray.intersectObjects(targets, false)) if (h.object.userData.pick) return h.object.userData.pick as Selection;
        return null;
    }

    private bindInput() {
        const canvas = this.renderer.domElement;
        canvas.addEventListener('pointerdown', (e) => (this.down = { x: e.clientX, y: e.clientY }));
        canvas.addEventListener('pointerup', (e) => {
            if (!this.down) return;
            const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
            this.down = null;
            if (moved > 6) return;
            const p = this.pick(e);
            if (p) this.cb.onPick(p);
        });
        canvas.addEventListener('pointermove', (e) => {
            if (e.pointerType === 'mouse') this.hoverEvent = e;
        });
        canvas.addEventListener('pointerleave', () => {
            this.hoverEvent = null;
            this.hover = null;
            this.tip.hidden = true;
            canvas.style.cursor = '';
        });
    }

    private processHover() {
        const e = this.hoverEvent;
        if (!e) return;
        this.hoverEvent = null;
        const p = this.down ? null : this.pick(e);
        this.hover = p;
        this.renderer.domElement.style.cursor = p ? 'pointer' : '';
        if (!p) {
            this.tip.hidden = true;
            return;
        }
        let text = '';
        if (p.type === 'building') text = this.buildingLabels.get(p.id)?.textContent ?? '';
        else if (p.type === 'island') text = this.islands.get(p.id)?.def.name ?? '';
        else if (p.type === 'walker') {
            const w = this.people.walkers[Number(p.id)];
            text = `${w.name}・${ROLE_LABEL[w.role]}`;
        } else text = '知識連結';
        const r = this.container.getBoundingClientRect();
        this.tip.textContent = text;
        this.tip.style.left = `${e.clientX - r.left}px`;
        this.tip.style.top = `${e.clientY - r.top}px`;
        this.tip.hidden = false;
    }

    private tickTime(dt: number) {
        const tour = this.tour;
        if (tour) {
            if (!tour.playing) return;
            if (tour.hold > 0) {
                tour.hold -= dt;
                this.minute += dt * 1.5;
            } else this.minute += dt * 18;
            while (tour.idx < tour.steps.length && this.minute >= tour.steps[tour.idx].minute) {
                this.minute = Math.max(this.minute, tour.steps[tour.idx].minute);
                tour.hold = this.reduced ? 2.5 : 4.5;
                this.cb.onTourStep(tour.idx++);
            }
            if (this.minute >= tour.end) {
                this.minute = tour.end;
                tour.playing = false;
                this.home();
                this.cb.onTourEnd();
            }
        } else if (this.liveTime) {
            const now = new Date();
            this.minute = toTaipei(now).minute + now.getSeconds() / 60;
        }
    }

    private frame(now: number) {
        const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.05) : 0;
        this.lastFrame = now;
        const run = !this.paused;
        if (run) this.simT += dt;

        this.tickTime(dt);
        this.env.setTime(this.minute);
        this.env.update(this.simT, run ? dt : 0);
        if (run) this.people.update(dt);
        this.flows.update(this.simT);

        for (const c of this.coins.values()) if (c.visible) c.rotation.y = this.simT * 2;
        for (const g of this.hourglasses.values()) if (g.visible) g.rotation.y = this.simT * 1.5;
        for (const isl of this.islands.values()) if (isl.flag.visible) isl.cloth.rotation.y = Math.sin(this.simT * 3 + isl.center.x) * 0.25;
        for (const o of this.lockSprites) {
            if (o.userData.lockSprite) o.position.y = GROUND_Y + 2.6 + Math.sin(this.simT * 2) * 0.12;
            else ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.13 + Math.sin(this.simT * 1.6) * 0.05;
        }
        if (this.selRing.visible) {
            const k = (this.simT * 1.4) % 1;
            this.selRing.scale.setScalar((this.selected && this.buildings.get(this.selected.id)?.plaza ? 0.7 : 1) * (0.9 + k * 0.5));
            this.selRing.material.opacity = 1 - k;
        }
        const hovered = this.hover?.type === 'building' ? this.hover.id : null;
        for (const b of this.buildings.values()) {
            const s = b.id === hovered ? b.scale * 1.08 : b.scale;
            b.group.scale.setScalar(THREE.MathUtils.lerp(b.group.scale.x, s, 0.2));
        }

        if (this.fly) {
            const f = this.fly;
            f.t = Math.min(1, f.t + dt / f.dur);
            const k = ease(f.t);
            this.camera.position.lerpVectors(f.fromPos, f.toPos, k);
            this.controls.target.lerpVectors(f.fromTarget, f.toTarget, k);
            if (f.t >= 1) this.fly = null;
        } else if (this.follow) {
            this.camDelta.copy(this.follow.mesh.position).sub(this.controls.target).multiplyScalar(0.08);
            this.controls.target.add(this.camDelta);
            this.camera.position.add(this.camDelta);
        }
        if (this.follow) this.walkerTag.position.copy(this.follow.mesh.position).setY(this.follow.mesh.position.y + 0.48);
        // 平移不要離群島太遠
        const off = this.camDelta.copy(this.controls.target).sub(this.env.centroid).setY(0);
        if (off.length() > 22) {
            off.setLength(off.length() - 22);
            this.controls.target.sub(off);
            this.camera.position.sub(off);
        }
        this.controls.update();
        // 霧跟著縮放，遠景不會一片白
        const camDist = this.camera.position.distanceTo(this.controls.target);
        this.env.fog.near = camDist * 0.9;
        this.env.fog.far = camDist * 2.6 + 20;

        this.labelTimer -= dt;
        if (this.labelTimer <= 0) {
            this.labelTimer = 0.15;
            const selIsland = this.selected?.type === 'island' ? this.selected.id : this.selected?.type === 'building' ? this.buildings.get(this.selected.id)?.island : null;
            // 名牌開：全景也看得到島名與建築名（廣場島 13 棟太擠，拉近或選到那座島才顯示）；
            // 名牌關：全部收起，只留選取中 / 滑鼠指著的那一個
            for (const b of this.buildings.values()) {
                const el = this.buildingLabels.get(b.id)!;
                const inRange = b.plaza ? camDist < 26 || selIsland === b.island : camDist < 75;
                const show = el.classList.contains('sel') || b.id === hovered || (this.names && inRange);
                el.classList.toggle('ci-hidden', !show);
            }
            for (const [id, el] of this.islandLabels) el.classList.toggle('ci-hidden', !this.names && selIsland !== id);
        }
        const m = Math.floor(this.minute);
        if (m !== this.shownMinute) {
            this.shownMinute = m;
            this.cb.onMinute(m);
        }
        this.processHover();
        this.renderer.render(this.scene, this.camera);
        this.labels.render(this.scene, this.camera);
    }
}
