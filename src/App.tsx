import React, { useState, useCallback, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import Needle from './components/Needle'
import Arm from './components/Arm'
import SliderControls from './components/SliderControls'

type Phase = 'pre-puncture' | 'punctured' | 'advancing' | 'completed'

// デフォルトの穿刺角度（30度）
const DEFAULT_NEEDLE_ANGLE_DEG = 15

/**
 * カメラコントローラー：断面図視点固定＋ズーム対応
 */
function CameraController({ zoom }: { zoom: number }) {
    const { camera } = useThree()

    useFrame(() => {
        // 断面図視点（腕の横から見る）をベースにズーム適用
        const basePos = new THREE.Vector3(4, 0.5, 2)
        const target = new THREE.Vector3(0, -0.8, 0.5)
        // ズームでカメラを近づける/遠ざける
        const direction = basePos.clone().sub(target).normalize()
        const distance = basePos.distanceTo(target) * zoom
        const pos = target.clone().add(direction.multiplyScalar(distance))
        camera.position.lerp(pos, 0.1)
        camera.lookAt(target)
        camera.updateProjectionMatrix()
    })

    return null
}

/**
 * 3Dシーン
 */
function SimulatorScene({
    needlePos,
    needleRot,
    innerOffset,
    outerOffset,
    phase,
    zoom,
    onPuncture,
}: {
    needlePos: THREE.Vector3
    needleRot: THREE.Euler
    innerOffset: number
    outerOffset: number
    phase: Phase
    zoom: number
    onPuncture: () => void
}) {
    useFrame(() => {
        if (phase !== 'pre-puncture') return
        const tipWorld = needlePos.clone()
        // 腕ワールド座標での静脈位置
        // Arm group: position=[0,-0.8,0], rotation=[0,0,PI/2]
        // 穿刺ガイド local (0.02, 0, 0.63) → world (0, -0.78, 0.63)
        const veinWorldApprox = new THREE.Vector3(0.0, -0.78, 0.55)
        const dist = tipWorld.distanceTo(veinWorldApprox)
        if (dist < 0.5) {
            onPuncture()
        }
    })

    return (
        <>
            <CameraController zoom={zoom} />

            {/* ライティング */}
            <ambientLight intensity={0.3} />
            <directionalLight
                position={[3, 8, 5]}
                intensity={1.2}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-far={20}
                shadow-camera-near={0.1}
            />
            <directionalLight position={[-2, 4, -3]} intensity={0.25} color="#c0d0ff" />
            <pointLight position={[1, 3, 3]} intensity={0.4} color="#fff8e0" distance={10} />
            <hemisphereLight args={['#d0e8ff', '#404040', 0.5]} />

            {/* 腕モデル */}
            <Arm phase={phase} />

            {/* 留置針モデル
        針の構造：
        - 先端（鋭利な金属）= Y=0（モデル原点）→ 穿刺方向の先頭
        - 柄（ハブ・ウイング）= Y=3.3+（モデル上部）→ 術者が持つ側
        穿刺方向：左→右（先端が右を向き、柄が左側に来る）
      */}
            <Needle
                innerOffset={innerOffset}
                outerOffset={outerOffset}
                position={[needlePos.x, needlePos.y, needlePos.z]}
                rotation={[needleRot.x, needleRot.y, needleRot.z]}
                showFlashback={phase === 'punctured'}
            />

            {/* 処置台 */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.3, 0]} receiveShadow>
                <planeGeometry args={[24, 24]} />
                <meshStandardMaterial color="#d5e0d8" roughness={0.95} metalness={0.0} />
            </mesh>

        </>
    )
}

/**
 * メインアプリケーション
 */
function App() {
    const [phase, setPhase] = useState<Phase>('pre-puncture')
    const [innerOffset, setInnerOffset] = useState(0)
    const [outerOffset, setOuterOffset] = useState(0)
    const [zoom, setZoom] = useState(1.0)
    const [needleAngle, setNeedleAngle] = useState(DEFAULT_NEEDLE_ANGLE_DEG)
    // 針の初期位置（左上から開始、右方向へ穿刺）
    // 腕は横向き（X軸方向）、右=拳（末梢）、左=肩（中枢）
    const [needlePos, setNeedlePos] = useState(new THREE.Vector3(1.5, 1.2, 1.5))

    // 針の回転を角度から計算
    // 針モデル: Y方向がシャフト方向（先端=Y:0→柄=Y:3.3+）
    // 穿刺方向: 右→左（-X方向）で、皮膚に対して角度をつけて下向きに入る
    // Z軸を-PI/2回転 → Y軸が-X方向を向く（先端が左を向く）
    // さらにangleRad分だけ回転させて穿刺角度をつける
    const needleRot = React.useMemo(() => {
        const angleRad = (needleAngle * Math.PI) / 180
        // -PI/2で先端を左(-X)に向け、+angleRadで先端を下方向に傾ける
        return new THREE.Euler(0, 0, -(Math.PI / 2) + angleRad)
    }, [needleAngle])

    // ドラッグ管理
    const isDragging = useRef(false)
    const lastPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
    const isOverUI = useRef(false) // UIエリア上かどうか

    // --- タッチ・マウスドラッグ（穿刺前） ---
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (phase !== 'pre-puncture') return
        if (isOverUI.current) return // UIパネル上ならドラッグしない
        isDragging.current = true
        lastPointer.current = { x: e.clientX, y: e.clientY }
            ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
    }, [phase])

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current || phase !== 'pre-puncture') return

        const dx = (e.clientX - lastPointer.current.x) * 0.01
        const dy = (e.clientY - lastPointer.current.y) * 0.01
        lastPointer.current = { x: e.clientX, y: e.clientY }

        setNeedlePos((prev) => {
            const newPos = prev.clone()
            newPos.x += dx
            newPos.y -= dy
            newPos.x = Math.max(-5, Math.min(5, newPos.x))
            newPos.y = Math.max(-1.5, Math.min(4, newPos.y))
            return newPos
        })
    }, [phase])

    const handlePointerUp = useCallback(() => {
        isDragging.current = false
    }, [])

    // --- 奥行き調整 ---
    const adjustDepth = useCallback((delta: number) => {
        setNeedlePos((prev) => {
            const p = prev.clone()
            p.z = Math.max(-0.5, Math.min(3.0, p.z + delta))
            return p
        })
    }, [])

    // --- マウスホイールでカメラズーム ---
    const handleWheel = useCallback((e: React.WheelEvent) => {
        setZoom((prev) => Math.max(0.3, Math.min(2.5, prev + e.deltaY * 0.001)))
    }, [])

    // --- ピンチズーム（タッチ） ---
    const pinchDistance = useRef<number | null>(null)
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            pinchDistance.current = Math.sqrt(dx * dx + dy * dy)
        }
    }, [])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchDistance.current !== null) {
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const newDist = Math.sqrt(dx * dx + dy * dy)
            const delta = (pinchDistance.current - newDist) * 0.005
            pinchDistance.current = newDist
            setZoom((prev) => Math.max(0.3, Math.min(2.5, prev + delta)))
        }
    }, [])

    const handleTouchEnd = useCallback(() => {
        pinchDistance.current = null
    }, [])

    // --- 穿刺判定 ---
    const handlePuncture = useCallback(() => {
        if (phase === 'pre-puncture') {
            setPhase('punctured')
        }
    }, [phase])

    // --- スライダー操作 ---
    const handleInnerChange = useCallback((value: number) => {
        setInnerOffset(value)
        if (value < -0.5 && phase === 'punctured') {
            setPhase('advancing')
        }
    }, [phase])

    const handleOuterChange = useCallback((value: number) => {
        setOuterOffset(value)
        if (value > 1.2 && innerOffset < -2.5) {
            setPhase('completed')
        }
    }, [innerOffset])

    // --- リセット ---
    const handleReset = useCallback(() => {
        setPhase('pre-puncture')
        setInnerOffset(0)
        setOuterOffset(0)
        setNeedlePos(new THREE.Vector3(1.5, 1.2, 1.5))
        setNeedleAngle(DEFAULT_NEEDLE_ANGLE_DEG)
        setZoom(1.0)
    }, [])

    return (
        <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-gray-900">
            {/* ===== ヘッダー ===== */}
            <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
                <div className="bg-gradient-to-b from-black/70 via-black/30 to-transparent pt-3 pb-6 px-4">
                    <h1 className="text-white text-lg font-bold tracking-[0.15em] text-center drop-shadow-lg"
                        style={{ fontFamily: "'Noto Sans JP', sans-serif" }}>
                        留置針穿刺シミュレーター
                    </h1>
                    <p className="text-blue-300/60 text-[11px] text-center mt-0.5 tracking-wider">
                        TERUMO SURFLO® — IV Catheter Insertion Simulator
                    </p>
                </div>
            </div>

            {/* ===== 操作ガイド（穿刺前表示） ===== */}
            {phase === 'pre-puncture' && (
                <div className="absolute top-20 left-0 right-0 z-10 pointer-events-none">
                    <div className="text-center">
                        <div className="inline-flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-2xl px-4 py-2 backdrop-blur-md shadow-lg">
                            <div className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10">
                                <svg className="w-3.5 h-3.5 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                                </svg>
                            </div>
                            <span className="text-white/60 text-xs">ドラッグで針を移動 ・ 右パネルで奥行き調整 ・ ホイール/ピンチでズーム</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== 右側コントロールパネル ===== */}
            <div
                className="absolute top-1/2 right-3 -translate-y-1/2 z-30 flex flex-col items-center gap-3"
                onPointerEnter={() => { isOverUI.current = true }}
                onPointerLeave={() => { isOverUI.current = false }}
            >
                {/* 針角度コントロール */}
                <div className="flex flex-col items-center gap-1 bg-black/50 backdrop-blur-md rounded-2xl px-3 py-3 border border-white/10 pointer-events-auto">
                    <span className="text-[9px] text-white/50 font-medium tracking-wider mb-1">穿刺角度</span>

                    {/* 角度を上げるボタン */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setNeedleAngle((a) => Math.min(45, a + 5)) }}
                        className="w-8 h-8 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 flex items-center justify-center transition-colors active:scale-90 border border-yellow-500/20"
                    >
                        <svg className="w-4 h-4 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                    </button>

                    {/* 現在の角度表示 */}
                    <div className="my-1 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <span className="text-sm text-yellow-300 font-mono font-bold">{needleAngle}°</span>
                    </div>

                    {/* 角度を下げるボタン */}
                    <button
                        onClick={(e) => { e.stopPropagation(); setNeedleAngle((a) => Math.max(5, a - 5)) }}
                        className="w-8 h-8 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 flex items-center justify-center transition-colors active:scale-90 border border-yellow-500/20"
                    >
                        <svg className="w-4 h-4 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                {/* 奥行きコントロール（Z軸：腕に近づける/離す） */}
                <div className="flex flex-col items-center gap-1 bg-black/50 backdrop-blur-md rounded-2xl px-3 py-3 border border-white/10 pointer-events-auto">
                    <span className="text-[9px] text-white/50 font-medium tracking-wider mb-1">奥行き</span>

                    {/* 手前に（腕から離す：Z+） */}
                    <button
                        onClick={(e) => { e.stopPropagation(); adjustDepth(0.1) }}
                        className="w-8 h-8 rounded-full bg-teal-500/20 hover:bg-teal-500/30 flex items-center justify-center transition-colors active:scale-90 border border-teal-500/20"
                    >
                        <svg className="w-4 h-4 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                    </button>

                    {/* 現在の奥行き表示 */}
                    <div className="my-1 px-2 py-1 rounded-lg bg-teal-500/10 border border-teal-500/30">
                        <span className="text-[10px] text-teal-300 font-mono font-bold">{needlePos.z.toFixed(1)}</span>
                    </div>

                    {/* 奥に（腕に近づける：Z-） */}
                    <button
                        onClick={(e) => { e.stopPropagation(); adjustDepth(-0.1) }}
                        className="w-8 h-8 rounded-full bg-teal-500/20 hover:bg-teal-500/30 flex items-center justify-center transition-colors active:scale-90 border border-teal-500/20"
                    >
                        <svg className="w-4 h-4 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                {/* ズームコントロール */}
                <div className="flex flex-col items-center gap-1 bg-black/50 backdrop-blur-md rounded-2xl px-3 py-2.5 border border-white/10 pointer-events-auto">
                    <button
                        onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(0.3, z - 0.15)) }}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:scale-90"
                    >
                        <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197M15.803 15.803A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6M7.5 10.5h6" />
                        </svg>
                    </button>
                    <span className="text-[9px] text-white/40 my-0.5">ズーム</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(2.5, z + 0.15)) }}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors active:scale-90"
                    >
                        <svg className="w-4 h-4 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197M15.803 15.803A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM7.5 10.5h6" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* ===== 3Dキャンバス ===== */}
            <div
                className="w-full h-full touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart as unknown as React.TouchEventHandler}
                onTouchMove={handleTouchMove as unknown as React.TouchEventHandler}
                onTouchEnd={handleTouchEnd}
            >
                <Canvas
                    shadows
                    camera={{
                        fov: 45,
                        near: 0.05,
                        far: 100,
                        position: [0, 2.5, 5],
                    }}
                    gl={{
                        antialias: true,
                        toneMapping: THREE.ACESFilmicToneMapping,
                        toneMappingExposure: 1.1,
                    }}
                    dpr={[1, 2]}
                >
                    <SimulatorScene
                        needlePos={needlePos}
                        needleRot={needleRot}
                        innerOffset={innerOffset}
                        outerOffset={outerOffset}
                        phase={phase}
                        zoom={zoom}
                        onPuncture={handlePuncture}
                    />
                </Canvas>
            </div>

            {/* ===== スライダーUI（穿刺後） ===== */}
            <SliderControls
                phase={phase}
                innerOffset={innerOffset}
                outerOffset={outerOffset}
                onInnerChange={handleInnerChange}
                onOuterChange={handleOuterChange}
                onReset={handleReset}
            />

            {/* ===== フラッシュバック演出 ===== */}
            {phase === 'punctured' && (
                <div className="absolute inset-0 z-[5] pointer-events-none">
                    <div className="w-full h-full bg-red-600/8 animate-pulse" />
                </div>
            )}

            {/* ===== 完了エフェクト ===== */}
            {phase === 'completed' && (
                <div className="absolute inset-0 z-[5] pointer-events-none flex items-center justify-center">
                    <div className="text-center animate-bounce">
                        <div className="text-6xl mb-4">✅</div>
                        <div className="text-white text-xl font-bold tracking-wider drop-shadow-lg">留置完了！</div>
                        <div className="text-green-300/60 text-sm mt-2">外筒が血管内に正しく留置されました</div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default App
