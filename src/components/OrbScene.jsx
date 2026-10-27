import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { useRef } from 'react'

function Core() {
  const shell = useRef(null)
  const core = useRef(null)
  const rings = useRef(null)

  useFrame((state, delta) => {
    if (shell.current) {
      shell.current.rotation.x += delta * 0.07
      shell.current.rotation.y += delta * 0.13
    }
    if (core.current) {
      core.current.rotation.y -= delta * 0.10
      core.current.rotation.z += delta * 0.05
    }
    if (rings.current) {
      rings.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.25) * 0.18
      rings.current.rotation.y += delta * 0.1
    }
  })

  return (
    <Float speed={1} rotationIntensity={0.22} floatIntensity={0.48}>
      <group rotation={[0.28, 0.08, -0.22]}>
        <mesh ref={core} scale={1.23}>
          <icosahedronGeometry args={[1.6, 5]} />
          <meshStandardMaterial color="#394b9d" roughness={0.28} metalness={0.45} flatShading />
        </mesh>
        <mesh ref={shell} scale={1.36}>
          <icosahedronGeometry args={[1.6, 2]} />
          <meshBasicMaterial color="#a99aff" transparent opacity={0.52} wireframe depthWrite={false} />
        </mesh>
        <group ref={rings}>
          <mesh rotation={[1.0, 0.2, -0.2]}>
            <torusGeometry args={[2.66, 0.006, 3, 150]} />
            <meshBasicMaterial color="#8bdffe" transparent opacity={0.68} />
          </mesh>
          <mesh rotation={[-0.25, 0.83, 0.8]}>
            <torusGeometry args={[2.85, 0.005, 3, 150]} />
            <meshBasicMaterial color="#9781ff" transparent opacity={0.48} />
          </mesh>
        </group>
      </group>
    </Float>
  )
}

export default function OrbScene() {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 8.0], fov: 40 }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}>
      <ambientLight intensity={1.5} />
      <pointLight position={[-4, 4, 6]} color="#88eaff" intensity={34} />
      <pointLight position={[3, -2, 4]} color="#a679ff" intensity={30} />
      <Core />
    </Canvas>
  )
}
