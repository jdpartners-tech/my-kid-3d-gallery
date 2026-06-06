import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const SPEED = 4.0
const CHAR_RADIUS = 0.35
const Z_RADIUS = 0.15  // smaller — lets player through narrow door/passage transitions
const CAM_OFFSET = new THREE.Vector3(0, 2.5, 4)

export async function loadCharacter(scene) {
  const loader = new GLTFLoader()
  const gltf = await new Promise((resolve, reject) => {
    loader.load('assets/character.glb', resolve, undefined, reject)
  })

  const mesh = gltf.scene
  mesh.scale.setScalar(1.0)
  mesh.position.set(0, 0, 2)
  mesh.traverse(c => { if (c.isMesh) { c.castShadow = false; c.receiveShadow = false } })
  scene.add(mesh)

  const mixer = new THREE.AnimationMixer(mesh)

  const idleClip = THREE.AnimationClip.findByName(gltf.animations, 'Idle')
  const walkClip = THREE.AnimationClip.findByName(gltf.animations, 'Walk')

  const idleAction = mixer.clipAction(idleClip)
  const walkAction = mixer.clipAction(walkClip)
  idleAction.play()

  return {
    mesh,
    mixer,
    walkAction,
    idleAction,
    isMoving: false,
    _yaw: 0,
  }
}

export function updateCharacter(char, delta, input, allBounds) {
  char.mixer.update(delta)

  const moving = input.forward || input.backward || input.left || input.right

  if (moving !== char.isMoving) {
    char.isMoving = moving
    if (moving) {
      char.idleAction.fadeOut(0.2)
      char.walkAction.reset().fadeIn(0.2).play()
    } else {
      char.walkAction.fadeOut(0.2)
      char.idleAction.reset().fadeIn(0.2).play()
    }
  }

  if (!moving) return

  const dir = new THREE.Vector3()
  if (input.forward)  dir.z -= 1
  if (input.backward) dir.z += 1
  if (input.left)     dir.x -= 1
  if (input.right)    dir.x += 1
  dir.normalize()

  dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), char._yaw)

  if (dir.length() > 0.01) {
    const targetRot = Math.atan2(-dir.x, -dir.z)
    let rotDiff = targetRot - char.mesh.rotation.y
    while (rotDiff >  Math.PI) rotDiff -= 2 * Math.PI
    while (rotDiff < -Math.PI) rotDiff += 2 * Math.PI
    char.mesh.rotation.y += rotDiff * Math.min(1, delta * 7)
  }

  const next = char.mesh.position.clone().addScaledVector(dir, SPEED * delta)

  // Spacious bounds get Z radius; narrow passage/door bounds need full depth
  const zr = b => (b.zMax - b.zMin) >= 0.9 ? Z_RADIUS : 0

  const inBound = b =>
    next.x >= b.xMin + CHAR_RADIUS && next.x <= b.xMax - CHAR_RADIUS &&
    next.z >= b.zMin + zr(b) && next.z <= b.zMax - zr(b)

  const inBounds = allBounds.find(inBound)

  if (inBounds || allBounds.length === 0) {
    char.mesh.position.copy(next)
  } else {
    // Wall sliding
    const tryX = char.mesh.position.clone(); tryX.x = next.x
    const tryZ = char.mesh.position.clone(); tryZ.z = next.z
    const canX = allBounds.find(b =>
      tryX.x >= b.xMin + CHAR_RADIUS && tryX.x <= b.xMax - CHAR_RADIUS &&
      tryX.z >= b.zMin + zr(b) && tryX.z <= b.zMax - zr(b))
    const canZ = allBounds.find(b =>
      tryZ.x >= b.xMin + CHAR_RADIUS && tryZ.x <= b.xMax - CHAR_RADIUS &&
      tryZ.z >= b.zMin + zr(b) && tryZ.z <= b.zMax - zr(b))
    if (canX) char.mesh.position.x = next.x
    if (canZ) char.mesh.position.z = next.z
  }
}

export function updateCamera(camera, char, delta, input) {
  // Auto-follow: smoothly swing camera behind the character's current facing direction
  let diff = char.mesh.rotation.y - char._yaw
  while (diff >  Math.PI) diff -= 2 * Math.PI
  while (diff < -Math.PI) diff += 2 * Math.PI
  char._yaw += diff * Math.min(1, delta * 3)
  input.dx = 0  // manual drag no longer used

  const offset = CAM_OFFSET.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), char._yaw)
  camera.position.copy(char.mesh.position).add(offset)
  camera.lookAt(char.mesh.position.x, char.mesh.position.y + 1.5, char.mesh.position.z)
}
