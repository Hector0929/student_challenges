import { Suspense, useMemo, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Environment, ContactShadows, useGLTF, Clone } from '@react-three/drei';
import { Box3, Vector3 } from 'three';
import type { Group, Mesh } from 'three';
import type { WorldTerrain, WorldTheme } from '../hooks/useWorldState';

type EnvPreset = 'forest' | 'sunset' | 'dawn' | 'park' | 'night' | 'apartment' | 'city' | 'lobby' | 'studio' | 'warehouse';

// ─── Atmosphere presets (sky/lighting/background) ───
interface AtmosphereParticles {
    color: string;
    emissive: string;
    count: number;
    size: number;
    speed: number;
    fallSpeed: number; // 0 = float/twinkle, positive = fall
    spread: number;
    usePlane: boolean;
}

interface AtmospherePreset {
    shellBg: string;
    shellBgDusk: string;
    ambientDay: number;
    ambientDusk: number;
    hemisphereSkyDay: string;
    hemisphereSkyDusk: string;
    hemisphereGroundDay: string;
    hemisphereGroundDusk: string;
    sunColorDay: string;
    sunColorDusk: string;
    pointColorDay: string;
    pointColorDusk: string;
    pointIntensityDay: number;
    pointIntensityDusk: number;
    envPresetDay: EnvPreset;
    envPresetDusk: EnvPreset;
    cloudColor: string;
    fireflyColor: string;
    fireflyEmissive: string;
    particles?: AtmosphereParticles;
}

const ATMOSPHERE_PRESETS: Record<WorldTheme, AtmospherePreset> = {
    normal: {
        shellBg: 'url(/images/backgrounds/bg_normal.png) center/cover no-repeat',
        shellBgDusk: 'url(/images/backgrounds/bg_normal.png) center/cover no-repeat',
        ambientDay: 0.55, ambientDusk: 0.4,
        hemisphereSkyDay: '#dbeafe', hemisphereSkyDusk: '#fdba74',
        hemisphereGroundDay: '#9ca3af', hemisphereGroundDusk: '#7c3aed',
        sunColorDay: '#ffffff', sunColorDusk: '#fb923c',
        pointColorDay: '#c4b5fd', pointColorDusk: '#f59e0b',
        pointIntensityDay: 0.38, pointIntensityDusk: 0.54,
        envPresetDay: 'forest', envPresetDusk: 'sunset',
        cloudColor: '#bfdbfe',
        fireflyColor: '#fef08a', fireflyEmissive: '#fde047',
    },
    night: {
        shellBg: 'url(/images/backgrounds/bg_night.png) center/cover no-repeat',
        shellBgDusk: 'url(/images/backgrounds/bg_night.png) center/cover no-repeat',
        ambientDay: 0.25, ambientDusk: 0.2,
        hemisphereSkyDay: '#312e81', hemisphereSkyDusk: '#1e1b4b',
        hemisphereGroundDay: '#1e293b', hemisphereGroundDusk: '#0f172a',
        sunColorDay: '#818cf8', sunColorDusk: '#6366f1',
        pointColorDay: '#a78bfa', pointColorDusk: '#8b5cf6',
        pointIntensityDay: 0.6, pointIntensityDusk: 0.7,
        envPresetDay: 'night', envPresetDusk: 'night',
        cloudColor: '#4338ca',
        fireflyColor: '#c4b5fd', fireflyEmissive: '#a78bfa',
        particles: { color: '#e0e7ff', emissive: '#818cf8', count: 22, size: 0.02, speed: 0.28, fallSpeed: 0, spread: 5.5, usePlane: false },
    },
    sakura: {
        shellBg: 'url(/images/backgrounds/bg_sakura.png) center/cover no-repeat',
        shellBgDusk: 'url(/images/backgrounds/bg_sakura.png) center/cover no-repeat',
        ambientDay: 0.6, ambientDusk: 0.42,
        hemisphereSkyDay: '#fce7f3', hemisphereSkyDusk: '#f9a8d4',
        hemisphereGroundDay: '#f0abfc', hemisphereGroundDusk: '#86198f',
        sunColorDay: '#fdf2f8', sunColorDusk: '#f472b6',
        pointColorDay: '#f9a8d4', pointColorDusk: '#ec4899',
        pointIntensityDay: 0.42, pointIntensityDusk: 0.52,
        envPresetDay: 'park', envPresetDusk: 'sunset',
        cloudColor: '#fbcfe8',
        fireflyColor: '#fbcfe8', fireflyEmissive: '#f9a8d4',
        particles: { color: '#fbcfe8', emissive: '#f9a8d4', count: 20, size: 0.026, speed: 0.55, fallSpeed: 0.38, spread: 4.0, usePlane: true },
    },
    rainbow_dragon: {
        shellBg: 'url(/images/backgrounds/bg_rainbow_dragon.png) center/cover no-repeat',
        shellBgDusk: 'url(/images/backgrounds/bg_rainbow_dragon.png) center/cover no-repeat',
        ambientDay: 0.6, ambientDusk: 0.45,
        hemisphereSkyDay: '#fdf4ff', hemisphereSkyDusk: '#fbcfe8',
        hemisphereGroundDay: '#fae8ff', hemisphereGroundDusk: '#fce7f3',
        sunColorDay: '#ffffff', sunColorDusk: '#fdf2f8',
        pointColorDay: '#e879f9', pointColorDusk: '#d946ef',
        pointIntensityDay: 0.4, pointIntensityDusk: 0.5,
        envPresetDay: 'park', envPresetDusk: 'sunset',
        cloudColor: '#fdf4ff',
        fireflyColor: '#fae8ff', fireflyEmissive: '#f0abfc',
    },
    star_fairy: {
        shellBg: 'url(/images/backgrounds/bg_star_fairy.png) center/cover no-repeat',
        shellBgDusk: 'url(/images/backgrounds/bg_star_fairy.png) center/cover no-repeat',
        ambientDay: 0.55, ambientDusk: 0.4,
        hemisphereSkyDay: '#eff6ff', hemisphereSkyDusk: '#bfdbfe',
        hemisphereGroundDay: '#dbeafe', hemisphereGroundDusk: '#93c5fd',
        sunColorDay: '#ffffff', sunColorDusk: '#dbeafe',
        pointColorDay: '#60a5fa', pointColorDusk: '#3b82f6',
        pointIntensityDay: 0.4, pointIntensityDusk: 0.5,
        envPresetDay: 'forest', envPresetDusk: 'sunset',
        cloudColor: '#eff6ff',
        fireflyColor: '#dbeafe', fireflyEmissive: '#93c5fd',
    },
    slime: {
        shellBg: 'url(/images/backgrounds/bg_slime.png) center/cover no-repeat',
        shellBgDusk: 'url(/images/backgrounds/bg_slime.png) center/cover no-repeat',
        ambientDay: 0.6, ambientDusk: 0.45,
        hemisphereSkyDay: '#f0fdf4', hemisphereSkyDusk: '#bbf7d0',
        hemisphereGroundDay: '#dcfce7', hemisphereGroundDusk: '#86efac',
        sunColorDay: '#ffffff', sunColorDusk: '#dcfce7',
        pointColorDay: '#4ade80', pointColorDusk: '#22c55e',
        pointIntensityDay: 0.4, pointIntensityDusk: 0.5,
        envPresetDay: 'park', envPresetDusk: 'sunset',
        cloudColor: '#f0fdf4',
        fireflyColor: '#dcfce7', fireflyEmissive: '#86efac',
    },
    flame_bird: {
        shellBg: 'url(/images/backgrounds/bg_flame_bird.png) center/cover no-repeat',
        shellBgDusk: 'url(/images/backgrounds/bg_flame_bird.png) center/cover no-repeat',
        ambientDay: 0.58, ambientDusk: 0.42,
        hemisphereSkyDay: '#fff7ed', hemisphereSkyDusk: '#fed7aa',
        hemisphereGroundDay: '#ffedd5', hemisphereGroundDusk: '#fdba74',
        sunColorDay: '#ffffff', sunColorDusk: '#ffedd5',
        pointColorDay: '#fb923c', pointColorDusk: '#f97316',
        pointIntensityDay: 0.4, pointIntensityDusk: 0.5,
        envPresetDay: 'sunset', envPresetDusk: 'sunset',
        cloudColor: '#fff7ed',
        fireflyColor: '#ffedd5', fireflyEmissive: '#fdba74',
    },
};

// ─── Terrain configs (island surface) ───
interface TerrainConfig {
    /** null = keep original GLB green */
    skinColor: string | null;
    showFlowers: boolean;
    groundColor: string;
    groundOpacity: number;
    particles?: AtmosphereParticles;
}

const TERRAIN_CONFIGS: Record<WorldTerrain, TerrainConfig> = {
    grassland: {
        skinColor: null,
        showFlowers: true,
        groundColor: '#86efac', groundOpacity: 0.18,
    },
    desert: {
        skinColor: '#e8c97a',
        showFlowers: false,
        groundColor: '#d97706', groundOpacity: 0.35,
        particles: { color: '#fde68a', emissive: '#b45309', count: 14, size: 0.014, speed: 0.45, fallSpeed: 0.28, spread: 4.0, usePlane: false },
    },
    snow: {
        skinColor: '#dff4fb',
        showFlowers: false,
        groundColor: '#e0f2fe', groundOpacity: 0.4,
        particles: { color: '#f0f9ff', emissive: '#bae6fd', count: 24, size: 0.01, speed: 0.75, fallSpeed: 1.0, spread: 4.5, usePlane: true },
    },
};

// ─── Model paths ───
const M = {
    // Nature
    pineA: '/models/nature/tree_pineRoundA.glb',
    pineB: '/models/nature/tree_pineRoundB.glb',
    pineC: '/models/nature/tree_pineRoundC.glb',
    pineSmallA: '/models/nature/tree_pineSmallA.glb',
    pineSmallB: '/models/nature/tree_pineSmallB.glb',
    pineTallA: '/models/nature/tree_pineTallA_detailed.glb',
    treeDetailed: '/models/nature/tree_detailed.glb',
    treeOak: '/models/nature/tree_oak.glb',
    treeSmall: '/models/nature/tree_small.glb',
    bush: '/models/nature/plant_bush.glb',
    bushLarge: '/models/nature/plant_bushLarge.glb',
    bushSmall: '/models/nature/plant_bushSmall.glb',
    grass: '/models/nature/grass.glb',
    grassLarge: '/models/nature/grass_large.glb',
    flowerRed: '/models/nature/flower_redA.glb',
    flowerYellow: '/models/nature/flower_yellowA.glb',
    flowerPurple: '/models/nature/flower_purpleA.glb',
    rockLargeA: '/models/nature/rock_largeA.glb',
    rockLargeB: '/models/nature/rock_largeB.glb',
    rockTallA: '/models/nature/rock_tallA.glb',
    rockTallB: '/models/nature/rock_tallB.glb',
    stoneLargeA: '/models/nature/stone_largeA.glb',
    stoneLargeB: '/models/nature/stone_largeB.glb',
    stoneTallA: '/models/nature/stone_tallA.glb',
    cliffBlock: '/models/nature/cliff_block_rock.glb',
    cliffLarge: '/models/nature/cliff_large_rock.glb',
    cliffHalf: '/models/nature/cliff_half_rock.glb',
    cliffCorner: '/models/nature/cliff_corner_rock.glb',
    cliffTop: '/models/nature/cliff_top_rock.glb',
    groundGrass: '/models/nature/ground_grass.glb',
    sign: '/models/nature/sign.glb',
    logStack: '/models/nature/log_stack.glb',
    mushroom: '/models/nature/mushroom_redGroup.glb',
    // Town
    stall: '/models/town/stall.glb',
    stallGreen: '/models/town/stall-green.glb',
    stallRed: '/models/town/stall-red.glb',
    windmill: '/models/town/windmill.glb',
    watermill: '/models/town/watermill.glb',
    lantern: '/models/town/lantern.glb',
    fountain: '/models/town/fountain-round.glb',
    bannerGreen: '/models/town/banner-green.glb',
    // Survival
    chest: '/models/survival/chest.glb',
    barrel: '/models/survival/barrel.glb',
    box: '/models/survival/box.glb',
    tent: '/models/survival/tent.glb',
    campfirePit: '/models/survival/campfire-pit.glb',
    signpost: '/models/survival/signpost.glb',
    resourceStone: '/models/survival/resource-stone.glb',
    toolPickaxe: '/models/survival/tool-pickaxe.glb',
    // Platformer
    blockGrassLarge: '/models/platformer/block-grass-large.glb',
    blockGrassOverhang: '/models/platformer/block-grass-overhang-large.glb',
    blockGrass: '/models/platformer/block-grass.glb',
    // Characters
    charMaleA: '/models/characters/character-male-a.glb',
    charFemaleA: '/models/characters/character-female-a.glb',
};

// Preload critical models
[
    M.blockGrassLarge, M.blockGrassOverhang, M.blockGrass,
    M.pineA, M.pineB, M.pineSmallA, M.bush, M.bushSmall,
    M.rockLargeA, M.rockTallA, M.stoneLargeA,
    M.stall, M.stallGreen, M.windmill, M.lantern,
    M.cliffBlock, M.cliffLarge, M.cliffHalf,
    M.groundGrass, M.grass, M.flowerRed,
    M.charMaleA, M.charFemaleA,
].forEach((path) => useGLTF.preload(path));

// ─── Reusable GLB component ───
function GLBModel({
    path,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
}: {
    path: string;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number | [number, number, number];
}) {
    const { scene } = useGLTF(path);
    const s = typeof scale === 'number' ? [scale, scale, scale] as [number, number, number] : scale;
    return (
        <Clone
            object={scene}
            position={position}
            rotation={rotation}
            scale={s}
            castShadow
            receiveShadow
        />
    );
}

// ─── Auto-grounding GLB: shifts model up so its bottom face sits at y=0 ───
// This handles GLBs whose pivot is at the model centre rather than the base.
function GroundedGLBModel({
    path,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
}: {
    path: string;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number | [number, number, number];
}) {
    const { scene } = useGLTF(path);
    const s = typeof scale === 'number' ? [scale, scale, scale] as [number, number, number] : scale;
    const scaleY = s[1];
    // Measure the bounding box of the raw (unscaled) scene geometry
    const groundLift = useMemo(() => {
        const box = new Box3().setFromObject(scene);
        // box.min.y is negative when pivot is at centre; multiply by scaleY to get world units
        return -box.min.y * scaleY;
    }, [scene, scaleY]);
    return (
        <Clone
            object={scene}
            position={[position[0], position[1] + groundLift, position[2]]}
            rotation={rotation}
            scale={s}
            castShadow
            receiveShadow
        />
    );
}

function AtmosphericParticle({
    initialX, initialY, initialZ, color, emissive, size, speed, fallSpeed, usePlane, phase,
}: {
    initialX: number; initialY: number; initialZ: number;
    color: string; emissive: string; size: number; speed: number;
    fallSpeed: number; usePlane: boolean; phase: number;
}) {
    const ref = useRef<Group>(null);
    const topY = 2.2;
    const bottomY = -1.8;
    const range = topY - bottomY;

    useFrame((state) => {
        if (!ref.current) return;
        const t = state.clock.getElapsedTime() * speed + phase;

        let y: number;
        if (fallSpeed > 0) {
            const elapsed = (state.clock.getElapsedTime() * fallSpeed * 0.18 + phase * 0.6) % range;
            y = topY - elapsed;
        } else {
            y = initialY + Math.sin(t * 0.9) * 0.35;
            // Stars twinkle
            const pulse = 0.75 + Math.sin(t * 2.8 + phase) * 0.25;
            ref.current.scale.setScalar(pulse);
        }

        ref.current.position.x = initialX + Math.sin(t * 0.65 + phase) * 0.3;
        ref.current.position.y = y;
        ref.current.position.z = initialZ + Math.cos(t * 0.5 + phase) * 0.3;

        if (usePlane) {
            ref.current.rotation.x = Math.sin(t * 1.1) * 0.9;
            ref.current.rotation.z = Math.cos(t * 0.8) * 0.7;
        }
    });

    return (
        <group ref={ref} position={[initialX, initialY, initialZ]}>
            {usePlane ? (
                <mesh>
                    <planeGeometry args={[size * 2.2, size * 1.4]} />
                    <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.45} transparent opacity={0.82} side={2} />
                </mesh>
            ) : (
                <mesh>
                    <sphereGeometry args={[size, 6, 6]} />
                    <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.65} />
                </mesh>
            )}
        </group>
    );
}

// Grass block with terrain skin color applied via material override.
// Grass block with an optional flat color overlay on the top face.
// Uses Box3 to measure the GLB's actual bounding box so the plane sits exactly
// on top regardless of scale variation between blockGrass and blockGrassLarge.
function TerrainBlock({
    path,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    skinColor,
}: {
    path: string;
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: number | [number, number, number];
    skinColor: string | null;
}) {
    const { scene } = useGLTF(path);
    const sc = typeof scale === 'number' ? scale : scale[0];

    // Measure the unscaled model's bounding box once, then multiply by scale.
    const { topY, w, slabH } = useMemo(() => {
        const box = new Box3().setFromObject(scene);
        const blockW = (box.max.x - box.min.x) * sc;
        // slab height covers the rounded top rim that slopes down from the peak
        const slab = (box.max.y - box.min.y) * sc * 0.22;
        return {
            topY: box.max.y * sc,
            w: blockW * 0.98,    // near-full width to cover rounded corners
            slabH: slab,
        };
    }, [scene, sc]);

    return (
        <group position={position} rotation={rotation}>
            <GLBModel path={path} scale={scale} />
            {skinColor && (
                // A thin slab positioned so its top face aligns with the block's peak.
                // The slab height reaches down enough to cover the curved green rim.
                // polygonOffset pushes it in front of the GLB faces at the same depth.
                <mesh position={[0, topY - slabH / 2, 0]} receiveShadow renderOrder={1}>
                    <boxGeometry args={[w, slabH, w]} />
                    <meshStandardMaterial color={skinColor} roughness={0.95} metalness={0} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
                </mesh>
            )}
        </group>
    );
}

// ── Decoration catalog ───────────────────────────────────────────────────────
// Each entry defines a purchasable decoration that appears on the main island.
// x/z are in the island's local coordinate system (parent group is at islandSurfaceY).
// GroundedGLBModel auto-lifts each model so its mesh bottom = y=0; yOffset is an
// additional fine-tune nudge on top of that (leave undefined / 0 for most models).
export const DECORATION_CATALOG: Array<{
    key: string;
    path: string;
    scale: number;
    x: number;
    z: number;
    yOffset?: number;   // extra nudge above auto-ground (default 0)
    rotation?: number;  // y-axis rotation in radians
}> = [
    { key: 'lantern_east', path: '/models/town/lantern.glb',         scale: 0.3,  x:  1.35, z:  0.75 },
    { key: 'lantern_west', path: '/models/town/lantern.glb',         scale: 0.3,  x: -1.40, z: -0.65 },
    { key: 'fountain',     path: '/models/town/fountain-round.glb',  scale: 0.22, x: -0.1,  z:  1.3  },
    { key: 'windmill',     path: '/models/town/windmill.glb',        scale: 0.24, x:  1.05, z: -1.1,  rotation: 0.3  },
    { key: 'chest',        path: '/models/survival/chest.glb',       scale: 0.26, x: -1.1,  z:  1.05 },
    { key: 'mushroom',     path: '/models/nature/mushroom_redGroup.glb', scale: 0.26, x: 0.5, z: 1.55 },
    { key: 'tent',         path: '/models/survival/tent.glb',        scale: 0.24, x: -1.55, z:  1.25, rotation: -0.4 },
    { key: 'banner',       path: '/models/town/banner-green.glb',    scale: 0.24, x:  1.6,  z: -0.1,  rotation: 0.2  },
];

interface World3DProps {
    islandLevel?: number;
    timeOfDay?: 'day' | 'dusk';
    selectedPlotKey?: string;
    onPlotSelect?: (plotKey: string) => void;
    buildings?: {
        forest?: number;
        mine?: number;
        crystal?: number;
    };
    /** Keys from DECORATION_CATALOG that the child has purchased */
    decorations?: string[];
    /** When true, fills the parent container (expects parent to be full-viewport) */
    fullScreen?: boolean;
    /** Sky/atmosphere preset */
    worldTheme?: WorldTheme;
}

type PlotType = 'forest' | 'mine' | 'crystal';

interface PlotData {
    key: string;
    type: PlotType;
    label: string;
    position: [number, number, number];
    unlockAt: number;
    level: number;
    unlocked: boolean;
}

function PlotWorker({ position, type }: { position: [number, number, number]; type: PlotType }) {
    const groupRef = useRef<Group>(null);
    const modelPath = type === 'mine' ? M.charFemaleA : M.charMaleA;
    const { scene: charScene } = useGLTF(modelPath);

    // Find the lowest geometry vertex (feet) without including armature/bone transforms.
    // Box3.setFromObject() is unreliable for rigged characters — it includes bone world
    // positions which can push min.y far negative. Reading mesh.geometry.boundingBox
    // gives raw vertex coords in the mesh's local space, unaffected by the skeleton.
    const [px, py, pz] = position;
    const adjustedY = useMemo(() => {
        let minY = Infinity;
        charScene.traverse((child) => {
            const mesh = child as Mesh;
            if (mesh.isMesh && mesh.geometry) {
                mesh.geometry.computeBoundingBox();
                const bb = mesh.geometry.boundingBox;
                if (bb) minY = Math.min(minY, bb.min.y);
            }
        });
        const footOffset = minY === Infinity ? 0 : -minY * 0.1; // 0.1 = render scale
        return py + footOffset;
    }, [charScene, py]); // eslint-disable-line react-hooks/exhaustive-deps

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.getElapsedTime();
        groupRef.current.position.x = px + Math.sin(t * 1.4 + px * 2) * 0.04;
        groupRef.current.position.z = pz + Math.cos(t * 1.4 + pz * 2) * 0.04;
        groupRef.current.rotation.y = Math.sin(t * 1.1 + px) * 0.6;
    });

    return (
        <group ref={groupRef} position={[px, adjustedY, pz]}>
            <GLBModel path={modelPath} scale={0.1} />
        </group>
    );
}

function ResourceOrb({ from, to, color, phase = 0 }: { from: [number, number, number]; to: [number, number, number]; color: string; phase?: number }) {
    const orbRef = useRef<Group>(null);

    useFrame((state) => {
        if (!orbRef.current) return;
        const t = (state.clock.getElapsedTime() * 0.32 + phase) % 1;
        orbRef.current.position.x = from[0] + (to[0] - from[0]) * t;
        orbRef.current.position.y = from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI) * 0.28;
        orbRef.current.position.z = from[2] + (to[2] - from[2]) * t;
        // Swell in arc midpoint
        const pulse = 1 + Math.sin(t * Math.PI) * 0.35;
        orbRef.current.scale.setScalar(pulse);
    });

    return (
        <group ref={orbRef} position={from}>
            {/* Core bright sphere */}
            <mesh>
                <sphereGeometry args={[0.032, 8, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.8} />
            </mesh>
            {/* Soft glow halo */}
            <mesh>
                <sphereGeometry args={[0.062, 8, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} transparent opacity={0.28} depthWrite={false} />
            </mesh>
        </group>
    );
}

function AdventureScout({ from, to, isActive }: { from: [number, number, number]; to: [number, number, number]; isActive: boolean }) {
    const scoutRef = useRef<Group>(null);

    useFrame((state) => {
        if (!scoutRef.current || !isActive) return;
        const t = (state.clock.getElapsedTime() * 0.12) % 1;
        scoutRef.current.position.x = from[0] + (to[0] - from[0]) * t;
        scoutRef.current.position.y = from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI) * 0.35;
        scoutRef.current.position.z = from[2] + (to[2] - from[2]) * t;
        scoutRef.current.rotation.y = Math.atan2(to[0] - from[0], to[2] - from[2]);
    });

    if (!isActive) return null;

    return (
        <group ref={scoutRef} position={from}>
            <GLBModel path={M.charMaleA} scale={0.4} />
        </group>
    );
}

function AdventureBeacon({ position, color, active }: { position: [number, number, number]; color: string; active: boolean }) {
    const beaconRef = useRef<Group>(null);

    useFrame((state) => {
        if (!beaconRef.current || !active) return;
        const pulse = 1 + Math.sin(state.clock.getElapsedTime() * 3.2) * 0.18;
        beaconRef.current.scale.setScalar(pulse);
        beaconRef.current.rotation.y += 0.02;
    });

    if (!active) return null;

    return (
        <group ref={beaconRef} position={position}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.22, 0.026, 8, 28]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.55} />
            </mesh>
            <mesh position={[0, 0.18, 0]}>
                <octahedronGeometry args={[0.08, 0]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.85} flatShading />
            </mesh>
        </group>
    );
}

// ─── Per-plot-type visual identity ───
const PLOT_ISLAND_CONFIG: Record<PlotType, {
    terrainColor: string;
    ringColor: string;
    ringEmissive: string;
    workerCount: number;
}> = {
    forest:  { terrainColor: '#16a34a', ringColor: '#4ade80', ringEmissive: '#22c55e', workerCount: 2 },
    mine:    { terrainColor: '#94a3b8', ringColor: '#cbd5e1', ringEmissive: '#94a3b8', workerCount: 2 },
    crystal: { terrainColor: '#a5f3fc', ringColor: '#67e8f9', ringEmissive: '#06b6d4', workerCount: 1 },
};

function PlotIslandRing({ color, emissive }: { color: string; emissive: string }) {
    const ringRef = useRef<Group>(null);
    useFrame((state) => {
        if (!ringRef.current) return;
        ringRef.current.rotation.y = state.clock.getElapsedTime() * 0.5;
    });
    return (
        <group ref={ringRef} position={[0, -0.32, 0]}>
            {/* Flat glowing base disc visible from isometric view */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.5, 0.78, 32]} />
                <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={1.2} transparent opacity={0.75} side={2} depthWrite={false} />
            </mesh>
            {/* Upright spinning ring for side visibility */}
            <mesh rotation={[0, 0, 0]}>
                <torusGeometry args={[0.62, 0.035, 8, 36]} />
                <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={1.0} transparent opacity={0.9} />
            </mesh>
        </group>
    );
}

function PlotIsland({
    plot,
    isSelected,
    onSelect,
}: {
    plot: PlotData;
    isSelected: boolean;
    onSelect?: (plotKey: string) => void;
}) {
    const { scene: blockScene } = useGLTF(M.blockGrass);

    // Island grows from 100% (level 1) to 130% (level 7) — uniform scale on the whole group
    const islandGrowth = 1 + Math.min(Math.max(0, plot.level - 1), 6) * 0.05;

    const surfaceY = useMemo(() => {
        const box = new Box3().setFromObject(blockScene);
        return box.max.y * 0.7; // base scale 0.7; the group scale handles growth
    }, [blockScene]);

    if (!plot.unlocked) return null;

    const cfg = PLOT_ISLAND_CONFIG[plot.type];

    const plotDecoration = useMemo(() => {
        const sy = surfaceY;
        switch (plot.type) {
            case 'forest':
                return (
                    <>
                        <GLBModel path={M.pineA}       position={[-0.13, sy, -0.08]} scale={0.32} rotation={[0, 0.3, 0]} />
                        <GLBModel path={M.pineB}       position={[0.14, sy, -0.05]}  scale={0.26} rotation={[0, 1.8, 0]} />
                        <GLBModel path={M.pineSmallA}  position={[0.0, sy, 0.18]}    scale={0.24} rotation={[0, 0.9, 0]} />
                        <GLBModel path={M.bush}        position={[-0.05, sy, 0.05]}  scale={0.22} />
                        <GLBModel path={M.flowerRed}   position={[0.08, sy, 0.12]}   scale={0.2} />
                        <GLBModel path={M.logStack}    position={[0.18, sy, 0.14]}   scale={0.22} rotation={[0, 0.5, 0]} />
                    </>
                );
            case 'mine':
                return (
                    <>
                        <GLBModel path={M.rockLargeA}    position={[-0.08, sy, -0.05]} scale={0.28} rotation={[0, 0.5, 0]} />
                        <GLBModel path={M.stoneTallA}     position={[0.12, sy, 0.0]}   scale={0.26} rotation={[0, 2.2, 0]} />
                        <GLBModel path={M.rockTallA}      position={[0.0, sy, -0.17]}  scale={0.22} rotation={[0, 1.1, 0]} />
                        <GLBModel path={M.stoneLargeB}    position={[-0.15, sy, 0.12]} scale={0.2}  rotation={[0, 3.0, 0]} />
                        <GLBModel path={M.toolPickaxe}    position={[0.06, sy, 0.15]}  scale={0.28} rotation={[0, 0.8, 0.35]} />
                        <GLBModel path={M.resourceStone}  position={[-0.04, sy, 0.05]} scale={0.22} />
                    </>
                );
            case 'crystal':
                return (
                    <>
                        {/* Crystals are pure Three.js geometry — origin is at center, so y = sy + radius sits base on surface */}
                        <mesh position={[-0.06, sy + 0.1, -0.07]} rotation={[0.15, 0.4, 0.2]} scale={[0.065, 0.14, 0.065]} castShadow>
                            <octahedronGeometry args={[1, 0]} />
                            <meshStandardMaterial color="#67e8f9" emissive="#06b6d4" emissiveIntensity={1.0} transparent opacity={0.88} />
                        </mesh>
                        <mesh position={[0.11, sy + 0.075, 0.04]} rotation={[-0.1, 1.3, -0.18]} scale={[0.05, 0.105, 0.05]} castShadow>
                            <octahedronGeometry args={[1, 0]} />
                            <meshStandardMaterial color="#c4b5fd" emissive="#7c3aed" emissiveIntensity={0.9} transparent opacity={0.9} />
                        </mesh>
                        <mesh position={[0.03, sy + 0.055, 0.15]} rotation={[0.2, 0.9, 0.1]} scale={[0.04, 0.09, 0.04]} castShadow>
                            <octahedronGeometry args={[1, 0]} />
                            <meshStandardMaterial color="#67e8f9" emissive="#06b6d4" emissiveIntensity={1.1} transparent opacity={0.85} />
                        </mesh>
                        <mesh position={[-0.14, sy + 0.06, 0.09]} rotation={[-0.12, 2.2, 0.25]} scale={[0.045, 0.1, 0.045]} castShadow>
                            <octahedronGeometry args={[1, 0]} />
                            <meshStandardMaterial color="#a5f3fc" emissive="#0891b2" emissiveIntensity={0.8} transparent opacity={0.9} />
                        </mesh>
                        <mesh position={[0.16, sy + 0.045, -0.11]} rotation={[0.3, 0.6, -0.1]} scale={[0.035, 0.075, 0.035]} castShadow>
                            <octahedronGeometry args={[1, 0]} />
                            <meshStandardMaterial color="#67e8f9" emissive="#06b6d4" emissiveIntensity={1.2} transparent opacity={0.85} />
                        </mesh>
                        <GLBModel path={M.rockLargeA} position={[-0.1, sy, -0.1]} scale={0.16} rotation={[0, 0.9, 0]} />
                    </>
                );
            default:
                return null;
        }
    }, [plot.type, surfaceY]);

    return (
        <group
            position={plot.position}
            scale={islandGrowth}
            onClick={() => onSelect?.(plot.key)}
            onPointerOver={() => { if (typeof document !== 'undefined') document.body.style.cursor = 'pointer'; }}
            onPointerOut={() => { if (typeof document !== 'undefined') document.body.style.cursor = 'default'; }}
        >
            {/* Permanent type-identity ring (always visible, type-coloured) */}
            <PlotIslandRing color={cfg.ringColor} emissive={cfg.ringEmissive} />

            <group>
                {isSelected && (
                    <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.52, 0.05, 10, 32]} />
                        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.6} />
                    </mesh>
                )}
                {/* Type-specific terrain color overrides world terrain */}
                <TerrainBlock path={M.blockGrass} position={[0, 0, 0]} scale={0.7} skinColor={cfg.terrainColor} />
                {plotDecoration}
                {/* Workers */}
                {Array.from({ length: cfg.workerCount }).map((_, i) => (
                    <PlotWorker
                        key={`pw-${i}`}
                        type={plot.type}
                        position={[
                            (i - (cfg.workerCount - 1) / 2) * 0.22,
                            surfaceY,
                            i % 2 === 0 ? -0.09 : 0.09,
                        ]}
                    />
                ))}
            </group>
        </group>
    );
}

const ISLAND_DRAG_LIMIT = 15;

// Keeps OrbitControls.target locked to the island group position every frame
// so that rotation always orbits around the island, even after a drag.
function OrbitTargetSyncer({
    islandGroupRef,
}: {
    islandGroupRef: React.RefObject<Group | null>;
}) {
    const { controls } = useThree();
    useFrame(() => {
        if (!islandGroupRef.current || !controls || !('target' in controls)) return;
        const orb = controls as unknown as { target: Vector3 };
        const pos = islandGroupRef.current.position;
        // Only update when position has actually changed to avoid fighting OrbitControls
        if (orb.target.x !== pos.x || orb.target.y !== pos.y || orb.target.z !== pos.z) {
            orb.target.copy(pos);
        }
    });
    return null;
}

function IslandDragHandler({
    dragRef,
    islandGroupRef,
    enabled,
}: {
    dragRef: { current: { pendingDx: number; pendingDy: number } };
    islandGroupRef: React.RefObject<Group | null>;
    enabled: boolean;
}) {
    const { camera } = useThree();
    const rv = useRef(new Vector3());
    const fv = useRef(new Vector3());
    const up = useRef(new Vector3(0, 1, 0));

    useFrame(() => {
        if (!enabled || !islandGroupRef.current) return;
        const { pendingDx, pendingDy } = dragRef.current;
        if (pendingDx === 0 && pendingDy === 0) return;
        dragRef.current.pendingDx = 0;
        dragRef.current.pendingDy = 0;

        camera.getWorldDirection(fv.current);
        rv.current.crossVectors(fv.current, up.current).normalize();
        fv.current.y = 0;
        fv.current.normalize();
        rv.current.y = 0;
        rv.current.normalize();

        const scale = camera.position.length() * 0.003;
        const pos = islandGroupRef.current.position;
        pos.x = Math.max(-ISLAND_DRAG_LIMIT, Math.min(ISLAND_DRAG_LIMIT,
            pos.x + rv.current.x * pendingDx * scale - fv.current.x * pendingDy * scale));
        pos.z = Math.max(-ISLAND_DRAG_LIMIT, Math.min(ISLAND_DRAG_LIMIT,
            pos.z + rv.current.z * pendingDx * scale - fv.current.z * pendingDy * scale));
    });

    return null;
}

/**
 * 基礎 3D 懸浮島嶼元件
 * 這是計畫中的第一階段原型：建立一個可縮放、旋轉的基礎場景
 */
export function World3D({
    islandLevel = 1,
    timeOfDay = 'day',
    selectedPlotKey,
    onPlotSelect,
    buildings,
    decorations = [],
    fullScreen = false,
    worldTheme = 'normal',
}: World3DProps) {
    const worldTerrain: WorldTerrain = 'grassland';

    // Measure the actual top surface of the main island's center block so decorations sit on it
    const { scene: blockGrassLargeScene } = useGLTF(M.blockGrassLarge);
    const islandSurfaceY = useMemo(() => {
        const box = new Box3().setFromObject(blockGrassLargeScene);
        return box.max.y * 2.0; // main island uses scale 2.0
    }, [blockGrassLargeScene]);

    const forestLv = buildings?.forest ?? 1;
    const mineLv = buildings?.mine ?? 1;

    const islandScale = Math.min(1 + Math.max(0, islandLevel - 1) * 0.05, 1.4);
    const orbitMaxDistance = Math.min(24 + islandLevel * 0.5, 36);
    const treeCount = Math.min(1 + Math.floor(forestLv / 2), 7);
    const rockCount = Math.min(1 + Math.floor(mineLv / 2), 6);
    const floatingTiles = Math.min(Math.max(0, islandLevel - 1), 6);
    const fireflyCount = Math.min(4 + Math.floor(forestLv / 2), 10);
    const forestStage = forestLv >= 6 ? 3 : forestLv >= 3 ? 2 : 1;
    const mineStage = mineLv >= 6 ? 3 : mineLv >= 3 ? 2 : 1;
    const isDusk = timeOfDay === 'dusk';
    const atmos = ATMOSPHERE_PRESETS[worldTheme] ?? ATMOSPHERE_PRESETS.normal;
    const terrain = TERRAIN_CONFIGS[worldTerrain] ?? TERRAIN_CONFIGS.grassland;
    const shellBackground = isDusk ? atmos.shellBgDusk : atmos.shellBg;
    const ambientIntensity = isDusk ? atmos.ambientDusk : atmos.ambientDay;
    const hemisphereSky = isDusk ? atmos.hemisphereSkyDusk : atmos.hemisphereSkyDay;
    const hemisphereGround = isDusk ? atmos.hemisphereGroundDusk : atmos.hemisphereGroundDay;
    const sunColor = isDusk ? atmos.sunColorDusk : atmos.sunColorDay;
    const pointColor = isDusk ? atmos.pointColorDusk : atmos.pointColorDay;
    const pointIntensity = isDusk ? atmos.pointIntensityDusk : atmos.pointIntensityDay;
    const environmentPreset = isDusk ? atmos.envPresetDusk : atmos.envPresetDay;
    // Particles: terrain-specific particles take priority (snow/sand), fallback to atmosphere (stars/sakura)
    const activeParticles = terrain.particles ?? atmos.particles ?? null;
    const crystalLv = buildings?.crystal ?? 1;
    const plotDefinitions = useMemo<PlotData[]>(() => {
        const order: Array<{ type: PlotType; label: string; level: number; unlockAt: number; position: [number, number, number] }> = [
            { type: 'forest',  label: '森林地塊', level: forestLv,  unlockAt: 2, position: [2.2,  -0.05, 3.2]  },
            { type: 'mine',    label: '石頭地塊', level: mineLv,    unlockAt: 3, position: [3.8,   0.05, 0.0]  },
            { type: 'crystal', label: '水晶地塊', level: crystalLv, unlockAt: 4, position: [-3.5,  0.0,  2.0]  },
        ];

        return order.map((plot, index) => ({
            key: `${plot.type}-${index}`,
            type: plot.type,
            label: plot.label,
            position: plot.position,
            unlockAt: plot.unlockAt,
            level: plot.level,
            unlocked: islandLevel >= plot.unlockAt,
        }));
    }, [crystalLv, forestLv, islandLevel, mineLv]);
    const unlockedPlots = plotDefinitions.filter((plot) => plot.unlocked);
    const resourceFlowStart: Record<PlotType, [number, number, number]> = {
        forest:  [2.2,  0.25, 3.2],
        mine:    [3.8,  0.35, 0.0],
        crystal: [-3.5, 0.3,  2.0],
    };
    const hubTarget: [number, number, number] = [0, 0.25, 0.15];
    const routeTargets: Record<PlotType, [number, number, number]> = {
        forest:  [-0.35, 0.16,  0.55],
        mine:    [ 0.45, 0.16,  0.28],
        crystal: [-0.45, 0.18, -0.42],
    };

    const containerClass = fullScreen
        ? 'w-full h-full overflow-hidden relative'
        : 'w-full h-[400px] rounded-2xl border-4 border-deep-black overflow-hidden relative shadow-clay';

    // ── Island drag state ──────────────────────────────────────────────────
    const [isPressing, setIsPressing] = useState(false);
    const [isDragMode, setIsDragMode] = useState(false);
    const [pressPos, setPressPos] = useState({ x: 0, y: 0 });
    const isDragModeRef = useRef(false);
    const isPressingRef = useRef(false);
    const islandGroupRef = useRef<Group | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const dragRef = useRef({ startX: 0, startY: 0, lastX: 0, lastY: 0, pendingDx: 0, pendingDy: 0 });

    useEffect(() => () => {
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    }, []);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        // Only left-button on mouse; all touches accepted
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        // Capture the pointer on this div so OrbitControls (canvas) can't steal pointermove events
        e.currentTarget.setPointerCapture(e.pointerId);
        const s = dragRef.current;
        s.startX = e.clientX; s.startY = e.clientY;
        s.lastX = e.clientX; s.lastY = e.clientY;
        s.pendingDx = 0; s.pendingDy = 0;
        isPressingRef.current = true;
        setIsPressing(true);
        setPressPos({ x: e.clientX, y: e.clientY });
        longPressTimerRef.current = setTimeout(() => {
            if (isPressingRef.current) {
                isDragModeRef.current = true;
                setIsDragMode(true);
                isPressingRef.current = false;
                setIsPressing(false);
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
            }
        }, 800);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const s = dragRef.current;
        if (isDragModeRef.current) {
            s.pendingDx += e.clientX - s.lastX;
            s.pendingDy += e.clientY - s.lastY;
            s.lastX = e.clientX;
            s.lastY = e.clientY;
            return;
        }
        if (isPressingRef.current) {
            const dx = e.clientX - s.startX;
            const dy = e.clientY - s.startY;
            if (Math.sqrt(dx * dx + dy * dy) > 12) {
                isPressingRef.current = false;
                setIsPressing(false);
                if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
            }
        }
        s.lastX = e.clientX;
        s.lastY = e.clientY;
    };

    const handlePointerUp = () => {
        isPressingRef.current = false;
        setIsPressing(false);
        if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
        isDragModeRef.current = false;
        setIsDragMode(false);
        dragRef.current.pendingDx = 0;
        dragRef.current.pendingDy = 0;
    };
    // ──────────────────────────────────────────────────────────────────────

    return (
        <div
            className={containerClass}
            style={{ background: shellBackground, cursor: isDragMode ? 'grabbing' : isPressing ? 'grab' : undefined }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Background fade overlay — sits on top of CSS bg image but below the WebGL canvas */}
            <div className="absolute inset-0 pointer-events-none bg-white/50" />
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={fullScreen ? [12, 10, 12] : [5, 5, 5]} fov={fullScreen ? 40 : 50} />
                <OrbitControls
                    enableRotate={!isDragMode}
                    enableZoom={!isDragMode}
                    enablePan={false}
                    minDistance={3}
                    maxDistance={orbitMaxDistance}
                    makeDefault
                />
                <IslandDragHandler dragRef={dragRef} islandGroupRef={islandGroupRef} enabled={isDragMode} />
                <OrbitTargetSyncer islandGroupRef={islandGroupRef} />

                {/* 環境光設計 */}
                <ambientLight intensity={ambientIntensity} />
                <hemisphereLight args={[hemisphereSky, hemisphereGround, isDusk ? 0.62 : 0.5]} />
                <directionalLight
                    position={[10, 10, 5]}
                    intensity={1.15}
                    color={sunColor}
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                />
                <pointLight position={[0, 2.2, 0]} intensity={pointIntensity} color={pointColor} />

                <Suspense fallback={null}>
                    <group ref={islandGroupRef}>
                    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                        <group scale={[islandScale, islandScale, islandScale]}>
                            {/* ── Main island base (mixed: grass top + rocky cliffs) ── */}
                            <group>
                                {/* Top grass platform layer */}
                                <TerrainBlock path={M.blockGrassLarge} position={[0, 0, 0]} scale={2.0} skinColor={terrain.skinColor} />
                                <TerrainBlock path={M.blockGrass} position={[1.6, -0.05, 0]} scale={1.5} skinColor={terrain.skinColor} />
                                <TerrainBlock path={M.blockGrass} position={[-1.6, -0.05, 0]} scale={1.5} skinColor={terrain.skinColor} />
                                <TerrainBlock path={M.blockGrass} position={[0, -0.05, 1.6]} scale={1.5} skinColor={terrain.skinColor} />
                                <TerrainBlock path={M.blockGrass} position={[0, -0.05, -1.6]} scale={1.5} skinColor={terrain.skinColor} />
                                <TerrainBlock path={M.blockGrass} position={[1.1, -0.03, 1.1]} scale={1.3} skinColor={terrain.skinColor} />
                                <TerrainBlock path={M.blockGrass} position={[-1.1, -0.03, 1.1]} scale={1.3} skinColor={terrain.skinColor} />
                                <TerrainBlock path={M.blockGrass} position={[1.1, -0.03, -1.1]} scale={1.3} skinColor={terrain.skinColor} />
                                <TerrainBlock path={M.blockGrass} position={[-1.1, -0.03, -1.1]} scale={1.3} skinColor={terrain.skinColor} />
                                {/* Rocky cliff underside */}
                                <GLBModel path={M.cliffBlock} position={[0, -0.7, 0]} scale={2.2} />
                                <GLBModel path={M.cliffLarge} position={[0.8, -1.0, 0.5]} scale={1.4} rotation={[0, 0.5, 0]} />
                                <GLBModel path={M.cliffLarge} position={[-0.8, -1.0, -0.5]} scale={1.4} rotation={[0, 2.1, 0]} />
                                <GLBModel path={M.cliffHalf} position={[0, -1.3, 0]} scale={1.8} />
                                <GLBModel path={M.cliffCorner} position={[1.2, -0.9, -0.8]} scale={1.2} rotation={[0, 1.6, 0]} />
                                <GLBModel path={M.cliffCorner} position={[-1.2, -0.9, 0.8]} scale={1.2} rotation={[0, -1.6, 0]} />
                                {/* Cloud ring */}
                                <mesh position={[0, -1.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                                    <torusGeometry args={[2.6, 0.08, 8, 28]} />
                                    <meshStandardMaterial color={atmos.cloudColor} transparent opacity={0.45} />
                                </mesh>
                            </group>

                            {/* ── All decorations lifted to actual island surface ── */}
                            <group position={[0, islandSurfaceY, 0]}>
                            {/* ── Forest: trees grow with level ── */}
                            <group>
                                {(() => {
                                    const treeModels = [M.pineA, M.pineB, M.pineC, M.pineSmallA, M.pineSmallB, M.treeDetailed, M.treeOak];
                                    const undergrowth = [M.bush, M.bushSmall, M.grass, M.grassLarge, M.flowerRed, M.flowerYellow, M.mushroom];
                                    return Array.from({ length: treeCount }).map((_, i) => {
                                        const a = (i / Math.max(1, treeCount)) * Math.PI * 2;
                                        const r = 0.7 + (i % 2) * 0.25;
                                        const x = Math.cos(a) * r;
                                        const z = Math.sin(a) * r;
                                        return (
                                            <group key={`tree-${i}`}>
                                                <GLBModel
                                                    path={treeModels[i % treeModels.length]}
                                                    position={[x, 0.05, z]}
                                                    scale={0.3 + (i % 3) * 0.08}
                                                    rotation={[0, (i * 1.3) % (Math.PI * 2), 0]}
                                                />
                                                {forestStage >= 2 && i % 2 === 0 && (
                                                    <GLBModel
                                                        path={undergrowth[i % undergrowth.length]}
                                                        position={[x + 0.12, 0.02, z + 0.08]}
                                                        scale={0.25}
                                                    />
                                                )}
                                            </group>
                                        );
                                    });
                                })()}
                                {forestStage >= 2 && (
                                    <GLBModel path={M.logStack} position={[0.85, 0.04, 0.2]} scale={0.3} rotation={[0, 0.4, 0]} />
                                )}
                                {forestStage >= 3 && (
                                    <GLBModel path={M.watermill} position={[1.0, 0.05, -0.35]} scale={0.2} rotation={[0, -0.5, 0]} />
                                )}
                            </group>

                            {/* ── Mine: rocks grow with level ── */}
                            <group>
                                {(() => {
                                    const rockModels = [M.rockLargeA, M.rockLargeB, M.rockTallA, M.rockTallB, M.stoneLargeA, M.stoneLargeB, M.stoneTallA];
                                    return Array.from({ length: rockCount }).map((_, i) => {
                                        const a = (i / Math.max(1, rockCount)) * Math.PI * 2 + 0.4;
                                        const r = 0.55 + (i % 2) * 0.2;
                                        const x = Math.cos(a) * r;
                                        const z = Math.sin(a) * r;
                                        return (
                                            <GLBModel
                                                key={`rock-${i}`}
                                                path={rockModels[i % rockModels.length]}
                                                position={[x, 0.02, z]}
                                                scale={0.2 + (i % 2) * 0.06}
                                                rotation={[0, (i * 2.1) % (Math.PI * 2), 0]}
                                            />
                                        );
                                    });
                                })()}
                                {mineStage >= 2 && (
                                    <GLBModel path={M.toolPickaxe} position={[-0.5, 0.08, -0.6]} scale={0.3} rotation={[0, 0.8, 0.4]} />
                                )}
                                {mineStage >= 3 && (
                                    <>
                                        <GLBModel path={M.resourceStone} position={[-0.6, 0.04, -0.75]} scale={0.3} />
                                        <GLBModel path={M.barrel} position={[-0.35, 0.04, -0.82]} scale={0.25} />
                                    </>
                                )}
                            </group>


                            {/* ── Scattered decorations ── */}
                            <GLBModel path={M.grass} position={[0.6, 0.02, -0.3]} scale={0.3} />
                            <GLBModel path={M.grass} position={[-0.4, 0.02, 0.5]} scale={0.25} />
                            <GLBModel path={M.flowerRed} position={[1.2, 0.02, 0.6]} scale={0.25} />
                            <GLBModel path={M.flowerYellow} position={[-1.0, 0.02, -0.8]} scale={0.25} />
                            <GLBModel path={M.flowerPurple} position={[0.3, 0.02, -1.2]} scale={0.2} />

                            {/* ── Purchased decorations ── */}
                            {/* GroundedGLBModel auto-lifts each model so its base sits on y=0  */}
                            {/* (the parent group already positions everything at islandSurfaceY) */}
                            {DECORATION_CATALOG
                                .filter((d) => decorations.includes(d.key))
                                .map((d) => (
                                    <GroundedGLBModel
                                        key={d.key}
                                        path={d.path}
                                        position={[d.x, d.yOffset ?? 0, d.z]}
                                        scale={d.scale}
                                        rotation={[0, d.rotation ?? 0, 0]}
                                    />
                                ))}
                            </group>{/* end decorations surface group */}

                            {/* ── Floating side islands (intermediate ring between main & plots) ── */}
                            {Array.from({ length: floatingTiles }).map((_, i) => {
                                const a = (i / Math.max(1, floatingTiles)) * Math.PI * 2 + Math.PI / floatingTiles;
                                const r = 2.8;
                                const x = Math.cos(a) * r;
                                const z = Math.sin(a) * r;
                                const yOff = 0.05 + (i % 3) * 0.08;
                                return (
                                    <group key={`tile-${i}`} position={[x, yOff, z]}>
                                        <TerrainBlock path={M.blockGrass} position={[0, 0, 0]} scale={0.55} skinColor={terrain.skinColor} />
                                        {i % 2 === 0 && (
                                            <GLBModel path={M.pineSmallA} position={[0, 0.18, 0]} scale={0.16} />
                                        )}
                                        {i % 3 === 0 && (
                                            <GLBModel path={M.bushSmall} position={[0.08, 0.14, 0.04]} scale={0.14} />
                                        )}
                                        {i % 2 === 1 && (
                                            <GLBModel path={M.grass} position={[-0.05, 0.12, 0.06]} scale={0.2} />
                                        )}
                                    </group>
                                );
                            })}

                            {unlockedPlots.map((plot) => (
                                <PlotIsland
                                    key={plot.key}
                                    plot={plot}
                                    isSelected={selectedPlotKey === plot.key}
                                    onSelect={onPlotSelect}
                                />
                            ))}


                            {unlockedPlots.flatMap((plot) => {
                                    // level 1 → 1 orb, level 4 → 2, level 7 → 3, level 10 → 4
                                    const orbCount = Math.min(4, 1 + Math.floor(Math.max(0, plot.level - 1) / 3));
                                    const from = resourceFlowStart[plot.type];
                                    const to = routeTargets[plot.type];
                                    const color = plot.type === 'forest' ? '#4ade80' : plot.type === 'mine' ? '#94a3b8' : '#67e8f9';
                                    return Array.from({ length: orbCount }).map((_, orbIndex) => (
                                        <ResourceOrb
                                            key={`orb-${plot.key}-${orbIndex}`}
                                            from={from}
                                            to={to}
                                            color={color}
                                            // Stagger each orb evenly around the loop so they never stack
                                            phase={orbIndex / orbCount}
                                        />
                                    ));
                                })}

                            {/* 生動感：飄浮光點 */}
                            {Array.from({ length: fireflyCount }).map((_, i) => {
                                const a = (i / Math.max(1, fireflyCount)) * Math.PI * 2;
                                const r = 1.15 + (i % 3) * 0.16;
                                return (
                                    <Float
                                        key={`firefly-${i}`}
                                        speed={1.2 + (i % 4) * 0.15}
                                        rotationIntensity={0.1}
                                        floatIntensity={0.2 + (i % 3) * 0.08}
                                        position={[Math.cos(a) * r, 0.38 + (i % 2) * 0.22, Math.sin(a) * r]}
                                    >
                                        <mesh>
                                            <sphereGeometry args={[0.018 + (i % 2) * 0.005, 8, 8]} />
                                            <meshStandardMaterial color={atmos.fireflyColor} emissive={atmos.fireflyEmissive} emissiveIntensity={0.55} />
                                        </mesh>
                                    </Float>
                                );
                            })}

                            <GLBModel path={M.signpost} position={[0.88, 0.15, -0.55]} scale={0.24} />

                            {/* ── Themed ground glow disk ── */}
                            <mesh position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                                <circleGeometry args={[3.0, 32]} />
                                <meshStandardMaterial color={terrain.groundColor} transparent opacity={terrain.groundOpacity} />
                            </mesh>

                            {/* ── Atmospheric particles (terrain or atmosphere) ── */}
                            {activeParticles && Array.from({ length: activeParticles.count }).map((_, i) => {
                                const a = (i / activeParticles.count) * Math.PI * 2;
                                const r = 0.6 + (i % 4) * (activeParticles.spread / 4);
                                return (
                                    <AtmosphericParticle
                                        key={`atm-${i}`}
                                        initialX={Math.cos(a) * r}
                                        initialY={0.5 + (i % 3) * 0.6}
                                        initialZ={Math.sin(a) * r}
                                        color={activeParticles.color}
                                        emissive={activeParticles.emissive}
                                        size={activeParticles.size}
                                        speed={activeParticles.speed}
                                        fallSpeed={activeParticles.fallSpeed}
                                        usePlane={activeParticles.usePlane}
                                        phase={i * 1.37}
                                    />
                                );
                            })}
                        </group>
                    </Float>
                    </group>

                    <Environment preset={environmentPreset} />
                    <ContactShadows
                        position={[0, -2, 0]}
                        opacity={0.4}
                        scale={10}
                        blur={2}
                        far={4.5}
                    />
                </Suspense>
            </Canvas>

            {/* UI 覆蓋層 */}
            {!fullScreen && (
                <div className="absolute top-3 left-3 pointer-events-none">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/30 backdrop-blur-md border border-white/50 shadow-sm">
                        <span className="text-sm">🏝</span>
                        <span className="font-pixel text-[11px] text-white drop-shadow-sm">冒險家家園</span>
                    </div>
                </div>
            )}

            {/* Level badges — top right (only in embedded/non-fullscreen mode) */}
            <div className={`absolute top-3 right-3 pointer-events-none ${fullScreen ? 'hidden' : ''}`}>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/25 shadow-lg">
                    <span className="text-xs">🏝</span>
                    <span className="font-pixel text-[11px] text-white">Lv.{islandLevel}</span>
                    <span className="w-px h-3 bg-white/40 mx-0.5" />
                    <span className="text-sm leading-none">{isDusk ? '🌆' : '☀️'}</span>
                </div>
            </div>

            {/* Status card — bottom left */}
            <div className={`absolute ${fullScreen ? 'bottom-6 sm:bottom-5' : 'bottom-4'} left-3 pointer-events-none flex flex-col gap-1.5`}>
                {/* Plot + worker status */}
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/25 shadow-lg">
                    <span className="text-xs">🗺️</span>
                    <span className="font-pixel text-[11px] text-white">
                        地塊 {unlockedPlots.length}<span className="text-white/60">/{plotDefinitions.length}</span>
                    </span>
                    <span className="hidden sm:inline w-px h-3 bg-white/35 mx-0.5" />
                    <span className="hidden sm:inline font-pixel text-[11px] text-white/80">✨ 工人搬運中</span>
                </div>
            </div>

            {/* Control hint — bottom right */}
            <div className="absolute bottom-5 right-3 pointer-events-none hidden sm:block">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/20 shadow-md">
                    <span className="font-pixel text-[10px] text-white/80">
                        {isDragMode ? '✋ 放開即停止拖曳' : '🖱 拖曳轉動 · 滾輪縮放'}
                    </span>
                </div>
            </div>

            {/* Long-press progress ring */}
            {isPressing && (
                <div
                    className="pointer-events-none absolute z-20"
                    style={{ left: pressPos.x - 28, top: pressPos.y - 28 }}
                >
                    <svg width="56" height="56" viewBox="0 0 56 56">
                        <circle cx="28" cy="28" r="20" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                        <circle
                            cx="28" cy="28" r="20" fill="none"
                            stroke="white" strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeDasharray="125.66 125.66"
                            strokeDashoffset="125.66"
                            transform="rotate(-90 28 28)"
                            style={{ animation: 'longpress-ring 0.8s linear forwards' }}
                        />
                    </svg>
                </div>
            )}

            {/* Drag mode badge */}
            {isDragMode && (
                <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 z-20">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600/70 backdrop-blur-md border border-indigo-300/40 shadow-xl shadow-indigo-900/30">
                        <span className="text-sm animate-pulse">✦</span>
                        <span className="font-pixel text-white text-[12px] tracking-wide">拖曳島嶼中</span>
                        <span className="text-sm animate-pulse">✦</span>
                    </div>
                </div>
            )}
        </div>
    );
}
