// 怪獸塔 V4 — three.js 螺旋石塔場景
// 只負責「畫」與「演」：格子、梯子、蛇、標記、主角與鏡頭。遊戲規則在 useTowerGame。
import * as THREE from 'three';
import type { TowerEvent } from '../../../types/database';
import {
    CORE_HALF,
    LAP_HEIGHT,
    RING_HALF,
    RISE,
    TILES_PER_LAP,
    cameraAzimuth,
    getCornerLanding,
    getSpiralTile,
    getZoneIndex,
} from '../../../lib/towerSpiralLayout';

import { ZONE_STYLES, type ZoneStyle } from './zoneStyles';

export { ZONE_STYLES, type ZoneStyle };

const ZONE_SKY = ZONE_STYLES.map((z) => new THREE.Color(z.sky));
const TILE_W = 1.44;
const TILE_H = 0.42;
const tmpV = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** 格子頂面中心 */
export function tileTop(floor: number) {
    const t = getSpiralTile(floor);
    return new THREE.Vector3(t.x, t.y + TILE_H / 2, t.z);
}

/**
 * 梯子 / 蛇的路徑：繞著塔身外側走（避免穿過塔心），中段往外鼓出、往上拱起。
 * 方向沿著螺旋前進方向，所以梯子會順著格子往上盤，不會繞遠路。
 */
export function slideCurve(from: number, to: number, wiggle = 0): THREE.Curve<THREE.Vector3> {
    const a = tileTop(from),
        b = tileTop(to);
    const thA = Math.atan2(a.z, a.x),
        thB = Math.atan2(b.z, b.x);
    const lo = Math.min(from, to),
        hi = Math.max(from, to);
    // 螺旋往上時 atan2 角度遞減；挑最接近「格數換算角度」的那一圈
    const expected = (-(hi - lo) / TILES_PER_LAP) * Math.PI * 2 * (to > from ? 1 : -1);
    let delta = thB - thA;
    while (delta - expected > Math.PI) delta -= Math.PI * 2;
    while (expected - delta > Math.PI) delta += Math.PI * 2;
    const rA = Math.hypot(a.x, a.z),
        rB = Math.hypot(b.x, b.z);
    const span = Math.abs(hi - lo);
    const bulge = 0.65 + Math.min(0.8, span * 0.03);
    const arch = 0.4 + span * 0.03;
    class Path extends THREE.Curve<THREE.Vector3> {
        constructor() {
            super();
        }
        getPoint(s: number, target = new THREE.Vector3()) {
            const th = thA + delta * s;
            const bump = Math.sin(Math.PI * s);
            const r = rA + (rB - rA) * s + bulge * bump + (wiggle ? Math.sin(s * Math.PI * 7) * wiggle * bump : 0);
            const y = a.y + (b.y - a.y) * s + arch * bump + 0.05;
            return target.set(Math.cos(th) * r, y, Math.sin(th) * r);
        }
    }
    return new Path();
}

function canvasTexture(draw: (ctx: CanvasRenderingContext2D, size: number) => void, size = 128) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    draw(ctx, size);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
}
function emojiTexture(emoji: string) {
    return canvasTexture((ctx, s) => {
        ctx.font = `${s * 0.78}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, s / 2, s * 0.56);
    });
}

function hasTransparentCorner(img: HTMLImageElement) {
    try {
        const c = document.createElement('canvas');
        c.width = c.height = 8;
        const ctx = c.getContext('2d')!;
        ctx.drawImage(img, 0, 0, 8, 8);
        return ctx.getImageData(0, 0, 1, 1).data[3] < 40;
    } catch {
        return false;
    }
}

interface Hop {
    from: THREE.Vector3;
    to: THREE.Vector3;
    t: number;
    dur: number;
    height: number;
    resolve?: () => void;
}
interface Slide {
    curve: THREE.Curve<THREE.Vector3>;
    tEnd: number;
    t: number;
    dur: number;
    resolve: () => void;
    then: THREE.Vector3;
}

export interface TowerSceneOptions {
    totalFloors: number;
    reducedMotion: boolean;
    onTileClick: (floor: number) => void;
}

export class TowerScene {
    private renderer: THREE.WebGLRenderer;
    private scene = new THREE.Scene();
    private camera = new THREE.PerspectiveCamera(38, 1, 0.3, 400);
    private container: HTMLElement;
    private opts: TowerSceneOptions;
    private resizeObserver: ResizeObserver;
    private tiles: THREE.Mesh[] = [];
    private eventGroup = new THREE.Group();
    private slideCurves = new Map<number, { curve: THREE.Curve<THREE.Vector3>; to: number }>();
    private markerSpinners: THREE.Object3D[] = [];
    private player = new THREE.Group();
    private companion: THREE.Sprite;
    private currentRing: THREE.Mesh;
    private selectRing: THREE.Mesh;
    private playerFloor = 1;
    private hop: Hop | null = null;
    private slide: Slide | null = null;
    private ray = new THREE.Raycaster();
    private ndc = new THREE.Vector2();
    private down: { x: number; y: number; az: number; lift: number } | null = null;
    private pinch: number | null = null;
    private pointers = new Map<number, { x: number; y: number }>();
    private lastFrame = 0;
    private time = 0;
    private skyColor = new THREE.Color(ZONE_STYLES[0].sky);
    // 鏡頭：跟隨主角的方位角 + 玩家手動轉的偏移
    private cam = { az: 0, lift: 0, target: new THREE.Vector3(), userAz: 0, userLift: 0, zoom: 1 };
    private disposed = false;

    constructor(container: HTMLElement, opts: TowerSceneOptions) {
        this.container = container;
        this.opts = opts;
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.domElement.style.display = 'block';
        this.renderer.domElement.style.touchAction = 'none';
        container.appendChild(this.renderer.domElement);

        this.scene.background = this.skyColor.clone();
        this.scene.fog = new THREE.Fog(this.skyColor, 30, 90);
        this.buildLights();
        this.buildGround();
        this.buildTower();
        this.scene.add(this.eventGroup);

        // 主角：棋子 + 隨行夥伴
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.62, 16), new THREE.MeshStandardMaterial({ color: 0xdb3a34, roughness: 0.5 }));
        body.position.y = 0.36;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), new THREE.MeshStandardMaterial({ color: 0xffd9b8, roughness: 0.6 }));
        head.position.y = 0.78;
        const hat = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.24, 14), new THREE.MeshStandardMaterial({ color: 0xfcd34d, roughness: 0.4, metalness: 0.2 }));
        hat.position.y = 1.02;
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.08, 20), new THREE.MeshStandardMaterial({ color: 0x7f1d1d }));
        base.position.y = 0.04;
        [body, head, hat, base].forEach((m) => (m.castShadow = true));
        this.player.add(base, body, head, hat);
        this.scene.add(this.player);
        this.companion = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
        this.companion.scale.setScalar(0.75);
        this.companion.visible = false;
        this.scene.add(this.companion);

        const ringGeo = new THREE.RingGeometry(0.58, 0.72, 32);
        ringGeo.rotateX(-Math.PI / 2);
        this.currentRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xfff176, transparent: true, depthWrite: false }));
        this.selectRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, depthWrite: false }));
        this.selectRing.visible = false;
        this.scene.add(this.currentRing, this.selectRing);

        this.placePlayer(1);
        this.snapCamera();
        this.bindInput();
        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
        this.resize();
        this.renderer.setAnimationLoop((now) => this.frame(now));
    }

    // ---------- 建置 ----------
    private buildLights() {
        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x7a8a6a, 1.15));
        const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
        sun.position.set(18, 40, 22);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 40, bottom: -6, near: 1, far: 120 });
        sun.shadow.bias = -0.0008;
        sun.shadow.normalBias = 0.03;
        this.scene.add(sun);
    }

    private buildGround() {
        const water = new THREE.Mesh(new THREE.CircleGeometry(120, 48), new THREE.MeshStandardMaterial({ color: 0x5fb7d4, roughness: 0.3 }));
        water.rotation.x = -Math.PI / 2;
        water.position.y = -1.3;
        water.receiveShadow = true;
        this.scene.add(water);
        const island = new THREE.Mesh(new THREE.CylinderGeometry(11, 12.5, 1.6, 9), new THREE.MeshStandardMaterial({ color: 0x8cc152, flatShading: true }));
        island.position.y = -0.95;
        island.receiveShadow = true;
        this.scene.add(island);
        const rng = (() => {
            let s = 7;
            return () => ((s = (s * 16807) % 2147483647) / 2147483647);
        })();
        for (let i = 0; i < 26; i++) {
            const a = rng() * Math.PI * 2,
                r = 6.2 + rng() * 4;
            const g = new THREE.Group();
            if (rng() < 0.7) {
                const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.4, 6), new THREE.MeshStandardMaterial({ color: 0x8a6446 }));
                trunk.position.y = 0.2;
                const crown = new THREE.Mesh(new THREE.ConeGeometry(0.45 + rng() * 0.2, 1 + rng() * 0.6, 7), new THREE.MeshStandardMaterial({ color: [0x4f8f3a, 0x5fa044, 0x3f7f34][i % 3], flatShading: true }));
                crown.position.y = 0.9;
                g.add(trunk, crown);
            } else {
                g.add(new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + rng() * 0.3, 0), new THREE.MeshStandardMaterial({ color: 0x9a9a92, flatShading: true })));
            }
            g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
            g.position.set(Math.cos(a) * r, -0.15, Math.sin(a) * r);
            this.scene.add(g);
        }
    }

    private buildTower() {
        const laps = Math.ceil(this.opts.totalFloors / TILES_PER_LAP);
        const windowMat = new THREE.MeshStandardMaterial({ color: 0x2b2330, roughness: 0.9 });
        // 塔身：每一圈一段，換區域就換石材顏色
        for (let lap = 0; lap < laps; lap++) {
            const z = ZONE_STYLES[Math.min(lap, ZONE_STYLES.length - 1)];
            const h = LAP_HEIGHT;
            const seg = new THREE.Mesh(new THREE.BoxGeometry(CORE_HALF * 2, h, CORE_HALF * 2), new THREE.MeshStandardMaterial({ color: z.stone, roughness: 0.95 }));
            seg.position.y = lap * h + h / 2 - 0.4;
            seg.castShadow = seg.receiveShadow = true;
            this.scene.add(seg);
            // 腰帶裝飾
            const band = new THREE.Mesh(new THREE.BoxGeometry(CORE_HALF * 2 + 0.16, 0.18, CORE_HALF * 2 + 0.16), new THREE.MeshStandardMaterial({ color: z.trim, roughness: 0.7 }));
            band.position.y = lap * h - 0.4;
            this.scene.add(band);
            // 每面兩扇窄窗
            for (let side = 0; side < 4; side++) {
                for (const off of [-0.9, 0.9]) {
                    const w = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.7, 0.06), windowMat);
                    const ang = (side * Math.PI) / 2;
                    const nx = Math.sin(ang),
                        nz = Math.cos(ang);
                    w.position.set(nx * (CORE_HALF + 0.01) + nz * off, lap * h + h * 0.62, nz * (CORE_HALF + 0.01) - nx * off);
                    w.rotation.y = ang;
                    this.scene.add(w);
                }
            }
        }
        // 塔頂：最後一格上方再補一段塔身，尖頂才不會壓到第 100 格
        const lapsTop = laps * LAP_HEIGHT - 0.4;
        const topY = tileTop(this.opts.totalFloors).y + 1.4;
        if (topY > lapsTop) {
            const lastStyle = ZONE_STYLES[Math.min(laps - 1, ZONE_STYLES.length - 1)];
            const cap = new THREE.Mesh(new THREE.BoxGeometry(CORE_HALF * 2, topY - lapsTop, CORE_HALF * 2), new THREE.MeshStandardMaterial({ color: lastStyle.stone, roughness: 0.95 }));
            cap.position.y = (topY + lapsTop) / 2;
            cap.castShadow = true;
            this.scene.add(cap);
        }
        const roof = new THREE.Mesh(new THREE.ConeGeometry(CORE_HALF * 1.5, 3.2, 4), new THREE.MeshStandardMaterial({ color: 0xb4483a, flatShading: true }));
        roof.rotation.y = Math.PI / 4;
        roof.position.y = topY + 1.6;
        roof.castShadow = true;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), new THREE.MeshStandardMaterial({ color: 0xfff8f4 }));
        pole.position.y = topY + 3.9;
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.55), new THREE.MeshStandardMaterial({ color: 0xfcd34d, side: THREE.DoubleSide }));
        flag.position.set(0.45, topY + 4.4, 0);
        this.markerSpinners.push(flag);
        this.scene.add(roof, pole, flag);

        // 格子：往塔心延伸接上牆面，頂面印樓層數字
        const radial = RING_HALF - CORE_HALF + TILE_W / 2;
        for (let floor = 1; floor <= this.opts.totalFloors; floor++) {
            const t = getSpiralTile(floor);
            const style = ZONE_STYLES[getZoneIndex(floor)];
            const color = style.tile[floor % 2];
            const isX = t.nx !== 0;
            const geo = new THREE.BoxGeometry(isX ? radial : TILE_W, TILE_H, isX ? TILE_W : radial);
            const top = new THREE.MeshStandardMaterial({ color, roughness: 0.75, map: this.numberTexture(floor, color) });
            const side = new THREE.MeshStandardMaterial({ color: new THREE.Color(style.stone).multiplyScalar(0.85), roughness: 0.9 });
            // BoxGeometry 材質順序：+x -x +y -y +z -z
            const tile = new THREE.Mesh(geo, [side, side, top, side, side, side]);
            const inward = (radial - TILE_W) / 2;
            tile.position.set(t.x - t.nx * inward, t.y, t.z - t.nz * inward);
            tile.castShadow = tile.receiveShadow = true;
            tile.userData.floor = floor;
            // 數字要朝外讀：依牆面轉貼圖
            top.map!.center.set(0.5, 0.5);
            top.map!.rotation = [0, Math.PI / 2, Math.PI, -Math.PI / 2][t.side];
            this.scene.add(tile);
            this.tiles.push(tile);
        }
        // 轉角平台
        for (let lap = 0; lap < laps; lap++)
            for (let corner = 0; corner < 4; corner++) {
                const c = getCornerLanding(lap, corner);
                if ((c.y - RISE / 2) / RISE + 1 >= this.opts.totalFloors) continue;
                const style = ZONE_STYLES[Math.min(lap, ZONE_STYLES.length - 1)];
                const m = new THREE.Mesh(new THREE.BoxGeometry(TILE_W * 1.1, TILE_H, TILE_W * 1.1), new THREE.MeshStandardMaterial({ color: new THREE.Color(style.stone).lerp(new THREE.Color(0xffffff), 0.25), roughness: 0.9 }));
                m.position.set(c.x, c.y, c.z);
                m.castShadow = m.receiveShadow = true;
                this.scene.add(m);
            }
    }

    private numberTexture(floor: number, color: number) {
        const c = new THREE.Color(color);
        const dark = c.getHSL({ h: 0, s: 0, l: 0 }).l > 0.62;
        return canvasTexture((ctx, s) => {
            ctx.fillStyle = `#${c.getHexString()}`;
            ctx.fillRect(0, 0, s, s);
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 6;
            ctx.strokeRect(6, 6, s - 12, s - 12);
            ctx.font = `900 ${s * 0.42}px system-ui, -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = dark ? 'rgba(40,52,30,0.78)' : 'rgba(255,255,255,0.92)';
            ctx.fillText(String(floor), s / 2, s / 2 + 4);
        });
    }

    // ---------- 事件：梯子、蛇、守門怪、怪獸蛋 ----------
    setEvents(events: TowerEvent[]) {
        this.clearGroup(this.eventGroup);
        this.slideCurves.clear();
        this.markerSpinners = this.markerSpinners.filter((o) => !o.userData.event);
        const snakeColors = [0x7c3aed, 0x16a34a, 0xdc2626, 0x0891b2, 0xea580c];
        let snakeIdx = 0;
        for (const ev of events) {
            if ((ev.event_type === 'ladder' || ev.event_type === 'trap') && ev.target_floor) {
                if (ev.event_type === 'ladder') {
                    const curve = slideCurve(ev.floor_number, ev.target_floor);
                    this.slideCurves.set(ev.floor_number, { curve, to: ev.target_floor });
                    this.eventGroup.add(this.buildLadder(curve));
                } else {
                    const curve = slideCurve(ev.floor_number, ev.target_floor, 0.32);
                    this.slideCurves.set(ev.floor_number, { curve, to: ev.target_floor });
                    this.eventGroup.add(this.buildSnake(curve, snakeColors[snakeIdx++ % snakeColors.length]));
                }
            } else if (ev.event_type === 'monster') {
                this.eventGroup.add(this.buildMarker(ev.floor_number, '👾', 0xef4444));
            } else if (ev.event_type === 'egg') {
                this.eventGroup.add(this.buildEgg(ev.floor_number));
            }
        }
    }

    private buildLadder(curve: THREE.Curve<THREE.Vector3>) {
        const g = new THREE.Group();
        const railMat = new THREE.MeshStandardMaterial({ color: 0xa8743f, roughness: 0.7 });
        const rungMat = new THREE.MeshStandardMaterial({ color: 0xd9a86a, roughness: 0.7 });
        const steps = 60;
        const sideAt = (s: number) => {
            const tan = curve.getTangentAt(s);
            const side = new THREE.Vector3().crossVectors(tan, UP);
            if (side.lengthSq() < 0.05) side.set(curve.getPointAt(s).x, 0, curve.getPointAt(s).z).normalize();
            return side.normalize();
        };
        for (const off of [-0.24, 0.24]) {
            const pts: THREE.Vector3[] = [];
            for (let i = 0; i <= steps; i++) {
                const s = i / steps;
                pts.push(curve.getPointAt(s).addScaledVector(sideAt(s), off));
            }
            const rail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), steps, 0.05, 6), railMat);
            rail.castShadow = true;
            g.add(rail);
        }
        const len = curve.getLength();
        const rungs = Math.max(6, Math.round(len / 0.42));
        const rungGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.5, 6);
        for (let i = 1; i < rungs; i++) {
            const s = i / rungs;
            const rung = new THREE.Mesh(rungGeo, rungMat);
            rung.position.copy(curve.getPointAt(s));
            rung.quaternion.setFromUnitVectors(UP, sideAt(s));
            rung.castShadow = true;
            g.add(rung);
        }
        return g;
    }

    private buildSnake(curve: THREE.Curve<THREE.Vector3>, color: number) {
        const g = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
        const belly = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0xfef3c7), 0.55), roughness: 0.5 });
        const body = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, 0.15, 10), mat);
        body.castShadow = true;
        g.add(body);
        // 斑紋
        for (let i = 1; i < 14; i++) {
            const ring = new THREE.Mesh(new THREE.TorusGeometry(0.155, 0.03, 6, 14), belly);
            const s = i / 14;
            ring.position.copy(curve.getPointAt(s));
            ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), curve.getTangentAt(s));
            g.add(ring);
        }
        // 蛇頭在起點（較高的那格），蛇尾在終點
        const headPos = curve.getPointAt(0);
        const dir = curve.getTangentAt(0).negate();
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), mat);
        head.scale.set(1, 0.8, 1.3);
        head.position.copy(headPos).addScaledVector(dir, 0.12);
        head.lookAt(tmpV.copy(head.position).add(dir));
        head.castShadow = true;
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        for (const sx of [-0.13, 0.13]) {
            const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), eyeMat);
            eye.position.set(sx, 0.14, 0.14);
            const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), pupilMat);
            pupil.position.set(sx, 0.16, 0.2);
            head.add(eye, pupil);
        }
        const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.2), new THREE.MeshBasicMaterial({ color: 0xe11d48 }));
        tongue.position.set(0, -0.02, 0.36);
        head.add(tongue);
        g.add(head);
        return g;
    }

    private buildMarker(floor: number, emoji: string, ringColor: number) {
        const g = new THREE.Group();
        const top = tileTop(floor);
        const ringGeo = new THREE.RingGeometry(0.48, 0.62, 28);
        ringGeo.rotateX(-Math.PI / 2);
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: ringColor, transparent: true, opacity: 0.85, depthWrite: false }));
        ring.position.copy(top).setY(top.y + 0.02);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTexture(emoji), transparent: true, depthWrite: false }));
        sprite.scale.setScalar(0.85);
        sprite.position.copy(top).setY(top.y + 0.55);
        sprite.userData = { event: true, bob: top.y + 0.55, phase: floor };
        ring.userData = { event: true, spin: true };
        this.markerSpinners.push(sprite, ring);
        g.add(ring, sprite);
        return g;
    }

    private buildEgg(floor: number) {
        const g = new THREE.Group();
        const top = tileTop(floor);
        const egg = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 16), new THREE.MeshStandardMaterial({ color: 0xfff1d6, roughness: 0.35, emissive: 0x8a5a00, emissiveIntensity: 0.15 }));
        egg.scale.set(1, 1.3, 1);
        egg.castShadow = true;
        const spotMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b });
        for (let i = 0; i < 6; i++) {
            const spot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), spotMat);
            const a = (i / 6) * Math.PI * 2;
            spot.position.set(Math.cos(a) * 0.26, (i % 2 ? 0.08 : -0.06), Math.sin(a) * 0.26);
            egg.add(spot);
        }
        egg.position.copy(top).setY(top.y + 0.45);
        egg.userData = { event: true, bob: top.y + 0.45, phase: floor, spinY: true };
        const ringGeo = new THREE.RingGeometry(0.48, 0.62, 28);
        ringGeo.rotateX(-Math.PI / 2);
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9, depthWrite: false }));
        ring.position.copy(top).setY(top.y + 0.02);
        this.markerSpinners.push(egg);
        g.add(egg, ring);
        return g;
    }

    // ---------- 主角 ----------
    setCompanion(image: string | null | undefined, emoji: string | null | undefined) {
        const mat = this.companion.material;
        mat.map?.dispose();
        mat.map = null;
        if (!image && !emoji) {
            this.companion.visible = false;
            return;
        }
        if (image) {
            new THREE.TextureLoader().load(
                image,
                (tex) => {
                    if (this.disposed) return tex.dispose();
                    // 舊的怪獸圖是 JPEG（副檔名 .png、棋盤格畫死在圖裡），沒有透明背景就改用 emoji
                    if (emoji && !hasTransparentCorner(tex.image as HTMLImageElement)) {
                        tex.dispose();
                        mat.map = emojiTexture(emoji);
                    } else {
                        tex.colorSpace = THREE.SRGBColorSpace;
                        mat.map = tex;
                    }
                    mat.needsUpdate = true;
                },
                undefined,
                () => {
                    if (emoji && !this.disposed) {
                        mat.map = emojiTexture(emoji);
                        mat.needsUpdate = true;
                    }
                },
            );
        } else if (emoji) {
            mat.map = emojiTexture(emoji);
        }
        mat.needsUpdate = true;
        this.companion.visible = true;
    }

    private placePlayer(floor: number) {
        this.playerFloor = floor;
        const p = tileTop(floor);
        this.player.position.copy(p);
        this.faceAlong(floor);
    }
    private faceAlong(floor: number) {
        const t = getSpiralTile(floor);
        this.player.rotation.y = Math.atan2(t.dx, t.dz);
    }

    /** 直接放到某格（重新開局、外部同步用） */
    setPlayerFloor(floor: number) {
        if (this.hop || this.slide) return;
        this.placePlayer(floor);
    }

    /** 跳到下一格 */
    hopTo(floor: number, durMs: number) {
        if (floor === this.playerFloor && !this.hop) return;
        this.hop?.resolve?.();
        const from = this.player.position.clone();
        this.playerFloor = floor;
        this.faceAlong(floor);
        this.hop = { from, to: tileTop(floor), t: 0, dur: this.opts.reducedMotion ? 0.01 : durMs / 1000, height: 0.55 };
    }

    /** 沿著梯子往上爬 / 沿著蛇身滑下來 */
    slideTo(from: number, to: number): Promise<void> {
        const entry = this.slideCurves.get(from);
        this.hop = null;
        return new Promise((resolve) => {
            const finish = () => {
                this.placePlayer(to);
                resolve();
            };
            if (!entry || this.opts.reducedMotion) return finish();
            // 夥伴出手會改變終點（少滑一半 / 多爬兩層）：只走曲線的一部分，再跳到實際格子
            const full = Math.abs(entry.to - from);
            const tEnd = Math.max(0.15, Math.min(1, Math.abs(to - from) / full));
            const len = entry.curve.getLength() * tEnd;
            this.playerFloor = to;
            this.slide = { curve: entry.curve, tEnd, t: 0, dur: Math.min(2.6, 0.8 + len * 0.12), resolve: finish, then: tileTop(to) };
        });
    }

    setSelected(floor: number | null) {
        this.selectRing.visible = floor != null;
        if (floor != null) this.selectRing.position.copy(tileTop(floor)).setY(tileTop(floor).y + 0.03);
    }

    /** 把手動轉過的鏡頭轉回主角 */
    recenter() {
        this.cam.userAz = 0;
        this.cam.userLift = 0;
        this.cam.zoom = 1;
    }

    dispose() {
        this.disposed = true;
        this.renderer.setAnimationLoop(null);
        this.resizeObserver.disconnect();
        this.clearGroup(this.scene);
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }

    // ---------- 內部 ----------
    private clearGroup(group: THREE.Object3D) {
        group.traverse((o) => {
            const m = o as THREE.Mesh;
            m.geometry?.dispose();
            const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
            mats.forEach((x) => {
                (x as THREE.MeshStandardMaterial).map?.dispose();
                x.dispose();
            });
        });
        if (group !== this.scene) group.clear();
    }

    private resize() {
        const w = this.container.clientWidth,
            h = this.container.clientHeight;
        if (!w || !h) return;
        this.renderer.setSize(w, h);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
    }

    private bindInput() {
        const el = this.renderer.domElement;
        el.addEventListener('pointerdown', (e) => {
            el.setPointerCapture(e.pointerId);
            this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (this.pointers.size === 1) this.down = { x: e.clientX, y: e.clientY, az: this.cam.userAz, lift: this.cam.userLift };
            if (this.pointers.size === 2) {
                const [a, b] = [...this.pointers.values()];
                this.pinch = Math.hypot(a.x - b.x, a.y - b.y);
                this.down = null;
            }
        });
        el.addEventListener('pointermove', (e) => {
            if (!this.pointers.has(e.pointerId)) return;
            this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (this.pointers.size === 2 && this.pinch) {
                const [a, b] = [...this.pointers.values()];
                const d = Math.hypot(a.x - b.x, a.y - b.y);
                this.cam.zoom = THREE.MathUtils.clamp(this.cam.zoom * (this.pinch / d), 0.55, 2.2);
                this.pinch = d;
            } else if (this.down) {
                // 左右拖曳繞塔轉、上下拖曳沿塔身看上看下
                this.cam.userAz = this.down.az - (e.clientX - this.down.x) * 0.006;
                this.cam.userLift = THREE.MathUtils.clamp(this.down.lift + (e.clientY - this.down.y) * 0.03, -40, 40);
            }
        });
        const up = (e: PointerEvent) => {
            const start = this.down;
            this.pointers.delete(e.pointerId);
            if (this.pointers.size < 2) this.pinch = null;
            if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) this.pickTile(e);
            if (!this.pointers.size) this.down = null;
        };
        el.addEventListener('pointerup', up);
        el.addEventListener('pointercancel', up);
        el.addEventListener(
            'wheel',
            (e) => {
                e.preventDefault();
                this.cam.zoom = THREE.MathUtils.clamp(this.cam.zoom * Math.exp(e.deltaY * 0.001), 0.55, 2.2);
            },
            { passive: false },
        );
    }

    private pickTile(e: PointerEvent) {
        const r = this.renderer.domElement.getBoundingClientRect();
        this.ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        this.ray.setFromCamera(this.ndc, this.camera);
        const hit = this.ray.intersectObjects(this.tiles, false)[0];
        if (hit) this.opts.onTileClick(hit.object.userData.floor as number);
    }

    private desiredCamera() {
        const narrow = this.container.clientWidth < 640;
        const base = this.player.position;
        const az = cameraAzimuth(this.playerFloor) + this.cam.userAz;
        const dist = (narrow ? 19 : 16) * this.cam.zoom;
        // 看向主角下方一點，主角會落在畫面中上方，不被底部操作列擋住
        const target = tmpV.set(base.x * 0.4, base.y - (narrow ? 1.6 : 1.1) + this.cam.userLift, base.z * 0.4);
        return { az, dist, target };
    }

    private snapCamera() {
        const d = this.desiredCamera();
        this.cam.az = d.az;
        this.cam.target.copy(d.target);
    }

    private frame(now: number) {
        const dt = this.lastFrame ? Math.min((now - this.lastFrame) / 1000, 0.05) : 0;
        this.lastFrame = now;
        this.time += dt;

        // 主角動畫
        if (this.slide) {
            const s = this.slide;
            s.t = Math.min(1, s.t + dt / s.dur);
            const u = ease(s.t) * s.tEnd;
            this.player.position.copy(s.curve.getPointAt(u));
            const tan = s.curve.getTangentAt(u);
            this.player.rotation.y = Math.atan2(tan.x, tan.z);
            if (s.t >= 1) {
                this.slide = null;
                const done = s.resolve;
                // 曲線終點不是實際格子（夥伴出手）就再補一跳
                if (this.player.position.distanceTo(s.then) > 0.05) {
                    this.hop = { from: this.player.position.clone(), to: s.then.clone(), t: 0, dur: 0.25, height: 0.4, resolve: done };
                } else done();
            }
        } else if (this.hop) {
            const h = this.hop;
            h.t = Math.min(1, h.t + dt / Math.max(0.01, h.dur));
            this.player.position.lerpVectors(h.from, h.to, h.t);
            this.player.position.y += Math.sin(Math.PI * h.t) * h.height;
            this.player.scale.set(1, 1 - Math.sin(Math.PI * h.t) * 0.12, 1);
            if (h.t >= 1) {
                this.hop = null;
                this.player.scale.setScalar(1);
                h.resolve?.();
                if (!this.slide) this.faceAlong(this.playerFloor);
            }
        }

        // 夥伴跟在主角後方
        if (this.companion.visible) {
            const behind = tmpV.set(Math.sin(this.player.rotation.y), 0, Math.cos(this.player.rotation.y)).multiplyScalar(-0.55);
            const want = this.player.position.clone().add(behind).add(new THREE.Vector3(0, 0.65 + Math.sin(this.time * 3) * 0.06, 0));
            this.companion.position.lerp(want, 0.15);
        }
        const p = this.player.position;
        this.currentRing.position.set(p.x, tileTop(this.playerFloor).y + 0.03, p.z);
        this.currentRing.visible = !this.slide;
        (this.currentRing.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(this.time * 4) * 0.35;

        for (const o of this.markerSpinners) {
            if (o.userData.bob != null) o.position.y = o.userData.bob + Math.sin(this.time * 2 + o.userData.phase) * 0.08;
            if (o.userData.spin) o.rotation.y += dt * 1.2;
            if (o.userData.spinY) o.rotation.y += dt * 0.8;
            if (!o.userData.event) o.rotation.y = Math.sin(this.time * 2) * 0.3; // 塔頂旗子
        }

        // 主角在動時，手動轉的鏡頭慢慢回正
        if (this.hop || this.slide) {
            this.cam.userAz *= 0.9;
            this.cam.userLift *= 0.9;
        }
        const d = this.desiredCamera();
        const k = this.opts.reducedMotion ? 1 : 1 - Math.pow(0.002, dt);
        this.cam.az += (d.az - this.cam.az) * k;
        this.cam.target.lerp(d.target, k);
        const polar = 0.9;
        this.camera.position.set(
            this.cam.target.x + Math.sin(this.cam.az) * Math.sin(polar) * d.dist,
            this.cam.target.y + Math.cos(polar) * d.dist,
            this.cam.target.z + Math.cos(this.cam.az) * Math.sin(polar) * d.dist,
        );
        this.camera.lookAt(this.cam.target);

        // 天空顏色跟著鏡頭所在的區域
        this.skyColor.lerp(ZONE_SKY[Math.max(0, Math.min(4, Math.floor(this.cam.target.y / LAP_HEIGHT)))], 0.03);
        (this.scene.background as THREE.Color).copy(this.skyColor);
        (this.scene.fog as THREE.Fog).color.copy(this.skyColor);

        this.renderer.render(this.scene, this.camera);
    }
}
