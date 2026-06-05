import { initScene, startLoop } from './scene.js'
import { buildLobby, buildWings } from './rooms.js'

const { scene, camera, renderer } = initScene()

const manifest = await fetch('manifest.json').then(r => r.json())
const kidNames  = manifest.kids.map(k => k.name)
const kidColors = manifest.kids.map(k => k.color)

const lobby = buildLobby(scene, kidNames, kidColors)
const { allSlots, allBounds } = buildWings(scene, manifest)

// Position camera inside Kid 1's first room to verify wings rendered
camera.position.set(-10, 2, 15)
camera.lookAt(-10, 1.5, 20)

startLoop(renderer, scene, camera, () => {})
