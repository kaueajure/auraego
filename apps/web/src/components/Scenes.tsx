import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, RoundedBox, Text } from "@react-three/drei";
import { Suspense, useRef } from "react";
import type { Group } from "three";
import { Character } from "./Character";

function Court({ compact = false }: { compact?: boolean }) {
  return <group>
    <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[18, 12]} /><meshStandardMaterial color="#b6723c" roughness={.65} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, .012, 0]}><ringGeometry args={[1.35, 1.42, 64]} /><meshBasicMaterial color="#f3e7cd" /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, .014, 0]}><planeGeometry args={[.045, 12]} /><meshBasicMaterial color="#f3e7cd" /></mesh>
    <mesh position={[0, 2.4, -4.9]} receiveShadow><boxGeometry args={[18, 4.8, .25]} /><meshStandardMaterial color="#3b5e4a" /></mesh>
    <mesh position={[0, 1.8, -4.72]}><boxGeometry args={[2.7, 1.8, .09]} /><meshStandardMaterial color="#e7dbc3" /></mesh>
    <mesh position={[0, 1.65, -4.55]}><torusGeometry args={[.52, .045, 10, 32]} /><meshStandardMaterial color="#b84a2f" /></mesh>
    {!compact && Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[-5.6 + i * 1.4, .45, -4.2]}><boxGeometry args={[.85, .9 + (i % 2) * .2, .7]} /><meshStandardMaterial color={i % 2 ? "#d1a74c" : "#7c3b33"} /></mesh>)}
  </group>;
}
function FloatingNumbers() {
  const group = useRef<Group>(null);
  useFrame(({ clock }) => { if (group.current) group.current.rotation.y = Math.sin(clock.elapsedTime * .35) * .15; });
  return <Float speed={1.5} floatIntensity={.45}><group ref={group} position={[0, 2.6, -1]}>
    <Text fontSize={1.5} color="#f3b63d" anchorX="center" anchorY="middle">6</Text>
    <Text position={[1.08, -.2, .1]} fontSize={1.5} color="#f6e8cf" anchorX="center" anchorY="middle">7</Text>
  </group></Float>;
}
export function AuthScene() {
  return <Canvas shadows dpr={[1, 1.5]} camera={{ position: [4.8, 2.8, 6.4], fov: 40 }}>
    <color attach="background" args={["#282018"]} /><fog attach="fog" args={["#282018", 7, 18]} />
    <ambientLight intensity={1.3} /><directionalLight castShadow position={[4, 7, 4]} intensity={2.2} color="#ffd99a" />
    <Suspense fallback={null}><Court compact /><Character position={[0, .08, 0]} facing={.18} action="six" scale={1.15} /><FloatingNumbers /><Environment preset="city" /></Suspense>
  </Canvas>;
}

export function ArenaScene({ playerAction = "idle", opponentAction = "idle" }: { playerAction?: "idle" | "six" | "seven" | "win" | "lose"; opponentAction?: "idle" | "six" | "seven" | "win" | "lose" }) {
  return <Canvas shadows dpr={[1, 1.6]} camera={{ position: [0, 3.1, 7.8], fov: 43 }}>
    <color attach="background" args={["#afc8b8"]} /><fog attach="fog" args={["#afc8b8", 11, 22]} />
    <ambientLight intensity={1.4} /><directionalLight castShadow position={[-4, 8, 6]} intensity={2.4} color="#fff1ce" shadow-mapSize={[1024, 1024]} />
    <Suspense fallback={null}>
      <Court />
      <Character position={[-1.65, .08, 0]} facing={.15} action={playerAction} scale={1.08} />
      <Character position={[1.65, .08, 0]} facing={-.15} action={opponentAction} color="#397c70" accent="#f08b52" scale={1.08} />
      <RoundedBox args={[3, .8, .12]} radius={.08} position={[0, 3.25, -4.55]}><meshStandardMaterial color="#191713" /></RoundedBox>
      <Text position={[0, 3.25, -4.45]} fontSize={.33} color="#f5b940">AURA  •  EGO</Text>
      <Environment preset="sunset" />
    </Suspense>
  </Canvas>;
}
