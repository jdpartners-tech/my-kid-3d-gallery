import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { findAnim, getCharacterTargetHeight } from './character-select.js'

const SPEED = 4.0
const CHAR_RADIUS = 0.35
const Z_RADIUS = 0.15  // smaller — lets player through narrow door/passage transitions
const CAM_OFFSET = new THREE.Vector3(0, 2.5, 4)

export async function loadCharacter(scene, modelPath = 'assets/characters/Adventurer.glb') {
  const loader = new GLTFLoader()
  const gltf = await new Promise((resolve, reject) => {
    loader.load(modelPath, resolve, undefined, reject)
  })

  const mesh = gltf.scene
  mesh.rotation.y = 0   // Quaternius models face +Z (north) at rotation.y=0

  // Auto-scale: target height varies per character (dinosaurs are smaller to avoid blocking view)
  const targetH = getCharacterTargetHeight(modelPath)
  const box = new THREE.Box3().setFromObject(mesh)
  const h = box.max.y - box.min.y
  if (h > 0.1) mesh.scale.setScalar(targetH / h)
  const box2 = new THREE.Box3().setFromObject(mesh)
  mesh.position.set(0, -box2.min.y, 5)

  mesh.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = false } })
  scene.add(mesh)

  const mixer = new THREE.AnimationMixer(mesh)
  const idleClip = findAnim(gltf.animations, 'idle')
  const walkClip = findAnim(gltf.animations, 'gallop') || findAnim(gltf.animations, 'walk')
  const runClip  = findAnim(gltf.animations, 'run')

  const idleAction = idleClip ? mixer.clipAction(idleClip) : null
  const walkAction = walkClip ? mixer.clipAction(walkClip) : null
  const runAction  = runClip  ? mixer.clipAction(runClip)  : null

  if (idleAction) idleAction.play()
  else if (walkAction) walkAction.play()

  return {
    mesh, mixer, walkAction, idleAction, runAction,
    _state: 'idle', _yaw: 0,
  }
}

export function updateCharacter(char, delta, input, allBounds, npcMeshes = []) {
  char.mixer.update(delta)

  const moving   = input.forward || input.backward || input.left || input.right
  const sprinting = moving && !!input.sprint && !!char.runAction
  const targetState = !moving ? 'idle' : sprinting ? 'run' : 'walk'

  if (targetState !== char._state) {
    char._state = targetState
    char.idleAction?.fadeOut(0.2)
    char.walkAction?.fadeOut(0.2)
    char.runAction?.fadeOut(0.2)
    if (targetState === 'idle')      char.idleAction?.reset().fadeIn(0.2).play()
    else if (targetState === 'run')  char.runAction?.reset().fadeIn(0.15).play()
    else                             char.walkAction?.reset().fadeIn(0.2).play()
  }

  if (!moving) return

  const dir = new THREE.Vector3()
  if (input.forward)  dir.z -= 1
  if (input.backward) dir.z += 1
  if (input.left)     dir.x -= 1
  if (input.right)    dir.x += 1
  dir.normalize()

  dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), char._yaw)

  // Only face toward movement direction when not purely backing up — prevents 180° spin
  const pureBackward = input.backward && !input.forward && !input.left && !input.right
  if (!pureBackward && dir.length() > 0.01) {
    const targetRot = Math.atan2(-dir.x, -dir.z)
    // Quaternius faces +Z at rotation.y=0, so target mesh rotation = logical yaw - π
    let rotDiff = (targetRot - Math.PI) - char.mesh.rotation.y
    while (rotDiff >  Math.PI) rotDiff -= 2 * Math.PI
    while (rotDiff < -Math.PI) rotDiff += 2 * Math.PI
    char.mesh.rotation.y += rotDiff * Math.min(1, delta * 2)
  }

  const speed = input.sprint ? SPEED * 2.0 : SPEED
  const next = char.mesh.position.clone().addScaledVector(dir, speed * delta)

  // Spacious bounds get Z radius; narrow passage/door bounds need full depth
  const zr = b => (b.zMax - b.zMin) >= 0.9 ? Z_RADIUS : 0

  const inBound = b =>
    next.x >= b.xMin + CHAR_RADIUS && next.x <= b.xMax - CHAR_RADIUS &&
    next.z >= b.zMin + zr(b) && next.z <= b.zMax - zr(b)

  const inBounds = allBounds.find(inBound)

  // NPC avoidance: treat each NPC as a solid cylinder
  const NPC_R_SQ = (CHAR_RADIUS + 0.3) ** 2
  const npcClear = pos => !npcMeshes.some(m => {
    const dx = pos.x - m.position.x, dz = pos.z - m.position.z
    return dx * dx + dz * dz < NPC_R_SQ
  })

  if ((inBounds || allBounds.length === 0) && npcClear(next)) {
    char.mesh.position.copy(next)
  } else {
    // Wall sliding
    const tryX = char.mesh.position.clone(); tryX.x = next.x
    const tryZ = char.mesh.position.clone(); tryZ.z = next.z
    const canX = npcClear(tryX) && allBounds.find(b =>
      tryX.x >= b.xMin + CHAR_RADIUS && tryX.x <= b.xMax - CHAR_RADIUS &&
      tryX.z >= b.zMin + zr(b) && tryX.z <= b.zMax - zr(b))
    const canZ = npcClear(tryZ) && allBounds.find(b =>
      tryZ.x >= b.xMin + CHAR_RADIUS && tryZ.x <= b.xMax - CHAR_RADIUS &&
      tryZ.z >= b.zMin + zr(b) && tryZ.z <= b.zMax - zr(b))
    if (canX) char.mesh.position.x = next.x
    if (canZ) char.mesh.position.z = next.z
  }
}

export function updateCamera(camera, char, delta, input) {
  // Auto-follow: smoothly swing camera behind the character's current facing direction
  // Quaternius: mesh.rotation.y = logical yaw - π, so logical yaw = mesh + π
  char._yaw = char.mesh.rotation.y + Math.PI
  input.dx = 0  // manual drag no longer used

  const offset = CAM_OFFSET.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), char._yaw)
  camera.position.copy(char.mesh.position).add(offset)
  camera.lookAt(char.mesh.position.x, char.mesh.position.y + 1.5, char.mesh.position.z)
}
