import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Float, Environment, ContactShadows } from '@react-three/drei';

/**
 * 基礎 3D 懸浮島嶼元件
 * 這是計畫中的第一階段原型：建立一個可縮放、旋轉的基礎場景
 */
export function World3D() {
    return (
        <div className="w-full h-[400px] bg-sky-200/50 rounded-2xl border-4 border-deep-black overflow-hidden relative shadow-clay">
            <Canvas shadows>
                <PerspectiveCamera makeDefault position={[5, 5, 5]} fov={50} />
                <OrbitControls
                    enablePan={false}
                    minDistance={3}
                    maxDistance={10}
                    makeDefault
                />

                {/* 環境光設計 */}
                <ambientLight intensity={0.7} />
                <directionalLight
                    position={[10, 10, 5]}
                    intensity={1.2}
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                />

                <Suspense fallback={null}>
                    {/* 第一階段：使用基礎幾何體模擬「懸浮小島」 */}
                    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
                        <group>
                            {/* 島嶼主體 */}
                            <mesh receiveShadow castShadow position={[0, -0.5, 0]}>
                                <cylinderGeometry args={[2, 1.5, 0.8, 6]} />
                                <meshStandardMaterial color="#4CAF50" flatShading />
                            </mesh>

                            {/* 岩石層 */}
                            <mesh receiveShadow castShadow position={[0, -1, 0]}>
                                <cylinderGeometry args={[1.5, 1, 0.5, 6]} />
                                <meshStandardMaterial color="#78909C" flatShading />
                            </mesh>

                            {/* 模擬樹木裝飾 */}
                            <mesh position={[0.8, 0.3, 0.5]} castShadow>
                                <coneGeometry args={[0.3, 0.8, 5]} />
                                <meshStandardMaterial color="#2E7D32" flatShading />
                            </mesh>
                            <mesh position={[-0.5, 0.2, -0.8]} castShadow>
                                <coneGeometry args={[0.2, 0.5, 5]} />
                                <meshStandardMaterial color="#388E3C" flatShading />
                            </mesh>
                        </group>
                    </Float>

                    <Environment preset="forest" />
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
                3D 世界原型 V1.0 - 冒險家家園
            </div>
            <div className="absolute bottom-4 right-4 font-pixel text-[10px] text-gray-500 pointer-events-none">
                拖越轉動 / 滾輪縮放
            </div>
        </div>
    );
}
