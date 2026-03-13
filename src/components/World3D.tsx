import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Environment, ContactShadows } from '@react-three/drei';
import type { Group } from 'three';
import type { AdventureEventType, AdventureRewards, AdventureStatus } from '../lib/world/adventure';

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

    useFrame((state) => {
        if (!groupRef.current) return;
        const t = state.clock.getElapsedTime();
        groupRef.current.position.x = position[0] + Math.sin(t * 1.4 + position[0] * 2) * 0.06;
        groupRef.current.position.y = position[1] + Math.sin(t * 2.2 + position[2]) * 0.035;
        groupRef.current.position.z = position[2] + Math.cos(t * 1.4 + position[2] * 2) * 0.06;
        groupRef.current.rotation.y = Math.sin(t * 1.1 + position[0]) * 0.6;
    });

    const bodyColor = type === 'mine' ? '#f59e0b' : type === 'market' ? '#f43f5e' : '#60a5fa';
    const glowColor = isDusk ? '#fde68a' : '#bfdbfe';

    return (
        <group ref={groupRef} position={position}>
            <mesh castShadow position={[0, 0.08, 0]}>
                <sphereGeometry args={[0.045, 10, 10]} />
                <meshStandardMaterial color="#fde68a" flatShading />
            </mesh>
            <mesh castShadow position={[0, 0.03, 0]}>
                <capsuleGeometry args={[0.03, 0.08, 4, 8]} />
                <meshStandardMaterial color={bodyColor} flatShading />
            </mesh>
            <mesh position={[0.05, 0.13, 0.02]}>
                <sphereGeometry args={[0.014, 8, 8]} />
                <meshStandardMaterial color={glowColor} emissive={glowColor} emissiveIntensity={0.45} />
            </mesh>
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
            <mesh castShadow>
                <capsuleGeometry args={[0.04, 0.14, 4, 8]} />
                <meshStandardMaterial color={isDusk ? '#fca5a5' : '#f87171'} flatShading />
            </mesh>
            <mesh position={[0, 0.08, -0.06]} castShadow>
                <coneGeometry args={[0.05, 0.12, 4]} />
                <meshStandardMaterial color="#fde68a" flatShading />
            </mesh>
            <mesh position={[0, 0.02, 0.08]}>
                <sphereGeometry args={[0.03, 8, 8]} />
                <meshStandardMaterial color="#93c5fd" emissive="#60a5fa" emissiveIntensity={0.45} />
            </mesh>
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
    const baseColor = plot.unlocked ? '#a7d8b1' : '#cbd5e1';
    const stemColor = plot.unlocked ? '#63a869' : '#94a3b8';
    const signColor = plot.unlocked ? '#f8fafc' : '#e2e8f0';
    const labelColor = plot.unlocked ? '#334155' : '#64748b';
    const highlightColor = plot.unlocked ? '#fbbf24' : '#94a3b8';

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
                <mesh castShadow receiveShadow>
                    <cylinderGeometry args={[0.58, 0.42, 0.22, 6]} />
                    <meshStandardMaterial color={baseColor} flatShading />
                </mesh>
                <mesh position={[0, -0.12, 0]} castShadow>
                    <cylinderGeometry args={[0.3, 0.22, 0.14, 6]} />
                    <meshStandardMaterial color={stemColor} flatShading />
                </mesh>
                <mesh position={[0, 0.18, 0.46]} castShadow>
                    <boxGeometry args={[0.32, 0.14, 0.04]} />
                    <meshStandardMaterial color={signColor} flatShading />
                </mesh>
                <mesh position={[0, 0.18, 0.485]}>
                    <boxGeometry args={[0.24, 0.02, 0.01]} />
                    <meshStandardMaterial color={labelColor} flatShading />
                </mesh>

                {plot.unlocked ? (
                    <>
                        {plot.type === 'forest' && (
                            <>
                                <mesh position={[-0.1, 0.14, -0.03]} castShadow>
                                    <coneGeometry args={[0.12, 0.28, 6]} />
                                    <meshStandardMaterial color="#2f8f45" flatShading />
                                </mesh>
                                <mesh position={[0.12, 0.11, 0.08]} castShadow>
                                    <coneGeometry args={[0.09, 0.2, 6]} />
                                    <meshStandardMaterial color="#1f7a39" flatShading />
                                </mesh>
                            </>
                        )}
                        {plot.type === 'mine' && (
                            <>
                                <mesh position={[-0.08, 0.08, 0]} castShadow>
                                    <dodecahedronGeometry args={[0.09, 0]} />
                                    <meshStandardMaterial color="#94a3b8" flatShading />
                                </mesh>
                                <mesh position={[0.06, 0.16, 0.02]} castShadow>
                                    <octahedronGeometry args={[0.08, 0]} />
                                    <meshStandardMaterial color="#7dd3fc" emissive="#22d3ee" emissiveIntensity={isDusk ? 0.7 : 0.35} flatShading />
                                </mesh>
                            </>
                        )}
                        {plot.type === 'market' && (
                            <>
                                <mesh position={[0, 0.08, 0]} castShadow>
                                    <boxGeometry args={[0.18, 0.12, 0.14]} />
                                    <meshStandardMaterial color="#8D6E63" flatShading />
                                </mesh>
                                <mesh position={[0, 0.18, 0]} castShadow>
                                    <coneGeometry args={[0.14, 0.12, 4]} />
                                    <meshStandardMaterial color="#fb923c" flatShading />
                                </mesh>
                            </>
                        )}
                        {plot.type === 'academy' && (
                            <>
                                <mesh position={[0, 0.12, 0]} castShadow>
                                    <cylinderGeometry args={[0.08, 0.1, 0.28, 6]} />
                                    <meshStandardMaterial color="#7E57C2" flatShading />
                                </mesh>
                                <mesh position={[0, 0.32, 0]} castShadow>
                                    <coneGeometry args={[0.1, 0.12, 6]} />
                                    <meshStandardMaterial color="#c4b5fd" emissive="#8b5cf6" emissiveIntensity={0.25} flatShading />
                                </mesh>
                            </>
                        )}
                        {plot.type === 'storage' && (
                            <>
                                <mesh position={[0, 0.08, 0]} castShadow>
                                    <boxGeometry args={[0.18, 0.14, 0.16]} />
                                    <meshStandardMaterial color="#c08457" flatShading />
                                </mesh>
                                <mesh position={[0, 0.18, 0]} castShadow>
                                    <boxGeometry args={[0.12, 0.05, 0.04]} />
                                    <meshStandardMaterial color="#fef08a" flatShading />
                                </mesh>
                            </>
                        )}
                        {plot.type === 'adventure' && (
                            <>
                                <mesh position={[0, 0.12, 0]} castShadow>
                                    <boxGeometry args={[0.04, 0.28, 0.04]} />
                                    <meshStandardMaterial color="#475569" flatShading />
                                </mesh>
                                <mesh position={[0.08, 0.2, 0]} castShadow>
                                    <boxGeometry args={[0.18, 0.1, 0.02]} />
                                    <meshStandardMaterial color="#ef4444" flatShading />
                                </mesh>
                            </>
                        )}
                    </>
                ) : (
                    <mesh position={[0, 0.1, 0]} castShadow>
                        <boxGeometry args={[0.16, 0.08, 0.16]} />
                        <meshStandardMaterial color="#cbd5e1" flatShading />
                    </mesh>
                )}
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
            { type: 'forest', label: '森林地塊', level: forestLv, unlockAt: 2, position: [-2.55, -0.92, 1.45] },
            { type: 'mine', label: '礦山地塊', level: mineLv, unlockAt: 3, position: [2.6, -0.88, 1.52] },
            { type: 'market', label: '商業地塊', level: marketLv, unlockAt: 4, position: [-2.45, -0.8, -1.68] },
            { type: 'academy', label: '訓練地塊', level: academyLv, unlockAt: 5, position: [2.45, -0.76, -1.74] },
            { type: 'storage', label: '倉儲地塊', level: islandLevel, unlockAt: 6, position: [0.15, -0.98, 2.75] },
            { type: 'adventure', label: '冒險地塊', level: heroLevel, unlockAt: 7, position: [0.25, -0.9, -2.95] },
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
        forest: [-2.55, -0.62, 1.45],
        mine: [2.6, -0.58, 1.52],
        market: [-2.45, -0.5, -1.68],
        academy: [2.45, -0.48, -1.74],
        storage: [0.15, -0.68, 2.75],
        adventure: [0.25, -0.6, -2.95],
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
    const adventureDestination: [number, number, number] = [0.15, 1.25, -4.45];
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

    return (
        <div className="w-full h-[400px] rounded-2xl border-4 border-deep-black overflow-hidden relative shadow-clay" style={{ background: shellBackground }}>
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} />
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
                    {/* 依等級動態擴建的懸浮小島 */}
                    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                        <group scale={[islandScale, islandScale, islandScale]}>
                            {/* 島嶼主體 */}
                            <mesh receiveShadow castShadow position={[0, -0.5, 0]}>
                                <cylinderGeometry args={[2, 1.5, 0.8, 6]} />
                                <meshStandardMaterial color="#42a846" flatShading />
                            </mesh>

                            {/* 島嶼草皮層 */}
                            <mesh receiveShadow castShadow position={[0, -0.05, 0]}>
                                <cylinderGeometry args={[2.02, 2.02, 0.08, 6]} />
                                <meshStandardMaterial color="#9dd7a9" flatShading />
                            </mesh>

                            {/* 岩石層 */}
                            <mesh receiveShadow castShadow position={[0, -1, 0]}>
                                <cylinderGeometry args={[1.5, 1, 0.5, 6]} />
                                <meshStandardMaterial color="#78909C" flatShading />
                            </mesh>

                            {/* 島嶼雲環 */}
                            <mesh position={[0, -1.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                                <torusGeometry args={[2.1, 0.08, 8, 28]} />
                                <meshStandardMaterial color="#bfdbfe" transparent opacity={0.55} />
                            </mesh>

                            {forestStage >= 2 && (
                                <mesh position={[0.95, 0.03, 0.15]} rotation={[0, -0.35, 0]} castShadow>
                                    <boxGeometry args={[0.28, 0.06, 0.16]} />
                                    <meshStandardMaterial color="#c08a4b" flatShading />
                                </mesh>
                            )}
                            {forestStage >= 3 && (
                                <group position={[1.1, 0.08, -0.3]}>
                                    <mesh castShadow>
                                        <cylinderGeometry args={[0.05, 0.06, 0.2, 6]} />
                                        <meshStandardMaterial color="#8d6e63" flatShading />
                                    </mesh>
                                    <mesh position={[0, 0.16, 0]} castShadow>
                                        <sphereGeometry args={[0.13, 10, 10]} />
                                        <meshStandardMaterial color="#4ade80" flatShading />
                                    </mesh>
                                </group>
                            )}

                            {/* forest 建築：樹林數量會成長 */}
                            {Array.from({ length: treeCount }).map((_, i) => {
                                const a = (i / Math.max(1, treeCount)) * Math.PI * 2;
                                const r = 0.75 + (i % 2) * 0.22;
                                const x = Math.cos(a) * r;
                                const z = Math.sin(a) * r;
                                const size = 0.18 + (i % 3) * 0.05;
                                return (
                                    <group key={`tree-${i}`} position={[x, 0.06, z]}>
                                        <mesh castShadow position={[0, 0.1, 0]}>
                                            <cylinderGeometry args={[0.04, 0.05, 0.18, 6]} />
                                            <meshStandardMaterial color="#8d6e63" flatShading />
                                        </mesh>
                                        <mesh castShadow position={[0, 0.25, 0]}>
                                            <coneGeometry args={[size, 0.3 + size * 0.35, 6]} />
                                            <meshStandardMaterial color="#2f8f45" flatShading />
                                        </mesh>
                                        <mesh castShadow position={[0, 0.39, 0]}>
                                            <coneGeometry args={[size * 0.72, 0.22 + size * 0.24, 6]} />
                                            <meshStandardMaterial color="#1f7a39" flatShading />
                                        </mesh>
                                        {forestStage >= 3 && i % 2 === 0 && (
                                            <mesh castShadow position={[0.08, 0.26, 0.02]}>
                                                <sphereGeometry args={[0.04, 8, 8]} />
                                                <meshStandardMaterial color="#f87171" flatShading />
                                            </mesh>
                                        )}
                                    </group>
                                );
                            })}

                            {/* mine 建築：礦石節點會增加 */}
                            {Array.from({ length: rockCount }).map((_, i) => {
                                const a = (i / Math.max(1, rockCount)) * Math.PI * 2 + 0.4;
                                const r = 0.55 + (i % 2) * 0.25;
                                const x = Math.cos(a) * r;
                                const z = Math.sin(a) * r;
                                return (
                                    <group key={`rock-${i}`} position={[x, 0.03, z]}>
                                        <mesh castShadow position={[0, 0.04, 0]}>
                                            <dodecahedronGeometry args={[0.08 + (i % 2) * 0.02, 0]} />
                                            <meshStandardMaterial color="#94a3b8" flatShading />
                                        </mesh>
                                        <mesh castShadow position={[0.03, 0.1, -0.01]}>
                                            <octahedronGeometry args={[0.06 + (i % 2) * 0.02, 0]} />
                                            <meshStandardMaterial
                                                color={i % 2 === 0 ? '#7dd3fc' : '#c4b5fd'}
                                                emissive={i % 2 === 0 ? '#22d3ee' : '#a78bfa'}
                                                emissiveIntensity={0.35}
                                                flatShading
                                            />
                                        </mesh>
                                        {mineStage >= 2 && (
                                            <mesh castShadow position={[-0.04, 0.02, 0.03]} rotation={[0, 0.3, 0]}>
                                                <boxGeometry args={[0.1, 0.03, 0.06]} />
                                                <meshStandardMaterial color="#7c5c3f" flatShading />
                                            </mesh>
                                        )}
                                    </group>
                                );
                            })}

                            {mineStage >= 3 && (
                                <group position={[-0.62, 0.05, -0.72]}>
                                    <mesh castShadow rotation={[0, Math.PI / 6, 0]}>
                                        <boxGeometry args={[0.22, 0.12, 0.14]} />
                                        <meshStandardMaterial color="#64748b" flatShading />
                                    </mesh>
                                    <mesh position={[0, 0.12, 0]} castShadow>
                                        <cylinderGeometry args={[0.02, 0.02, 0.18, 6]} />
                                        <meshStandardMaterial color="#475569" flatShading />
                                    </mesh>
                                    <mesh position={[0.05, 0.18, 0]} castShadow rotation={[0, 0, -0.7]}>
                                        <boxGeometry args={[0.12, 0.03, 0.03]} />
                                        <meshStandardMaterial color="#f59e0b" flatShading />
                                    </mesh>
                                </group>
                            )}

                            {/* academy 建築：中央訓練塔會長高 */}
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
                                    <mesh position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
                                        <torusGeometry args={[0.23, 0.02, 8, 24]} />
                                        <meshStandardMaterial color="#f5d0fe" emissive="#e879f9" emissiveIntensity={0.18} />
                                    </mesh>
                                )}
                                {academyStage >= 3 && (
                                    <>
                                        <mesh position={[0.18, 0.18, 0.12]} castShadow>
                                            <boxGeometry args={[0.08, 0.18, 0.08]} />
                                            <meshStandardMaterial color="#c4b5fd" flatShading />
                                        </mesh>
                                        <mesh position={[-0.18, 0.18, -0.12]} castShadow>
                                            <boxGeometry args={[0.08, 0.18, 0.08]} />
                                            <meshStandardMaterial color="#c4b5fd" flatShading />
                                        </mesh>
                                    </>
                                )}
                            </group>

                            {/* market 建築：攤位數量增加 */}
                            {Array.from({ length: marketStands }).map((_, i) => (
                                <group key={`market-${i}`} position={[-0.9 + i * 0.28, 0.08, 0.92]}>
                                    <mesh castShadow>
                                        <boxGeometry args={[0.17, 0.12, 0.14]} />
                                        <meshStandardMaterial color="#8D6E63" flatShading />
                                    </mesh>
                                    <mesh position={[0, 0.12, 0]} castShadow>
                                        <coneGeometry args={[0.12, 0.1, 4]} />
                                        <meshStandardMaterial color={i % 2 === 0 ? '#fb923c' : '#f43f5e'} flatShading />
                                    </mesh>
                                    <mesh position={[0, 0.16, 0]} castShadow>
                                        <boxGeometry args={[0.14, 0.02, 0.12]} />
                                        <meshStandardMaterial color="#fef3c7" flatShading />
                                    </mesh>
                                    {marketStage >= 2 && (
                                        <mesh position={[0.05, 0.03, 0.06]} castShadow>
                                            <boxGeometry args={[0.04, 0.04, 0.04]} />
                                            <meshStandardMaterial color="#22c55e" flatShading />
                                        </mesh>
                                    )}
                                </group>
                            ))}

                            {marketStage >= 3 && (
                                <group position={[-0.35, 0.11, 1.02]}>
                                    <mesh castShadow>
                                        <boxGeometry args={[0.32, 0.16, 0.18]} />
                                        <meshStandardMaterial color="#a16207" flatShading />
                                    </mesh>
                                    <mesh position={[0, 0.13, 0]} castShadow>
                                        <coneGeometry args={[0.22, 0.16, 4]} />
                                        <meshStandardMaterial color="#f43f5e" flatShading />
                                    </mesh>
                                    <mesh position={[0, 0.2, 0.1]} castShadow>
                                        <boxGeometry args={[0.18, 0.05, 0.02]} />
                                        <meshStandardMaterial color="#fef08a" flatShading />
                                    </mesh>
                                </group>
                            )}

                            {/* island 擴建：額外浮空小地塊 */}
                            {Array.from({ length: floatingTiles }).map((_, i) => {
                                const a = (i / Math.max(1, floatingTiles)) * Math.PI * 2;
                                const r = 2.4;
                                const x = Math.cos(a) * r;
                                const z = Math.sin(a) * r;
                                return (
                                    <group key={`tile-${i}`} position={[x, -0.85 + (i % 2) * 0.08, z]}>
                                        <mesh castShadow receiveShadow>
                                            <cylinderGeometry args={[0.55, 0.42, 0.22, 6]} />
                                            <meshStandardMaterial color="#93c5aa" flatShading />
                                        </mesh>
                                        <mesh position={[0, -0.12, 0]} castShadow>
                                            <cylinderGeometry args={[0.32, 0.24, 0.12, 6]} />
                                            <meshStandardMaterial color="#4f9f58" flatShading />
                                        </mesh>
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
                            <mesh position={[0.88, 0.24, -0.55]} castShadow>
                                <cylinderGeometry args={[0.02, 0.02, 0.25 + heroLevel * 0.015, 6]} />
                                <meshStandardMaterial color="#424242" flatShading />
                            </mesh>
                            <mesh position={[0.96, 0.34 + heroLevel * 0.008, -0.55]} castShadow>
                                <boxGeometry args={[0.14 + heroLevel * 0.006, 0.09, 0.02]} />
                                <meshStandardMaterial color="#EF5350" flatShading />
                            </mesh>
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
            <div className="absolute top-4 left-4 font-pixel text-xs bg-white/80 p-2 border-2 border-deep-black pointer-events-none">
                3D 世界原型 V1.1 - 冒險家家園
            </div>
            <div className="absolute top-4 right-4 font-pixel text-[10px] bg-white/85 p-2 border border-slate-300 rounded pointer-events-none text-slate-700">
                {isDusk ? '黃昏' : '白天'}｜島 Lv.{islandLevel}｜角色 Lv.{heroLevel}
            </div>
            <div className="absolute bottom-4 left-4 font-pixel text-[10px] bg-white/80 px-2 py-1 border border-slate-300 rounded pointer-events-none text-slate-700">
                功能地塊 {unlockedPlots.length}/{plotDefinitions.length}｜小精靈與工人正在搬運資源
            </div>
            <div className="absolute bottom-12 left-4 font-pixel text-[10px] bg-white/80 px-2 py-1 border border-slate-300 rounded pointer-events-none text-slate-700">
                冒險狀態 {adventureStatus}{lastAdventureEventType ? `｜事件 ${lastAdventureEventType}` : ''}
            </div>
            <div className="absolute bottom-4 right-4 font-pixel text-[10px] text-gray-500 pointer-events-none">
                拖越轉動 / 滾輪縮放
            </div>
        </div>
    );
}
