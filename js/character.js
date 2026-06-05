import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const SPEED = 4.0
const CAM_OFFSET = new THREE.Vector3(0, 2.5, 4)

export async function loadCharacter(scene) {
  const loader = new GLTFLoader()
  const gltf = await new Promise((resolve, reject) => {
    loader.load('assets/character.glb', resolve, undefined, reject)
  })

  const mesh = gltf.scene
  mesh.scale.setScalar(1.0)
  mesh.position.set(0, 0, 2)
  mesh.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true } })
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
    char.mesh.rotation.y = Math.atan2(-dir.x, -dir.z)
  }

  const next = char.mesh.position.clone().addScaledVector(dir, SPEED * delta)

  const inBounds = allBounds.find(b =>
    next.x >= b.xMin && next.x <= b.xMax &&
    next.z >= b.zMin && next.z <= b.zMax
  )

  if (inBounds || allBounds.length === 0) {
    char.mesh.position.copy(next)
  } else {
    // Wall sliding
    const tryX = char.mesh.position.clone(); tryX.x = next.x
    const tryZ = char.mesh.position.clone(); tryZ.z = next.z
    const canX = allBounds.find(b => tryX.x >= b.xMin && tryX.x <= b.xMax && tryX.z >= b.zMin && tryX.z <= b.zMax)
    const canZ = allBounds.find(b => tryZ.x >= b.xMin && tryZ.x <= b.xMax && tryZ.z >= b.zMin && tryZ.z <= b.zMax)
    if (canX) char.mesh.position.x = next.x
    if (canZ) char.mesh.position.z = next.z
  }
}

export function updateCamera(camera, char, input) {
  char._yaw += (input.dx || 0) * 0.005
  input.dx = 0

  const offset = CAM_OFFSET.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), char._yaw)
  camera.position.copy(char.mesh.position).add(offset)
  camera.lookAt(char.mesh.position.x, char.mesh.position.y + 1.5, char.mesh.position.z)
}
