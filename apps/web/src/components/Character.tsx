import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Euler,
  LoopOnce,
  LoopRepeat,
  Matrix4,
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

export type CharacterAction =
  | "idle"
  | "six"
  | "seven"
  | "chin"
  | "win"
  | "lose"
  | "cross"
  | "victory"
  | "salute"
  | "focus"
  | "champion"
  | "point";

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
  sourceFinger: Vector3;
  sourcePalm: Vector3;
}

interface FingerBoneRig {
  bone: Bone;
  base: Quaternion;
}

interface CharacterRig {
  left: ArmRig;
  right: ArmRig;
  chest: Bone;
  head: Bone;
  baseChest: Quaternion;
  baseHead: Quaternion;
  pelvis: Bone;
  spine: Bone;
  leftLeg: Bone;
  rightLeg: Bone;
  basePelvis: Quaternion;
  baseSpine: Quaternion;
  baseLeftLeg: Quaternion;
  baseRightLeg: Quaternion;
  leftFingers: FingerBoneRig[];
  rightFingers: FingerBoneRig[];
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
  const middle = model.getObjectByName(`middle1${side}`) as Bone;
  const index = model.getObjectByName(`index1${side}`) as Bone;
  const pinky = model.getObjectByName(`pinky1${side}`) as Bone;
  if (!middle || !index || !pinky) {
    throw new Error(`Rig incompleto no player.glb: mão ${side}`);
  }
  const sourceFinger = middle.position.clone().normalize();
  const acrossPalm = pinky.position.clone().sub(index.position).normalize();
  const sourcePalm = sourceFinger.clone().cross(acrossPalm).normalize();
  return {
    upper,
    forearm,
    hand,
    baseUpper: upper.quaternion.clone(),
    baseForearm: forearm.quaternion.clone(),
    baseHand: hand.quaternion.clone(),
    fingerDirection: new Vector3(side === "L" ? .37 : -.37, -.93, 0).normalize(),
    sourceFinger,
    sourcePalm
  };
}

function createFingerRigs(model: Group, side: "L" | "R"): FingerBoneRig[] {
  return ["thumb", "index", "middle", "ring", "pinky"].flatMap(finger =>
    [1, 2, 3].map(segment => {
      const bone = model.getObjectByName(`${finger}${segment}${side}`) as Bone;
      if (!bone) throw new Error(`Rig incompleto no player.glb: ${finger}${segment}${side}`);
      return { bone, base: bone.quaternion.clone() };
    })
  );
}

function poseArmWithIk(
  model: Group,
  arm: ArmRig,
  targetLocal: Vector3,
  bendHintLocal: Vector3,
  handDirectionLocal: Vector3,
  influence: number,
  palmUp = false
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

  let desiredHand: Quaternion;
  if (palmUp) {
    const desiredFinger = handDirectionLocal.clone().normalize();
    const desiredPalm = new Vector3(0, 1, 0);
    const desiredRight = desiredFinger.clone().cross(desiredPalm).normalize();
    const sourceRight = arm.sourceFinger.clone().cross(arm.sourcePalm).normalize();
    const sourceBasis = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(sourceRight, arm.sourceFinger, arm.sourcePalm)
    );
    const desiredBasis = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(desiredRight, desiredFinger, desiredPalm)
    );
    const desiredInModel = desiredBasis.multiply(sourceBasis.invert());
    const desiredWorld = model.getWorldQuaternion(new Quaternion()).multiply(desiredInModel);
    desiredHand = forearmWorld.clone().invert().multiply(desiredWorld);
  } else {
    const worldHandDirection = handDirectionLocal
      .clone()
      .transformDirection(model.matrixWorld)
      .normalize();
    const handWorld = new Quaternion().setFromUnitVectors(
      arm.fingerDirection,
      worldHandDirection
    );
    desiredHand = forearmWorld.clone().invert().multiply(handWorld);
  }

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
    const pelvis = model.getObjectByName("pelvis") as Bone;
    const spine = model.getObjectByName("spine") as Bone;
    const leftLeg = model.getObjectByName("thighL") as Bone;
    const rightLeg = model.getObjectByName("thighR") as Bone;
    if (!chest || !head || !pelvis || !spine || !leftLeg || !rightLeg) {
      throw new Error("Rig incompleto no player.glb: tronco/cabeça");
    }
    return {
      left: createArmRig(model, "L"),
      right: createArmRig(model, "R"),
      chest,
      head,
      baseChest: chest.quaternion.clone(),
      baseHead: head.quaternion.clone(),
      pelvis,
      spine,
      leftLeg,
      rightLeg,
      basePelvis: pelvis.quaternion.clone(),
      baseSpine: spine.quaternion.clone(),
      baseLeftLeg: leftLeg.quaternion.clone(),
      baseRightLeg: rightLeg.quaternion.clone(),
      leftFingers: createFingerRigs(model, "L"),
      rightFingers: createFingerRigs(model, "R")
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
  const gestureBalance = useRef(0);
  const gestureResponsiveness = useRef(8);
  const lastGestureAt = useRef(0);
  const proceduralAction = [
    "six",
    "seven",
    "chin",
    "cross",
    "victory",
    "salute",
    "focus",
    "champion",
    "point",
    "lose"
  ].includes(action);
  const clipAction = proceduralAction ? "idle" : action;

  useEffect(() => {
    const now = performance.now();
    actionStartedAt.current = now;
    if (action === "six" || action === "seven") {
      const interval = lastGestureAt.current ? (now - lastGestureAt.current) / 1000 : .7;
      gestureResponsiveness.current = MathUtils.clamp(
        8 + Math.max(0, .7 - interval) * 24,
        8,
        24
      );
      lastGestureAt.current = now;
    }
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

  useFrame(({ clock }, delta) => {
    const elapsed = (performance.now() - actionStartedAt.current) / 1000;
    const time = clock.elapsedTime;
    const gestureTarget = action === "six" ? 1 : action === "seven" ? -1 : 0;
    gestureBalance.current = MathUtils.damp(
      gestureBalance.current,
      gestureTarget,
      gestureTarget === 0 ? 7 : gestureResponsiveness.current,
      delta
    );
    const gestureArc = Math.abs(gestureBalance.current);
    const gestureDirection = gestureBalance.current < 0 ? -1 : 1;

    if (action === "six" || action === "seven") {
      // Six Seven meme: balança de mãos com palmas pra cima.
      const bounce = Math.sin(time * 15) * .04 * Math.max(gestureArc, .2);
      const leftHeight = .34 * gestureBalance.current + bounce;
      const rightHeight = -.34 * gestureBalance.current - bounce;
      const spread = .1 + .08 * gestureArc;
      poseArmWithIk(
        model,
        rig.left,
        new Vector3(.26 + spread, 1.2 + leftHeight, .36),
        new Vector3(.58, 1.18, .12),
        new Vector3(.1, .08, .98),
        1,
        true
      );
      poseArmWithIk(
        model,
        rig.right,
        new Vector3(-.26 - spread, 1.2 + rightHeight, .36),
        new Vector3(-.58, 1.18, .12),
        new Vector3(-.1, .08, .98),
        1,
        true
      );
    } else if (action === "chin" || chadMode && action === "idle") {
      const enter = action === "chin" ? smoothstep(0, .46, elapsed) : 1;
      const leave = action === "chin" ? 1 - smoothstep(1.92, 2.28, elapsed) : 1;
      const pose = Math.max(enter * leave, chadMode && action === "idle" ? .92 : 0);
      const sway = Math.sin(time * 2.1) * .012;
      poseArmWithIk(
        model,
        rig.left,
        new Vector3(.42 + sway, 1.02, .08),
        new Vector3(.55, 1.12, .04),
        new Vector3(.2, -.9, .15).normalize(),
        pose * .85
      );
      poseArmWithIk(
        model,
        rig.right,
        new Vector3(
          -.05 + sway * .4,
          1.5 + Math.sin(time * 1.7) * .012,
          .22
        ),
        new Vector3(-.58, 1.12, .14),
        new Vector3(-.96, -.08, .08).normalize(),
        pose
      );
      const chestPose = rig.baseChest.clone().multiply(
        new Quaternion().setFromEuler(new Euler(-.08, .03, -.02))
      );
      const headPose = rig.baseHead.clone().multiply(
        new Quaternion().setFromEuler(new Euler(-.16, -.05, .05))
      );
      rig.chest.quaternion.copy(rig.baseChest).slerp(chestPose, pose);
      rig.head.quaternion.copy(rig.baseHead).slerp(headPose, pose);
    } else if (action === "cross") {
      const pose = smoothstep(0, .4, elapsed);
      poseArmWithIk(
        model,
        rig.left,
        new Vector3(-.2, 1.29, .35),
        new Vector3(.55, 1.13, .12),
        new Vector3(-.95, .05, .3).normalize(),
        pose
      );
      poseArmWithIk(
        model,
        rig.right,
        new Vector3(.2, 1.22, .37),
        new Vector3(-.55, 1.08, .1),
        new Vector3(.95, .05, .3).normalize(),
        pose
      );
    } else if (action === "victory") {
      const pose = smoothstep(0, .34, elapsed);
      poseArmWithIk(
        model,
        rig.left,
        new Vector3(.34, 1.88, .12),
        new Vector3(.62, 1.58, .04),
        new Vector3(.2, .96, .1).normalize(),
        pose
      );
      poseArmWithIk(
        model,
        rig.right,
        new Vector3(-.34, 1.88, .12),
        new Vector3(-.62, 1.58, .04),
        new Vector3(-.2, .96, .1).normalize(),
        pose
      );
    } else if (action === "lose") {
      const pose = smoothstep(0, .42, elapsed);
      poseArmWithIk(
        model,
        rig.left,
        new Vector3(.28, .92, .1),
        new Vector3(.48, 1.08, .02),
        new Vector3(.08, -.98, .08).normalize(),
        pose
      );
      poseArmWithIk(
        model,
        rig.right,
        new Vector3(-.28, .9, .12),
        new Vector3(-.48, 1.06, .02),
        new Vector3(-.08, -.98, .08).normalize(),
        pose
      );
      const headPose = new Quaternion().setFromEuler(new Euler(.28, 0, 0));
      const chestPose = new Quaternion().setFromEuler(new Euler(.14, 0, 0));
      rig.head.quaternion.copy(rig.baseHead).slerp(headPose, pose);
      rig.chest.quaternion.copy(rig.baseChest).slerp(chestPose, pose);
    } else if (action === "salute") {
      const pose = smoothstep(0, .38, elapsed);
      poseArmWithIk(
        model,
        rig.right,
        new Vector3(-.12, 1.68, .28),
        new Vector3(-.58, 1.45, .1),
        new Vector3(.96, .08, .2).normalize(),
        pose
      );
    } else if (action === "focus") {
      const pose = smoothstep(0, .42, elapsed);
      poseArmWithIk(
        model,
        rig.left,
        new Vector3(.055, 1.34, .44),
        new Vector3(.5, 1.14, .14),
        new Vector3(-.12, .96, .22).normalize(),
        pose
      );
      poseArmWithIk(
        model,
        rig.right,
        new Vector3(-.055, 1.34, .44),
        new Vector3(-.5, 1.14, .14),
        new Vector3(.12, .96, .22).normalize(),
        pose
      );
    } else if (action === "champion") {
      const pose = smoothstep(0, .36, elapsed);
      poseArmWithIk(
        model,
        rig.left,
        new Vector3(.25, 1.93, .16),
        new Vector3(.62, 1.58, .04),
        new Vector3(.12, .98, .04).normalize(),
        pose
      );
    } else if (action === "point") {
      const pose = smoothstep(0, .36, elapsed);
      poseArmWithIk(
        model,
        rig.right,
        new Vector3(-.2, 1.38, .58),
        new Vector3(-.55, 1.26, .16),
        new Vector3(0, 0, 1),
        pose
      );
      poseArmWithIk(
        model,
        rig.left,
        new Vector3(.34, 1.04, .18),
        new Vector3(.55, 1.14, .04),
        new Vector3(.15, -.96, .2).normalize(),
        pose
      );
      poseArmWithIk(
        model,
        rig.right,
        new Vector3(-.33, 1.02, .2),
        new Vector3(-.54, 1.12, .04),
        new Vector3(-.15, -.96, .2).normalize(),
        pose
      );
    } else if (action === "idle" || action === "win") {
      const returnSpeed = 1 - Math.exp(-delta * 14);
      [rig.left, rig.right].forEach(arm => {
        arm.upper.quaternion.slerp(arm.baseUpper, returnSpeed);
        arm.forearm.quaternion.slerp(arm.baseForearm, returnSpeed);
        arm.hand.quaternion.slerp(arm.baseHand, returnSpeed);
      });
    }

    const gestureActive = action === "six" || action === "seven";
    const gestureEnergy = gestureActive ? 1 : 0;
    const breath = Math.sin(time * 1.65);
    const fingerFlex = gestureActive
      ? .035 + gestureArc * .085
      : Math.sin(time * 1.8) * .012;
    const animateFingers = (fingers: FingerBoneRig[], chinCurl: boolean) => {
      fingers.forEach(({ bone, base }, index) => {
        const depth = (index % 3) / 2;
        const curl = chinCurl ? .12 + depth * .15 : fingerFlex * (1 + depth * .5);
        const spread = gestureActive && depth === 0 ? Math.sin(index * 1.3) * .035 : 0;
        bone.quaternion.copy(base).multiply(
          new Quaternion().setFromEuler(new Euler(curl, spread, 0))
        );
      });
    };
    animateFingers(rig.leftFingers, false);
    animateFingers(rig.rightFingers, action === "chin");

    if (action !== "win" && action !== "lose" && action !== "victory" && action !== "chin" && !(chadMode && action === "idle")) {
      const weightShift = gestureActive
        ? gestureArc * gestureDirection
        : Math.sin(time * .85);
      if (action !== "six" && action !== "seven") {
        rig.chest.quaternion.copy(rig.baseChest).multiply(
          new Quaternion().setFromEuler(new Euler(
            breath * .012,
            weightShift * .022 * gestureEnergy,
            -weightShift * .018 * gestureEnergy
          ))
        );
        rig.head.quaternion.copy(rig.baseHead).multiply(
          new Quaternion().setFromEuler(new Euler(
            -breath * .008,
            -weightShift * .03 * gestureEnergy,
            weightShift * .014 * gestureEnergy
          ))
        );
      }
      rig.spine.quaternion.copy(rig.baseSpine).multiply(
        new Quaternion().setFromEuler(new Euler(
          breath * .008,
          -weightShift * .018 * gestureEnergy,
          weightShift * .025 * gestureEnergy
        ))
      );
      rig.pelvis.quaternion.copy(rig.basePelvis).multiply(
        new Quaternion().setFromEuler(new Euler(
          0,
          weightShift * .014 * gestureEnergy,
          -weightShift * (.016 + .026 * gestureEnergy)
        ))
      );
      rig.leftLeg.quaternion.copy(rig.baseLeftLeg).multiply(
        new Quaternion().setFromEuler(new Euler(weightShift * .018 * gestureEnergy, 0, weightShift * .012))
      );
      rig.rightLeg.quaternion.copy(rig.baseRightLeg).multiply(
        new Quaternion().setFromEuler(new Euler(-weightShift * .018 * gestureEnergy, 0, -weightShift * .012))
      );
      const hop = gestureActive ? Math.abs(Math.sin(time * 15)) * .018 * gestureArc : 0;
      model.position.y = hop;
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
