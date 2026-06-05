import * as THREE from 'three'
import { initScene, startLoop } from './scene.js'

const { scene, camera, renderer } = initScene()

// Temp: rotating cube to verify scene works
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xffffff })
)
cube.position.set(0, 1, 5)
scene.add(cube)

startLoop(renderer, scene, camera, (delta) => {
  cube.rotation.y += delta
})
