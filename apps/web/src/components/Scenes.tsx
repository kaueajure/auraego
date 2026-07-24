import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Float, RoundedBox, Text } from "@react-three/drei";
import { Suspense, useRef } from "react";
import type { Group } from "three";
import { Character, type CharacterAction } from "./Character";

const noop = () => {};

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

function SpecialAuraOrb({ position, onCollect }: { position: [number, number, number]; onCollect: () => void }) {
  const orb = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!orb.current) return;
    const time = clock.elapsedTime;
    orb.current.rotation.y = time * 1.8;
    orb.current.rotation.z = Math.sin(time * 1.2) * .18;
  });
  return <Float speed={2.4} floatIntensity={.8} rotationIntensity={.35}>
    <group
      ref={orb}
      position={position}
      onClick={event => { event.stopPropagation(); onCollect(); }}
      onPointerOver={event => { event.stopPropagation(); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { document.body.style.cursor = ""; }}
    >
      <pointLight intensity={6} distance={3.5} color="#ffc84d" />
      <mesh scale={1.55}>
        <sphereGeometry args={[.26, 28, 22]} />
        <meshBasicMaterial color="#f6b82f" transparent opacity={.12} />
      </mesh>
      <mesh castShadow>
        <sphereGeometry args={[.25, 32, 24]} />
        <meshStandardMaterial color="#15120e" emissive="#d99613" emissiveIntensity={2.8} metalness={.72} roughness={.2} />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[.34, .022, 10, 48]} />
        <meshBasicMaterial color="#ffe7a0" />
      </mesh>
      <mesh rotation-y={Math.PI / 2}>
        <torusGeometry args={[.31, .012, 10, 48]} />
        <meshBasicMaterial color="#d86a32" />
      </mesh>
      <Text position={[0, -.43, .02]} fontSize={.11} color="#fff2be" anchorX="center" anchorY="middle">TOQUE RARO</Text>
    </group>
  </Float>;
}
export function AuthScene() {
  return <Canvas shadows dpr={[1, 1.5]} camera={{ position: [4.8, 2.8, 6.4], fov: 40 }}>
    <color attach="background" args={["#282018"]} /><fog attach="fog" args={["#282018", 7, 18]} />
    <ambientLight intensity={1.3} /><directionalLight castShadow position={[4, 7, 4]} intensity={2.2} color="#ffd99a" />
    <Suspense fallback={null}><Court compact /><Character position={[0, .08, 0]} facing={.18} action="six" scale={1.15} /><FloatingNumbers /><Environment preset="city" /></Suspense>
  </Canvas>;
}

interface ArenaSceneProps {
  playerAction?: CharacterAction;
  opponentAction?: CharacterAction;
  playerChad?: boolean;
  specialOrbVisible?: boolean;
  specialOrbPosition?: [number, number, number];
  onSpecialOrbClick?: () => void;
}

export function ArenaScene({
  playerAction = "idle",
  opponentAction = "idle",
  playerChad = false,
  specialOrbVisible = false,
  specialOrbPosition = [-.55, 2.25, .7],
  onSpecialOrbClick = noop
}: ArenaSceneProps) {
  return <Canvas shadows dpr={[1, 1.65]} camera={{ position: [0, 2.75, 6.55], fov: 40 }}>
    <color attach="background" args={["#afc8b8"]} /><fog attach="fog" args={["#afc8b8", 11, 22]} />
    <hemisphereLight intensity={1.25} color="#fff4d6" groundColor="#38261d" />
    <directionalLight castShadow position={[-4, 8, 6]} intensity={2.7} color="#fff1ce" shadow-mapSize={[1024, 1024]} />
    <spotLight position={[3.8, 5.5, 3]} intensity={20} angle={.34} penumbra={.8} color="#f1a54f" />
    <Suspense fallback={null}>
      <Court />
      <Character position={[-1.52, .08, 0]} facing={.12} action={playerAction} chadMode={playerChad} scale={1.16} />
      <Character position={[1.52, .08, 0]} facing={-.12} action={opponentAction} color="#397c70" accent="#f08b52" skin="#7c4a35" scale={1.16} />
      {specialOrbVisible ? <SpecialAuraOrb position={specialOrbPosition} onCollect={onSpecialOrbClick} /> : null}
      <ContactShadows position={[0, .03, 0]} opacity={.38} scale={8} blur={2.2} far={4} />
      <RoundedBox args={[3, .8, .12]} radius={.08} position={[0, 3.25, -4.55]}><meshStandardMaterial color="#191713" /></RoundedBox>
      <Text position={[0, 3.25, -4.45]} fontSize={.33} color="#f5b940">AURA  •  EGO</Text>
      <Environment preset="sunset" />
    </Suspense>
  </Canvas>;
}
