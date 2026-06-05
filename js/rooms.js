import * as THREE from 'three'

const ROOM_W = 8, ROOM_D = 12, ROOM_H = 3.5
const LOBBY_W = 12, LOBBY_D = 10
const DOOR_W = 2.0, DOOR_H = 2.6
const ARTWORK_Y = 1.5
const ARTWORK_Z_OFFSETS = [-3.5, 0, 3.5]

const MATS = {
  wall:    new THREE.MeshStandardMaterial({ color: 0xf0ece0 }),
  floor:   new THREE.MeshStandardMaterial({ color: 0x282828, roughness: 0.9 }),
  ceiling: new THREE.MeshStandardMaterial({ color: 0xe8e4d8, roughness: 1 }),
  frame:   new THREE.MeshStandardMaterial({ color: 0xb8960a, metalness: 0.4, roughness: 0.5 }),
  trim:    new THREE.MeshStandardMaterial({ color: 0x806000, metalness: 0.3 }),
}

function addSpotlight(scene, x, y, z, targetX, targetZ) {
  const light = new THREE.SpotLight(0xfff5e0, 2.5, 8, Math.PI / 6, 0.4)
  light.position.set(x, y, z)
  light.castShadow = true
  light.shadow.mapSize.set(512, 512)
  const target = new THREE.Object3D()
  target.position.set(targetX, ARTWORK_Y, targetZ)
  scene.add(target)
  light.target = target
  scene.add(light)
}

export function buildLobby(scene, kidNames, kidColors) {
  const cx = 0, cz = LOBBY_D / 2

  // Floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(LOBBY_W, 0.1, LOBBY_D), MATS.floor)
  floor.position.set(cx, -0.05, cz)
  floor.receiveShadow = true
  scene.add(floor)

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(LOBBY_W, 0.1, LOBBY_D), MATS.ceiling)
  ceil.position.set(cx, ROOM_H, cz)
  scene.add(ceil)

  // Ceiling light
  const lobbyLight = new THREE.PointLight(0xfff5e0, 1.5, 14)
  lobbyLight.position.set(cx, ROOM_H - 0.3, cz)
  scene.add(lobbyLight)

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

function buildRoom(scene, cx, cz, openSouth = false) {
  // Floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.1, ROOM_D), MATS.floor)
  floor.position.set(cx, -0.05, cz)
  floor.receiveShadow = true
  scene.add(floor)

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.1, ROOM_D), MATS.ceiling)
  ceil.position.set(cx, ROOM_H, cz)
  scene.add(ceil)

  // Ceiling light
  const light = new THREE.PointLight(0xfff5e0, 1.2, 12)
  light.position.set(cx, ROOM_H - 0.3, cz)
  scene.add(light)

  // Left wall
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, ROOM_H, ROOM_D), MATS.wall)
  leftWall.position.set(cx - ROOM_W / 2, ROOM_H / 2, cz)
  leftWall.receiveShadow = true
  scene.add(leftWall)

  // Right wall
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, ROOM_H, ROOM_D), MATS.wall)
  rightWall.position.set(cx + ROOM_W / 2, ROOM_H / 2, cz)
  rightWall.receiveShadow = true
  scene.add(rightWall)

  // Back wall (south) — omitted for first room so player can enter from the junction corridor
  if (!openSouth) {
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, 0.15), MATS.wall)
    backWall.position.set(cx, ROOM_H / 2, cz - ROOM_D / 2)
    scene.add(backWall)
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
    m.receiveShadow = true
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
  const bFloor = new THREE.Mesh(new THREE.BoxGeometry(fullSpan, 0.1, juncDepth + 0.2), MATS.floor)
  bFloor.position.set(0, -0.05, juncZ)
  bFloor.receiveShadow = true
  scene.add(bFloor)

  // Ceiling bridge
  const bCeil = new THREE.Mesh(new THREE.BoxGeometry(fullSpan, 0.1, juncDepth + 0.2), MATS.ceiling)
  bCeil.position.set(0, ROOM_H, juncZ)
  scene.add(bCeil)

  // Back wall of junction (blocks the void between the two wings)
  const bBack = new THREE.Mesh(new THREE.BoxGeometry(LOBBY_W, ROOM_H, 0.15), MATS.wall)
  bBack.position.set(0, ROOM_H / 2, LOBBY_D + juncDepth)
  scene.add(bBack)

  // Dim light in junction
  const jLight = new THREE.PointLight(0xfff5e0, 0.6, 14)
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
      const { slots, bounds } = buildRoom(scene, wingX, cz, r === 0)

      slots.forEach((slot, s) => {
        const artIdx = r * 6 + s
        slot.kidIndex = kidIdx
        slot.artworkIndex = artIdx < artworks.length ? artIdx : null
        allSlots.push(slot)
      })

      allBounds.push(bounds)
    }
  })

  return { allSlots, allBounds }
}
