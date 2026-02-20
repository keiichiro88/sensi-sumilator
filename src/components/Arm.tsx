import { useMemo } from 'react'
import * as THREE from 'three'

type Phase = 'pre-puncture' | 'punctured' | 'advancing' | 'completed'

/**
 * 人間の腕（前腕部分）の3Dモデル
 * 穿刺後に皮膚が半透明になり血管が透けて見える
 */
export default function Arm({ phase }: { phase: Phase }) {
    // --- 腕のジオメトリ（前腕の自然な形状） ---
    const armGeometry = useMemo(() => {
        const length = 14
        const segments = 48
        const lengthSegments = 32

        const geometry = new THREE.CylinderGeometry(1, 1, length, segments, lengthSegments, false)
        const positions = geometry.attributes.position

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i)
            const y = positions.getY(i)
            const z = positions.getZ(i)

            const angle = Math.atan2(z, x)
            const r = Math.sqrt(x * x + z * z)

            // 楕円変形：横幅を少し広く、縦を少し潰す（前腕の断面）
            const radiusX = 1.1
            const radiusZ = 0.75

            let newX = r * Math.cos(angle) * radiusX
            let newZ = r * Math.sin(angle) * radiusZ

            // 上面を少し平らにする（前腕の前面）
            if (z > 0) {
                newZ *= 0.9
            }

            // 手首側（y < 0）を細く、肘側（y > 0）をやや太くテーパー
            const t = (y + length / 2) / length // 0 (手首側) ~ 1 (肘側)
            const taper = 0.65 + t * 0.45

            newX *= taper
            newZ *= taper

            // 自然な凹凸（うっすらとした筋肉のふくらみ）
            const bumpFreq = 2.5
            const bump = Math.sin(angle * bumpFreq) * 0.02 * taper
            newX += bump * Math.cos(angle)
            newZ += bump * Math.sin(angle)

            positions.setX(i, newX)
            positions.setZ(i, newZ)
        }

        geometry.computeVertexNormals()
        return geometry
    }, [])

    // --- 皮膚マテリアル（穿刺後は半透明になり血管が透ける） ---
    const isPunctured = phase !== 'pre-puncture'
    const skinMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: 0xf0bc8a,
        roughness: 0.8,
        metalness: 0.0,
        clearcoat: 0.05,
        clearcoatRoughness: 0.9,
        sheen: 0.3,
        sheenColor: new THREE.Color(0xffccaa),
        transparent: isPunctured,
        opacity: isPunctured ? 0.35 : 1.0,
        depthWrite: !isPunctured,
    }), [isPunctured])

    return (
        <group rotation={[0, 0, Math.PI / 2]} position={[0, -0.8, 0]}>
            {/* 腕本体 */}
            <mesh geometry={armGeometry} material={skinMaterial} castShadow receiveShadow />

            {/* 尺側皮静脈 */}
            <Vein />

            {/* 穿刺ターゲットマーカー（うっすらとした目印） */}
            <PunctureGuide />
        </group>
    )
}


/**
 * 尺側皮静脈 (Basilic Vein) の3Dモデル
 */
function Vein() {
    const veinGeometry = useMemo(() => {
        // 自然にカーブする静脈のパス
        // Z値は腕表面の93%に統一（浅い皮下静脈の位置）
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.15, -6, 0.43),
            new THREE.Vector3(-0.1, -4, 0.47),
            new THREE.Vector3(-0.05, -2, 0.51),
            new THREE.Vector3(0.0, -0.5, 0.54),
            new THREE.Vector3(0.02, 0, 0.55),
            new THREE.Vector3(0.05, 0.5, 0.56),
            new THREE.Vector3(0.1, 2, 0.59),
            new THREE.Vector3(0.15, 3, 0.61),
            new THREE.Vector3(0.2, 4.5, 0.64),
            new THREE.Vector3(0.25, 6, 0.66),
        ])
        return new THREE.TubeGeometry(curve, 80, 0.08, 12, false)
    }, [])

    const veinMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: 0xcc2222,
        transparent: true,
        opacity: 0.85,
        roughness: 0.7,
        metalness: 0.0,
        depthWrite: false,
    }), [])

    return <mesh geometry={veinGeometry} material={veinMaterial} />
}

/**
 * 穿刺位置のガイドマーカー（うっすら光るリング）
 */
function PunctureGuide() {
    return (
        <group position={[0.02, 0, 0.55]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.12, 0.16, 32]} />
                <meshBasicMaterial
                    color={0x66ffaa}
                    transparent
                    opacity={0.2}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>
        </group>
    )
}
