import * as THREE from 'three'
import { IS_MOBILE } from './mobile.js'

const ROOM_W = 8, ROOM_D = 12, ROOM_H = 5.0
const LOBBY_W = 12, LOBBY_D = 10
const DOOR_W = 2.4, DOOR_H = 3.6
const ARTWORK_Y = 2.1
const ARTWORK_Z_OFFSETS = [-4.8, -2.4, 0, 2.4, 4.8]
const DADO_Y = 1.8
const JUNC_DEPTH = 4
const JUNC_END_Z = LOBBY_D + JUNC_DEPTH

const MATS = {
  wall:     makeWallMat(),
  ceiling:  new THREE.MeshLambertMaterial({ color: 0xfaf6ee }),
  skirting: new THREE.MeshLambertMaterial({ color: 0xf2ede5 }),
  frame:    IS_MOBILE
    ? new THREE.MeshLambertMaterial({ color: 0xc8a820 })
    : new THREE.MeshStandardMaterial({ color: 0xc8a820, metalness: 0.6, roughness: 0.3 }),
  trim:     IS_MOBILE
    ? new THREE.MeshLambertMaterial({ color: 0xd4af37 })
    : new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.5, roughness: 0.3 }),
}

// ── Marble floor texture ─────────────────────────────────────────────────────
let _mSeed = 0
function makeMarbleTex(seed) {
  const S = IS_MOBILE ? 256 : 512
  const cvs = document.createElement('canvas'); cvs.width = S; cvs.height = S
  const ctx = cvs.getContext('2d')
  let s = (seed * 1664525 + 1013904223) | 0
  const rng = () => { s = (s * 1664525 + 1013904223) | 0; return (s >>> 0) / 4294967296 }
  ctx.fillStyle = '#f5f2ee'; ctx.fillRect(0, 0, S, S)
  for (let i = 0; i < 5; i++) {
    const x0=rng()*S,y0=rng()*S,cx1=rng()*S,cy1=rng()*S,cx2=rng()*S,cy2=rng()*S,x1=rng()*S,y1=rng()*S
    for (let w = 14; w >= 1; w -= 2) {
      ctx.beginPath(); ctx.moveTo(x0,y0); ctx.bezierCurveTo(cx1,cy1,cx2,cy2,x1,y1)
      ctx.strokeStyle=`rgba(150,138,120,${0.03*w/14})`; ctx.lineWidth=w; ctx.stroke()
    }
  }
  for (let i = 0; i < 9; i++) {
    ctx.beginPath(); ctx.moveTo(rng()*S,rng()*S); ctx.quadraticCurveTo(rng()*S,rng()*S,rng()*S,rng()*S)
    ctx.strokeStyle=`rgba(140,128,110,${0.22+rng()*0.2})`; ctx.lineWidth=0.5+rng()*2; ctx.stroke()
  }
  for (let i = 0; i < 14; i++) {
    ctx.beginPath(); ctx.moveTo(rng()*S,rng()*S); ctx.lineTo(rng()*S,rng()*S)
    ctx.strokeStyle=`rgba(170,158,138,${0.1+rng()*0.14})`; ctx.lineWidth=0.2+rng()*0.5; ctx.stroke()
  }
  return cvs
}
function makeFloorMat(rx=4, rz=4) {
  const tex = new THREE.CanvasTexture(makeMarbleTex(++_mSeed))
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(rx/3, rz/3)
  return new THREE.MeshLambertMaterial({ map: tex })
}

// ── Damask wall texture (暗花) — sage green, distinct from white marble ──────
function makeWallTex() {
  const S = IS_MOBILE ? 256 : 512, T = IS_MOBILE ? 64 : 128
  const cvs = document.createElement('canvas'); cvs.width = S; cvs.height = S
  const ctx = cvs.getContext('2d')
  ctx.fillStyle = '#c8d4c2'; ctx.fillRect(0, 0, S, S)
  for (let row = 0; row < S/T; row++) {
    for (let col = 0; col < S/T; col++) {
      const cx = col*T + T/2, cy = row*T + T/2, d = 46
      ctx.strokeStyle = 'rgba(100,130,95,0.55)'; ctx.lineWidth = 1.2
      ctx.beginPath(); ctx.moveTo(cx,cy-d); ctx.lineTo(cx+d,cy); ctx.lineTo(cx,cy+d); ctx.lineTo(cx-d,cy); ctx.closePath(); ctx.stroke()
      ctx.fillStyle = 'rgba(100,130,95,0.45)'
      ctx.beginPath(); ctx.ellipse(cx,cy,9,13,0,0,Math.PI*2); ctx.fill()
      const pL=21, pW=7
      ctx.beginPath(); ctx.ellipse(cx,cy-pL-2,pW/2,pL/2,0,0,Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(cx,cy+pL+2,pW/2,pL/2,0,0,Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(cx+pL+2,cy,pL/2,pW/2,0,0,Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(cx-pL-2,cy,pL/2,pW/2,0,0,Math.PI*2); ctx.fill()
      for (const [dx,dy] of [[17,17],[-17,17],[17,-17],[-17,-17]]) {
        ctx.beginPath(); ctx.arc(cx+dx,cy+dy,2.5,0,Math.PI*2); ctx.fill()
      }
    }
  }
  return cvs
}
function makeWallMat() {
  const tex = new THREE.CanvasTexture(makeWallTex())
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 2)
  return new THREE.MeshLambertMaterial({ map: tex })
}

// ── Crown molding + skirting board (牆腳線) ───────────────────────────────────
function addWallTrimming(scene, cx, cz, w, d, noOcclude=false) {
  const crown = new THREE.Mesh(new THREE.BoxGeometry(w, 0.10, d), MATS.trim)
  crown.position.set(cx, ROOM_H - 0.05, cz); crown.userData.isTrim = true
  if (noOcclude) crown.userData.notOccludable = true; scene.add(crown)
  const sk = new THREE.Mesh(new THREE.BoxGeometry(w, 0.30, d), MATS.skirting)
  sk.position.set(cx, 0.15, cz); sk.userData.isTrim = true
  if (noOcclude) sk.userData.notOccludable = true; scene.add(sk)
  const cap = new THREE.Mesh(new THREE.BoxGeometry(w, 0.035, d), MATS.trim)
  cap.position.set(cx, 0.315, cz); cap.userData.isTrim = true
  if (noOcclude) cap.userData.notOccludable = true; scene.add(cap)
}

// ── 3D wall panels: dado rail + vertical dividers (牆身3D花紋) ────────────────
function addSideWallPaneling(scene, wx, wallCz, wallLen, noOcclude=false) {
  const inward = wx < 0 ? 1 : -1
  const proj = 0.05
  const px = wx + inward * proj/2
  const dado = new THREE.Mesh(new THREE.BoxGeometry(proj, 0.06, wallLen), MATS.trim)
  dado.position.set(px, DADO_Y, wallCz); dado.userData.isTrim = true
  if (noOcclude) dado.userData.notOccludable = true; scene.add(dado)
  for (let i = 0; i < ARTWORK_Z_OFFSETS.length-1; i++) {
    const midZ = wallCz + (ARTWORK_Z_OFFSETS[i] + ARTWORK_Z_OFFSETS[i+1]) / 2
    const bar = new THREE.Mesh(new THREE.BoxGeometry(proj, ROOM_H-0.32, 0.05), MATS.trim)
    bar.position.set(px, ROOM_H/2, midZ); bar.userData.isTrim = true
    if (noOcclude) bar.userData.notOccludable = true; scene.add(bar)
  }
}
function addFaceWallPaneling(scene, cx, fz, wallW, inward) {
  const proj = 0.05
  const pz = fz + inward * proj/2
  const dado = new THREE.Mesh(new THREE.BoxGeometry(wallW, 0.06, proj), MATS.trim)
  dado.position.set(cx, DADO_Y, pz); dado.userData.isTrim = true; scene.add(dado)
  const spacing = 2.5
  const count = Math.floor(wallW / spacing) - 1
  for (let i = 1; i <= count; i++) {
    const divX = cx - wallW/2 + i * (wallW/(count+1))
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, ROOM_H-0.32, proj), MATS.trim)
    bar.position.set(divX, ROOM_H/2, pz); bar.userData.isTrim = true; scene.add(bar)
  }
}

// ── Spotlights ────────────────────────────────────────────────────────────────
function addSpotlight(scene, x, y, z, targetX, targetY, targetZ) {
  if (IS_MOBILE) return
  const light = new THREE.SpotLight(0xfff8e0, 5.5, 10, Math.PI/7, 0.25)
  light.position.set(x, y, z); light.castShadow = false
  const t = new THREE.Object3D(); t.position.set(targetX, targetY, targetZ)
  scene.add(t); light.target = t; scene.add(light)
}

export const wallMat = MATS.wall

// ── Lobby ─────────────────────────────────────────────────────────────────────
export function buildLobby(scene, kidNames, kidColors) {
  const cx = 0, cz = LOBBY_D/2

  const floor = new THREE.Mesh(new THREE.BoxGeometry(LOBBY_W, 0.1, LOBBY_D), makeFloorMat(LOBBY_W, LOBBY_D))
  floor.position.set(cx, -0.05, cz); floor.userData.notOccludable = true; scene.add(floor)

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(LOBBY_W, 0.1, LOBBY_D), MATS.ceiling)
  ceil.position.set(cx, ROOM_H, cz); ceil.userData.notOccludable = true; scene.add(ceil)

  const ll1 = new THREE.PointLight(0xfff0d0, 6.5, 30); ll1.position.set(cx, ROOM_H-0.3, cz-LOBBY_D/4); scene.add(ll1)
  const ll2 = new THREE.PointLight(0xfff0d0, 6.5, 30); ll2.position.set(cx, ROOM_H-0.3, cz+LOBBY_D/4); scene.add(ll2)

  const fullSpan = LOBBY_W + 2 * ROOM_W   // 28m — full gallery width

  // South wall spans full gallery width so the back is closed even in the wing arm areas
  const sw = new THREE.Mesh(new THREE.BoxGeometry(fullSpan, ROOM_H, 0.15), MATS.wall)
  sw.position.set(cx, ROOM_H/2, 0.075); scene.add(sw)
  addWallTrimming(scene, cx, 0.19, fullSpan, 0.09)
  addFaceWallPaneling(scene, cx, 0, fullSpan, 1)

  // No lobby side walls or north wall — the gallery opens fully into the junction arms

  return {
    bounds: { xMin: -fullSpan/2+0.4, xMax: fullSpan/2-0.4, zMin: 0.4, zMax: LOBBY_D-0.4 }
  }
}

// ── Wing room ─────────────────────────────────────────────────────────────────
// openSouth: no south wall (entrance from junction); hasNorthWall: solid end wall or open to next room
function buildRoom(scene, cx, cz, openSouth=false, hasNorthWall=true, noOcclude=false) {
  const floor = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.1, ROOM_D), makeFloorMat(ROOM_W, ROOM_D))
  floor.position.set(cx, -0.05, cz); floor.userData.notOccludable = true; scene.add(floor)

  const ceil = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.1, ROOM_D), MATS.ceiling)
  ceil.position.set(cx, ROOM_H, cz); ceil.userData.notOccludable = true; scene.add(ceil)

  const mkPt = (x,z) => { const l=new THREE.PointLight(0xfff0d0,6.0,26); l.position.set(x,ROOM_H-0.3,z); scene.add(l) }
  mkPt(cx, cz-ROOM_D/4); mkPt(cx, cz); mkPt(cx, cz+ROOM_D/4)

  // Left wall
  const lw = new THREE.Mesh(new THREE.BoxGeometry(0.15, ROOM_H, ROOM_D), MATS.wall)
  lw.position.set(cx-ROOM_W/2, ROOM_H/2, cz)
  lw.userData.notOccludable = noOcclude; scene.add(lw)
  addWallTrimming(scene, cx-ROOM_W/2+0.10, cz, 0.09, ROOM_D, noOcclude)
  addSideWallPaneling(scene, cx-ROOM_W/2, cz, ROOM_D, noOcclude)

  // Right wall
  const rw = new THREE.Mesh(new THREE.BoxGeometry(0.15, ROOM_H, ROOM_D), MATS.wall)
  rw.position.set(cx+ROOM_W/2, ROOM_H/2, cz)
  rw.userData.notOccludable = noOcclude; scene.add(rw)
  addWallTrimming(scene, cx+ROOM_W/2-0.10, cz, 0.09, ROOM_D, noOcclude)
  addSideWallPaneling(scene, cx+ROOM_W/2, cz, ROOM_D, noOcclude)

  // South wall (omitted when open to junction)
  if (!openSouth) {
    const bw = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, 0.15), MATS.wall)
    bw.position.set(cx, ROOM_H/2, cz-ROOM_D/2); scene.add(bw)
    addWallTrimming(scene, cx, cz-ROOM_D/2+0.10, ROOM_W, 0.09)
    addFaceWallPaneling(scene, cx, cz-ROOM_D/2, ROOM_W, 1)
  }

  // North wall: solid end (last room) or open passage to next room
  const frontZ = cz + ROOM_D/2
  if (hasNorthWall) {
    const fw = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, 0.15), MATS.wall)
    fw.position.set(cx, ROOM_H/2, frontZ); scene.add(fw)
    addWallTrimming(scene, cx, frontZ, ROOM_W, 0.09)
    addFaceWallPaneling(scene, cx, frontZ, ROOM_W, -1)
  }

  // Artwork slots + spotlights
  const slots = []
  for (const dz of ARTWORK_Z_OFFSETS) {
    const lx = cx - ROOM_W/2 + 0.16
    const rx = cx + ROOM_W/2 - 0.16
    addSpotlight(scene, lx+0.5, ROOM_H-0.4, cz+dz-0.4, lx, ARTWORK_Y, cz+dz)
    addSpotlight(scene, lx+0.5, ROOM_H-0.4, cz+dz+0.4, lx, ARTWORK_Y, cz+dz)
    addSpotlight(scene, rx-0.5, ROOM_H-0.4, cz+dz-0.4, rx, ARTWORK_Y, cz+dz)
    addSpotlight(scene, rx-0.5, ROOM_H-0.4, cz+dz+0.4, rx, ARTWORK_Y, cz+dz)
    slots.push({ position: new THREE.Vector3(lx, ARTWORK_Y, cz+dz), normalX:  1, kidIndex: null, artworkIndex: null })
    slots.push({ position: new THREE.Vector3(rx, ARTWORK_Y, cz+dz), normalX: -1, kidIndex: null, artworkIndex: null })
  }

  return {
    slots,
    bounds: {
      xMin: cx-ROOM_W/2+0.4, xMax: cx+ROOM_W/2-0.4,
      zMin: cz-ROOM_D/2+0.4, zMax: cz+ROOM_D/2-0.4
    }
  }
}

// ── Wings ─────────────────────────────────────────────────────────────────────
export function buildWings(scene, manifest) {
  const allSlots = [], allBounds = []

  const juncZ    = LOBBY_D + JUNC_DEPTH / 2     // corridor centre z = 12
  const fullSpan = LOBBY_W + 2 * ROOM_W          // full corridor width = 28

  // Floor + ceiling span full gallery width and the entire lobby+junction depth (z=0–14)
  const totalDepth = LOBBY_D + JUNC_DEPTH   // 14
  const totalCz    = totalDepth / 2          // 7
  const bFloor = new THREE.Mesh(new THREE.BoxGeometry(fullSpan, 0.1, totalDepth), makeFloorMat(fullSpan, totalDepth))
  bFloor.position.set(0, -0.05, totalCz); bFloor.userData.notOccludable = true; scene.add(bFloor)

  const bCeil = new THREE.Mesh(new THREE.BoxGeometry(fullSpan, 0.1, totalDepth), MATS.ceiling)
  bCeil.position.set(0, ROOM_H, totalCz); bCeil.userData.notOccludable = true; scene.add(bCeil)

  // Outer side walls at x = ±14, spanning full lobby+junction depth
  ;[-1, 1].forEach(side => {
    const faceX = side * fullSpan / 2
    const meshX = faceX - side * 0.075
    const ow = new THREE.Mesh(new THREE.BoxGeometry(0.15, ROOM_H, totalDepth), MATS.wall)
    ow.position.set(meshX, ROOM_H/2, totalCz)
    scene.add(ow)
    addWallTrimming(scene, meshX - side * 0.025, totalCz, 0.09, totalDepth)
    addSideWallPaneling(scene, faceX, totalCz, totalDepth)
  })

  // Arm south walls REMOVED — gallery entrance is now fully open across the entire width

  // Directional wing signs suspended in the junction (no back wall — open passage to wings)
  manifest.kids.forEach((kid, i) => {
    // Kayden (i=0) at x=+3 (screen left), wing at x=+10 (screen left) → arrow ←
    // Kaylie (i=1) at x=−3 (screen right), wing at x=−10 (screen right) → arrow →
    const arrowLeft = i === 0
    const W = 512, H = 128
    const cvs = document.createElement('canvas'); cvs.width = W; cvs.height = H
    const ctx = cvs.getContext('2d')

    // Dark navy background
    ctx.fillStyle = '#0f1b2d'; ctx.fillRect(0, 0, W, H)

    // Outer gold border
    ctx.strokeStyle = '#c8a820'; ctx.lineWidth = 3; ctx.strokeRect(4, 4, W-8, H-8)

    // Thin inner accent line
    ctx.strokeStyle = 'rgba(200,168,32,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(10, 10, W-20, H-20)

    // Corner bracket ornaments
    const orn = 18; ctx.strokeStyle = '#c8a820'; ctx.lineWidth = 2
    ;[[8,8],[W-8,8],[8,H-8],[W-8,H-8]].forEach(([ox, oy]) => {
      const sx = ox < W/2 ? 1 : -1, sy = oy < H/2 ? 1 : -1
      ctx.beginPath(); ctx.moveTo(ox+sx*orn, oy); ctx.lineTo(ox, oy); ctx.lineTo(ox, oy+sy*orn); ctx.stroke()
    })

    // Arrow in gold
    ctx.font = 'bold 54px Georgia'; ctx.fillStyle = '#c8a820'; ctx.textBaseline = 'middle'
    if (arrowLeft) { ctx.textAlign = 'left';  ctx.fillText('←', 20, H/2) }
    else           { ctx.textAlign = 'right'; ctx.fillText('→', W-20, H/2) }

    // Wing name in kid colour
    ctx.font = 'bold 38px Georgia'; ctx.fillStyle = kid.color
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(`${kid.name}'s Wing`, W/2, H/2)

    const tex = new THREE.CanvasTexture(cvs)
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 1.0), mat)
    sign.userData.notOccludable = true
    sign.position.set(i === 0 ? 3 : -3, 2.8, JUNC_END_Z - 0.16)
    sign.rotation.y = Math.PI
    scene.add(sign)
  })

  // Junction north wall — centre section only (x = -6…+6); wing openings are on the sides.
  // Signs hang on the south face. Occludable so it fades only when genuinely between camera
  // and player (e.g. camera clips through it from behind).
  const jnw = new THREE.Mesh(new THREE.BoxGeometry(LOBBY_W, ROOM_H, 0.15), MATS.wall)
  jnw.position.set(0, ROOM_H/2, JUNC_END_Z); scene.add(jnw)
  addWallTrimming(scene, 0, JUNC_END_Z, LOBBY_W, 0.09)
  addFaceWallPaneling(scene, 0, JUNC_END_Z, LOBBY_W, -1)

  // Junction lighting — three evenly spaced pendants across the width
  ;[0, -10, 10].forEach(lx => {
    const jl = new THREE.PointLight(0xfff0d0, 6.0, 30)
    jl.position.set(lx, ROOM_H-0.3, juncZ); scene.add(jl)
  })

  allBounds.push(
    // Full-width passthrough — entire lobby+junction is one open space.
    // zMax stops short of the centre wall so the player can't clip into it.
    { xMin: -fullSpan/2+0.4, xMax: fullSpan/2-0.4, zMin: 0.4, zMax: JUNC_END_Z-0.4 }
  )

  manifest.kids.forEach((kid, kidIdx) => {
    const wingX = kidIdx === 0 ? 10 : -10
    const artworks = kid.artworks
    const slotsPerRoom = ARTWORK_Z_OFFSETS.length * 2
    const roomCount = Math.max(1, Math.ceil(artworks.length / slotsPerRoom))

    // Wing entry connector spans ±0.70 so that, after Z_RADIUS (0.15) is applied,
    // effective zMin = junction zMax_eff (13.45) and effective zMax = room zMin_eff (14.55).
    allBounds.push({
      xMin: wingX - ROOM_W/2 + 0.4, xMax: wingX + ROOM_W/2 - 0.4,
      zMin: JUNC_END_Z - 0.70, zMax: JUNC_END_Z + 0.70
    })

    for (let r = 0; r < roomCount; r++) {
      const cz = JUNC_END_Z + ROOM_D/2 + r * ROOM_D
      const isLast = r === roomCount - 1
      const { slots, bounds } = buildRoom(scene, wingX, cz, true, isLast)

      slots.forEach((slot, s) => {
        const artIdx = r*slotsPerRoom + s
        slot.kidIndex = kidIdx
        slot.artworkIndex = artIdx < artworks.length ? artIdx : null
        allSlots.push(slot)
      })
      allBounds.push(bounds)

      if (r < roomCount-1) {
        // Inter-room connector spans ±0.70 so effective zMin/zMax match adjacent room bounds
        // after Z_RADIUS (0.15) is applied (room zMax_eff = wall - 0.55, connector zMin_eff = wall - 0.55).
        allBounds.push({
          xMin: wingX - ROOM_W/2 + 0.4, xMax: wingX + ROOM_W/2 - 0.4,
          zMin: cz + ROOM_D/2 - 0.70, zMax: cz + ROOM_D/2 + 0.70
        })
      }
    }
  })

  return { allSlots, allBounds }
}
