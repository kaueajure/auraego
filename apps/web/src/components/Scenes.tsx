import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Float, RoundedBox, Text } from "@react-three/drei";
import { Suspense, useEffect, useRef } from "react";
import type { Group } from "three";
import type { WardrobeLook } from "../cosmetics";
import { Character, type CharacterAction } from "./Character";
import { PlayerLookModel } from "./WardrobeScene";

export type ArenaVariant = 0 | 1 | 2;

const ARENAS = [
  {
    background: "#9fb9aa",
    fog: "#9fb9aa",
    floor: "#b6723c",
    line: "#f3e7cd",
    wall: "#3b5e4a",
    accent: "#b84a2f",
    light: "#ef9c4e"
  },
  {
    background: "#d98a66",
    fog: "#9d625a",
    floor: "#48454b",
    line: "#f2c66d",
    wall: "#563846",
    accent: "#f0b54c",
    light: "#ffba72"
  },
  {
    background: "#171a38",
    fog: "#171a38",
    floor: "#222846",
    line: "#55e7dc",
    wall: "#291949",
    accent: "#ff4d9a",
    light: "#8c63ff"
  }
] as const;

function CameraTarget({ y }: { y: number }) {
  const camera = useThree(state => state.camera);
  useEffect(() => {
    camera.lookAt(0, y, 0);
    camera.updateProjectionMatrix();
  }, [camera, y]);
  return null;
}

function Court({ compact = false, variant = 0 }: { compact?: boolean; variant?: ArenaVariant }) {
  const arena = ARENAS[variant];
  return <group>
    <mesh rotation-x={-Math.PI / 2} receiveShadow><planeGeometry args={[18, 12]} /><meshStandardMaterial color={arena.floor} roughness={variant === 2 ? .4 : .65} metalness={variant === 2 ? .18 : 0} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, .012, 0]}><ringGeometry args={[1.35, 1.42, 64]} /><meshBasicMaterial color={arena.line} /></mesh>
    <mesh rotation-x={-Math.PI / 2} position={[0, .014, 0]}><planeGeometry args={[.045, 12]} /><meshBasicMaterial color={arena.line} /></mesh>
    <mesh position={[0, 2.4, -4.9]} receiveShadow><boxGeometry args={[18, 4.8, .25]} /><meshStandardMaterial color={arena.wall} /></mesh>
    <mesh position={[0, 1.8, -4.72]}><boxGeometry args={[2.7, 1.8, .09]} /><meshStandardMaterial color="#e7dbc3" /></mesh>
    <mesh position={[0, 1.65, -4.55]}><torusGeometry args={[.52, .045, 10, 32]} /><meshStandardMaterial color={arena.accent} emissive={variant === 2 ? arena.accent : "#000000"} emissiveIntensity={variant === 2 ? 2 : 0} /></mesh>
    {!compact && variant === 0 && Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[-5.6 + i * 1.4, .45, -4.2]}><boxGeometry args={[.85, .9 + (i % 2) * .2, .7]} /><meshStandardMaterial color={i % 2 ? "#d1a74c" : "#7c3b33"} /></mesh>)}
    {!compact && variant === 1 && <>
      {Array.from({ length: 10 }, (_, i) => {
        const height = 1.15 + (i % 4) * .42;
        return <mesh key={i} position={[-7.2 + i * 1.6, height / 2, -4.35]}>
          <boxGeometry args={[1.15, height, .75]} />
          <meshStandardMaterial color={i % 2 ? "#383642" : "#292c37"} roughness={.82} />
        </mesh>;
      })}
      <mesh position={[-4.7, 2.75, -4.25]}><cylinderGeometry args={[.05, .05, 2.2, 8]} /><meshStandardMaterial color="#c5b17d" /></mesh>
      <mesh position={[-4.7, 3.82, -4.25]} rotation-z={-.24}><boxGeometry args={[1.45, .06, .06]} /><meshStandardMaterial color="#c5b17d" /></mesh>
    </>}
    {!compact && variant === 2 && <>
      {[-6, -3, 3, 6].map((x, index) => <group key={x} position={[x, 1.8, -4.3]}>
        <mesh><boxGeometry args={[.14, 3.5, .22]} /><meshStandardMaterial color="#141329" /></mesh>
        <mesh position={[0, 0, .13]}><boxGeometry args={[.035, 3.15, .02]} /><meshBasicMaterial color={index % 2 ? "#55e7dc" : "#ff4d9a"} /></mesh>
      </group>)}
      <mesh position={[0, .08, -3.9]} rotation-x={-Math.PI / 2}><ringGeometry args={[2.3, 2.34, 64]} /><meshBasicMaterial color="#ff4d9a" /></mesh>
      <pointLight position={[-4, 2.3, -2]} intensity={10} distance={5} color="#55e7dc" />
      <pointLight position={[4, 2.3, -2]} intensity={10} distance={5} color="#ff4d9a" />
    </>}
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

function SpecialAuraOrb({ position }: { position: [number, number, number] }) {
  const orb = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (!orb.current) return;
    const time = clock.elapsedTime;
    orb.current.rotation.y = time * 1.35;
    orb.current.rotation.z = Math.sin(time * 1.6) * .12;
  });
  return <Float speed={2} floatIntensity={.45} rotationIntensity={.18}>
    <group ref={orb} position={position}>
      <pointLight intensity={10} distance={4.5} color="#ffd45e" />
      <pointLight position={[0, 0, .3]} intensity={5} distance={2} color="#ff7145" />

      <mesh>
        <sphereGeometry args={[.45, 40, 32]} />
        <meshBasicMaterial color="#ffc83d" transparent opacity={.1} depthWrite={false} />
      </mesh>
      <mesh castShadow>
        <icosahedronGeometry args={[.27, 4]} />
        <meshStandardMaterial
          color="#ffd765"
          emissive="#f08b18"
          emissiveIntensity={3.8}
          metalness={.78}
          roughness={.16}
        />
      </mesh>
      <mesh scale={.78}>
        <sphereGeometry args={[.27, 32, 24]} />
        <meshStandardMaterial color="#fff3ad" emissive="#ffbd28" emissiveIntensity={2.4} transparent opacity={.64} />
      </mesh>

      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[.38, .018, 10, 64]} />
        <meshBasicMaterial color="#fff0a2" />
      </mesh>
      <mesh rotation-y={Math.PI / 2} rotation-z={.45}>
        <torusGeometry args={[.35, .012, 10, 64]} />
        <meshBasicMaterial color="#ff7048" />
      </mesh>
      <mesh rotation-x={.7} rotation-y={.35}>
        <torusGeometry args={[.42, .009, 8, 64]} />
        <meshBasicMaterial color="#ffd34f" transparent opacity={.8} />
      </mesh>

      {Array.from({ length: 8 }, (_, index) => {
        const angle = index / 8 * Math.PI * 2;
        return <mesh key={index} position={[Math.cos(angle) * .48, Math.sin(angle * 2) * .12, Math.sin(angle) * .48]}>
          <sphereGeometry args={[.025 + index % 2 * .009, 10, 8]} />
          <meshBasicMaterial color={index % 2 ? "#fff3af" : "#ff784d"} />
        </mesh>;
      })}

      <Text position={[0, 0, .285]} fontSize={.105} fontWeight={800} color="#2a1706" anchorX="center" anchorY="middle">GIGA</Text>
      <Text position={[0, -.56, .02]} fontSize={.1} color="#fff2be" anchorX="center" anchorY="middle">COMBO 50 • SEQ</Text>
    </group>
  </Float>;
}
export function AuthScene() {
  return <Canvas shadows dpr={[1, 1.5]} camera={{ position: [4.8, 2.8, 6.4], fov: 40 }}>
    <CameraTarget y={1.05} />
    <color attach="background" args={["#282018"]} /><fog attach="fog" args={["#282018", 7, 18]} />
    <ambientLight intensity={1.3} /><directionalLight castShadow position={[4, 7, 4]} intensity={2.2} color="#ffd99a" />
    <Suspense fallback={null}><Court compact /><Character position={[0, 0, 0]} facing={.18} action="six" scale={1.15} /><FloatingNumbers /><Environment preset="city" /></Suspense>
  </Canvas>;
}

export function LobbyShowcaseScene({ look, pose, cosmetics }: {
  look: WardrobeLook;
  pose: CharacterAction;
  cosmetics?: Record<string, string> | null;
}) {
  const variant: ArenaVariant = look.type === "phil" ? 2 : look.type === "charlie" || look.type === "banana" || look.type === "cj" || look.type === "order67" || look.type === "simao" ? 1 : 0;
  const arena = ARENAS[variant];
  return <Canvas shadows dpr={[1, 1.65]} camera={{ position: [0, 2.35, 6.15], fov: 38 }}>
    <CameraTarget y={1.12} />
    <color attach="background" args={[arena.background]} />
    <fog attach="fog" args={[arena.fog, 9, 20]} />
    <hemisphereLight intensity={1.35} color="#fff3d6" groundColor="#33231b" />
    <directionalLight castShadow position={[-4, 8, 5]} intensity={2.8} color="#ffe8bc" shadow-mapSize={[1024, 1024]} />
    <spotLight position={[3.5, 5, 3]} intensity={18} angle={.36} penumbra={.85} color={arena.light} />
    <Court variant={variant} />
    <Suspense fallback={null}>
      <PlayerLookModel look={look} position={[0, 0, .15]} facing={0} action={pose} scale={1.28} chadMode={pose === "chin"} cosmetics={cosmetics} />
    </Suspense>
    <ContactShadows position={[0, .012, .15]} opacity={.45} scale={5} blur={2.4} far={4} />
    <Suspense fallback={null}>
      <RoundedBox args={[3, .8, .12]} radius={.08} position={[0, 3.25, -4.55]}><meshStandardMaterial color="#191713" /></RoundedBox>
      <Text position={[0, 3.25, -4.45]} fontSize={.33} color="#f5b940">AURA  •  EGO</Text>
      <Environment preset="sunset" />
    </Suspense>
  </Canvas>;
}

interface ArenaSceneProps {
  playerAction?: CharacterAction;
  opponentAction?: CharacterAction;
  playerLook?: WardrobeLook;
  opponentLook?: WardrobeLook;
  playerCosmetics?: Record<string, string> | null;
  opponentCosmetics?: Record<string, string> | null;
  playerChad?: boolean;
  playerScale?: number;
  specialOrbVisible?: boolean;
  specialOrbPosition?: [number, number, number];
  variant?: ArenaVariant;
}

export function ArenaScene({
  playerAction = "idle",
  opponentAction = "idle",
  playerLook,
  opponentLook,
  playerCosmetics,
  opponentCosmetics,
  playerChad = false,
  playerScale = 1,
  specialOrbVisible = false,
  specialOrbPosition = [-.55, 2.25, .7],
  variant = 0
}: ArenaSceneProps) {
  const arena = ARENAS[variant];
  return <Canvas shadows dpr={[1, 1.65]} camera={{ position: [0, 2.5, 7.15], fov: 39 }}>
    <CameraTarget y={1.08} />
    <color attach="background" args={[arena.background]} /><fog attach="fog" args={[arena.fog, 11, 22]} />
    <hemisphereLight intensity={1.25} color="#fff4d6" groundColor="#38261d" />
    <directionalLight castShadow position={[-4, 8, 6]} intensity={2.7} color="#fff1ce" shadow-mapSize={[1024, 1024]} />
    <spotLight position={[3.8, 5.5, 3]} intensity={20} angle={.34} penumbra={.8} color={arena.light} />
    <Suspense fallback={null}>
      <Court variant={variant} />
      {playerLook
        ? <PlayerLookModel look={playerLook} position={[-1.52, 0, 0]} facing={.12} action={playerAction} chadMode={playerChad} scale={1.16 * playerScale} cosmetics={playerCosmetics} />
        : <Character position={[-1.52, 0, 0]} facing={.12} action={playerAction} chadMode={playerChad} scale={1.16 * playerScale} />}
      {opponentLook
        ? <PlayerLookModel look={opponentLook} position={[1.52, 0, 0]} facing={-.12} action={opponentAction} scale={1.16} cosmetics={opponentCosmetics} />
        : <Character position={[1.52, 0, 0]} facing={-.12} action={opponentAction} color="#397c70" accent="#f08b52" skin="#7c4a35" scale={1.16} />}
      {specialOrbVisible ? <SpecialAuraOrb position={specialOrbPosition} /> : null}
      <ContactShadows position={[0, .012, 0]} opacity={.38} scale={8} blur={2.2} far={4} />
      <RoundedBox args={[3, .8, .12]} radius={.08} position={[0, 3.25, -4.55]}><meshStandardMaterial color="#191713" /></RoundedBox>
      <Text position={[0, 3.25, -4.45]} fontSize={.33} color="#f5b940">AURA  •  EGO</Text>
      <Environment preset="sunset" />
    </Suspense>
  </Canvas>;
}
