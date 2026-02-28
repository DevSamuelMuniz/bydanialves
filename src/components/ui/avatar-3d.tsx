import { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, Float, Text } from "@react-three/drei";
import type { Mesh } from "three";

interface Avatar3DProps {
  initial: string;
  blocked?: boolean;
}

function AvatarScene({ initial, blocked }: Avatar3DProps) {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
  });

  const color = blocked ? "#ef4444" : "#d4a843";

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[3, 3, 3]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-3, -2, 2]} intensity={0.4} color={color} />

      <Float speed={2} rotationIntensity={0.3} floatIntensity={0.4}>
        <mesh ref={meshRef}>
          <Sphere args={[0.72, 64, 64]}>
            <MeshDistortMaterial
              color={color}
              distort={0.22}
              speed={2}
              roughness={0.15}
              metalness={0.6}
            />
          </Sphere>
        </mesh>

        <Text
          position={[0, 0, 0.78]}
          fontSize={0.52}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          font={undefined}
        >
          {initial}
        </Text>
      </Float>
    </>
  );
}

export default function Avatar3D({ initial, blocked }: Avatar3DProps) {
  return (
    <div className="h-16 w-16 rounded-full overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 2.2], fov: 50 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <Suspense fallback={null}>
          <AvatarScene initial={initial} blocked={blocked} />
        </Suspense>
      </Canvas>
    </div>
  );
}
