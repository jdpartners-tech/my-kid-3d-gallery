import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { CHARACTERS, findAnim, getCharacterPath, getCharacterTargetHeight } from './character-select.js'
import { IS_MOBILE } from './mobile.js'

const SPEED = 1.8  // m/s
const AVOID_R_SQ = 0.64  // (0.8m)² — NPC–NPC and NPC–player avoidance radius squared
const PROBE_DIST = 1.6   // metres to look ahead for early avoidance
const STEER_BLEND = 0.9  // how strongly to blend in the sideways offset

// pts: [x, z, pauseSeconds]. lookYaw corrected for Quaternius (+Z at rotation.y=0).
const ROUTES = [
  // ── Kaylie room 1, inner corridor ──────────────────────────────────────────
  { lookYaw: -Math.PI / 2, startIdx: 2, pts: [
    [8.5, 15.8, 3.2], [8.5, 17.9, 2.5], [8.5, 20.0, 4.0],
    [8.5, 22.1, 2.5], [8.5, 24.2, 3.0], [8.5, 22.1, 1.8],
    [8.5, 20.0, 2.0], [8.5, 17.9, 2.2],
  ]},
  // ── Kayden room 1, inner corridor ──────────────────────────────────────────
  { lookYaw: Math.PI / 2, startIdx: 4, pts: [
    [-8.5, 24.2, 3.5], [-8.5, 22.1, 2.0], [-8.5, 20.0, 3.2],
    [-8.5, 17.9, 2.5], [-8.5, 15.8, 2.0], [-8.5, 17.9, 1.8],
    [-8.5, 20.0, 2.8],
  ]},
  // ── Lobby wanderer ─────────────────────────────────────────────────────────
  { lookYaw: 0, startIdx: 0, pts: [
    [ 4.5,  6.5, 1.5], [ 4.5, 11.5, 1.2], [-4.5, 11.5, 1.5],
    [-4.5,  6.5, 1.2], [ 0.0,  4.0, 2.0], [ 0.0,  9.5, 1.5],
  ]},
  // ── Kaylie room 1, outer corridor ──────────────────────────────────────────
  { lookYaw: Math.PI / 2, startIdx: 1, pts: [
    [11.5, 27.8, 3.0], [11.5, 29.9, 2.5], [11.5, 32.0, 4.0],
    [11.5, 34.1, 2.5], [11.5, 36.2, 3.0], [11.5, 34.1, 2.0],
  ]},
  // ── Kayden room 2, inner corridor ──────────────────────────────────────────
  { lookYaw: Math.PI / 2, startIdx: 3, pts: [
    [-8.5, 27.8, 3.0], [-8.5, 29.9, 2.5], [-8.5, 32.0, 4.0],
    [-8.5, 34.1, 2.5], [-8.5, 36.2, 3.0], [-8.5, 34.1, 2.0],
  ]},
  // ── Kayden room 2, outer corridor ──────────────────────────────────────────
  { lookYaw: -Math.PI / 2, startIdx: 0, pts: [
    [-11.5, 27.8, 2.5], [-11.5, 29.9, 3.0], [-11.5, 32.0, 2.0],
    [-11.5, 34.1, 3.5], [-11.5, 36.2, 2.0], [-11.5, 34.1, 1.8],
    [-11.5, 32.0, 2.5],
  ]},
  // ── Kayden room 3, inner corridor ──────────────────────────────────────────
  { lookYaw: Math.PI / 2, startIdx: 2, pts: [
    [-8.5, 39.8, 3.2], [-8.5, 42.0, 2.5], [-8.5, 44.0, 4.0],
    [-8.5, 46.0, 2.5], [-8.5, 48.2, 3.0], [-8.5, 46.0, 1.8],
  ]},
  // ── Kaylie room 1, outer corridor ──────────────────────────────────────────
  { lookYaw: -Math.PI / 2, startIdx: 1, pts: [
    [11.5, 15.8, 3.0], [11.5, 17.9, 2.5], [11.5, 20.0, 4.0],
    [11.5, 22.1, 2.5], [11.5, 24.2, 3.0], [11.5, 22.1, 1.8],
  ]},
  // ── Junction meander ───────────────────────────────────────────────────────
  { lookYaw: 0, startIdx: 0, pts: [
    [ 2.0, 10.5, 2.0], [-2.0, 10.5, 1.5], [-2.0, 12.5, 2.0],
    [ 2.0, 12.5, 1.5], [ 0.0, 11.5, 2.5],
  ]},
]

export async function createVisitors(scene) {
  // Pick unique random characters; mobile loads fewer to save bandwidth and CPU
  const routeCount = IS_MOBILE ? 3 : ROUTES.length
  const shuffled = [...CHARACTERS].sort(() => Math.random() - 0.5)
  const picks = shuffled.slice(0, routeCount)

  const loader = new GLTFLoader()
  const results = await Promise.allSettled(
    ROUTES.slice(0, routeCount).map((route, i) => loadVisitor(loader, scene, route, picks[i].id))
  )
  return results.filter(r => r.status === 'fulfilled').map(r => r.value)
}

async function loadVisitor(loader, scene, route, charId) {
  const gltf = await new Promise((resolve, reject) => {
    loader.load(getCharacterPath(charId), resolve, undefined, reject)
  })

  const mesh = gltf.scene

  const targetH = getCharacterTargetHeight(getCharacterPath(charId))
  const box = new THREE.Box3().setFromObject(mesh)
  const h = box.max.y - box.min.y
  if (h > 0.1) mesh.scale.setScalar(targetH / h)
  const box2 = new THREE.Box3().setFromObject(mesh)
  const yOffset = -box2.min.y

  const pt = route.pts[route.startIdx % route.pts.length]
  mesh.position.set(pt[0], yOffset, pt[1])
  mesh.rotation.y = route.lookYaw

  mesh.traverse(c => {
    if (c.isMesh) {
      c.castShadow = false
      c.receiveShadow = false
      c.userData.notOccludable = true
    }
  })
  scene.add(mesh)

  const mixer = new THREE.AnimationMixer(mesh)
  const walkClip = findAnim(gltf.animations, 'walk')
  const idleClip = findAnim(gltf.animations, 'idle')
  const walkAction = walkClip ? mixer.clipAction(walkClip) : null
  const idleAction = idleClip ? mixer.clipAction(idleClip) : null

  if (idleAction) idleAction.play()

  return {
    mesh, mixer, walkAction, idleAction, yOffset,
    pts: route.pts,
    lookYaw: route.lookYaw,
    idx: route.startIdx % route.pts.length,
    pauseLeft: pt[2] * Math.random(),
    pausing: true,
    _state: 'idle',
  }
}

export function updateVisitors(visitors, delta, charPos) {
  for (let i = 0; i < visitors.length; i++) {
    const v = visitors[i]
    v.mixer.update(delta)
    const target = v.pts[v.idx]
    const tx = target[0], tz = target[1]

    if (v.pausing) {
      v.pauseLeft -= delta
      let diff = v.lookYaw - v.mesh.rotation.y
      while (diff >  Math.PI) diff -= 2 * Math.PI
      while (diff < -Math.PI) diff += 2 * Math.PI
      v.mesh.rotation.y += diff * Math.min(1, delta * 1.8)

      if (v._state !== 'idle') {
        v._state = 'idle'
        v.walkAction?.fadeOut(0.3)
        v.idleAction?.reset().fadeIn(0.3).play()
      }

      if (v.pauseLeft <= 0) {
        v.idx = (v.idx + 1) % v.pts.length
        v.pausing = false
      }
      continue
    }

    const dx = tx - v.mesh.position.x
    const dz = tz - v.mesh.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < 0.08) {
      v.mesh.position.x = tx
      v.mesh.position.z = tz
      v.pausing = true
      v.pauseLeft = target[2]
      continue
    }

    // Compute next position with look-ahead steering
    const step = SPEED * delta
    const ndx = dx / dist, ndz = dz / dist

    // Helper: check if a world point (px,pz) is within avoidance radius of any obstacle
    const hitAny = (px, pz) => {
      if (charPos) {
        const ax = px - charPos.x, az = pz - charPos.z
        if (ax * ax + az * az < AVOID_R_SQ) return true
      }
      for (let j = 0; j < visitors.length; j++) {
        if (j === i) continue
        const ax = px - visitors[j].mesh.position.x, az = pz - visitors[j].mesh.position.z
        if (ax * ax + az * az < AVOID_R_SQ) return true
      }
      return false
    }

    // Probe PROBE_DIST ahead; if occupied, steer to the clear side early
    let moveX = ndx, moveZ = ndz
    const probeX = v.mesh.position.x + ndx * PROBE_DIST
    const probeZ = v.mesh.position.z + ndz * PROBE_DIST
    if (hitAny(probeX, probeZ)) {
      const leftX = -ndz, leftZ = ndx    // 90° left of travel
      const rightX = ndz, rightZ = -ndx  // 90° right of travel
      const clearL = !hitAny(probeX + leftX * 0.7,  probeZ + leftZ * 0.7)
      const clearR = !hitAny(probeX + rightX * 0.7, probeZ + rightZ * 0.7)
      // Pick clear side; if both clear or both blocked, default to left
      const sideX = (!clearR || clearL) ? leftX : rightX
      const sideZ = (!clearR || clearL) ? leftZ : rightZ
      moveX = ndx + sideX * STEER_BLEND
      moveZ = ndz + sideZ * STEER_BLEND
      const mlen = Math.sqrt(moveX * moveX + moveZ * moveZ)
      moveX /= mlen; moveZ /= mlen
    }

    const nx = v.mesh.position.x + moveX * step
    const nz = v.mesh.position.z + moveZ * step

    // Final hard collision check at the actual next position
    let blocked = false
    if (charPos) {
      const px = nx - charPos.x, pz = nz - charPos.z
      if (px * px + pz * pz < AVOID_R_SQ) blocked = true
    }
    if (!blocked) {
      for (let j = 0; j < visitors.length; j++) {
        if (j === i) continue
        const ox = nx - visitors[j].mesh.position.x
        const oz = nz - visitors[j].mesh.position.z
        if (ox * ox + oz * oz < AVOID_R_SQ) { blocked = true; break }
      }
    }

    if (v._state !== 'walk') {
      v._state = 'walk'
      v.idleAction?.fadeOut(0.3)
      v.walkAction?.reset().fadeIn(0.3).play()
    }

    if (!blocked) {
      v.mesh.position.x = nx
      v.mesh.position.z = nz
      v.mesh.rotation.y = Math.atan2(moveX, moveZ)  // face actual travel direction (steered)
      v._blockedTime = 0
    } else {
      v._blockedTime = (v._blockedTime || 0) + delta
      if (v._blockedTime > 1.5) {
        // Give up on current waypoint and move to the next one
        v._blockedTime = 0
        v.idx = (v.idx + 1) % v.pts.length
        v.pausing = false
      }
    }
  }
}
