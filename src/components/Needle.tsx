import { useRef, useMemo } from 'react'
import * as THREE from 'three'

interface NeedleProps {
    innerOffset: number   // 内筒のオフセット（0=完全に挿入、負の値=引き抜き方向）
    outerOffset: number   // 外筒のオフセット（0=初期位置、正の値=前進方向）
    position: [number, number, number]
    rotation: [number, number, number]
    showFlashback: boolean // フラッシュバック（逆血）の表示
}

/**
 * テルモ サーフロー型留置針の3Dモデル（SVGリファレンス準拠）
 * 内筒（金属針+ハブ）と外筒（カテーテル+ハブ一体型）を構成
 */
export default function Needle({ innerOffset, outerOffset, position, rotation, showFlashback }: NeedleProps) {
    const groupRef = useRef<THREE.Group>(null)

    // ===== 内筒（金属針）のジオメトリ =====
    const innerNeedleGeometry = useMemo(() => {
        const points: THREE.Vector2[] = []
        // 針先端（鋭利な刃面）
        points.push(new THREE.Vector2(0, 0))
        points.push(new THREE.Vector2(0.008, 0.03))
        // 刃面斜めカット
        points.push(new THREE.Vector2(0.014, 0.08))
        points.push(new THREE.Vector2(0.016, 0.12))
        // 針のシャフト部分（均一な太さ）
        points.push(new THREE.Vector2(0.016, 0.15))
        points.push(new THREE.Vector2(0.016, 3.2))
        // ハブへの接合テーパー
        points.push(new THREE.Vector2(0.02, 3.25))
        points.push(new THREE.Vector2(0.022, 3.3))
        points.push(new THREE.Vector2(0, 3.3))
        return new THREE.LatheGeometry(points, 24)
    }, [])

    // ===== 内筒ハブ（SVG準拠：段差付き複雑形状） =====
    const innerHubGeometry = useMemo(() => {
        const points: THREE.Vector2[] = []
        // 先端（閉じ）
        points.push(new THREE.Vector2(0, 0))
        // 針との接合部
        points.push(new THREE.Vector2(0.035, 0.02))
        points.push(new THREE.Vector2(0.04, 0.05))
        // グリップ段差1（メインボディ前半）
        points.push(new THREE.Vector2(0.048, 0.12))
        points.push(new THREE.Vector2(0.048, 0.35))
        // 段差（指掛け部）
        points.push(new THREE.Vector2(0.044, 0.38))
        points.push(new THREE.Vector2(0.04, 0.42))
        // フラッシュバックチャンバー
        points.push(new THREE.Vector2(0.042, 0.48))
        points.push(new THREE.Vector2(0.042, 1.1))
        // チャンバー→後端遷移
        points.push(new THREE.Vector2(0.038, 1.15))
        points.push(new THREE.Vector2(0.04, 1.2))
        // 後端膨らみ
        points.push(new THREE.Vector2(0.05, 1.3))
        points.push(new THREE.Vector2(0.055, 1.5))
        // 後端ボディ
        points.push(new THREE.Vector2(0.055, 1.8))
        // 後端テーパー
        points.push(new THREE.Vector2(0.048, 1.85))
        points.push(new THREE.Vector2(0.04, 1.9))
        // 閉じ
        points.push(new THREE.Vector2(0, 1.9))
        return new THREE.LatheGeometry(points, 24)
    }, [])

    // ===== 外筒一体型（カテーテルチューブ+ハブ） =====
    const outerGeometry = useMemo(() => {
        const points: THREE.Vector2[] = []
        // チューブ先端（閉じ）
        points.push(new THREE.Vector2(0, 0))
        points.push(new THREE.Vector2(0.024, 0.02))
        // チューブ均一部分
        points.push(new THREE.Vector2(0.025, 0.05))
        points.push(new THREE.Vector2(0.025, 2.2))
        // テーパー遷移（チューブ→ハブ）
        points.push(new THREE.Vector2(0.03, 2.25))
        points.push(new THREE.Vector2(0.045, 2.35))
        // ハブメインボディ
        points.push(new THREE.Vector2(0.06, 2.45))
        points.push(new THREE.Vector2(0.065, 2.5))
        points.push(new THREE.Vector2(0.065, 2.85))
        // グリップ段差
        points.push(new THREE.Vector2(0.055, 2.9))
        // ルアーロック接続部
        points.push(new THREE.Vector2(0.045, 2.95))
        points.push(new THREE.Vector2(0.04, 3.05))
        points.push(new THREE.Vector2(0.04, 3.15))
        // 閉じ
        points.push(new THREE.Vector2(0, 3.15))
        return new THREE.LatheGeometry(points, 24)
    }, [])

    // ===== マテリアル =====
    const metalMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: 0xd0d0d0,
        metalness: 0.98,
        roughness: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        reflectivity: 1.0,
    }), [])

    const innerHubMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: showFlashback ? 0xcc0000 : 0xf0f0f0,
        metalness: 0.0,
        roughness: 0.3,
        transparent: true,
        opacity: 0.5,
        transmission: showFlashback ? 0.0 : 0.4,
        clearcoat: 0.5,
    }), [showFlashback])

    const outerMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: 0x66baff,
        metalness: 0.05,
        roughness: 0.4,
        transparent: true,
        opacity: 0.8,
        clearcoat: 0.3,
        side: THREE.DoubleSide,
    }), [])

    return (
        <group ref={groupRef} position={position} rotation={rotation}>
            {/* === 内筒グループ（金属針 + 内筒ハブ） === */}
            <group position={[0, innerOffset, 0]}>
                {/* 金属針シャフト */}
                <mesh geometry={innerNeedleGeometry} material={metalMaterial} castShadow />
                {/* 内筒ハブ（フラッシュバックチャンバー付き） */}
                <mesh geometry={innerHubGeometry} material={innerHubMaterial} position={[0, 3.3, 0]} />
            </group>

            {/* === 外筒（カテーテル+ハブ一体型） === */}
            <group position={[0, outerOffset, 0]}>
                <mesh geometry={outerGeometry} material={outerMaterial} />
            </group>
        </group>
    )
}
