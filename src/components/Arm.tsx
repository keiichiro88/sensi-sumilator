import { useMemo } from 'react'
import * as THREE from 'three'

type Phase = 'pre-puncture' | 'punctured' | 'advancing' | 'completed'

/**
 * 人間の腕（肘上〜拳）の3Dモデル
 * 解剖学的な前腕形状＋拳を含むリアルなモデル
 */
export default function Arm({ phase }: { phase: Phase }) {
    // --- 前腕ジオメトリ（解剖学的な形状） ---
    const armGeometry = useMemo(() => {
        const length = 14
        const segments = 48
        const lengthSegments = 48

        const geometry = new THREE.CylinderGeometry(1, 1, length, segments, lengthSegments, false)
        const positions = geometry.attributes.position

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i)
            const y = positions.getY(i)
            const z = positions.getZ(i)

            const angle = Math.atan2(z, x)
            const r = Math.sqrt(x * x + z * z)
            const t = (y + length / 2) / length // 0=手首 ~ 1=肘

            // 非線形テーパー：手首が細く、中間部に筋肉の膨らみ、肘に向かって広がる
            const wristRadius = 0.45
            const elbowRadius = 0.95
            const muscleBulge = Math.sin(t * Math.PI * 0.85) * 0.12
            const taper = wristRadius + (elbowRadius - wristRadius) * t + muscleBulge

            // 断面形状：前腕の解剖学的断面（やや扁平な楕円＋角度依存の変形）
            const radiusX = 1.15  // 左右にやや広い
            const radiusTop = 0.65  // 背側（上面）はやや平ら
            const radiusBottom = 0.75  // 掌側（下面）はやや丸い
            const radiusZ = z > 0 ? radiusTop : radiusBottom

            let newX = r * Math.cos(angle) * radiusX * taper
            let newZ = r * Math.sin(angle) * radiusZ * taper

            // 尺骨茎状突起（手首の骨の出っ張り：ulna styloid）
            if (t < 0.12) {
                const boneT = 1 - t / 0.12
                const boneAngle = Math.PI * 0.3  // 尺側の位置
                const boneDist = Math.cos(angle - boneAngle)
                if (boneDist > 0.7) {
                    const bump = boneDist * 0.06 * boneT * boneT
                    newX += bump * Math.cos(angle)
                    newZ += bump * Math.sin(angle)
                }
            }

            // 橈骨茎状突起（反対側の手首の骨）
            if (t < 0.1) {
                const boneT = 1 - t / 0.1
                const boneAngle = -Math.PI * 0.3
                const boneDist = Math.cos(angle - boneAngle)
                if (boneDist > 0.7) {
                    const bump = boneDist * 0.05 * boneT * boneT
                    newX += bump * Math.cos(angle)
                    newZ += bump * Math.sin(angle)
                }
            }

            // 中間部の筋肉（屈筋群・伸筋群）の微細な形状
            if (t > 0.2 && t < 0.7) {
                const muscleT = Math.sin((t - 0.2) / 0.5 * Math.PI)
                // 屈筋（掌側やや尺側）
                const flexorAngle = Math.PI * 0.7
                const flexor = Math.max(0, Math.cos(angle - flexorAngle)) * 0.04 * muscleT
                // 伸筋（背側やや橈側）
                const extensorAngle = -Math.PI * 0.3
                const extensor = Math.max(0, Math.cos(angle - extensorAngle)) * 0.03 * muscleT
                const muscleBump = (flexor + extensor) * taper
                newX += muscleBump * Math.cos(angle)
                newZ += muscleBump * Math.sin(angle)
            }

            // 肘付近の広がり（上腕骨内側上顆・外側上顆）
            if (t > 0.85) {
                const elbowT = (t - 0.85) / 0.15
                const elbowBump = Math.abs(Math.cos(angle)) * 0.08 * elbowT * elbowT
                newX += elbowBump * Math.cos(angle)
            }

            positions.setX(i, newX)
            positions.setZ(i, newZ)
        }

        geometry.computeVertexNormals()
        return geometry
    }, [])

    // --- 皮膚マテリアル（断面図で血管が見えるよう半透明ベース） ---
    const isPunctured = phase !== 'pre-puncture'
    const skinMaterial = useMemo(() => new THREE.MeshPhysicalMaterial({
        color: 0xf0bc8a,
        roughness: 0.8,
        metalness: 0.0,
        clearcoat: 0.05,
        clearcoatRoughness: 0.9,
        sheen: 0.3,
        sheenColor: new THREE.Color(0xffccaa),
        transparent: true,
        opacity: isPunctured ? 0.3 : 0.65,
        depthWrite: false,
    }), [isPunctured])

    return (
        <group rotation={[0, 0, Math.PI / 2]} position={[0, -0.8, 0]}>
            {/* 前腕本体 */}
            <mesh geometry={armGeometry} material={skinMaterial} castShadow receiveShadow />

            {/* 拳（手首の先） */}
            <Fist skinMaterial={skinMaterial} />

            {/* 尺側皮静脈 */}
            <Vein />

            {/* 穿刺ターゲットマーカー */}
            <PunctureGuide />
        </group>
    )
}

/**
 * 拳（グー）のモデル
 */
function Fist({ skinMaterial }: { skinMaterial: THREE.Material }) {
    const fistGeometry = useMemo(() => {
        // 拳のベース（楕円球体）
        const geometry = new THREE.SphereGeometry(1, 24, 24)
        const positions = geometry.attributes.position

        for (let i = 0; i < positions.count; i++) {
            let x = positions.getX(i)
            let y = positions.getY(i)
            let z = positions.getZ(i)

            // 拳の形状に変形：横に広く、前後に潰す
            x *= 0.5   // 腕方向に短い
            y *= 0.42   // 上下にやや潰す
            z *= 0.55   // 左右に広い（ナックル幅）

            // 指の関節のこぶ（上面）
            if (y > 0.1) {
                const knuckleWave = Math.sin(z * 8) * 0.03
                y += knuckleWave * (y / 0.42)
            }

            // 親指側をやや膨らませる
            if (x > 0 && z < -0.1) {
                const thumbBulge = 0.06 * Math.max(0, -z / 0.55)
                z -= thumbBulge
                y += thumbBulge * 0.3
            }

            positions.setX(i, x)
            positions.setY(i, y)
            positions.setZ(i, z)
        }

        geometry.computeVertexNormals()
        return geometry
    }, [])

    return (
        <group position={[0, -7.8, 0]}>
            <mesh geometry={fistGeometry} material={skinMaterial} castShadow />
        </group>
    )
}

/**
 * 尺側皮静脈 (Basilic Vein) の3Dモデル
 * Z値は腕の中心寄りに配置（断面図で見やすい位置）
 */
function Vein() {
    const veinGeometry = useMemo(() => {
        // Z値は腕断面の中心寄り（表面Zの約65%）
        const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(-0.08, -6, 0.20),
            new THREE.Vector3(-0.05, -4, 0.23),
            new THREE.Vector3(-0.03, -2, 0.27),
            new THREE.Vector3(0.0,  -0.5, 0.29),
            new THREE.Vector3(0.02,  0,   0.30),
            new THREE.Vector3(0.03,  0.5, 0.31),
            new THREE.Vector3(0.05,  2,   0.33),
            new THREE.Vector3(0.08,  3,   0.35),
            new THREE.Vector3(0.10,  4.5, 0.38),
            new THREE.Vector3(0.12,  6,   0.40),
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
        <group position={[0.02, 0, 0.30]}>
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
