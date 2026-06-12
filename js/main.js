import * as THREE from 'three'
import { initScene, startLoop } from './scene.js'
import { buildLobby, buildWings } from './rooms.js'
import { loadCharacter, updateCharacter, updateCamera } from './character.js'
import { loadArtworks, checkProximity, hideFullscreen, isFullscreen, viewNearestArtwork } from './artwork.js'
import { isMobile, IS_MOBILE, createMobileControls } from './mobile.js'
import { createVisitors, updateVisitors } from './visitors.js'
import { showCharacterSelect } from './character-select.js'

function dismissLoader() {
  const loader = document.getElementById('loader')
  if (!loader) return
  loader.classList.add('hidden')
  loader.addEventListener('transitionend', () => loader.remove(), { once: true })
}

function createEnterLoader() {
  const el = document.createElement('div')
  el.id = 'loader'
  el.innerHTML = `
    <div id="loader-ring"></div>
    <div id="loader-text">Entering Gallery</div>
    <div id="loader-sub">Loading your character…</div>
  `
  document.body.appendChild(el)
  return {
    setSub: msg => { const s = el.querySelector('#loader-sub'); if (s) s.textContent = msg },
    dismiss: () => {
      el.classList.add('hidden')
      el.addEventListener('transitionend', () => el.remove(), { once: true })
    }
  }
}

function showLoaderError(msg) {
  const ring = document.getElementById('loader-ring')
  const text = document.getElementById('loader-text')
  const sub  = document.getElementById('loader-sub')
  if (ring) { ring.style.animation = 'none'; ring.style.borderTopColor = 'rgba(255,100,100,0.6)' }
  if (text) text.textContent = 'Could not load gallery'
  if (sub)  sub.textContent  = msg || 'Please refresh the page'
}

;(async () => {
  const { scene, camera, renderer } = initScene()

  let manifest
  try {
    const res = await fetch('manifest.json')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    manifest = await res.json()
  } catch (err) {
    console.error('Failed to load manifest:', err)
    showLoaderError('Could not load artwork list — check your connection.')
    return
  }

  const kidNames  = manifest.kids.map(k => k.name)
  const kidColors = manifest.kids.map(k => k.color)

  const lobby = buildLobby(scene, kidNames, kidColors)
  const { allSlots, allBounds } = buildWings(scene, manifest)
  const artworks = loadArtworks(manifest, allSlots, scene)

  // Force matrixWorld to be correct before computing worldBBs — Three.js only updates
  // matrixWorld during render, so without this all boxes end up at the origin.
  scene.updateMatrixWorld(true)

  // Clone every occludable mesh's material so it can be made transparent independently.
  // Floor, ceiling, and junction arm walls are excluded (notOccludable flag).
  const occludables = []
  scene.traverse(obj => {
    if (obj.isMesh && !obj.userData.notOccludable) {
      obj.material = obj.material.clone()
      obj.userData.hidden = false
      // Pre-compute world bounding box once — used to detect camera clipping into a wall
      obj.geometry.computeBoundingBox()
      obj.userData.worldBB = obj.geometry.boundingBox.clone().applyMatrix4(obj.matrixWorld)
      occludables.push(obj)
    }
  })

  // Warm-up: compile transparent shader variants now (under the loader) so the first wall
  // that goes transparent doesn't cause a 1-3s GPU stall mid-game.
  occludables.forEach(m => { m.material.transparent = true; m.material.opacity = 0; m.material.needsUpdate = true })
  renderer.render(scene, camera)
  occludables.forEach(m => { m.material.transparent = false; m.material.opacity = 1; m.material.needsUpdate = true })
  renderer.render(scene, camera)

  // Link each trim piece to its nearest parent wall so blocking the wall also blocks its trim.
  // Exclude isFrame meshes from wallMeshes — frames sit closer to trim than walls do,
  // causing trim to incorrectly link to a frame that can't go transparent from behind.
  const _tc = new THREE.Vector3(), _wc = new THREE.Vector3()
  const wallMeshes = occludables.filter(m => !m.userData.isTrim && !m.userData.isFrame)
  for (const t of occludables.filter(m => m.userData.isTrim)) {
    t.userData.worldBB.getCenter(_tc)
    let nearest = null, nearestDist = Infinity
    for (const w of wallMeshes) {
      w.userData.worldBB.getCenter(_wc)
      const d = _tc.distanceTo(_wc)
      if (d < nearestDist) { nearestDist = d; nearest = w }
    }
    if (nearest && nearestDist < 4.0) t.userData.linkedWall = nearest
  }
  // Link each frame/canvas mesh to its nearest wall for the same reason — when the camera
  // clips through a wall the wall turns transparent but unlinked frame backs stayed opaque.
  for (const f of occludables.filter(m => m.userData.isFrame)) {
    f.userData.worldBB.getCenter(_tc)
    let nearest = null, nearestDist = Infinity
    for (const w of wallMeshes) {
      w.userData.worldBB.getCenter(_wc)
      const d = _tc.distanceTo(_wc)
      if (d < nearestDist) { nearestDist = d; nearest = w }
    }
    if (nearest && nearestDist < 6.0) f.userData.linkedWall = nearest
  }

  // Only raycast against walls — trim and frames go transparent via linkedWall propagation,
  // so including them in intersectObjects is wasted work (especially on mobile).
  const raycastTargets = occludables.filter(m => !m.userData.isTrim && !m.userData.isFrame)

  const camRaycaster = new THREE.Raycaster()
  let _occTick = 0

  function updateOcclusion(camera, charPos) {
    // Three rays along the character's centre line (no shoulder offsets — those caused
    // false positives when character walked near a side wall)
    const bodyPoints = [
      new THREE.Vector3(charPos.x, charPos.y + 1.5, charPos.z),
      new THREE.Vector3(charPos.x, charPos.y + 1.0, charPos.z),
      new THREE.Vector3(charPos.x, charPos.y + 0.2, charPos.z),
    ]
    const blocked = new Set()
    for (const target of bodyPoints) {
      const dir = target.clone().sub(camera.position)
      const dist = dir.length()
      if (dist < 0.1) continue
      camRaycaster.set(camera.position, dir.normalize())
      camRaycaster.far = dist  // trim transparency handled by linkedWall propagation
      for (const h of camRaycaster.intersectObjects(raycastTargets)) blocked.add(h.object)
    }
    // Also hide any wall the camera is inside or very near (clips into corners after a turn).
    // distanceToPoint returns 0 when inside the box, distance to nearest face otherwise.
    for (const m of occludables) {
      if (m.userData.worldBB && m.userData.worldBB.distanceToPoint(camera.position) < 0.25) {
        blocked.add(m)
      }
    }
    // Propagate: if a wall is blocked, also block its linked trim pieces
    for (const m of occludables) {
      if (m.userData.linkedWall && blocked.has(m.userData.linkedWall)) blocked.add(m)
    }
    for (const m of occludables) {
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

  // Input state
  const keys = {}
  const input = { forward: false, backward: false, left: false, right: false, dx: 0, sprint: false }

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape') { hideFullscreen(); return }
    if (['s','S','ArrowDown','a','A','ArrowLeft','d','D','ArrowRight'].includes(e.key) && isFullscreen()) {
      hideFullscreen()
      // fall through — register the key so movement starts immediately after closing
    }
    if (e.key === ' ') { e.preventDefault(); input.sprint = true; return }
    keys[e.key.toLowerCase()] = true
  })
  window.addEventListener('keyup', e => {
    if (e.key === ' ') { input.sprint = false; return }
    keys[e.key.toLowerCase()] = false
  })

  // Mouse drag for camera
  let dragging = false, lastMouseX = 0
  window.addEventListener('mousedown', e => { dragging = true; lastMouseX = e.clientX })
  window.addEventListener('mouseup',   () => { dragging = false })
  window.addEventListener('mousemove', e => {
    if (dragging) { input.dx += e.clientX - lastMouseX; lastMouseX = e.clientX }
  })

  document.getElementById('view-btn')?.addEventListener('click', viewNearestArtwork)
  document.getElementById('fullscreen-overlay')?.addEventListener('click', hideFullscreen)
  document.getElementById('fullscreen-close')?.addEventListener('click', hideFullscreen)

  const allRoomBounds = [lobby.bounds, ...allBounds]

  // Dismiss room-build loader, show character select
  dismissLoader()
  const selection = await showCharacterSelect(manifest)

  // Create mobile controls AFTER character select — the global touchmove handler calls
  // e.preventDefault() which blocks native scroll on the character grid if registered early.
  let mobileControls = null
  if (isMobile()) {
    mobileControls = createMobileControls()
    document.getElementById('hud').textContent = 'Use joystick to walk · Drag to look'
  }

  // Show loading screen while player character and NPCs load in parallel
  const enterLoader = createEnterLoader()

  let char = null
  let visitors = []

  await Promise.all([
    loadCharacter(scene, selection.path)
      .then(c => { char = c })
      .catch(err => console.warn('Character model failed to load:', err)),
    createVisitors(scene)
      .then(v => { visitors = v })
      .catch(err => console.warn('Visitors failed:', err)),
  ])

  enterLoader.dismiss()

  camera.position.set(0, 2.5, 1)
  camera.lookAt(0, 1, 10)

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

    if (isFullscreen() && input.backward) { hideFullscreen() }

    if (char && !isFullscreen()) {
      updateCharacter(char, delta, input, allRoomBounds, visitors.map(v => v.mesh))
      updateCamera(camera, char, delta, input)
      _occTick++
      if (!IS_MOBILE || _occTick % 2 === 0) updateOcclusion(camera, char.mesh.position)
    }

    if (!isFullscreen()) updateVisitors(visitors, delta, char ? char.mesh.position : null)
    checkProximity(artworks, char ? char.mesh.position : camera.position)
  })
})()
