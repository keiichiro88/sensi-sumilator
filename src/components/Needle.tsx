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
 * テルモ サーフロー型留置針の3Dモデル
 * 内筒（金属針）と外筒（カテーテル）を個別のメッシュとして構成
 */
export default function Needle({ innerOffset, outerOffset, position, rotation, showFlashback }: NeedleProps) {
    const groupRef = useRef<THREE.Group>(null)

    // ===== 内筒（金属針）のジオメトリ =====
    const innerNeedleGeometry = useMemo(() => {
        const points: THREE.Vector2[] = []
        // 針先端（鋭利な刃面）- 研ぎ澄まされた先端
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

    // ===== 内筒ハブ（フラッシュバックチャンバー付き） =====
    const innerHubGeometry = useMemo(() => {
        const points: THREE.Vector2[] = []
        points.push(new THREE.Vector2(0, 0))
        // 先端の接合部
        points.push(new THREE.Vector2(0.04, 0))
        points.push(new THREE.Vector2(0.05, 0.03))
        // メインボディ部分
        points.push(new THREE.Vector2(0.055, 0.08))
        points.push(new THREE.Vector2(0.055, 0.5))
        // グリップの段差（指で押す部分）
        points.push(new THREE.Vector2(0.05, 0.52))
        points.push(new THREE.Vector2(0.045, 0.55))
        // フラッシュバックチャンバー（透明な確認窓）
        points.push(new THREE.Vector2(0.04, 0.6))
        points.push(new THREE.Vector2(0.04, 1.2))
        // 後端（太めに）
        points.push(new THREE.Vector2(0.045, 1.25))
        points.push(new THREE.Vector2(0.05, 1.3))
        points.push(new THREE.Vector2(0, 1.3))
        return new THREE.LatheGeometry(points, 24)
    }, [])

    // ===== 外筒（カテーテル部分） =====
    const outerCatheterGeometry = useMemo(() => {
        // 2層の管状構造（中空）
        const outerRadius = 0.025
        const length = 2.5
        const geo = new THREE.CylinderGeometry(outerRadius, outerRadius * 0.95, length, 24, 1, true)
        return geo
    }, [])

    // ===== 外筒ハブ（青い持ち手部分） =====
    const outerHubGeometry = useMemo(() => {
        const points: THREE.Vector2[] = []
        points.push(new THREE.Vector2(0, 0))
        // 先端テーパー
        points.push(new THREE.Vector2(0.035, 0))
        points.push(new THREE.Vector2(0.06, 0.04))
        // メインボディ
        points.push(new THREE.Vector2(0.065, 0.1))
        points.push(new THREE.Vector2(0.065, 0.35))
        // ウイング付け根
        points.push(new THREE.Vector2(0.06, 0.38))
        points.push(new THREE.Vector2(0.055, 0.42))
        // ルアーロック接続部
        points.push(new THREE.Vector2(0.045, 0.55))
        points.push(new THREE.Vector2(0.04, 0.6))
        points.push(new THREE.Vector2(0, 0.6))
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

    const catheterMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: 0x64b5f6,
        transparent: true,
        opacity: 0.55,
        metalness: 0.0,
        roughness: 0.5,
        side: THREE.DoubleSide,
        transmission: 0.2,
    }), [])

    const outerHubMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: 0x42a5f5,
        metalness: 0.05,
        roughness: 0.4,
        transparent: true,
        opacity: 0.85,
        clearcoat: 0.3,
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

            {/* === 外筒グループ（カテーテル + 外筒ハブ + ウイング） === */}
            <group position={[0, outerOffset, 0]}>
                {/* カテーテルチューブ */}
                <mesh geometry={outerCatheterGeometry} material={catheterMaterial} position={[0, 1.35, 0]} />
                {/* 外筒ハブ */}
                <mesh geometry={outerHubGeometry} material={outerHubMaterial} position={[0, 2.60, 0]} />
            </group>
        </group>
    )
}
