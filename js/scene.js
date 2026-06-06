import * as THREE from 'three'
import { IS_MOBILE } from './mobile.js'

export function initScene() {
  const canvas = document.createElement('canvas')
  document.body.prepend(canvas)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !IS_MOBILE })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(IS_MOBILE ? 1 : Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = false

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x080806)
  scene.fog = new THREE.Fog(0x080806, IS_MOBILE ? 14 : 20, IS_MOBILE ? 30 : 45)

  const far = IS_MOBILE ? 35 : 100
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, far)
  camera.position.set(0, 3, -5)

  // Higher ambient on mobile compensates for no spotlights
  scene.add(new THREE.AmbientLight(0xfff8ee, IS_MOBILE ? 0.8 : 0.35))

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
  })

  return { scene, camera, renderer }
}

export function startLoop(renderer, scene, camera, onUpdate) {
  const clock = new THREE.Clock()
  function tick() {
    requestAnimationFrame(tick)
    onUpdate(Math.min(clock.getDelta(), 0.05))
    renderer.render(scene, camera)
  }
  tick()
}
