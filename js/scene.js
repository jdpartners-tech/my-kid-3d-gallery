import * as THREE from 'three'

export function initScene() {
  const canvas = document.createElement('canvas')
  document.body.prepend(canvas)

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a14)
  scene.fog = new THREE.Fog(0x0a0a14, 20, 45)

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.set(0, 3, -5)

  scene.add(new THREE.AmbientLight(0xffffff, 0.25))

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
