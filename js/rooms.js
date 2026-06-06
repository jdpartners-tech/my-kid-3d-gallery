import * as THREE from 'three'
import { IS_MOBILE } from './mobile.js'

const ROOM_W = 8, ROOM_D = 12, ROOM_H = 3.5
const LOBBY_W = 12, LOBBY_D = 10
const DOOR_W = 2.0, DOOR_H = 2.6
const ARTWORK_Y = 1.5
const ARTWORK_Z_OFFSETS = [-3.5, 0, 3.5]
const JUNC_DEPTH = 1.4
const JUNC_END_Z = LOBBY_D + JUNC_DEPTH  // z=11.4 — where junction ends and wing walls begin

// Lambert is cheaper than Standard (no PBR) — walls don't need metalness
const MATS = {
  wall:    new THREE.MeshLambertMaterial({ color: 0x2e5238 }),   // rich emerald green
  ceiling: new THREE.MeshLambertMaterial({ color: 0xfaf6ee }),   // bright warm ivory
  frame:   IS_MOBILE
    ? new THREE.MeshLambertMaterial({ color: 0xc8a820 })
    : new THREE.MeshStandardMaterial({ color: 0xc8a820, metalness: 0.6, roughness: 0.3 }),
  trim:    IS_MOBILE
    ? new THREE.MeshLambertMaterial({ color: 0xd4af37 })
    : new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.5, roughness: 0.3 }),
}

// Procedural marble texture — warm Crema Marfil with natural bezier veining
let _mSeed = 0
function makeMarbleTex(seed) {
  const S = 512
  const cvs = document.createElement('canvas')
  cvs.width = S; cvs.height = S
  const ctx = cvs.getContext('2d')
  let s = (seed * 1664525 + 1013904223) | 0
  const rng = () => { s = (s * 1664525 + 1013904223) | 0; return (s >>> 0) / 4294967296 }

  ctx.fillStyle = '#ece4ce'   // warm ivory base
  ctx.fillRect(0, 0, S, S)

  // Soft blurred deep veins
  ctx.save(); ctx.filter = 'blur(5px)'
  for (let i = 0; i < 6; i++) {
    ctx.beginPath()
    ctx.moveTo(rng() * S, rng() * S)
    ctx.bezierCurveTo(rng() * S, rng() * S, rng() * S, rng() * S, rng() * S, rng() * S)
    ctx.strokeStyle = `rgba(148,118,72,${0.15 + rng() * 0.2})`
    ctx.lineWidth = 8 + rng() * 16
    ctx.stroke()
  }
  ctx.restore()

  // Mid-weight veins
  for (let i = 0; i < 10; i++) {
    ctx.beginPath()
    ctx.moveTo(rng() * S, rng() * S)
    ctx.quadraticCurveTo(rng() * S, rng() * S, rng() * S, rng() * S)
    ctx.strokeStyle = `rgba(140,110,65,${0.2 + rng() * 0.25})`
    ctx.lineWidth = 0.7 + rng() * 2.5
    ctx.stroke()
  }

  // Hairline veins
  for (let i = 0; i < 16; i++) {
    ctx.beginPath()
    ctx.moveTo(rng() * S, rng() * S)
    ctx.lineTo(rng() * S, rng() * S)
    ctx.strokeStyle = `rgba(175,150,100,${0.12 + rng() * 0.16})`
    ctx.lineWidth = 0.2 + rng() * 0.6
    ctx.stroke()
  }
  return cvs
}

function makeFloorMat(rx = 4, rz = 4) {
  if (IS_MOBILE) return new THREE.MeshLambertMaterial({ color: 0xddd5bc })
  const tex = new THREE.CanvasTexture(makeMarbleTex(++_mSeed))
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(rx / 3, rz / 3)   // ~3-unit slabs — large gallery marble
  return new THREE.MeshLambertMaterial({ map: tex })
}

// Gold crown molding + baseboard strip along a wall face
function addHorzTrim(scene, cx, cz, w, d) {
  const crown = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), MATS.trim)
  crown.position.set(cx, ROOM_H - 0.06, cz)
  scene.add(crown)
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), MATS.trim)
  base.position.set(cx, 0.07, cz)
  scene.add(base)
}

function addSpotlight(scene, x, y, z, targetX, targetZ) {
  if (IS_MOBILE) return  // spotlights are the #1 mobile perf killer — skip entirely
  const light = new THREE.SpotLight(0xfff0d0, 5.0, 9, Math.PI / 6, 0.3)
  light.position.set(x, y, z)
  light.castShadow = false
  const target = new THREE.Object3D()
  target.position.set(targetX, ARTWORK_Y, targetZ)
  scene.add(target)
  light.target = target
  scene.add(light)
}

export const wallMat = MATS.wall  // exported so main.js can identify wall meshes for occlusion

export function buildLobby(scene, kidNames, kidColors) {
  const cx = 0, cz = LOBBY_D / 2

  // Floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(LOBBY_W, 0.1, LOBBY_D), makeFloorMat(LOBBY_W, LOBBY_D))
  floor.position.set(cx, -0.05, cz)
  floor.userData.notOccludable = true
  scene.add(floor)

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(LOBBY_W, 0.1, LOBBY_D), MATS.ceiling)
  ceil.position.set(cx, ROOM_H, cz)
  ceil.userData.notOccludable = true
  scene.add(ceil)

  // Two ceiling pendants — front and back of lobby for glamorous even fill
  const lobbyLight1 = new THREE.PointLight(0xfff0d0, 3.5, 22)
  lobbyLight1.position.set(cx, ROOM_H - 0.3, cz - LOBBY_D / 4)
  scene.add(lobbyLight1)
  const lobbyLight2 = new THREE.PointLight(0xfff0d0, 3.5, 22)
  lobbyLight2.position.set(cx, ROOM_H - 0.3, cz + LOBBY_D / 4)
  scene.add(lobbyLight2)

  // South wall (entry side — solid)
  const southWall = new THREE.Mesh(new THREE.BoxGeometry(LOBBY_W, ROOM_H, 0.15), MATS.wall)
  southWall.position.set(cx, ROOM_H / 2, 0.075)
  southWall.receiveShadow = true
  scene.add(southWall)

  // Left wall
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, ROOM_H, LOBBY_D), MATS.wall)
  leftWall.position.set(cx - LOBBY_W / 2 + 0.075, ROOM_H / 2, cz)
  scene.add(leftWall)

  // Right wall
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, ROOM_H, LOBBY_D), MATS.wall)
  rightWall.position.set(cx + LOBBY_W / 2 - 0.075, ROOM_H / 2, cz)
  scene.add(rightWall)

  // Gold crown molding + baseboard on lobby walls
  addHorzTrim(scene, cx, 0.19, LOBBY_W, 0.09)                          // south wall
  addHorzTrim(scene, cx - LOBBY_W / 2 + 0.10, cz, 0.09, LOBBY_D)      // left wall
  addHorzTrim(scene, cx + LOBBY_W / 2 - 0.10, cz, 0.09, LOBBY_D)      // right wall

  // North wall — two door openings: left door centred at X=-2.5, right at X=+2.5
  const northZ = cz + LOBBY_D / 2
  const doorXL = cx - 2.5
  const doorXR = cx + 2.5

  // North wall is split into panels around the two doors:
  // [far-left panel] [door gap] [middle panel] [door gap] [far-right panel] + top strips
  const farSideW = (LOBBY_W / 2 - DOOR_W / 2 - 2.5) // width of outermost panels
  const midW = doorXR - doorXL - DOOR_W              // width of middle panel between doors

  // Far-left panel
  const nwFL = new THREE.Mesh(new THREE.BoxGeometry(farSideW, ROOM_H, 0.15), MATS.wall)
  nwFL.position.set(cx - LOBBY_W / 2 + farSideW / 2, ROOM_H / 2, northZ)
  scene.add(nwFL)

  // Far-right panel
  const nwFR = new THREE.Mesh(new THREE.BoxGeometry(farSideW, ROOM_H, 0.15), MATS.wall)
  nwFR.position.set(cx + LOBBY_W / 2 - farSideW / 2, ROOM_H / 2, northZ)
  scene.add(nwFR)

  // Middle panel (between the two doors)
  if (midW > 0) {
    const nwMid = new THREE.Mesh(new THREE.BoxGeometry(midW, ROOM_H, 0.15), MATS.wall)
    nwMid.position.set(cx, ROOM_H / 2, northZ)
    scene.add(nwMid)
  }

  // Top strips above each door opening
  const topH = ROOM_H - DOOR_H
  ;[doorXL, doorXR].forEach(dx => {
    const top = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, topH, 0.15), MATS.wall)
    top.position.set(dx, DOOR_H + topH / 2, northZ)
    scene.add(top)

    // Door arch trim
    const arch = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + 0.15, 0.12, 0.15), MATS.trim)
    arch.position.set(dx, DOOR_H, northZ - 0.08)
    scene.add(arch)
  })

  // Wing name signs above each door
  kidNames.forEach((name, i) => {
    const dx = i === 0 ? doorXL : doorXR
    const canvas2d = document.createElement('canvas')
    canvas2d.width = 256
    canvas2d.height = 64
    const ctx = canvas2d.getContext('2d')
    ctx.clearRect(0, 0, 256, 64)
    ctx.fillStyle = kidColors[i]
    ctx.font = 'bold 26px Georgia'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${name}'s Wing`, 128, 32)
    const tex = new THREE.CanvasTexture(canvas2d)
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.45),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    )
    sign.position.set(dx, DOOR_H + 0.5, northZ - 0.16)
    scene.add(sign)
  })

  return {
    bounds: {
      xMin: cx - LOBBY_W / 2 + 0.2,
      xMax: cx + LOBBY_W / 2 - 0.2,
      zMin: 0.2,
      zMax: northZ - 0.2
    },
    leftDoorX: doorXL,
    rightDoorX: doorXR,
    northZ
  }
}

function buildRoom(scene, cx, cz, openSouth = false, openInnerSouth = false) {
  // Floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.1, ROOM_D), makeFloorMat(ROOM_W, ROOM_D))
  floor.position.set(cx, -0.05, cz)
  floor.userData.notOccludable = true
  scene.add(floor)

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.1, ROOM_D), MATS.ceiling)
  ceil.position.set(cx, ROOM_H, cz)
  ceil.userData.notOccludable = true
  scene.add(ceil)

  // Two ceiling pendants — front and back half of room for bright even fill
  const light1 = new THREE.PointLight(0xfff0d0, 3.0, 20)
  light1.position.set(cx, ROOM_H - 0.3, cz - ROOM_D / 4)
  scene.add(light1)
  const light2 = new THREE.PointLight(0xfff0d0, 3.0, 20)
  light2.position.set(cx, ROOM_H - 0.3, cz + ROOM_D / 4)
  scene.add(light2)

  // Left wall — trimmed for right wing room 0 (inner wall faces the junction corridor)
  const leftShorten = openInnerSouth && cx > 0
  const leftWallLen = leftShorten ? (cz + ROOM_D / 2) - JUNC_END_Z : ROOM_D
  const leftWallCz  = leftShorten ? (JUNC_END_Z + cz + ROOM_D / 2) / 2 : cz
  if (leftWallLen > 0) {
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, ROOM_H, leftWallLen), MATS.wall)
    leftWall.position.set(cx - ROOM_W / 2, ROOM_H / 2, leftWallCz)
    scene.add(leftWall)
  }

  // Right wall — trimmed for left wing room 0 (inner wall faces the junction corridor)
  const rightShorten = openInnerSouth && cx < 0
  const rightWallLen = rightShorten ? (cz + ROOM_D / 2) - JUNC_END_Z : ROOM_D
  const rightWallCz  = rightShorten ? (JUNC_END_Z + cz + ROOM_D / 2) / 2 : cz
  if (rightWallLen > 0) {
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, ROOM_H, rightWallLen), MATS.wall)
    rightWall.position.set(cx + ROOM_W / 2, ROOM_H / 2, rightWallCz)
    scene.add(rightWall)
  }

  // Gold crown molding + baseboard along side walls
  addHorzTrim(scene, cx - ROOM_W / 2 + 0.10, leftShorten ? leftWallCz : cz,  0.09, leftWallLen  > 0 ? leftWallLen  : ROOM_D)
  addHorzTrim(scene, cx + ROOM_W / 2 - 0.10, rightShorten ? rightWallCz : cz, 0.09, rightWallLen > 0 ? rightWallLen : ROOM_D)

  // Decorative gold pilasters between the three artwork bays
  const PILASTER_H = ROOM_H - 0.30
  for (const pz of [cz - 1.75, cz + 1.75]) {
    const pl = new THREE.Mesh(new THREE.BoxGeometry(0.08, PILASTER_H, 0.10), MATS.trim)
    pl.position.set(cx - ROOM_W / 2 + 0.12, ROOM_H / 2, pz)
    scene.add(pl)
    const pr = new THREE.Mesh(new THREE.BoxGeometry(0.08, PILASTER_H, 0.10), MATS.trim)
    pr.position.set(cx + ROOM_W / 2 - 0.12, ROOM_H / 2, pz)
    scene.add(pr)
  }

  // Back wall (south) — omitted for first room so player can enter from the junction corridor
  if (!openSouth) {
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, 0.15), MATS.wall)
    backWall.position.set(cx, ROOM_H / 2, cz - ROOM_D / 2)
    scene.add(backWall)
    addHorzTrim(scene, cx, cz - ROOM_D / 2 + 0.10, ROOM_W, 0.09)
  }

  // Front wall (north) — with door opening to next room
  const frontZ = cz + ROOM_D / 2
  const sideW = (ROOM_W - DOOR_W) / 2
  const topH = ROOM_H - DOOR_H
  ;[
    [cx - DOOR_W / 2 - sideW / 2, ROOM_H / 2,         sideW, ROOM_H],
    [cx + DOOR_W / 2 + sideW / 2, ROOM_H / 2,         sideW, ROOM_H],
    [cx,                           DOOR_H + topH / 2,  DOOR_W, topH ],
  ].forEach(([px, py, pw, ph]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.15), MATS.wall)
    m.position.set(px, py, frontZ)
      scene.add(m)
  })

  // Artwork spotlights + slots
  const slots = []
  for (const dz of ARTWORK_Z_OFFSETS) {
    const lx = cx - ROOM_W / 2 + 0.16
    const rx = cx + ROOM_W / 2 - 0.16
    addSpotlight(scene, lx + 0.5, ROOM_H - 0.3, cz + dz, lx, cz + dz)
    addSpotlight(scene, rx - 0.5, ROOM_H - 0.3, cz + dz, rx, cz + dz)
    slots.push({ position: new THREE.Vector3(lx, ARTWORK_Y, cz + dz), normalX:  1, kidIndex: null, artworkIndex: null })
    slots.push({ position: new THREE.Vector3(rx, ARTWORK_Y, cz + dz), normalX: -1, kidIndex: null, artworkIndex: null })
  }

  return {
    slots,
    bounds: {
      xMin: cx - ROOM_W / 2 + 0.2,
      xMax: cx + ROOM_W / 2 - 0.2,
      zMin: cz - ROOM_D / 2 + 0.2,
      zMax: cz + ROOM_D / 2 - 0.2
    }
  }
}

export function buildWings(scene, manifest) {
  const allSlots = []
  const allBounds = []

  // T-junction corridor: bridges the lobby north doors to the two wing room entrances.
  // The lobby doors are at x=±2.5, z=10. The wings are at x=±10. The corridor lets
  // the player walk laterally from a door to whichever wing they want.
  const juncZ = LOBBY_D + 0.6        // corridor centre z = 10.6
  const juncDepth = 1.4              // corridor spans z=10 to z=11.4 (approx)
  const juncHalfD = juncDepth / 2
  const fullSpan = LOBBY_W + ROOM_W  // =20, covers x=-10..+10 with some extra

  // Floor bridge covering the gap between lobby and wing floors
  const bFloor = new THREE.Mesh(new THREE.BoxGeometry(fullSpan, 0.1, juncDepth + 0.2), makeFloorMat(fullSpan, juncDepth + 0.2))
  bFloor.position.set(0, -0.05, juncZ)
  bFloor.receiveShadow = true
  bFloor.userData.notOccludable = true
  scene.add(bFloor)

  // Ceiling bridge
  const bCeil = new THREE.Mesh(new THREE.BoxGeometry(fullSpan, 0.1, juncDepth + 0.2), MATS.ceiling)
  bCeil.position.set(0, ROOM_H, juncZ)
  bCeil.userData.notOccludable = true
  scene.add(bCeil)

  // Back wall of junction (blocks the void between the two wings)
  const bBack = new THREE.Mesh(new THREE.BoxGeometry(LOBBY_W, ROOM_H, 0.15), MATS.wall)
  bBack.position.set(0, ROOM_H / 2, LOBBY_D + juncDepth)
  scene.add(bBack)

  // Junction corridor light
  const jLight = new THREE.PointLight(0xfff0d0, 2.5, 24)
  jLight.position.set(0, ROOM_H - 0.3, juncZ)
  scene.add(jLight)

  // Bounds: narrow door passages (prevent walking through solid wall panels),
  // then full-width lateral corridor past the wall.
  const DOOR_HALF = DOOR_W / 2
  allBounds.push(
    // Left door passage
    { xMin: -2.5 - DOOR_HALF, xMax: -2.5 + DOOR_HALF, zMin: LOBBY_D - 0.3, zMax: LOBBY_D + 0.3 },
    // Right door passage
    { xMin:  2.5 - DOOR_HALF, xMax:  2.5 + DOOR_HALF, zMin: LOBBY_D - 0.3, zMax: LOBBY_D + 0.3 },
    // Full lateral corridor
    { xMin: -(LOBBY_W / 2 + ROOM_W / 2 - 0.2), xMax: LOBBY_W / 2 + ROOM_W / 2 - 0.2,
      zMin: LOBBY_D + 0.2, zMax: LOBBY_D + juncDepth - 0.1 }
  )

  manifest.kids.forEach((kid, kidIdx) => {
    const wingX = kidIdx === 0 ? -10 : 10
    const artworks = kid.artworks
    const roomCount = Math.max(1, Math.ceil(artworks.length / 6))

    for (let r = 0; r < roomCount; r++) {
      const cz = LOBBY_D + ROOM_D / 2 + r * ROOM_D
      // Always omit south wall: room 0's south is open to the corridor;
      // rooms r>0 south is already handled by room r-1's north door wall.
      // For room 0, trim the inner side wall so the junction corridor is open.
      const { slots, bounds } = buildRoom(scene, wingX, cz, true, r === 0)

      slots.forEach((slot, s) => {
        const artIdx = r * 6 + s
        slot.kidIndex = kidIdx
        slot.artworkIndex = artIdx < artworks.length ? artIdx : null
        allSlots.push(slot)
      })

      allBounds.push(bounds)

      // Bridge the 0.4-unit bound gap at the north door between consecutive rooms
      if (r < roomCount - 1) {
        allBounds.push({
          xMin: wingX - DOOR_W / 2,
          xMax: wingX + DOOR_W / 2,
          zMin: cz + ROOM_D / 2 - 0.35,
          zMax: cz + ROOM_D / 2 + 0.35
        })
      }
    }
  })

  return { allSlots, allBounds }
}
