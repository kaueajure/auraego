import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Euler,
  LoopOnce,
  LoopRepeat,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  SkinnedMesh,
  Vector3,
  type Bone,
  type Group
} from "three";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

export type CharacterAction = "idle" | "six" | "seven" | "chin" | "win" | "lose";

interface CharacterProps {
  color?: string;
  accent?: string;
  skin?: string;
  hair?: string;
  pants?: string;
  shoes?: string;
  position?: [number, number, number];
  facing?: number;
  action?: CharacterAction;
  scale?: number;
  chadMode?: boolean;
}

const MODEL_URL = "/models/player.glb";

type BoneWeight = [name: string, weight: number];

interface ArmRig {
  upper: Bone;
  forearm: Bone;
  hand: Bone;
  baseUpper: Quaternion;
  baseForearm: Quaternion;
  baseHand: Quaternion;
  fingerDirection: Vector3;
}

interface CharacterRig {
  left: ArmRig;
  right: ArmRig;
  chest: Bone;
  head: Bone;
  baseChest: Quaternion;
  baseHead: Quaternion;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (from: number, to: number, value: number) => {
  const progress = clamp01((value - from) / (to - from));
  return progress * progress * (3 - 2 * progress);
};

function weightsForVertex(meshName: string, x: number, y: number, z: number): BoneWeight[] {
  const side = x >= 0 ? "L" : "R";
  const absX = Math.abs(x);

  if (meshName === "Hair" || meshName === "Eyes" || meshName === "FacialLines") {
    return [["head", 1]];
  }
  if (meshName === "Shoes") return [[`foot.${side}`, 1]];
  if (meshName === "Pants") {
    if (y > .84) return [["pelvis", .82], [`thigh.${side}`, .18]];
    return [[`thigh.${side}`, .88], ["pelvis", .12]];
  }
  if (meshName === "Accent") {
    if (y < 1.14 || absX < .29) return [["spine", .72], ["pelvis", .28]];
    return [[`upper_arm.${side}`, .86], [`clavicle.${side}`, .14]];
  }
  if (meshName === "Shirt") {
    if (absX > .275) {
      return [
        [`upper_arm.${side}`, .68],
        [`clavicle.${side}`, .22],
        ["chest", .1]
      ];
    }
    if (y > 1.3) return [["chest", .82], ["spine", .18]];
    return [["spine", .72], ["chest", .28]];
  }

  // O corpo gerado veio com pesos calculados por proximidade: mãos próximas
  // da cintura acabaram deformando abdômen, shorts e faixa da camisa.
  if (meshName === "Body") {
    if (y > 1.48) {
      if (y < 1.63 && z > .055) return [["jaw", .72], ["head", .28]];
      return [["head", 1]];
    }
    if (y > 1.37 && absX < .21) return [["neck", .72], ["chest", .28]];

    const armVertex = absX > .35 && y > .56;
    if (armVertex) {
      if (y > 1.2) return [[`upper_arm.${side}`, .78], [`clavicle.${side}`, .22]];
      if (y > .82 && absX < .61) {
        return [[`forearm.${side}`, .8], [`upper_arm.${side}`, .2]];
      }
      return [[`hand.${side}`, .86], [`forearm.${side}`, .14]];
    }

    if (y > 1.24) return [["chest", .82], ["spine", .18]];
    if (y > .91) return [["spine", .72], ["pelvis", .28]];
    if (y > .5) return [[`thigh.${side}`, .82], ["pelvis", .18]];
    if (y > .13) return [[`lower_leg.${side}`, .88], [`thigh.${side}`, .12]];
    return [[`foot.${side}`, .9], [`lower_leg.${side}`, .1]];
  }

  return [["pelvis", 1]];
}

function repairSkinWeights(mesh: SkinnedMesh) {
  const geometry = mesh.geometry;
  const positions = geometry.getAttribute("position");
  const skinIndex = geometry.getAttribute("skinIndex");
  const skinWeight = geometry.getAttribute("skinWeight");
  if (!positions || !skinIndex || !skinWeight) return;

  const boneIndices = new Map(mesh.skeleton.bones.map((bone, index) => [bone.name, index]));
  const resolveBone = (name: string) =>
    boneIndices.get(name) ?? boneIndices.get(name.replace(".", ""));
  const fallback = boneIndices.get("pelvis") ?? 0;

  for (let index = 0; index < positions.count; index += 1) {
    const requested = weightsForVertex(
      mesh.name,
      positions.getX(index),
      positions.getY(index),
      positions.getZ(index)
    );
    const resolved = requested
      .map(([name, weight]) => [resolveBone(name) ?? fallback, weight] as const)
      .slice(0, 4);
    const total = resolved.reduce((sum, [, weight]) => sum + weight, 0) || 1;
    const indices = [fallback, fallback, fallback, fallback];
    const weights = [0, 0, 0, 0];
    resolved.forEach(([boneIndex, weight], slot) => {
      indices[slot] = boneIndex;
      weights[slot] = weight / total;
    });
    skinIndex.setXYZW(index, indices[0], indices[1], indices[2], indices[3]);
    skinWeight.setXYZW(index, weights[0], weights[1], weights[2], weights[3]);
  }

  skinIndex.needsUpdate = true;
  skinWeight.needsUpdate = true;
}

function createArmRig(model: Group, side: "L" | "R"): ArmRig {
  const upper = model.getObjectByName(`upper_arm${side}`) as Bone;
  const forearm = model.getObjectByName(`forearm${side}`) as Bone;
  const hand = model.getObjectByName(`hand${side}`) as Bone;
  if (!upper || !forearm || !hand) {
    throw new Error(`Rig incompleto no player.glb: braço ${side}`);
  }
  return {
    upper,
    forearm,
    hand,
    baseUpper: upper.quaternion.clone(),
    baseForearm: forearm.quaternion.clone(),
    baseHand: hand.quaternion.clone(),
    fingerDirection: new Vector3(side === "L" ? .37 : -.37, -.93, 0).normalize()
  };
}

function poseArmWithIk(
  model: Group,
  arm: ArmRig,
  targetLocal: Vector3,
  bendHintLocal: Vector3,
  handDirectionLocal: Vector3,
  influence: number
) {
  arm.upper.quaternion.copy(arm.baseUpper);
  arm.forearm.quaternion.copy(arm.baseForearm);
  arm.hand.quaternion.copy(arm.baseHand);
  model.updateMatrixWorld(true);

  const shoulder = arm.upper.getWorldPosition(new Vector3());
  const elbowRest = arm.forearm.getWorldPosition(new Vector3());
  const wristRest = arm.hand.getWorldPosition(new Vector3());
  const target = model.localToWorld(targetLocal.clone());
  const bendHint = model.localToWorld(bendHintLocal.clone());
  const firstLength = shoulder.distanceTo(elbowRest);
  const secondLength = elbowRest.distanceTo(wristRest);

  const targetOffset = target.clone().sub(shoulder);
  const targetDistance = MathUtils.clamp(
    targetOffset.length(),
    Math.abs(firstLength - secondLength) + .0001,
    firstLength + secondLength - .0001
  );
  const targetDirection = targetOffset.normalize();
  const bendOffset = bendHint.sub(shoulder);
  const bendDirection = bendOffset
    .clone()
    .addScaledVector(targetDirection, -bendOffset.dot(targetDirection));
  if (bendDirection.lengthSq() < .000001) bendDirection.set(0, -1, 0);
  bendDirection.normalize();

  const along = (
    firstLength * firstLength
    - secondLength * secondLength
    + targetDistance * targetDistance
  ) / (2 * targetDistance);
  const away = Math.sqrt(Math.max(0, firstLength * firstLength - along * along));
  const elbow = shoulder
    .clone()
    .addScaledVector(targetDirection, along)
    .addScaledVector(bendDirection, away);

  const upperDirection = elbow.clone().sub(shoulder).normalize();
  const forearmDirection = target.clone().sub(elbow).normalize();
  const upperWorld = new Quaternion().setFromUnitVectors(
    arm.forearm.position.clone().normalize(),
    upperDirection
  );
  const forearmWorld = new Quaternion().setFromUnitVectors(
    arm.hand.position.clone().normalize(),
    forearmDirection
  );
  const parentWorld = arm.upper.parent!.getWorldQuaternion(new Quaternion());
  const desiredUpper = parentWorld.clone().invert().multiply(upperWorld);
  const desiredForearm = upperWorld.clone().invert().multiply(forearmWorld);

  const worldHandDirection = handDirectionLocal
    .clone()
    .transformDirection(model.matrixWorld)
    .normalize();
  const handWorld = new Quaternion().setFromUnitVectors(
    arm.fingerDirection,
    worldHandDirection
  );
  const desiredHand = forearmWorld.clone().invert().multiply(handWorld);

  arm.upper.quaternion.copy(arm.baseUpper).slerp(desiredUpper, influence);
  arm.forearm.quaternion.copy(arm.baseForearm).slerp(desiredForearm, influence);
  arm.hand.quaternion.copy(arm.baseHand).slerp(desiredHand, influence);
}

export function Character({
  color = "#b6402c",
  accent = "#f2c94c",
  skin = "#a96748",
  hair = "#201713",
  pants = "#292542",
  shoes = "#e8dfcf",
  position = [0, 0, 0],
  facing = 0,
  action = "idle",
  scale = 1,
  chadMode = false
}: CharacterProps) {
  const { scene, animations } = useGLTF(MODEL_URL);

  // Cada personagem precisa de uma cópia própria do esqueleto e dos materiais.
  const model = useMemo(() => {
    const clone = SkeletonUtils.clone(scene) as Group;
    clone.traverse(object => {
      if (!(object instanceof Mesh)) return;
      object.geometry = object.geometry.clone();
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = false;
      object.material = Array.isArray(object.material)
        ? object.material.map(material => material.clone())
        : object.material.clone();
      if (object instanceof SkinnedMesh) repairSkinWeights(object);
    });
    return clone;
  }, [scene]);

  const rig = useMemo<CharacterRig>(() => {
    const chest = model.getObjectByName("chest") as Bone;
    const head = model.getObjectByName("head") as Bone;
    if (!chest || !head) throw new Error("Rig incompleto no player.glb: tronco/cabeça");
    return {
      left: createArmRig(model, "L"),
      right: createArmRig(model, "R"),
      chest,
      head,
      baseChest: chest.quaternion.clone(),
      baseHead: head.quaternion.clone()
    };
  }, [model]);

  const morphMeshes = useMemo(() => {
    const meshes: Mesh[] = [];
    model.traverse(object => {
      if (
        object instanceof Mesh
        && object.morphTargetDictionary?.GigaJaw !== undefined
        && object.morphTargetInfluences
      ) {
        meshes.push(object);
      }
    });
    return meshes;
  }, [model]);

  const { actions } = useAnimations(animations, model);
  const actionStartedAt = useRef(performance.now());
  const proceduralAction = action === "six" || action === "seven" || action === "chin";
  const clipAction = proceduralAction ? "idle" : action;

  useEffect(() => {
    actionStartedAt.current = performance.now();
  }, [action]);

  useEffect(() => {
    const colors: Record<string, string> = {
      MAT_Skin: skin,
      MAT_Hair: hair,
      MAT_Eyebrows: hair,
      MAT_Shirt: color,
      MAT_Pants: pants,
      MAT_Shoes: shoes,
      MAT_Accent: accent
    };

    model.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => {
        if (!(material instanceof MeshStandardMaterial)) return;
        const nextColor = colors[material.name];
        if (nextColor) material.color.set(nextColor);
      });
    });
  }, [accent, color, hair, model, pants, shoes, skin]);

  useEffect(() => {
    const nextAction = actions[clipAction] ?? actions.idle;
    if (!nextAction) return;

    const looping = clipAction === "idle";
    nextAction.enabled = true;
    nextAction.clampWhenFinished = !looping;
    nextAction.setLoop(looping ? LoopRepeat : LoopOnce, looping ? Infinity : 1);
    nextAction.reset().fadeIn(looping ? .16 : .035).play();

    return () => {
      nextAction.fadeOut(looping ? .1 : .045);
    };
  }, [actions, clipAction]);

  useFrame((_, delta) => {
    const elapsed = (performance.now() - actionStartedAt.current) / 1000;

    if (action === "six" || action === "seven") {
      const pulse = smoothstep(0, .11, elapsed);
      const activeArm = action === "six" ? rig.left : rig.right;
      const side = action === "six" ? 1 : -1;
      poseArmWithIk(
        model,
        activeArm,
        new Vector3(side * .16, 1.36, .54),
        new Vector3(side * .54, 1.12, .2),
        new Vector3(side * .06, -.96, .28).normalize(),
        pulse
      );
    } else if (action === "chin") {
      const enter = smoothstep(0, .46, elapsed);
      const leave = 1 - smoothstep(1.92, 2.28, elapsed);
      const pose = enter * leave;
      const sweep = smoothstep(.68, 1.65, elapsed);
      poseArmWithIk(
        model,
        rig.right,
        new Vector3(
          MathUtils.lerp(.13, -.065, sweep),
          1.525 + Math.sin(sweep * Math.PI) * .014,
          .205
        ),
        new Vector3(-.58, 1.08, .16),
        new Vector3(-.98, MathUtils.lerp(-.18, -.06, sweep), .04).normalize(),
        pose
      );
      const chestPose = rig.baseChest.clone().multiply(
        new Quaternion().setFromEuler(new Euler(-.055, 0, -.018))
      );
      const headPose = rig.baseHead.clone().multiply(
        new Quaternion().setFromEuler(new Euler(-.12, -.025, .018))
      );
      rig.chest.quaternion.copy(rig.baseChest).slerp(chestPose, pose);
      rig.head.quaternion.copy(rig.baseHead).slerp(headPose, pose);
    } else if (action === "idle") {
      const returnSpeed = 1 - Math.exp(-delta * 14);
      [rig.left, rig.right].forEach(arm => {
        arm.upper.quaternion.slerp(arm.baseUpper, returnSpeed);
        arm.forearm.quaternion.slerp(arm.baseForearm, returnSpeed);
        arm.hand.quaternion.slerp(arm.baseHand, returnSpeed);
      });
    }

    const target = chadMode ? 1 : 0;
    morphMeshes.forEach(mesh => {
      const index = mesh.morphTargetDictionary?.GigaJaw;
      if (index === undefined || !mesh.morphTargetInfluences) return;
      mesh.morphTargetInfluences[index] = MathUtils.damp(
        mesh.morphTargetInfluences[index] ?? 0,
        target,
        chadMode ? 8 : 5,
        delta
      );
    });

  });

  return (
    <group position={position} rotation-y={facing} scale={scale}>
      <primitive object={model} />
    </group>
  );
}

useGLTF.preload(MODEL_URL);
