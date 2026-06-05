import { initScene, startLoop } from './scene.js'
import { buildLobby } from './rooms.js'

const { scene, camera, renderer } = initScene()

const manifest = await fetch('manifest.json').then(r => r.json())
const kidNames  = manifest.kids.map(k => k.name)
const kidColors = manifest.kids.map(k => k.color)

buildLobby(scene, kidNames, kidColors)

camera.position.set(0, 2, -2)
camera.lookAt(0, 1.5, 5)

startLoop(renderer, scene, camera, () => {})
