import { initScene, startLoop } from './scene.js'
import { buildLobby, buildWings } from './rooms.js'
import { loadCharacter, updateCharacter, updateCamera } from './character.js'

const { scene, camera, renderer } = initScene()

const manifest = await fetch('manifest.json').then(r => r.json())
const kidNames  = manifest.kids.map(k => k.name)
const kidColors = manifest.kids.map(k => k.color)

const lobby = buildLobby(scene, kidNames, kidColors)
const { allSlots, allBounds } = buildWings(scene, manifest)

const char = await loadCharacter(scene)

// Keyboard state
const keys = {}
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true })
window.addEventListener('keyup',   e => { keys[e.key.toLowerCase()] = false })

// Mouse drag for camera
const input = { forward: false, backward: false, left: false, right: false, dx: 0 }
let dragging = false, lastMouseX = 0
window.addEventListener('mousedown', e => { dragging = true; lastMouseX = e.clientX })
window.addEventListener('mouseup',   () => { dragging = false })
window.addEventListener('mousemove', e => {
  if (dragging) { input.dx += e.clientX - lastMouseX; lastMouseX = e.clientX }
})

const allRoomBounds = [lobby.bounds, ...allBounds]

startLoop(renderer, scene, camera, (delta) => {
  input.forward  = !!(keys['w'] || keys['arrowup'])
  input.backward = !!(keys['s'] || keys['arrowdown'])
  input.left     = !!(keys['a'] || keys['arrowleft'])
  input.right    = !!(keys['d'] || keys['arrowright'])

  updateCharacter(char, delta, input, allRoomBounds)
  updateCamera(camera, char, input)
})
