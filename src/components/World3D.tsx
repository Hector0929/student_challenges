import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Environment, ContactShadows, useGLTF, Clone } from '@react-three/drei';
import type { Group } from 'three';
import type { AdventureEventType, AdventureRewards, AdventureStatus } from '../lib/world/adventure';

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

interface World3DProps {
    islandLevel?: number;
    heroLevel?: number;
    timeOfDay?: 'day' | 'dusk';
    selectedPlotKey?: string;
    onPlotSelect?: (plotKey: string) => void;
    adventureStatus?: AdventureStatus;
    lastAdventureEventType?: AdventureEventType | null;
    lastAdventureRewards?: AdventureRewards | null;
    buildings?: {
        forest?: number;
        mine?: number;
        academy?: number;
        market?: number;
    };
    /** When true, fills the parent container (expects parent to be full-viewport) */
    fullScreen?: boolean;
}

type PlotType = 'forest' | 'mine' | 'market' | 'academy' | 'storage' | 'adventure';

interface PlotData {
    key: string;
    type: PlotType;
    label: string;
    position: [number, number, number];
    unlockAt: number;
    level: number;
    unlocked: boolean;
}

function PlotWorker({ position, type, isDusk }: { position: [number, number, number]; type: PlotType; isDusk: boolean }) {
    const groupRef = useRef<Group>(null);
    const modelPath = type === 'mine' || type === 'market' ? M.charFemaleA : M.charMaleA;

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.getElapsedTime();
        groupRef.current.position.x = position[0] + Math.sin(t * 1.4 + position[0] * 2) * 0.06;
        groupRef.current.position.y = position[1] + Math.sin(t * 2.2 + position[2]) * 0.035;
        groupRef.current.position.z = position[2] + Math.cos(t * 1.4 + position[2] * 2) * 0.06;
        groupRef.current.rotation.y = Math.sin(t * 1.1 + position[0]) * 0.6;
    });

    return (
        <group ref={groupRef} position={position}>
            <GLBModel path={modelPath} scale={0.35} />
        </group>
    );
}

function ResourceOrb({ from, to, color }: { from: [number, number, number]; to: [number, number, number]; color: string }) {
    const orbRef = useRef<Group>(null);

    useFrame((state) => {
        if (!orbRef.current) return;
        const t = (state.clock.getElapsedTime() * 0.28 + (from[0] + from[2]) * 0.07) % 1;
        orbRef.current.position.x = from[0] + (to[0] - from[0]) * t;
        orbRef.current.position.y = from[1] + (to[1] - from[1]) * t + Math.sin(t * Math.PI) * 0.18;
        orbRef.current.position.z = from[2] + (to[2] - from[2]) * t;
    });

    return (
        <group ref={orbRef} position={from}>
            <mesh>
                <sphereGeometry args={[0.026, 8, 8]} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
            </mesh>
        </group>
    );
}

function AdventureScout({ from, to, isActive, isDusk }: { from: [number, number, number]; to: [number, number, number]; isActive: boolean; isDusk: boolean }) {
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

function PlotIsland({
    plot,
    isDusk,
    isSelected,
    onSelect,
}: {
    plot: PlotData;
    isDusk: boolean;
    isSelected: boolean;
    onSelect?: (plotKey: string) => void;
}) {
    const highlightColor = plot.unlocked ? '#fbbf24' : '#94a3b8';

    const plotDecoration = useMemo(() => {
        if (!plot.unlocked) {
            return <GLBModel path={M.box} position={[0, 0.12, 0]} scale={0.25} />;
        }
        switch (plot.type) {
            case 'forest':
                return (
                    <>
                        <GLBModel path={M.pineA} position={[-0.08, 0.12, -0.02]} scale={0.25} />
                        <GLBModel path={M.pineSmallA} position={[0.1, 0.1, 0.06]} scale={0.2} />
                        <GLBModel path={M.bushSmall} position={[0.02, 0.1, 0.12]} scale={0.18} />
                    </>
                );
            case 'mine':
                return (
                    <>
                        <GLBModel path={M.rockLargeA} position={[-0.06, 0.1, 0]} scale={0.2} />
                        <GLBModel path={M.stoneLargeA} position={[0.08, 0.1, 0.04]} scale={0.15} />
                    </>
                );
            case 'market':
                return <GLBModel path={M.stall} position={[0, 0.1, 0]} scale={0.14} />;
            case 'academy':
                return <GLBModel path={M.windmill} position={[0, 0.1, 0]} scale={0.12} />;
            case 'storage':
                return (
                    <>
                        <GLBModel path={M.chest} position={[-0.06, 0.1, 0]} scale={0.3} />
                        <GLBModel path={M.barrel} position={[0.08, 0.1, 0.04]} scale={0.25} />
                    </>
                );
            case 'adventure':
                return (
                    <>
                        <GLBModel path={M.tent} position={[0, 0.1, 0]} scale={0.25} />
                        <GLBModel path={M.campfirePit} position={[0.15, 0.1, 0.1]} scale={0.2} />
                    </>
                );
            default:
                return null;
        }
    }, [plot.unlocked, plot.type]);

    return (
        <group
            position={plot.position}
            onClick={() => onSelect?.(plot.key)}
            onPointerOver={() => {
                if (typeof document !== 'undefined') document.body.style.cursor = 'pointer';
            }}
            onPointerOut={() => {
                if (typeof document !== 'undefined') document.body.style.cursor = 'default';
            }}
        >
            <Float speed={1.3} rotationIntensity={0.08} floatIntensity={0.08}>
                {isSelected && (
                    <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.5, 0.03, 10, 26]} />
                        <meshStandardMaterial color={highlightColor} emissive={highlightColor} emissiveIntensity={0.35} />
                    </mesh>
                )}
                {/* Island base using platformer grass block */}
                <GLBModel path={M.blockGrass} position={[0, 0, 0]} scale={0.7} />
                {/* Sign */}
                <GLBModel path={M.sign} position={[0, 0.14, 0.4]} scale={0.22} />
                {/* Plot-specific decoration */}
                {plotDecoration}
            </Float>
        </group>
    );
}

/**
 * 基礎 3D 懸浮島嶼元件
 * 這是計畫中的第一階段原型：建立一個可縮放、旋轉的基礎場景
 */
export function World3D({
    islandLevel = 1,
    heroLevel = 1,
    timeOfDay = 'day',
    selectedPlotKey,
    onPlotSelect,
    adventureStatus = 'idle',
    lastAdventureEventType = null,
    lastAdventureRewards = null,
    buildings,
    fullScreen = false,
}: World3DProps) {
    const forestLv = buildings?.forest ?? 1;
    const mineLv = buildings?.mine ?? 1;
    const academyLv = buildings?.academy ?? 1;
    const marketLv = buildings?.market ?? 1;

    const islandScale = Math.min(1 + Math.max(0, islandLevel - 1) * 0.12, 2.2);
    const orbitMaxDistance = Math.min(12 + islandLevel * 0.25, 18);
    const treeCount = Math.min(1 + Math.floor(forestLv / 2), 7);
    const rockCount = Math.min(1 + Math.floor(mineLv / 2), 6);
    const towerHeight = 0.28 + academyLv * 0.08;
    const marketStands = Math.min(1 + Math.floor(marketLv / 2), 4);
    const floatingTiles = Math.min(Math.max(0, islandLevel - 1), 6);
    const fireflyCount = Math.min(4 + Math.floor((forestLv + academyLv) / 2), 12);
    const forestStage = forestLv >= 6 ? 3 : forestLv >= 3 ? 2 : 1;
    const mineStage = mineLv >= 6 ? 3 : mineLv >= 3 ? 2 : 1;
    const academyStage = academyLv >= 6 ? 3 : academyLv >= 3 ? 2 : 1;
    const marketStage = marketLv >= 6 ? 3 : marketLv >= 3 ? 2 : 1;
    const isDusk = timeOfDay === 'dusk';
    const shellBackground = isDusk
        ? 'linear-gradient(180deg, rgba(251,191,36,0.18) 0%, rgba(125,211,252,0.1) 32%, rgba(30,41,59,0.3) 100%)'
        : 'rgba(191, 219, 254, 0.35)';
    const ambientIntensity = isDusk ? 0.4 : 0.55;
    const hemisphereSky = isDusk ? '#fdba74' : '#dbeafe';
    const hemisphereGround = isDusk ? '#7c3aed' : '#9ca3af';
    const sunColor = isDusk ? '#fb923c' : '#ffffff';
    const pointColor = isDusk ? '#f59e0b' : '#c4b5fd';
    const pointIntensity = isDusk ? 0.54 : 0.38;
    const environmentPreset = isDusk ? 'sunset' : 'forest';
    const plotDefinitions = useMemo<PlotData[]>(() => {
        const order: Array<{ type: PlotType; label: string; level: number; unlockAt: number; position: [number, number, number] }> = [
            { type: 'forest', label: '森林地塊', level: forestLv, unlockAt: 2, position: [2.2, -0.05, 3.2] },
            { type: 'mine', label: '礦山地塊', level: mineLv, unlockAt: 3, position: [3.8, 0.05, 0.0] },
            { type: 'market', label: '商業地塊', level: marketLv, unlockAt: 4, position: [-2.2, 0.0, 3.2] },
            { type: 'academy', label: '訓練地塊', level: academyLv, unlockAt: 5, position: [-3.8, 0.1, 0.0] },
            { type: 'storage', label: '倉儲地塊', level: islandLevel, unlockAt: 6, position: [1.9, -0.08, -3.3] },
            { type: 'adventure', label: '冒險地塊', level: heroLevel, unlockAt: 7, position: [-1.9, 0.02, -3.3] },
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
    }, [academyLv, forestLv, heroLevel, islandLevel, marketLv, mineLv]);
    const unlockedPlots = plotDefinitions.filter((plot) => plot.unlocked);
    const resourceFlowStart: Record<string, [number, number, number]> = {
        forest: [2.2, 0.25, 3.2],
        mine: [3.8, 0.35, 0.0],
        market: [-2.2, 0.3, 3.2],
        academy: [-3.8, 0.4, 0.0],
        storage: [1.9, 0.22, -3.3],
        adventure: [-1.9, 0.32, -3.3],
    };
    const hubTarget: [number, number, number] = [0, 0.25, 0.15];
    const routeTargets: Partial<Record<PlotType, [number, number, number]>> = {
        forest: [-0.35, 0.16, 0.55],
        mine: [0.45, 0.16, 0.28],
        market: [-0.85, 0.18, 0.92],
        academy: [0.08, 0.52, 0.04],
        storage: [0.22, 0.16, 1.08],
        adventure: [0.96, 0.38, -0.55],
    };
    const adventureOrigin = resourceFlowStart.adventure;
    const adventureDestination: [number, number, number] = [-2.5, 1.5, -5.5];
    const adventureEventColorMap: Record<AdventureEventType, string> = {
        chest: '#fbbf24',
        lost: '#94a3b8',
        monster: '#ef4444',
        npc: '#22c55e',
        weather: '#38bdf8',
    };
    const adventureEventColor = lastAdventureEventType ? adventureEventColorMap[lastAdventureEventType] : '#a78bfa';
    const adventureRewardOrbs = useMemo(() => {
        if (!lastAdventureRewards) return [];

        const rewards = [
            lastAdventureRewards.wood > 0 ? { key: 'wood', color: '#4ade80' } : null,
            lastAdventureRewards.stone > 0 ? { key: 'stone', color: '#cbd5e1' } : null,
            lastAdventureRewards.crystal > 0 ? { key: 'crystal', color: '#7c3aed' } : null,
            lastAdventureRewards.monsterShards > 0 ? { key: 'monsterShards', color: '#ec4899' } : null,
        ].filter(Boolean) as Array<{ key: string; color: string }>;

        return rewards;
    }, [lastAdventureRewards]);

    const containerClass = fullScreen
        ? 'w-full h-full overflow-hidden relative'
        : 'w-full h-[400px] rounded-2xl border-4 border-deep-black overflow-hidden relative shadow-clay';

    return (
        <div className={containerClass} style={{ background: shellBackground }}>
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={fullScreen ? 45 : 50} />
                <OrbitControls
                    enablePan={false}
                    minDistance={3}
                    maxDistance={orbitMaxDistance}
                    makeDefault
                />

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
                    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                        <group scale={[islandScale, islandScale, islandScale]}>
                            {/* ── Main island base (mixed: grass top + rocky cliffs) ── */}
                            <group>
                                {/* Top grass platform layer */}
                                <GLBModel path={M.blockGrassLarge} position={[0, 0, 0]} scale={2.0} />
                                <GLBModel path={M.blockGrass} position={[1.6, -0.05, 0]} scale={1.5} />
                                <GLBModel path={M.blockGrass} position={[-1.6, -0.05, 0]} scale={1.5} />
                                <GLBModel path={M.blockGrass} position={[0, -0.05, 1.6]} scale={1.5} />
                                <GLBModel path={M.blockGrass} position={[0, -0.05, -1.6]} scale={1.5} />
                                <GLBModel path={M.blockGrass} position={[1.1, -0.03, 1.1]} scale={1.3} />
                                <GLBModel path={M.blockGrass} position={[-1.1, -0.03, 1.1]} scale={1.3} />
                                <GLBModel path={M.blockGrass} position={[1.1, -0.03, -1.1]} scale={1.3} />
                                <GLBModel path={M.blockGrass} position={[-1.1, -0.03, -1.1]} scale={1.3} />
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
                                    <meshStandardMaterial color="#bfdbfe" transparent opacity={0.45} />
                                </mesh>
                            </group>

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

                            {/* ── Academy tower (dynamic height stays procedural) ── */}
                            <group>
                                <mesh position={[0, 0.06, 0]} castShadow>
                                    <cylinderGeometry args={[0.22, 0.26, 0.1, 8]} />
                                    <meshStandardMaterial color="#ddd6fe" flatShading />
                                </mesh>
                                <mesh position={[0, 0.18 + towerHeight / 2, 0]} castShadow>
                                    <cylinderGeometry args={[0.12, 0.16, towerHeight, 6]} />
                                    <meshStandardMaterial color="#7E57C2" flatShading />
                                </mesh>
                                <mesh position={[0, 0.24 + towerHeight, 0]} castShadow>
                                    <coneGeometry args={[0.15, 0.18, 6]} />
                                    <meshStandardMaterial color="#B39DDB" emissive="#8b5cf6" emissiveIntensity={0.22} flatShading />
                                </mesh>
                                {academyStage >= 2 && (
                                    <GLBModel path={M.windmill} position={[0.35, 0.04, -0.2]} scale={0.18} rotation={[0, -0.3, 0]} />
                                )}
                                {academyStage >= 3 && (
                                    <>
                                        <GLBModel path={M.bannerGreen} position={[0.2, 0.2, 0.15]} scale={0.2} />
                                        <GLBModel path={M.bannerGreen} position={[-0.2, 0.2, -0.15]} scale={0.2} rotation={[0, Math.PI, 0]} />
                                    </>
                                )}
                            </group>

                            {/* ── Market stalls ── */}
                            <group>
                                {(() => {
                                    const stallModels = [M.stall, M.stallGreen, M.stallRed];
                                    return Array.from({ length: marketStands }).map((_, i) => (
                                        <GLBModel
                                            key={`stall-${i}`}
                                            path={stallModels[i % stallModels.length]}
                                            position={[-0.9 + i * 0.35, 0.04, 0.92]}
                                            scale={0.2}
                                            rotation={[0, (i % 2 === 0 ? 0 : Math.PI), 0]}
                                        />
                                    ));
                                })()}
                                <GLBModel path={M.lantern} position={[-1.05, 0.04, 0.85]} scale={0.22} />
                                {marketStage >= 2 && (
                                    <GLBModel path={M.lantern} position={[0.15, 0.04, 0.85]} scale={0.22} />
                                )}
                                {marketStage >= 3 && (
                                    <GLBModel path={M.fountain} position={[-0.35, 0.04, 1.15]} scale={0.18} />
                                )}
                            </group>

                            {/* ── Scattered decorations ── */}
                            <GLBModel path={M.grass} position={[0.6, 0.02, -0.3]} scale={0.3} />
                            <GLBModel path={M.grass} position={[-0.4, 0.02, 0.5]} scale={0.25} />
                            <GLBModel path={M.flowerRed} position={[1.2, 0.02, 0.6]} scale={0.25} />
                            <GLBModel path={M.flowerYellow} position={[-1.0, 0.02, -0.8]} scale={0.25} />
                            <GLBModel path={M.flowerPurple} position={[0.3, 0.02, -1.2]} scale={0.2} />

                            {/* ── Floating side islands (intermediate ring between main & plots) ── */}
                            {Array.from({ length: floatingTiles }).map((_, i) => {
                                const a = (i / Math.max(1, floatingTiles)) * Math.PI * 2 + Math.PI / floatingTiles;
                                const r = 2.8;
                                const x = Math.cos(a) * r;
                                const z = Math.sin(a) * r;
                                const yOff = 0.05 + (i % 3) * 0.08;
                                return (
                                    <group key={`tile-${i}`} position={[x, yOff, z]}>
                                        <GLBModel path={M.blockGrass} position={[0, 0, 0]} scale={0.55} />
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

                            {plotDefinitions.map((plot) => (
                                <PlotIsland
                                    key={plot.key}
                                    plot={plot}
                                    isDusk={isDusk}
                                    isSelected={selectedPlotKey === plot.key}
                                    onSelect={onPlotSelect}
                                />
                            ))}

                            {unlockedPlots.flatMap((plot, index) => {
                                const workerCount = Math.min(3, 1 + Math.floor(Math.max(0, plot.level - 1) / 2));
                                return Array.from({ length: workerCount }).map((_, workerIndex) => (
                                    <PlotWorker
                                        key={`worker-${plot.key}-${workerIndex}`}
                                        type={plot.type}
                                        isDusk={isDusk}
                                        position={[
                                            plot.position[0] + (workerIndex - (workerCount - 1) / 2) * 0.11,
                                            plot.position[1] + 0.22 + (index % 2) * 0.015,
                                            plot.position[2] + (workerIndex % 2 === 0 ? -0.04 : 0.06),
                                        ]}
                                    />
                                ));
                            })}

                            {unlockedPlots
                                .filter((plot) => ['forest', 'mine', 'market', 'storage'].includes(plot.type))
                                .flatMap((plot) => {
                                    const orbCount = Math.min(3, 1 + Math.floor(Math.max(0, plot.level - 1) / 3));
                                    const to = routeTargets[plot.type] ?? hubTarget;
                                    const color = plot.type === 'forest' ? '#4ade80' : plot.type === 'mine' ? '#7dd3fc' : plot.type === 'storage' ? '#fef08a' : '#f59e0b';
                                    return Array.from({ length: orbCount }).map((_, orbIndex) => (
                                        <ResourceOrb
                                            key={`orb-${plot.key}-${orbIndex}`}
                                            from={[
                                                resourceFlowStart[plot.type][0] + orbIndex * 0.04,
                                                resourceFlowStart[plot.type][1] + (orbIndex % 2) * 0.03,
                                                resourceFlowStart[plot.type][2] - orbIndex * 0.03,
                                            ]}
                                            to={[
                                                to[0] + orbIndex * 0.02,
                                                to[1] + (orbIndex % 2) * 0.03,
                                                to[2] - orbIndex * 0.02,
                                            ]}
                                            color={color}
                                        />
                                    ));
                                })}

                            <AdventureScout
                                from={adventureOrigin}
                                to={adventureDestination}
                                isActive={adventureStatus === 'running'}
                                isDusk={isDusk}
                            />

                            <AdventureBeacon
                                position={[adventureOrigin[0], adventureOrigin[1] + 0.24, adventureOrigin[2]]}
                                color={adventureStatus === 'completed' || adventureStatus === 'claimed' ? adventureEventColor : '#818cf8'}
                                active={adventureStatus === 'completed' || adventureStatus === 'claimed'}
                            />

                            {adventureRewardOrbs.map((reward, orbIndex) => (
                                <ResourceOrb
                                    key={`adventure-reward-${reward.key}`}
                                    from={[
                                        adventureOrigin[0] + orbIndex * 0.05,
                                        adventureOrigin[1] + 0.08 + (orbIndex % 2) * 0.03,
                                        adventureOrigin[2] - orbIndex * 0.04,
                                    ]}
                                    to={[
                                        hubTarget[0] + orbIndex * 0.05,
                                        hubTarget[1] + 0.04 + (orbIndex % 2) * 0.04,
                                        hubTarget[2] - orbIndex * 0.05,
                                    ]}
                                    color={reward.color}
                                />
                            ))}

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
                                            <meshStandardMaterial color="#fef08a" emissive="#fde047" emissiveIntensity={0.55} />
                                        </mesh>
                                    </Float>
                                );
                            })}

                            {/* hero icon：角色等級越高，旗幟越大 */}
                            <GLBModel
                                path={M.signpost}
                                position={[0.88, 0.15, -0.55]}
                                scale={0.22 + heroLevel * 0.008}
                            />
                        </group>
                    </Float>

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
                <div className="absolute top-4 left-4 font-pixel text-xs bg-white/80 p-2 border-2 border-deep-black pointer-events-none">
                    3D 世界 V2.0 - 冒險家家園
                </div>
            )}
            <div className={`absolute ${fullScreen ? 'top-16 sm:top-4' : 'top-4'} right-4 font-pixel text-[10px] sm:text-xs bg-white/85 p-2 border border-slate-300 rounded pointer-events-none text-slate-700`}>
                {isDusk ? '黃昏' : '白天'}｜島 Lv.{islandLevel}｜角色 Lv.{heroLevel}
            </div>
            <div className={`absolute ${fullScreen ? 'bottom-6 sm:bottom-4' : 'bottom-4'} left-4 font-pixel text-[10px] bg-white/80 px-2 py-1 border border-slate-300 rounded pointer-events-none text-slate-700`}>
                功能地塊 {unlockedPlots.length}/{plotDefinitions.length}
                <span className="hidden sm:inline">｜小精靈與工人正在搬運資源</span>
            </div>
            <div className={`absolute ${fullScreen ? 'bottom-12 sm:bottom-12' : 'bottom-12'} left-4 font-pixel text-[10px] bg-white/80 px-2 py-1 border border-slate-300 rounded pointer-events-none text-slate-700 hidden sm:block`}>
                冒險狀態 {adventureStatus}{lastAdventureEventType ? `｜事件 ${lastAdventureEventType}` : ''}
            </div>
            <div className="absolute bottom-4 right-4 font-pixel text-[10px] text-gray-500 pointer-events-none hidden sm:block">
                拖越轉動 / 滾輪縮放
            </div>
        </div>
    );
}
