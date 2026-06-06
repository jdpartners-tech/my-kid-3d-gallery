import * as THREE from 'three'
import { initScene, startLoop } from './scene.js'
import { buildLobby, buildWings, wallMat } from './rooms.js'
import { loadCharacter, updateCharacter, updateCamera } from './character.js'
import { loadArtworks, checkProximity, hideFullscreen, isFullscreen } from './artwork.js'
import { isMobile, createMobileControls } from './mobile.js'

const { scene, camera, renderer } = initScene()

const manifest = await fetch('manifest.json').then(r => r.json())
const kidNames  = manifest.kids.map(k => k.name)
const kidColors = manifest.kids.map(k => k.color)

const lobby = buildLobby(scene, kidNames, kidColors)
const { allSlots, allBounds } = buildWings(scene, manifest)
const artworks = loadArtworks(manifest, allSlots, scene)

// Per-mesh wall materials — needed so each wall can be made transparent independently
// when it blocks the camera from the character's position
const wallMeshes = []
scene.traverse(obj => {
  if (obj.isMesh && obj.material === wallMat) {
    obj.material = obj.material.clone()
    obj.userData.hidden = false
    wallMeshes.push(obj)
  }
})
const camRaycaster = new THREE.Raycaster()

function updateOcclusion(camera, charPos) {
  const eye = new THREE.Vector3(charPos.x, charPos.y + 1.5, charPos.z)
  const toCam = camera.position.clone().sub(eye)
  const dist = toCam.length()
  if (dist < 0.1) return
  camRaycaster.set(eye, toCam.normalize())
  camRaycaster.far = dist
  const blocked = new Set(camRaycaster.intersectObjects(wallMeshes).map(h => h.object))
  for (const m of wallMeshes) {
    const hide = blocked.has(m)
    if (hide !== m.userData.hidden) {
      m.userData.hidden = hide
      m.material.transparent = hide
      m.material.opacity = hide ? 0.0 : 1.0
      m.material.depthWrite = !hide
      m.material.needsUpdate = true
    }
  }
}

// Keyboard state
const keys = {}
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') hideFullscreen()
  keys[e.key.toLowerCase()] = true
})
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false })

// Mouse drag for camera
const input = { forward: false, backward: false, left: false, right: false, dx: 0 }
let dragging = false, lastMouseX = 0
window.addEventListener('mousedown', e => { dragging = true; lastMouseX = e.clientX })
window.addEventListener('mouseup',   () => { dragging = false })
window.addEventListener('mousemove', e => {
  if (dragging) { input.dx += e.clientX - lastMouseX; lastMouseX = e.clientX }
})

let mobileControls = null
if (isMobile()) {
  mobileControls = createMobileControls()
  document.getElementById('hud').textContent = 'Use joystick to walk · Drag to look'
}

const allRoomBounds = [lobby.bounds, ...allBounds]

// Character starts null — rooms render immediately while it loads
let char = null
camera.position.set(0, 2.5, 6)
camera.lookAt(0, 1, 2)

startLoop(renderer, scene, camera, (delta) => {
  if (mobileControls) {
    const m = mobileControls.getMovementInput()
    input.forward  = m.forward
    input.backward = m.backward
    input.left     = m.left
    input.right    = m.right
    input.dx += mobileControls.getCameraDx()
  } else {
    input.forward  = !!(keys['w'] || keys['arrowup'])
    input.backward = !!(keys['s'] || keys['arrowdown'])
    input.left     = !!(keys['a'] || keys['arrowleft'])
    input.right    = !!(keys['d'] || keys['arrowright'])
  }

  if (char && !isFullscreen()) {
    updateCharacter(char, delta, input, allRoomBounds)
    updateCamera(camera, char, delta, input)
    updateOcclusion(camera, char.mesh.position)
  }

  checkProximity(artworks, char ? char.mesh.position : camera.position)
})

// Load character model in background — failure won't break the gallery
try {
  char = await loadCharacter(scene)
} catch (err) {
  console.warn('Character model failed to load:', err)
}
