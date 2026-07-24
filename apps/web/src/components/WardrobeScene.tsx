import { ContactShadows, Environment, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Bone, Box3, BufferAttribute, Euler, MathUtils, Matrix4, Mesh, Quaternion, SkinnedMesh, Vector3, type Group, type Object3D } from "three";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import type { WardrobeLook } from "../cosmetics";
import { Character, type CharacterAction } from "./Character";

interface PlayerLookModelProps {
  look: WardrobeLook;
  position?: [number, number, number];
  facing?: number;
  action?: CharacterAction;
  scale?: number;
  chadMode?: boolean;
  cosmetics?: Record<string, string> | null;
}

interface EmiArmRig {
  upper: Bone;
  forearm: Bone;
  hand: Bone;
  baseUpper: Quaternion;
  baseForearm: Quaternion;
  baseHand: Quaternion;
  sourceFinger: Vector3;
  sourcePalm: Vector3;
}

interface RigNames {
  left: { upper: string; forearm: string; hand: string };
  right: { upper: string; forearm: string; hand: string };
  chest: string;
  head: string;
  hips: string;
  spine: string;
  leftLeg: string;
  rightLeg: string;
  leftFingerPrefixes: string[];
  rightFingerPrefixes: string[];
  flipLeftPalm?: boolean;
}

const EMI_RIG: RigNames = {
  left: { upper: "LeftArm", forearm: "LeftForeArm", hand: "LeftHand" },
  right: { upper: "RightArm", forearm: "RightForeArm", hand: "RightHand" },
  chest: "Spine2",
  head: "Head",
  hips: "Hips",
  spine: "Spine1",
  leftLeg: "LeftUpLeg",
  rightLeg: "RightUpLeg",
  leftFingerPrefixes: ["LeftHandThumb", "LeftHandIndex", "LeftHandMiddle", "LeftHandRing", "LeftHandPinky"],
  rightFingerPrefixes: ["RightHandThumb", "RightHandIndex", "RightHandMiddle", "RightHandRing", "RightHandPinky"],
  flipLeftPalm: true
};

const CHARLIE_RIG: RigNames = {
  left: { upper: "Left_arm_030_42", forearm: "Left_elbow_031_43", hand: "Left_wrist_032_44" },
  right: { upper: "Right_arm_014_22", forearm: "Right_elbow_015_23", hand: "Right_wrist_016_24" },
  chest: "Upper_Chest_04_9",
  head: "Head_06_11",
  hips: "Hips_01_6",
  spine: "Chest_03_8",
  leftLeg: "Left_leg_049_68",
  rightLeg: "Right_leg_044_61",
  leftFingerPrefixes: ["Index_L_", "Middle_L_", "Ring_L_", "Little_L_"],
  rightFingerPrefixes: ["Index_R_", "Middle_R_", "Ring_R_", "Little_R_"]
};

/** Fortnite UE mannequin (Banana) — nomes já vêm sem espaços. */
const BANANA_RIG: RigNames = {
  left: { upper: "upperarm_l_011", forearm: "lowerarm_l_012", hand: "hand_l_013" },
  right: { upper: "upperarm_r_039", forearm: "lowerarm_r_040", hand: "hand_r_041" },
  chest: "spine_05_09",
  head: "head_068",
  hips: "pelvis_04",
  spine: "spine_03_07",
  leftLeg: "thigh_l_074",
  rightLeg: "thigh_r_082",
  leftFingerPrefixes: ["thumb_01_l_", "index_01_l_", "middle_01_l_", "ring_01_l_", "pinky_01_l_"],
  rightFingerPrefixes: ["thumb_01_r_", "index_01_r_", "middle_01_r_", "ring_01_r_", "pinky_01_r_"]
};

/** Carl Johnson (GTA SA / Sketchfab) — Three.js troca espaços por `_`. */
const CJ_RIG: RigNames = {
  left: { upper: "arm_left_shoulder_2_039", forearm: "arm_left_elbow_040", hand: "arm_left_wrist_041" },
  right: { upper: "arm_right_shoulder_2_049", forearm: "arm_right_elbow_050", hand: "arm_right_wrist_051" },
  chest: "spine_upper_013",
  head: "head_neck_upper_015",
  hips: "pelvis_02",
  spine: "spine_middle_012",
  leftLeg: "leg_left_thigh_03",
  rightLeg: "leg_right_thigh_07",
  leftFingerPrefixes: ["arm_left_finger_1a", "arm_left_finger_2a"],
  rightFingerPrefixes: ["arm_right_finger_1a", "arm_right_finger_2a"],
  flipLeftPalm: true
};

/** Order Number 67 / Brainr — Three.js remove `.` dos nomes. */
const ORDER67_RIG: RigNames = {
  left: { upper: "upper_armL001_19", forearm: "forearmL_18", hand: "handL_16" },
  right: { upper: "upper_armR001_40", forearm: "forearmR_39", hand: "handR_37" },
  chest: "spine002_0",
  head: "spine006_44",
  hips: "spine_64",
  spine: "spine001_51",
  leftLeg: "thighL_57",
  rightLeg: "thighR_63",
  leftFingerPrefixes: ["thumb01L", "f_index01L", "f_middle01L", "f_ring01L"],
  rightFingerPrefixes: ["thumb01R", "f_index01R", "f_middle01R", "f_ring01R"],
  flipLeftPalm: true
};

interface AnimatedBone {
  bone: Bone;
  base: Quaternion;
}

function findAnimatedBones(model: Group, prefixes: string[]): AnimatedBone[] {
  const bones: AnimatedBone[] = [];
  model.traverse(object => {
    if (
      object instanceof Bone
      && prefixes.some(prefix => object.name.startsWith(prefix))
      && !object.name.toLowerCase().includes("end")
    ) {
      bones.push({ bone: object, base: object.quaternion.clone() });
    }
  });
  return bones;
}

/** Remove empties do Sketchfab (scale ~100) que poluem o bounding box. */
function stripEmptyHelpers(root: Object3D) {
  const doomed: Object3D[] = [];
  root.traverse(object => {
    if (object instanceof Mesh || object instanceof Bone) return;
    if (object.children.length > 0) return;
    if (Math.abs(object.scale.x) > 10 || Math.abs(object.position.x) > 100) doomed.push(object);
  });
  for (const object of doomed) object.removeFromParent();
}

function boundsFromSkinnedMeshes(root: Object3D) {
  const bounds = new Box3();
  let found = false;
  root.updateMatrixWorld(true);
  root.traverse(object => {
    if (!(object instanceof SkinnedMesh) && !(object instanceof Mesh)) return;
    bounds.expandByObject(object);
    found = true;
  });
  return found ? bounds : new Box3().setFromObject(root);
}

function fitCloneHeight(clone: Group, fitHeight: number) {
  clone.updateMatrixWorld(true);
  const bounds = boundsFromSkinnedMeshes(clone);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const nextScale = fitHeight / Math.max(size.y, .001);
  clone.scale.setScalar(nextScale);
  clone.position.set(-center.x * nextScale, -bounds.min.y * nextScale, -center.z * nextScale);
  clone.updateMatrixWorld(true);
  const fitted = boundsFromSkinnedMeshes(clone);
  clone.position.y -= fitted.min.y;
  clone.updateMatrixWorld(true);
}

function prepareRiggedClone(scene: Group, fitHeight?: number) {
  const clone = SkeletonUtils.clone(scene) as Group;
  stripEmptyHelpers(clone);
  clone.traverse(object => {
    if (!(object instanceof Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    object.frustumCulled = false;
  });
  if (fitHeight) fitCloneHeight(clone, fitHeight);
  return clone;
}

function findFingerRoots(model: Group, prefixes: string[]): Bone[] {
  const roots: Bone[] = [];
  const seen = new Set<string>();
  for (const prefix of prefixes) {
    const matches: Bone[] = [];
    model.traverse(object => {
      if (
        object instanceof Bone
        && object.name.startsWith(prefix)
        && !object.name.toLowerCase().includes("end")
      ) {
        matches.push(object);
      }
    });
    for (const bone of matches) {
      const parent = bone.parent;
      const parentInChain = parent instanceof Bone && parent.name.startsWith(prefix);
      if (parentInChain || seen.has(bone.uuid)) continue;
      seen.add(bone.uuid);
      roots.push(bone);
    }
  }
  return roots;
}

function createAvatarArmRig(
  model: Group,
  names: { upper: string; forearm: string; hand: string },
  fingerPrefixes: string[],
  flipPalm = false
): EmiArmRig {
  const upper = model.getObjectByName(names.upper) as Bone;
  const forearm = model.getObjectByName(names.forearm) as Bone;
  const hand = model.getObjectByName(names.hand) as Bone;
  if (!upper || !forearm || !hand) throw new Error(`Rig incompleto: ${names.upper}`);
  model.updateMatrixWorld(true);
  let fingerRoots = findFingerRoots(model, fingerPrefixes);
  // Fallback: filhos diretos da mão / netos tipo dedo, para rigs com poucos dedos.
  if (fingerRoots.length < 2) {
    const extras: Bone[] = [];
    hand.traverse(object => {
      if (
        object instanceof Bone
        && object !== hand
        && object.parent instanceof Bone
        && (object.parent === hand || object.parent.parent === hand)
        && /finger|thumb|index|middle|ring|pinky|f_/i.test(object.name)
        && !/end|02|03|2b|2c|1b|1c|b_|c_/i.test(object.name)
      ) {
        extras.push(object);
      }
    });
    const known = new Set(fingerRoots.map(bone => bone.uuid));
    for (const bone of extras) {
      if (known.has(bone.uuid)) continue;
      known.add(bone.uuid);
      fingerRoots.push(bone);
    }
  }

  let sourceFinger: Vector3;
  let sourcePalm: Vector3;
  if (fingerRoots.length >= 2) {
    const fingerPoints = fingerRoots.map(bone =>
      hand.worldToLocal(bone.getWorldPosition(new Vector3()))
    );
    const palmPoints = fingerRoots[0].name.toLowerCase().includes("thumb")
      ? fingerPoints.slice(1)
      : fingerPoints;
    const usablePalm = palmPoints.length >= 2 ? palmPoints : fingerPoints;
    sourceFinger = usablePalm
      .reduce((sum, point) => sum.add(point), new Vector3())
      .normalize();
    const acrossPalm = usablePalm.at(-1)!.clone().sub(usablePalm[0]).normalize();
    sourcePalm = sourceFinger.clone().cross(acrossPalm);
    if (sourcePalm.lengthSq() < .000001) sourcePalm.set(0, 0, 1);
    else sourcePalm.normalize();
  } else {
    // Rigs sem dedos (ex.: Simão): eixo da mão a partir do antebraço → mão.
    const forearmWorld = forearm.getWorldPosition(new Vector3());
    const handWorld = hand.getWorldPosition(new Vector3());
    const along = handWorld.clone().sub(forearmWorld);
    if (along.lengthSq() < .000001) along.set(0, -1, 0);
    else along.normalize();
    const tipWorld = handWorld.clone().addScaledVector(along, .08);
    sourceFinger = hand.worldToLocal(tipWorld);
    if (sourceFinger.lengthSq() < .000001) sourceFinger.set(0, 1, 0);
    else sourceFinger.normalize();
    const upHint = hand.worldToLocal(handWorld.clone().add(new Vector3(0, 1, 0)));
    sourcePalm = sourceFinger.clone().cross(upHint);
    if (sourcePalm.lengthSq() < .000001) {
      sourcePalm = sourceFinger.clone().cross(new Vector3(1, 0, 0));
    }
    if (sourcePalm.lengthSq() < .000001) sourcePalm.set(0, 0, 1);
    else sourcePalm.normalize();
    // Sem dedos o eixo é estimado: escolhe a normal que aponta mais pra cima no rest.
    const palmWorld = sourcePalm.clone().transformDirection(hand.matrixWorld);
    if (palmWorld.y < 0) sourcePalm.multiplyScalar(-1);
  }
  if (flipPalm) sourcePalm.multiplyScalar(-1);
  return {
    upper,
    forearm,
    hand,
    baseUpper: upper.quaternion.clone(),
    baseForearm: forearm.quaternion.clone(),
    baseHand: hand.quaternion.clone(),
    sourceFinger,
    sourcePalm
  };
}

function solveEmiArm(
  model: Group,
  arm: EmiArmRig,
  targetLocal: Vector3,
  bendHintLocal: Vector3,
  influence: number,
  palmUpDirection?: Vector3
) {
  arm.upper.quaternion.copy(arm.baseUpper);
  arm.forearm.quaternion.copy(arm.baseForearm);
  arm.hand.quaternion.copy(arm.baseHand);
  model.updateMatrixWorld(true);

  if (influence <= .0001) return;

  const shoulder = arm.upper.getWorldPosition(new Vector3());
  const restElbow = arm.forearm.getWorldPosition(new Vector3());
  const restWrist = arm.hand.getWorldPosition(new Vector3());
  const target = model.localToWorld(targetLocal.clone());
  const bendHint = model.localToWorld(bendHintLocal.clone());
  const upperLength = shoulder.distanceTo(restElbow);
  const forearmLength = restElbow.distanceTo(restWrist);
  const targetOffset = target.clone().sub(shoulder);
  const targetDistance = MathUtils.clamp(
    targetOffset.length(),
    Math.abs(upperLength - forearmLength) + .001,
    upperLength + forearmLength - .001
  );
  const targetDirection = targetOffset.normalize();
  const bendOffset = bendHint.sub(shoulder);
  const bendDirection = bendOffset.addScaledVector(
    targetDirection,
    -bendOffset.dot(targetDirection)
  );
  if (bendDirection.lengthSq() < .000001) bendDirection.set(0, -1, 0);
  bendDirection.normalize();

  const elbowAlong = (
    upperLength * upperLength
    - forearmLength * forearmLength
    + targetDistance * targetDistance
  ) / (2 * targetDistance);
  const elbowAway = Math.sqrt(Math.max(0, upperLength * upperLength - elbowAlong * elbowAlong));
  const desiredElbow = shoulder.clone()
    .addScaledVector(targetDirection, elbowAlong)
    .addScaledVector(bendDirection, elbowAway);

  const upperWorld = arm.upper.getWorldQuaternion(new Quaternion());
  const upperDelta = new Quaternion().setFromUnitVectors(
    restElbow.clone().sub(shoulder).normalize(),
    desiredElbow.clone().sub(shoulder).normalize()
  );
  const desiredUpperWorld = upperDelta.multiply(upperWorld);
  const upperParentWorld = arm.upper.parent!.getWorldQuaternion(new Quaternion());
  const desiredUpperLocal = upperParentWorld.invert().multiply(desiredUpperWorld);
  arm.upper.quaternion.copy(desiredUpperLocal);
  model.updateMatrixWorld(true);

  const elbow = arm.forearm.getWorldPosition(new Vector3());
  const wrist = arm.hand.getWorldPosition(new Vector3());
  const forearmWorld = arm.forearm.getWorldQuaternion(new Quaternion());
  const forearmDelta = new Quaternion().setFromUnitVectors(
    wrist.clone().sub(elbow).normalize(),
    target.clone().sub(elbow).normalize()
  );
  const desiredForearmWorld = forearmDelta.multiply(forearmWorld);
  const forearmParentWorld = arm.forearm.parent!.getWorldQuaternion(new Quaternion());
  const desiredForearmLocal = forearmParentWorld.invert().multiply(desiredForearmWorld);

  arm.forearm.quaternion.copy(desiredForearmLocal);
  model.updateMatrixWorld(true);
  let desiredHandLocal = arm.baseHand.clone();
  if (palmUpDirection) {
    const desiredFinger = palmUpDirection.clone().normalize();
    let desiredPalmNormal = new Vector3(0, 1, 0);
    let desiredRight = desiredFinger.clone().cross(desiredPalmNormal);
    if (desiredRight.lengthSq() < .000001) {
      desiredRight = new Vector3(1, 0, 0).cross(desiredPalmNormal);
    }
    desiredRight.normalize();
    desiredPalmNormal = desiredRight.clone().cross(desiredFinger).normalize();
    if (desiredPalmNormal.y < 0) desiredPalmNormal.multiplyScalar(-1);

    const sourceFinger = arm.sourceFinger.clone().normalize();
    let sourcePalm = arm.sourcePalm.clone().normalize();
    let sourceRight = sourceFinger.clone().cross(sourcePalm);
    if (sourceRight.lengthSq() < .000001) sourceRight.set(1, 0, 0);
    else sourceRight.normalize();
    sourcePalm = sourceRight.clone().cross(sourceFinger).normalize();

    const sourceBasis = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(sourceRight, sourceFinger, sourcePalm)
    );
    const desiredBasis = new Quaternion().setFromRotationMatrix(
      new Matrix4().makeBasis(desiredRight, desiredFinger, desiredPalmNormal)
    );
    const desiredHandInModel = desiredBasis.multiply(sourceBasis.invert());
    const modelWorld = model.getWorldQuaternion(new Quaternion());
    const desiredHandWorld = modelWorld.multiply(desiredHandInModel);
    const handParentWorld = arm.hand.parent!.getWorldQuaternion(new Quaternion());
    desiredHandLocal = handParentWorld.invert().multiply(desiredHandWorld);

    // Escolhe entre 0° e 180° no eixo dos dedos a orientação com palma mais pra cima.
    const previousHand = arm.hand.quaternion.clone();
    const flip = new Quaternion().setFromAxisAngle(sourceFinger, Math.PI);
    arm.hand.quaternion.copy(desiredHandLocal);
    model.updateMatrixWorld(true);
    const palmA = sourcePalm.clone().transformDirection(arm.hand.matrixWorld).y;
    const flipped = desiredHandLocal.clone().multiply(flip);
    arm.hand.quaternion.copy(flipped);
    model.updateMatrixWorld(true);
    const palmB = sourcePalm.clone().transformDirection(arm.hand.matrixWorld).y;
    if (palmB > palmA) desiredHandLocal.copy(flipped);
    arm.hand.quaternion.copy(previousHand);
  }

  arm.upper.quaternion.copy(arm.baseUpper).slerp(desiredUpperLocal, influence);
  arm.forearm.quaternion.copy(arm.baseForearm).slerp(desiredForearmLocal, influence);
  arm.hand.quaternion.copy(arm.baseHand).slerp(desiredHandLocal, influence);
}

function RiggedAvatarModel({ modelUrl, rigNames, action = "idle", chadMode = false, fitHeight }: {
  modelUrl: string;
  rigNames: RigNames;
  action?: CharacterAction;
  chadMode?: boolean;
  fitHeight?: number;
}) {
  const { scene } = useGLTF(modelUrl);
  const model = useMemo(
    () => prepareRiggedClone(scene as Group, fitHeight),
    [fitHeight, scene]
  );

  const rig = useMemo(() => {
    const chest = model.getObjectByName(rigNames.chest) as Bone;
    const head = model.getObjectByName(rigNames.head) as Bone;
    const hips = model.getObjectByName(rigNames.hips) as Bone;
    const spine = model.getObjectByName(rigNames.spine) as Bone;
    const leftLeg = model.getObjectByName(rigNames.leftLeg) as Bone;
    const rightLeg = model.getObjectByName(rigNames.rightLeg) as Bone;
    if (!chest || !head || !hips || !spine || !leftLeg || !rightLeg) {
      throw new Error(`Rig incompleto: ${modelUrl}`);
    }
    return {
      left: createAvatarArmRig(
        model,
        rigNames.left,
        rigNames.leftFingerPrefixes,
        rigNames.flipLeftPalm
      ),
      right: createAvatarArmRig(model, rigNames.right, rigNames.rightFingerPrefixes),
      chest,
      head,
      hips,
      spine,
      leftLeg,
      rightLeg,
      leftFingers: findAnimatedBones(model, rigNames.leftFingerPrefixes),
      rightFingers: findAnimatedBones(model, rigNames.rightFingerPrefixes),
      baseChest: chest.quaternion.clone(),
      baseHead: head.quaternion.clone(),
      baseHips: hips.quaternion.clone(),
      baseSpine: spine.quaternion.clone(),
      baseLeftLeg: leftLeg.quaternion.clone(),
      baseRightLeg: rightLeg.quaternion.clone(),
      baseModelY: model.position.y
    };
  }, [model, modelUrl, rigNames]);

  const poseWeights = useRef({ pose: 0, chin: 0 });
  const gestureBalance = useRef(0);
  const gestureResponsiveness = useRef(8);
  const lastGestureAt = useRef(0);
  useEffect(() => {
    const now = performance.now();
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

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    const gestureTarget = action === "six" ? 1 : action === "seven" ? -1 : 0;
    gestureBalance.current = MathUtils.damp(
      gestureBalance.current,
      gestureTarget,
      gestureTarget === 0 ? 7 : gestureResponsiveness.current,
      delta
    );
    const gestureArc = Math.abs(gestureBalance.current);
    const chinActive = action === "chin" || chadMode && action === "idle";
    const poseAction = action === "win" ? "victory" : action;
    const poseActive = !["idle", "chin"].includes(poseAction);
    const gestureActive = poseAction === "six" || poseAction === "seven";
    const gestureInMotion = gestureActive || Math.abs(gestureBalance.current) > .006;
    poseWeights.current.pose = MathUtils.damp(
      poseWeights.current.pose,
      poseActive || gestureInMotion ? 1 : 0,
      poseActive || gestureInMotion ? 14 : 9,
      delta
    );
    poseWeights.current.chin = MathUtils.damp(
      poseWeights.current.chin,
      chinActive ? 1 : 0,
      chinActive ? 10 : 7,
      delta
    );

    if (chinActive) {
      // GigaChad: mão no queixo, peito aberto, braço livre em akimbo leve.
      const sway = Math.sin(time * 2.1) * .012;
      solveEmiArm(
        model,
        rig.left,
        new Vector3(.42 + sway, 1.02, .06),
        new Vector3(.55, 1.12, .02),
        poseWeights.current.chin * .85
      );
      solveEmiArm(
        model,
        rig.right,
        new Vector3(-.05 + sway * .4, 1.5 + Math.sin(time * 1.7) * .01, .22),
        new Vector3(-.52, 1.22, .1),
        poseWeights.current.chin
      );
    } else if (gestureInMotion) {
      // Six Seven meme: see-saw com palmas pra cima (pesando opções).
      const seeSaw = gestureBalance.current;
      const bounce = Math.sin(time * 15) * .04 * Math.max(gestureArc, .15);
      const leftHeight = .34 * seeSaw + bounce;
      const rightHeight = -.34 * seeSaw - bounce;
      const spread = .1 + .08 * gestureArc;
      solveEmiArm(
        model,
        rig.left,
        new Vector3(.26 + spread, 1.2 + leftHeight, .36),
        new Vector3(.58, 1.18, .1),
        poseWeights.current.pose,
        new Vector3(.1, .08, .98)
      );
      solveEmiArm(
        model,
        rig.right,
        new Vector3(-.26 - spread, 1.2 + rightHeight, .36),
        new Vector3(-.58, 1.18, .1),
        poseWeights.current.pose,
        new Vector3(-.1, .08, .98)
      );
    } else if (poseAction === "lose") {
      solveEmiArm(model, rig.left, new Vector3(.26, .92, .08), new Vector3(.48, 1.05, .02), poseWeights.current.pose);
      solveEmiArm(model, rig.right, new Vector3(-.26, .9, .1), new Vector3(-.48, 1.04, .02), poseWeights.current.pose);
    } else if (poseAction === "cross") {
      solveEmiArm(model, rig.left, new Vector3(-.18, 1.31, .24), new Vector3(.5, 1.18, .06), poseWeights.current.pose);
      solveEmiArm(model, rig.right, new Vector3(.18, 1.23, .26), new Vector3(-.5, 1.13, .06), poseWeights.current.pose);
    } else if (poseAction === "victory") {
      solveEmiArm(model, rig.left, new Vector3(.27, 1.79, .13), new Vector3(.55, 1.57, .02), poseWeights.current.pose);
      solveEmiArm(model, rig.right, new Vector3(-.27, 1.79, .13), new Vector3(-.55, 1.57, .02), poseWeights.current.pose);
    } else if (poseAction === "salute") {
      solveEmiArm(model, rig.left, new Vector3(), new Vector3(), 0);
      solveEmiArm(model, rig.right, new Vector3(-.09, 1.64, .2), new Vector3(-.5, 1.42, .04), poseWeights.current.pose);
    } else if (poseAction === "focus") {
      solveEmiArm(model, rig.left, new Vector3(.045, 1.36, .32), new Vector3(.48, 1.18, .06), poseWeights.current.pose);
      solveEmiArm(model, rig.right, new Vector3(-.045, 1.36, .32), new Vector3(-.48, 1.18, .06), poseWeights.current.pose);
    } else if (poseAction === "champion") {
      solveEmiArm(model, rig.left, new Vector3(.22, 1.82, .12), new Vector3(.56, 1.56, .02), poseWeights.current.pose);
      solveEmiArm(model, rig.right, new Vector3(-.32, 1.1, .18), new Vector3(-.5, 1.16, .04), poseWeights.current.pose);
    } else if (poseAction === "point") {
      solveEmiArm(model, rig.left, new Vector3(.32, 1.1, .18), new Vector3(.5, 1.16, .04), poseWeights.current.pose);
      solveEmiArm(model, rig.right, new Vector3(-.2, 1.39, .48), new Vector3(-.52, 1.27, .08), poseWeights.current.pose);
    } else {
      solveEmiArm(model, rig.left, new Vector3(), new Vector3(), 0);
      solveEmiArm(model, rig.right, new Vector3(), new Vector3(), 0);
    }

    const gestureDirection = gestureBalance.current < 0 ? -1 : 1;
    const fingerMotion = gestureActive
      ? .02 + gestureArc * .05
      : .012 * Math.sin(time * 1.7);
    const animateFingers = (fingers: AnimatedBone[], sideOffset: number, chinCurl: boolean, openPalm: boolean) => {
      fingers.forEach(({ bone, base }, index) => {
        const depth = (index % 4) / 3;
        const curl = chinCurl
          ? .14 + depth * .16
          : openPalm
            ? .02 + depth * .03
            : fingerMotion * (1 + depth * .45);
        const spread = (gestureActive || chinCurl) && depth < .2
          ? Math.sin(index * 1.7 + sideOffset) * (openPalm ? .05 : .035)
          : 0;
        bone.quaternion.copy(base).multiply(
          new Quaternion().setFromEuler(new Euler(curl, spread, 0))
        );
      });
    };
    animateFingers(rig.leftFingers, .4, false, gestureInMotion);
    animateFingers(rig.rightFingers, -.4, chinActive, gestureInMotion && !chinActive);

    const chinWeight = poseWeights.current.chin;
    const energy = gestureActive ? poseWeights.current.pose : 0;
    const breath = Math.sin(time * 1.65);
    const idleBob = Math.sin(time * 2.35);
    const idleSway = Math.sin(time * 1.05);
    const weightShift = gestureActive
      ? gestureArc * gestureDirection
      : chinActive
        ? Math.sin(time * 1.25) * .55
        : idleSway;
    const loseWeight = poseAction === "lose" ? poseWeights.current.pose : 0;
    const chestPose = rig.baseChest.clone().multiply(
      new Quaternion().setFromEuler(new Euler(
        -.08 * chinWeight + .16 * loseWeight + breath * .014,
        .03 * chinWeight + weightShift * .04 * (energy + chinWeight * .4 + .25),
        -.04 * chinWeight - weightShift * .03 * (energy + .35)
      ))
    );
    const headPose = rig.baseHead.clone().multiply(
      new Quaternion().setFromEuler(new Euler(
        -.16 * chinWeight + .22 * loseWeight - breath * .01,
        -.06 * chinWeight - weightShift * .05 * (energy + chinWeight * .5 + .2),
        .06 * chinWeight + weightShift * .025 * (energy + .2)
      ))
    );
    rig.chest.quaternion.copy(chestPose);
    rig.head.quaternion.copy(headPose);
    rig.spine.quaternion.copy(rig.baseSpine).multiply(
      new Quaternion().setFromEuler(new Euler(
        breath * .012 + .05 * chinWeight,
        -weightShift * .03 * (energy + .35),
        weightShift * .04 * (energy + .35)
      ))
    );
    rig.hips.quaternion.copy(rig.baseHips).multiply(
      new Quaternion().setFromEuler(new Euler(
        idleBob * .012 * (1 - energy),
        weightShift * .035 * (energy + .45),
        -weightShift * (.04 + .06 * energy)
      ))
    );
    const leftLegPitch = gestureActive
      ? weightShift * .22 + Math.sin(time * 15) * .08 * gestureArc
      : chinActive
        ? weightShift * .12
        : idleBob * .12 + idleSway * .06;
    const rightLegPitch = gestureActive
      ? -weightShift * .22 - Math.sin(time * 15) * .08 * gestureArc
      : chinActive
        ? -weightShift * .12
        : -idleBob * .12 + idleSway * .05;
    const leftLegRoll = gestureActive ? weightShift * .09 : idleSway * .055;
    const rightLegRoll = gestureActive ? -weightShift * .09 : -idleSway * .055;
    rig.leftLeg.quaternion.copy(rig.baseLeftLeg).multiply(
      new Quaternion().setFromEuler(new Euler(leftLegPitch, weightShift * .035 * (energy + .4), leftLegRoll))
    );
    rig.rightLeg.quaternion.copy(rig.baseRightLeg).multiply(
      new Quaternion().setFromEuler(new Euler(rightLegPitch, -weightShift * .035 * (energy + .4), rightLegRoll))
    );
    const hop = gestureActive
      ? Math.abs(Math.sin(time * 15)) * .04 * gestureArc
      : chinActive
        ? Math.sin(time * 2.2) * .012
        : Math.abs(idleBob) * .018;
    model.position.y = rig.baseModelY + hop;
  });

  return <primitive object={model} />;
}

/** Simão: skeleton Tripo (Y no osso, sem dedos). IK genérico estoura a pose — Euler local. */
function SimaoModel({ action = "idle", chadMode = false }: { action?: CharacterAction; chadMode?: boolean }) {
  const { scene } = useGLTF("/models/simao.glb");
  const model = useMemo(() => prepareRiggedClone(scene as Group, 1.72), [scene]);
  const rig = useMemo(() => {
    const bone = (name: string) => {
      const target = model.getObjectByName(name) as Bone | undefined;
      if (!target) throw new Error(`Simão: osso ausente ${name}`);
      return { bone: target, base: target.quaternion.clone() };
    };
    return {
      leftUpper: bone("L_Upperarm"),
      leftForearm: bone("L_Forearm"),
      leftHand: bone("L_Hand"),
      rightUpper: bone("R_Upperarm"),
      rightForearm: bone("R_Forearm"),
      rightHand: bone("R_Hand"),
      chest: bone("Spine02"),
      spine: bone("Spine01"),
      head: bone("Head"),
      hips: bone("Pelvis"),
      leftThigh: bone("L_Thigh"),
      leftCalf: bone("L_Calf"),
      leftFoot: bone("L_Foot"),
      rightThigh: bone("R_Thigh"),
      rightCalf: bone("R_Calf"),
      rightFoot: bone("R_Foot"),
      baseModelY: model.position.y
    };
  }, [model]);

  const poseWeight = useRef(0);
  const chinWeight = useRef(0);
  const gestureBalance = useRef(0);
  const gestureResponsiveness = useRef(8);
  const lastGestureAt = useRef(0);

  useEffect(() => {
    const now = performance.now();
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

  useFrame(({ clock }, delta) => {
    const time = clock.elapsedTime;
    const gestureTarget = action === "six" ? 1 : action === "seven" ? -1 : 0;
    gestureBalance.current = MathUtils.damp(
      gestureBalance.current,
      gestureTarget,
      gestureTarget === 0 ? 7 : gestureResponsiveness.current,
      delta
    );
    const seeSaw = gestureBalance.current;
    const arc = Math.abs(seeSaw);
    const gestureActive = action === "six" || action === "seven";
    const gestureInMotion = gestureActive || arc > .006;
    const chinActive = action === "chin" || chadMode && action === "idle";
    poseWeight.current = MathUtils.damp(
      poseWeight.current,
      gestureInMotion || action === "victory" || action === "win" || action === "lose" ? 1 : 0,
      gestureInMotion ? 14 : 9,
      delta
    );
    chinWeight.current = MathUtils.damp(chinWeight.current, chinActive ? 1 : 0, chinActive ? 10 : 7, delta);

    const energy = poseWeight.current;
    const chin = chinWeight.current;
    const idleBob = Math.sin(time * 2.35);
    const idleSway = Math.sin(time * 1.05);
    const bounce = Math.sin(time * 15) * .08 * Math.max(arc, .12);
    const weightShift = gestureInMotion
      ? seeSaw
      : chinActive
        ? Math.sin(time * 1.25) * .45
        : idleSway;

    const setLocal = (
      part: { bone: Bone; base: Quaternion },
      x: number,
      y: number,
      z: number
    ) => {
      part.bone.quaternion.copy(part.base).multiply(
        new Quaternion().setFromEuler(new Euler(x, y, z))
      );
    };

    // Braços: balança Six/Seven com palma = eixo Z do osso da mão (pra cima).
    for (const [upper, forearm, hand, sign] of [
      [rig.leftUpper, rig.leftForearm, rig.leftHand, 1] as const,
      [rig.rightUpper, rig.rightForearm, rig.rightHand, -1] as const
    ]) {
      const up = -sign * seeSaw;
      const lift = up * energy;
      const upperX = MathUtils.lerp(
        .08 * idleBob + .12 * chin,
        .58 - lift * .5,
        energy
      );
      const upperY = MathUtils.lerp(
        sign * .04 * idleSway,
        sign * (.06 + lift * .08),
        energy
      );
      const upperZ = MathUtils.lerp(
        sign * (-.12 + .05 * chin),
        sign * (-.38 - lift * .35) + bounce * sign * .15 * energy,
        energy
      );
      const foreX = MathUtils.lerp(
        .08 + .1 * chin,
        .75 + (1 - lift) * .35,
        energy
      );
      const handY = MathUtils.lerp(sign * .15, sign * -1.22, energy);
      setLocal(upper, upperX, upperY, upperZ);
      setLocal(forearm, foreX, 0, sign * .04 * energy);
      setLocal(hand, .05 * chin, handY, sign * .04 * energy);
    }

    setLocal(
      rig.chest,
      -.06 * chin + .02 * idleBob + .04 * energy,
      weightShift * .05 * (energy + .3),
      -weightShift * .04 * (energy + .25)
    );
    setLocal(
      rig.spine,
      .02 * idleBob + .03 * chin,
      -weightShift * .04 * (energy + .35),
      weightShift * .05 * (energy + .35)
    );
    setLocal(
      rig.head,
      -.12 * chin + .02 * idleBob,
      -weightShift * .06 * (energy + .25),
      weightShift * .03 * (energy + .2)
    );
    setLocal(
      rig.hips,
      idleBob * .02 * (1 - energy),
      weightShift * .05 * (energy + .4),
      -weightShift * (.05 + .06 * energy)
    );

    // Coxa / joelho / pé — sempre vivos no idle e no gesto.
    const leftLift = gestureInMotion ? Math.max(0, -weightShift) : Math.max(0, -idleBob);
    const rightLift = gestureInMotion ? Math.max(0, weightShift) : Math.max(0, idleBob);
    setLocal(
      rig.leftThigh,
      idleBob * .1 + weightShift * .16 * (energy + .5) + leftLift * .12,
      weightShift * .03,
      idleSway * .05 + weightShift * .07
    );
    setLocal(
      rig.rightThigh,
      -idleBob * .1 - weightShift * .16 * (energy + .5) + rightLift * .12,
      -weightShift * .03,
      -idleSway * .05 - weightShift * .07
    );
    setLocal(rig.leftCalf, -(.07 + leftLift * .45 + Math.abs(idleBob) * .1 * (1 - leftLift)), 0, 0);
    setLocal(rig.rightCalf, -(.07 + rightLift * .45 + Math.abs(idleBob) * .1 * (1 - rightLift)), 0, 0);
    setLocal(rig.leftFoot, idleBob * .05 + leftLift * .22 + arc * .06, 0, idleSway * .03);
    setLocal(rig.rightFoot, -idleBob * .05 + rightLift * .22 + arc * .06, 0, -idleSway * .03);

    const hop = gestureInMotion
      ? Math.abs(Math.sin(time * 15)) * .035 * arc
      : Math.abs(idleBob) * .016 + chin * .008;
    model.position.y = rig.baseModelY + hop;
  });

  return <primitive object={model} />;
}

function StaticPhilModel({ action = "idle" }: { action?: CharacterAction }) {
  const { scene } = useGLTF("/models/phil.glb");
  const group = useRef<Group>(null);
  const gestureBalance = useRef(0);
  const gestureResponsiveness = useRef(8);
  const lastGestureAt = useRef(0);
  const { model, offset, normalizedScale, surfaces } = useMemo(() => {
    const clone = scene.clone(true) as Group;
    const animatedSurfaces: {
      position: BufferAttribute;
      normal?: BufferAttribute;
      basePosition: Float32Array;
      baseNormal?: Float32Array;
    }[] = [];
    clone.traverse(object => {
      if (!(object instanceof Mesh)) return;
      object.geometry = object.geometry.clone();
      object.castShadow = true;
      object.receiveShadow = true;
      object.frustumCulled = false;
      // O arquivo não possui rig. O corpo principal recebe uma deformação
      // procedural suave por regiões para criar ombros, cotovelos e mãos.
      if (object.name === "Object_2") {
        const position = object.geometry.getAttribute("position") as BufferAttribute;
        const normal = object.geometry.getAttribute("normal") as BufferAttribute | undefined;
        animatedSurfaces.push({
          position,
          normal,
          basePosition: new Float32Array(position.array),
          baseNormal: normal ? new Float32Array(normal.array) : undefined
        });
      }
    });
    clone.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(clone);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    return {
      model: clone,
      // Phil (minion) fica ~1/3 da altura dos outros looks.
      normalizedScale: (1.72 / 3) / Math.max(size.y, .001),
      offset: new Vector3(-center.x, -bounds.min.y, -center.z),
      surfaces: animatedSurfaces
    };
  }, [scene]);

  useEffect(() => {
    const now = performance.now();
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

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const time = clock.elapsedTime;
    const gestureTarget = action === "six" ? 1 : action === "seven" ? -1 : 0;
    gestureBalance.current = MathUtils.damp(
      gestureBalance.current,
      gestureTarget,
      gestureTarget === 0 ? 7 : gestureResponsiveness.current,
      delta
    );
    const arc = Math.abs(gestureBalance.current);
    const chinPose = action === "chin" ? 1 : 0;
    const upperAngle = -.62 * gestureBalance.current
      + Math.sin(time * 14) * .05 * Math.max(arc, .2)
      + Math.sin(time * 1.45) * .025 * (1 - arc)
      + chinPose * .12;
    const forearmAngle = -.38 * gestureBalance.current - chinPose * .18;

    surfaces.forEach(surface => {
      const positions = surface.position.array as Float32Array;
      const normals = surface.normal?.array as Float32Array | undefined;
      for (let index = 0; index < surface.position.count; index += 1) {
        const offsetIndex = index * 3;
        const originalX = surface.basePosition[offsetIndex];
        const originalY = surface.basePosition[offsetIndex + 1];
        const originalZ = surface.basePosition[offsetIndex + 2];
        const side = originalX < 0 ? -1 : 1;
        const distance = Math.abs(originalX);
        const armWeight = MathUtils.smoothstep(distance, 2.05, 2.72);
        const forearmWeight = MathUtils.smoothstep(distance, 3.35, 4.65);
        const shoulderX = side * 2.08;
        const shoulderZ = 4.15;
        const armCos = Math.cos(upperAngle);
        const armSin = Math.sin(upperAngle);
        const shoulderDx = originalX - shoulderX;
        const shoulderDz = originalZ - shoulderZ;
        const armX = shoulderX + shoulderDx * armCos + shoulderDz * armSin;
        const armZ = shoulderZ - shoulderDx * armSin + shoulderDz * armCos;
        let nextX = MathUtils.lerp(originalX, armX, armWeight);
        let nextZ = MathUtils.lerp(originalZ, armZ, armWeight);

        if (forearmWeight > 0) {
          const elbowX = side * 3.45;
          const elbowDx = nextX - elbowX;
          const elbowDz = nextZ - shoulderZ;
          const foreCos = Math.cos(forearmAngle);
          const foreSin = Math.sin(forearmAngle);
          const bentX = elbowX + elbowDx * foreCos + elbowDz * foreSin;
          const bentZ = shoulderZ - elbowDx * foreSin + elbowDz * foreCos;
          nextX = MathUtils.lerp(nextX, bentX, forearmWeight);
          nextZ = MathUtils.lerp(nextZ, bentZ, forearmWeight);
        }

        positions[offsetIndex] = nextX;
        positions[offsetIndex + 1] = originalY;
        positions[offsetIndex + 2] = nextZ;

        if (normals && surface.baseNormal) {
          const normalX = surface.baseNormal[offsetIndex];
          const normalY = surface.baseNormal[offsetIndex + 1];
          const normalZ = surface.baseNormal[offsetIndex + 2];
          const totalAngle = upperAngle * armWeight + forearmAngle * forearmWeight;
          const normalCos = Math.cos(totalAngle);
          const normalSin = Math.sin(totalAngle);
          normals[offsetIndex] = normalX * normalCos + normalZ * normalSin;
          normals[offsetIndex + 1] = normalY;
          normals[offsetIndex + 2] = -normalX * normalSin + normalZ * normalCos;
        }
      }
      surface.position.needsUpdate = true;
      if (surface.normal) surface.normal.needsUpdate = true;
    });

    const idleBob = Math.sin(time * 2.35);
    const idleSway = Math.sin(time * 1.05);
    const targetTilt = Math.abs(gestureBalance.current) > .001
      ? gestureBalance.current * .07
      : action === "victory" ? -.035 : action === "chin" ? .05 : idleSway * .03;
    const targetTurn = action === "point" ? -.18 : action === "salute" ? .12 : action === "chin" ? -.08 : idleSway * .02;
    group.current.rotation.z = MathUtils.damp(group.current.rotation.z, targetTilt, 8, delta);
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, targetTurn, 8, delta);
    group.current.rotation.x = MathUtils.damp(
      group.current.rotation.x,
      idleBob * .025 + (chinPose ? .02 : 0),
      8,
      delta
    );
    group.current.position.y = chinPose
      ? Math.sin(time * 2.2) * .014
      : Math.abs(idleBob) * .016 + arc * .02;
    const pulse = 1 + arc * .012 + Math.sin(time * 1.7) * .003 * (1 - arc) + chinPose * .02;
    group.current.scale.setScalar(pulse);
  });

  return <group ref={group}>
    <primitive object={model} position={offset} scale={normalizedScale} />
  </group>;
}

export function PlayerLookModel({
  look,
  position = [0, 0, 0],
  facing = 0,
  action = "idle",
  scale = 1,
  chadMode = false,
  cosmetics
}: PlayerLookModelProps) {
  if (look.type === "emi") {
    return <group position={position} rotation-y={facing} scale={scale}>
      <RiggedAvatarModel modelUrl="/models/emi.glb" rigNames={EMI_RIG} action={action} chadMode={chadMode} />
    </group>;
  }

  if (look.type === "charlie") {
    return <group position={position} rotation-y={facing} scale={scale * .9}>
      <RiggedAvatarModel modelUrl="/models/charlie-morningstar.glb" rigNames={CHARLIE_RIG} action={action} chadMode={chadMode} />
    </group>;
  }

  if (look.type === "phil") {
    return <group position={position} rotation-y={facing} scale={scale}>
      <StaticPhilModel action={chadMode && action === "idle" ? "chin" : action} />
    </group>;
  }

  if (look.type === "banana") {
    return <group position={position} rotation-y={facing} scale={scale}>
      <RiggedAvatarModel
        modelUrl="/models/banana.glb"
        rigNames={BANANA_RIG}
        action={action}
        chadMode={chadMode}
        fitHeight={1.72}
      />
    </group>;
  }

  if (look.type === "cj") {
    return <group position={position} rotation-y={facing} scale={scale}>
      <RiggedAvatarModel
        modelUrl="/models/cj.glb"
        rigNames={CJ_RIG}
        action={action}
        chadMode={chadMode}
        fitHeight={1.72}
      />
    </group>;
  }

  if (look.type === "order67") {
    return <group position={position} rotation-y={facing} scale={scale}>
      <RiggedAvatarModel
        modelUrl="/models/order-67.glb"
        rigNames={ORDER67_RIG}
        action={action}
        chadMode={chadMode}
        fitHeight={1.72}
      />
    </group>;
  }

  if (look.type === "simao") {
    return <group position={position} rotation-y={facing} scale={scale}>
      <SimaoModel action={action} chadMode={chadMode} />
    </group>;
  }

  return <Character
    color={look.color}
    accent={look.accent}
    skin={look.skin}
    hair={look.hair}
    pants={look.pants}
    shoes={look.shoes}
    position={position}
    facing={facing}
    action={action}
    scale={scale}
    chadMode={chadMode}
  />;
}

function Turntable({ look, cosmetics }: { look: WardrobeLook; cosmetics?: Record<string, string> | null }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.position.y = 0;
    group.current.rotation.y += delta * .08;
  });

  return <group ref={group} rotation-y={-.2}>
    <PlayerLookModel look={look} action="idle" scale={1.02} cosmetics={cosmetics} />
  </group>;
}

export function WardrobeScene({ look, cosmetics }: { look: WardrobeLook; cosmetics?: Record<string, string> | null }) {
  return <Canvas
    shadows
    dpr={[1, 1.75]}
    camera={{ position: [0, 1.28, 3.65], fov: 32 }}
    gl={{ alpha: true, antialias: true }}
  >
    <ambientLight intensity={1.65} />
    <hemisphereLight intensity={1.2} color="#fff4d9" groundColor="#2b1e19" />
    <directionalLight
      castShadow
      position={[-3, 5, 4]}
      intensity={3.1}
      color="#ffe3ac"
      shadow-mapSize={[1024, 1024]}
    />
    <spotLight position={[3, 3.5, 2]} intensity={16} angle={.4} penumbra={.85} color="#e97648" />
    <Suspense fallback={null}>
      <Turntable look={look} cosmetics={cosmetics} />
      <ContactShadows position={[0, .006, 0]} opacity={.52} scale={3.2} blur={2.6} far={3} />
      <Environment preset="studio" />
    </Suspense>
    <OrbitControls
      makeDefault
      enablePan={false}
      minDistance={2.25}
      maxDistance={4.1}
      minPolarAngle={Math.PI * .28}
      maxPolarAngle={Math.PI * .58}
      target={[0, .92, 0]}
    />
  </Canvas>;
}

useGLTF.preload("/models/emi.glb");
useGLTF.preload("/models/charlie-morningstar.glb");
useGLTF.preload("/models/phil.glb");
useGLTF.preload("/models/banana.glb");
useGLTF.preload("/models/cj.glb");
useGLTF.preload("/models/order-67.glb");
useGLTF.preload("/models/simao.glb");

