import { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, RoundedBox, Sphere as DreiSphere } from "@react-three/drei";
import type { Group } from "three";

interface Avatar3DProps {
  name: string;
  blocked?: boolean;
}

/** Heurística simples para nomes brasileiros */
function inferGender(name: string): "female" | "male" {
  const first = name.trim().split(" ")[0].toLowerCase();
  const femaleEndings = ["a", "inha", "ana", "ane", "ene", "ine", "ela", "ila", "ola", "ula", "alice", "iris", "ines", "inês", "es"];
  const maleNames = ["gabriel", "rafael", "miguel", "daniel", "samuel", "israel", "abel", "ezequiel", "raul", "saul", "naul"];
  if (maleNames.some((m) => first === m)) return "male";
  if (femaleEndings.some((e) => first.endsWith(e))) return "female";
  return "male";
}

function BoyCharacter({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.35;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 0.52, 0]}>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial color="#f5c8a0" roughness={0.5} />
      </mesh>
      {/* Hair */}
      <mesh position={[0, 0.74, 0]}>
        <sphereGeometry args={[0.22, 32, 16]} />
        <meshStandardMaterial color="#5c3a1e" roughness={0.7} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.1, 0.55, 0.26]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[0.1, 0.55, 0.26]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      {/* Body */}
      <mesh position={[0, 0.0, 0]}>
        <RoundedBox args={[0.44, 0.52, 0.28]} radius={0.06}>
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
        </RoundedBox>
      </mesh>
      {/* Left arm */}
      <mesh position={[-0.32, 0.06, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.07, 0.34, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      {/* Right arm */}
      <mesh position={[0.32, 0.06, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.07, 0.34, 8, 16]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
      {/* Left leg */}
      <mesh position={[-0.13, -0.56, 0]}>
        <capsuleGeometry args={[0.08, 0.38, 8, 16]} />
        <meshStandardMaterial color="#2a3f6b" roughness={0.5} />
      </mesh>
      {/* Right leg */}
      <mesh position={[0.13, -0.56, 0]}>
        <capsuleGeometry args={[0.08, 0.38, 8, 16]} />
        <meshStandardMaterial color="#2a3f6b" roughness={0.5} />
      </mesh>
    </group>
  );
}

function GirlCharacter({ color }: { color: string }) {
  const groupRef = useRef<Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.35;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 0.52, 0]}>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshStandardMaterial color="#f5c8a0" roughness={0.5} />
      </mesh>
      {/* Hair long */}
      <mesh position={[0, 0.6, -0.04]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#8B4513" roughness={0.7} />
      </mesh>
      {/* Hair side left */}
      <mesh position={[-0.24, 0.34, 0]} rotation={[0, 0, 0.3]}>
        <capsuleGeometry args={[0.08, 0.32, 8, 16]} />
        <meshStandardMaterial color="#8B4513" roughness={0.7} />
      </mesh>
      {/* Hair side right */}
      <mesh position={[0.24, 0.34, 0]} rotation={[0, 0, -0.3]}>
        <capsuleGeometry args={[0.08, 0.32, 8, 16]} />
        <meshStandardMaterial color="#8B4513" roughness={0.7} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.1, 0.55, 0.26]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      <mesh position={[0.1, 0.55, 0.26]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>
      {/* Body top */}
      <mesh position={[0, 0.12, 0]}>
        <RoundedBox args={[0.42, 0.38, 0.26]} radius={0.06}>
          <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
        </RoundedBox>
      </mesh>
      {/* Skirt (cone) */}
      <mesh position={[0, -0.24, 0]}>
        <coneGeometry args={[0.36, 0.52, 32, 1, true]} />
        <meshStandardMaterial color={color} roughness={0.4} side={2} />
      </mesh>
      {/* Left arm */}
      <mesh position={[-0.3, 0.16, 0]} rotation={[0, 0, 0.4]}>
        <capsuleGeometry args={[0.065, 0.3, 8, 16]} />
        <meshStandardMaterial color="#f5c8a0" roughness={0.5} />
      </mesh>
      {/* Right arm */}
      <mesh position={[0.3, 0.16, 0]} rotation={[0, 0, -0.4]}>
        <capsuleGeometry args={[0.065, 0.3, 8, 16]} />
        <meshStandardMaterial color="#f5c8a0" roughness={0.5} />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.1, -0.64, 0]}>
        <capsuleGeometry args={[0.07, 0.28, 8, 16]} />
        <meshStandardMaterial color="#f5c8a0" roughness={0.5} />
      </mesh>
      <mesh position={[0.1, -0.64, 0]}>
        <capsuleGeometry args={[0.07, 0.28, 8, 16]} />
        <meshStandardMaterial color="#f5c8a0" roughness={0.5} />
      </mesh>
    </group>
  );
}

function AvatarScene({ name, blocked }: Avatar3DProps) {
  const gender = inferGender(name);
  const activeColor = gender === "female" ? "#e879a0" : "#4a90d9";
  const blockedColor = "#ef4444";
  const color = blocked ? blockedColor : activeColor;

  return (
    <>
      <ambientLight intensity={0.8} />
      <pointLight position={[3, 4, 3]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-2, -1, 2]} intensity={0.5} color={color} />

      <Float speed={1.6} rotationIntensity={0.1} floatIntensity={0.5}>
        {gender === "female" ? (
          <GirlCharacter color={color} />
        ) : (
          <BoyCharacter color={color} />
        )}
      </Float>
    </>
  );
}

export default function Avatar3D({ name, blocked }: Avatar3DProps) {
  return (
    <div className="h-20 w-20 rounded-full overflow-hidden">
      <Canvas
        camera={{ position: [0, 0.1, 2.6], fov: 46 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <Suspense fallback={null}>
          <AvatarScene name={name} blocked={blocked} />
        </Suspense>
      </Canvas>
    </div>
  );
}
