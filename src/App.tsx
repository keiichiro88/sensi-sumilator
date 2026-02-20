import React, { useState, useCallback, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import Needle from './components/Needle'
import Arm from './components/Arm'
import SliderControls from './components/SliderControls'

type Phase = 'pre-puncture' | 'punctured' | 'advancing' | 'completed'
type Mode = 'camera' | 'needle'

const DEFAULT_NEEDLE_ANGLE_DEG = 15

/**
 * 3Dシーン
 */
/**
 * カメラ参照を外部に渡すヘルパー
 */
function CameraCapture({ cameraRef }: { cameraRef: React.MutableRefObject<THREE.Camera | null> }) {
    const { camera } = useThree()
    cameraRef.current = camera
    return null
}

function SimulatorScene({
    needlePos,
    needleRot,
    innerOffset,
    outerOffset,
    phase,
    mode,
    cameraRef,
    controlsRef,
    onPuncture,
}: {
    needlePos: THREE.Vector3
    needleRot: THREE.Euler
    innerOffset: number
    outerOffset: number
    phase: Phase
    mode: Mode
    cameraRef: React.MutableRefObject<THREE.Camera | null>
    controlsRef: React.MutableRefObject<any>
    onPuncture: () => void
}) {
    useFrame(() => {
        if (phase !== 'pre-puncture') return
        const tipWorld = needlePos.clone()
        const veinWorldApprox = new THREE.Vector3(0.0, -0.78, 0.30)
        const dist = tipWorld.distanceTo(veinWorldApprox)
        if (dist < 0.5) {
            onPuncture()
        }
    })

    return (
        <>
            <CameraCapture cameraRef={cameraRef} />

            {/* カメラモード時のみOrbitControls有効 */}
            <OrbitControls
                ref={controlsRef}
                target={[0, -0.8, 0.2]}
                enableDamping
                dampingFactor={0.1}
                enabled={mode === 'camera'}
            />

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

            {/* 留置針モデル */}
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
 * 2Dクロスセクション・ミニマップ
 * 腕の断面図に血管と針の位置を表示
 */
function CrossSectionMinimap({ needleZ, needleY }: { needleZ: number; needleY: number }) {
    const size = 130
    const cx = size / 2
    const cy = size / 2
    const armRx = 48  // 腕楕円の横幅
    const armRy = 32  // 腕楕円の縦幅

    // 血管のワールドZ=0.30 → ミニマップ座標
    // Z座標: 0=腕の中心, 正=上面(カメラ手前), ミニマップでは上
    // 腕の表面Z≈0.59(center), 血管Z=0.30
    const veinFraction = 0.30 / 0.59  // 血管の腕内相対位置
    const veinMapX = cx + 3
    const veinMapY = cy - armRy * veinFraction * 0.7

    // 針のZ位置をミニマップ座標にマッピング
    // Z: -0.5~3.0 → 腕の外から腕の下まで
    // 腕の上面≈0.59, 下面≈-0.59
    const needleZNorm = (needleZ - (-0.5)) / 3.5  // 0~1に正規化
    const needleMapY = cy + armRy + 10 - needleZNorm * (armRy * 2 + 20)

    // 針のY位置（高さ）→ ミニマップでは左右にマッピング
    // Y: -1.5~4.0 → ミニマップ横方向
    const needleYNorm = (needleY - (-1.5)) / 5.5
    const needleMapX = cx - armRx + needleYNorm * armRx * 2

    return (
        <div className="absolute bottom-24 right-3 z-20 pointer-events-none">
            <div className="bg-black/60 backdrop-blur-md rounded-xl border border-white/15 p-2">
                <div className="text-[8px] text-white/40 text-center mb-1 tracking-wider">断面図</div>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* 背景グリッド */}
                    <line x1={cx} y1={4} x2={cx} y2={size - 4} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
                    <line x1={4} y1={cy} x2={size - 4} y2={cy} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />

                    {/* 腕の断面（楕円） */}
                    <ellipse
                        cx={cx} cy={cy} rx={armRx} ry={armRy}
                        fill="rgba(240,188,138,0.25)"
                        stroke="rgba(240,188,138,0.5)"
                        strokeWidth={1.5}
                    />

                    {/* 皮下組織のリング */}
                    <ellipse
                        cx={cx} cy={cy} rx={armRx - 4} ry={armRy - 3}
                        fill="none"
                        stroke="rgba(240,188,138,0.15)"
                        strokeWidth={0.5}
                        strokeDasharray="3 3"
                    />

                    {/* 血管 */}
                    <circle
                        cx={veinMapX} cy={veinMapY} r={5}
                        fill="rgba(204,34,34,0.7)"
                        stroke="#cc2222"
                        strokeWidth={1}
                    />
                    <text x={veinMapX + 9} y={veinMapY + 3} fill="rgba(204,34,34,0.6)" fontSize={7}>静脈</text>

                    {/* 針位置マーカー */}
                    <circle
                        cx={needleMapX} cy={needleMapY} r={4}
                        fill="rgba(102,255,170,0.6)"
                        stroke="#66ffaa"
                        strokeWidth={1.5}
                    />
                    {/* 針の十字線 */}
                    <line x1={needleMapX - 7} y1={needleMapY} x2={needleMapX + 7} y2={needleMapY} stroke="#66ffaa" strokeWidth={0.5} opacity={0.5} />
                    <line x1={needleMapX} y1={needleMapY - 7} x2={needleMapX} y2={needleMapY + 7} stroke="#66ffaa" strokeWidth={0.5} opacity={0.5} />

                    {/* ラベル */}
                    <text x={4} y={12} fill="rgba(255,255,255,0.3)" fontSize={7}>上</text>
                    <text x={4} y={size - 5} fill="rgba(255,255,255,0.3)" fontSize={7}>下</text>
                </svg>
            </div>
        </div>
    )
}

/**
 * メインアプリケーション
 */
function App() {
    const [phase, setPhase] = useState<Phase>('pre-puncture')
    const [mode, setMode] = useState<Mode>('camera')
    const [innerOffset, setInnerOffset] = useState(0)
    const [outerOffset, setOuterOffset] = useState(0)
    const [needleAngle, setNeedleAngle] = useState(DEFAULT_NEEDLE_ANGLE_DEG)
    const [needlePos, setNeedlePos] = useState(new THREE.Vector3(1.5, 1.2, 1.5))

    // 針の回転を角度から計算
    const needleRot = React.useMemo(() => {
        const angleRad = (needleAngle * Math.PI) / 180
        return new THREE.Euler(0, 0, -(Math.PI / 2) + angleRad)
    }, [needleAngle])

    // ドラッグ管理
    const cameraRef = useRef<THREE.Camera | null>(null)
    const controlsRef = useRef<any>(null)
    const isDragging = useRef(false)
    const lastPointer = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
    const isOverUI = useRef(false)
    const lastPinchDist = useRef<number | null>(null)
    const activeTouchCount = useRef(0)

    // --- タッチ・マウスドラッグ（穿刺モード時のみ） ---
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (mode !== 'needle' || phase !== 'pre-puncture') return
        if (isOverUI.current) return
        isDragging.current = true
        lastPointer.current = { x: e.clientX, y: e.clientY }
            ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
    }, [mode, phase])

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging.current || mode !== 'needle' || phase !== 'pre-puncture') return
        if (activeTouchCount.current > 1) return // ピンチ中はドラッグ無効

        const dx = e.clientX - lastPointer.current.x
        const dy = e.clientY - lastPointer.current.y
        lastPointer.current = { x: e.clientX, y: e.clientY }

        const camera = cameraRef.current
        if (!camera) return

        // カメラのright/upベクトルを取得（ワールド空間）
        // これにより画面上のドラッグ方向が3D空間で正しい方向にマッピングされる
        const right = new THREE.Vector3()
        const up = new THREE.Vector3()
        const back = new THREE.Vector3()
        camera.matrixWorld.extractBasis(right, up, back)

        const sensitivity = 0.01
        setNeedlePos((prev) => {
            const newPos = prev.clone()
            // 画面右ドラッグ → カメラのrightベクトル方向に移動
            newPos.addScaledVector(right, dx * sensitivity)
            // 画面上ドラッグ → カメラのupベクトル方向に移動（screen Yは反転）
            newPos.addScaledVector(up, -dy * sensitivity)
            // 範囲制限
            newPos.x = Math.max(-5, Math.min(5, newPos.x))
            newPos.y = Math.max(-1.5, Math.min(4, newPos.y))
            newPos.z = Math.max(-0.5, Math.min(3.0, newPos.z))
            return newPos
        })
    }, [mode, phase])

    const handlePointerUp = useCallback(() => {
        isDragging.current = false
    }, [])

    // --- ホイール：穿刺モードでは奥行き調整、カメラモードはOrbitControlsが処理 ---
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (mode !== 'needle') return
        e.preventDefault()
        const delta = e.deltaY * -0.002
        setNeedlePos((prev) => {
            const p = prev.clone()
            p.z = Math.max(-0.5, Math.min(3.0, p.z + delta))
            return p
        })
    }, [mode])

    // --- ピンチ（2本指）で奥行き調整（モバイル対応） ---
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        activeTouchCount.current = e.touches.length
        if (mode !== 'needle' || phase !== 'pre-puncture') return
        if (e.touches.length === 2) {
            isDragging.current = false
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            lastPinchDist.current = Math.sqrt(dx * dx + dy * dy)
        }
    }, [mode, phase])

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (mode !== 'needle' || phase !== 'pre-puncture') return
        if (e.touches.length === 2 && lastPinchDist.current !== null) {
            const dx = e.touches[0].clientX - e.touches[1].clientX
            const dy = e.touches[0].clientY - e.touches[1].clientY
            const dist = Math.sqrt(dx * dx + dy * dy)
            const delta = (dist - lastPinchDist.current) * 0.005
            lastPinchDist.current = dist
            setNeedlePos(prev => {
                const p = prev.clone()
                // ピンチアウト(広げる)=浅く、ピンチイン(狭める)=深く
                p.z = Math.max(-0.5, Math.min(3.0, p.z - delta))
                return p
            })
        }
    }, [mode, phase])

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        activeTouchCount.current = e.touches.length
        if (e.touches.length < 2) {
            lastPinchDist.current = null
        }
    }, [])

    // --- 穿刺判定（成功時カメラを断面図アングルに切替） ---
    const handlePuncture = useCallback(() => {
        if (phase === 'pre-puncture') {
            setPhase('punctured')
            setMode('camera')
            // カメラを断面図（横アングル）に自動切替
            requestAnimationFrame(() => {
                const controls = controlsRef.current
                if (controls) {
                    controls.object.position.set(7, 0.3, 1.2)
                    controls.target.set(0, -0.8, 0.2)
                    controls.update()
                }
            })
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
        setMode('camera')
        setInnerOffset(0)
        setOuterOffset(0)
        setNeedlePos(new THREE.Vector3(1.5, 1.2, 1.5))
        setNeedleAngle(DEFAULT_NEEDLE_ANGLE_DEG)
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
                            <span className="text-white/60 text-xs">
                                {mode === 'camera'
                                    ? 'ドラッグで回転 ・ ピンチ/ホイールでズーム ・ アングルを決めて穿刺モードへ'
                                    : 'ドラッグで移動 ・ ピンチ/ホイールで奥行き ・ 右下の断面図で位置確認'
                                }
                            </span>
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
                {/* モード切替ボタン */}
                <div className="flex flex-col items-center gap-1 bg-black/50 backdrop-blur-md rounded-2xl px-2 py-2 border border-white/10 pointer-events-auto">
                    <button
                        onClick={() => setMode('camera')}
                        className={`w-14 py-1.5 rounded-xl text-[10px] font-medium transition-all ${mode === 'camera'
                            ? 'bg-blue-500/40 text-blue-200 border border-blue-400/40 shadow-lg shadow-blue-500/10'
                            : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
                            }`}
                    >
                        カメラ
                    </button>
                    <button
                        onClick={() => setMode('needle')}
                        className={`w-14 py-1.5 rounded-xl text-[10px] font-medium transition-all ${mode === 'needle'
                            ? 'bg-emerald-500/40 text-emerald-200 border border-emerald-400/40 shadow-lg shadow-emerald-500/10'
                            : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'
                            }`}
                    >
                        穿刺
                    </button>
                </div>

                {/* 針角度コントロール（穿刺モード時のみ） */}
                {mode === 'needle' && phase === 'pre-puncture' && (
                    <div className="flex flex-col items-center gap-1 bg-black/50 backdrop-blur-md rounded-2xl px-3 py-3 border border-white/10 pointer-events-auto">
                        <span className="text-[9px] text-white/50 font-medium tracking-wider mb-1">穿刺角度</span>
                        <button
                            onClick={(e) => { e.stopPropagation(); setNeedleAngle((a) => Math.min(45, a + 5)) }}
                            className="w-8 h-8 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 flex items-center justify-center transition-colors active:scale-90 border border-yellow-500/20"
                        >
                            <svg className="w-4 h-4 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            </svg>
                        </button>
                        <div className="my-1 px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                            <span className="text-sm text-yellow-300 font-mono font-bold">{needleAngle}°</span>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); setNeedleAngle((a) => Math.max(5, a - 5)) }}
                            className="w-8 h-8 rounded-full bg-yellow-500/20 hover:bg-yellow-500/30 flex items-center justify-center transition-colors active:scale-90 border border-yellow-500/20"
                        >
                            <svg className="w-4 h-4 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            {/* ===== 3Dキャンバス ===== */}
            <div
                className="w-full h-full touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onWheel={handleWheel}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <Canvas
                    shadows
                    camera={{
                        fov: 45,
                        near: 0.05,
                        far: 100,
                        position: [7, 0.3, 1.2],
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
                        mode={mode}
                        cameraRef={cameraRef}
                        controlsRef={controlsRef}
                        onPuncture={handlePuncture}
                    />
                </Canvas>
            </div>

            {/* ===== 2Dクロスセクション・ミニマップ（穿刺モード時） ===== */}
            {mode === 'needle' && phase === 'pre-puncture' && (
                <CrossSectionMinimap needleZ={needlePos.z} needleY={needlePos.y} />
            )}

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
