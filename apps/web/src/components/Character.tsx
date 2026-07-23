import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";

interface CharacterProps { color?: string; accent?: string; position?: [number, number, number]; facing?: number; action?: "idle" | "six" | "seven" | "win" | "lose"; scale?: number }
export function Character({ color = "#e15437", accent = "#f2c94c", position = [0, 0, 0], facing = 0, action = "idle", scale = 1 }: CharacterProps) {
  const body = useRef<Group>(null), leftArm = useRef<Group>(null), rightArm = useRef<Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (!body.current || !leftArm.current || !rightArm.current) return;
    body.current.position.y = Math.sin(t * 2) * .025;
    const gesture = action === "six" ? 1 : action === "seven" ? -1 : 0;
    const idle = Math.sin(t * 1.8) * .08;
    leftArm.current.rotation.z = -.35 + idle + gesture * .55;
    rightArm.current.rotation.z = .35 - idle + gesture * .55;
    leftArm.current.rotation.x = action === "idle" ? -.15 : -1.05;
    rightArm.current.rotation.x = action === "idle" ? -.15 : -1.05;
    body.current.rotation.z = action === "lose" ? -.08 : Math.sin(t) * .015;
  });
  return <group ref={body} position={position} rotation-y={facing} scale={scale}>
    <mesh position={[0, 1.58, 0]} castShadow><sphereGeometry args={[.34, 24, 20]} /><meshStandardMaterial color="#9b5d3f" roughness={.8} /></mesh>
    <mesh position={[0, 1.67, -.13]} rotation-x={-.2} castShadow><sphereGeometry args={[.35, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#211a17" roughness={1} /></mesh>
    <mesh position={[-.12, 1.59, .3]}><sphereGeometry args={[.027, 10, 8]} /><meshBasicMaterial color="#17120f" /></mesh>
    <mesh position={[.12, 1.59, .3]}><sphereGeometry args={[.027, 10, 8]} /><meshBasicMaterial color="#17120f" /></mesh>
    <mesh position={[0, 1.45, .31]} scale={[1.2, .35, .4]}><sphereGeometry args={[.09, 12, 8, 0, Math.PI]} /><meshBasicMaterial color="#3b211e" /></mesh>
    <mesh position={[0, 1.04, 0]} castShadow><capsuleGeometry args={[.31, .55, 8, 16]} /><meshStandardMaterial color={color} roughness={.72} /></mesh>
    <mesh position={[0, 1.16, .3]}><boxGeometry args={[.28, .07, .03]} /><meshStandardMaterial color={accent} /></mesh>
    <group ref={leftArm} position={[-.34, 1.24, 0]}>
      <mesh position={[-.18, -.25, 0]} rotation-z={-.16} castShadow><capsuleGeometry args={[.09, .38, 6, 10]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[-.31, -.51, .03]} scale={[1.35, .7, 1]} castShadow><sphereGeometry args={[.11, 14, 10]} /><meshStandardMaterial color="#9b5d3f" /></mesh>
    </group>
    <group ref={rightArm} position={[.34, 1.24, 0]}>
      <mesh position={[.18, -.25, 0]} rotation-z={.16} castShadow><capsuleGeometry args={[.09, .38, 6, 10]} /><meshStandardMaterial color={color} /></mesh>
      <mesh position={[.31, -.51, .03]} scale={[1.35, .7, 1]} castShadow><sphereGeometry args={[.11, 14, 10]} /><meshStandardMaterial color="#9b5d3f" /></mesh>
    </group>
    <mesh position={[-.18, .47, 0]} castShadow><capsuleGeometry args={[.12, .62, 7, 12]} /><meshStandardMaterial color="#342d65" /></mesh>
    <mesh position={[.18, .47, 0]} castShadow><capsuleGeometry args={[.12, .62, 7, 12]} /><meshStandardMaterial color="#342d65" /></mesh>
    <mesh position={[-.18, .08, .12]} castShadow><boxGeometry args={[.3, .13, .5]} /><meshStandardMaterial color="#ece3cf" /></mesh>
    <mesh position={[.18, .08, .12]} castShadow><boxGeometry args={[.3, .13, .5]} /><meshStandardMaterial color="#ece3cf" /></mesh>
  </group>;
}
