# My Kid 3D Gallery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based 3D virtual art gallery where kids' scanned artwork is displayed on walls of navigable 3D rooms, with a third-person character and proximity-triggered fullscreen artwork view.

**Architecture:** Static site using Three.js r165 via CDN import maps — no build step. Rooms are generated procedurally from `manifest.json`. A low-poly `.glb` character (Mixamo) is controlled with WASD. Mobile gets a virtual joystick overlay. A Node.js `scan.js` script auto-generates `manifest.json` by scanning the artwork folders.

**Tech Stack:** Three.js r165 (CDN), Vanilla JS ES modules, Node.js 18+ (scan script only).

---

## File Map

| File | Responsibility |
|---|---|
| `index.html` | Landing page — dark hero, "Enter Gallery" → gallery.html |
| `gallery.html` | Three.js canvas shell + import map |
| `js/main.js` | Entry point: loads manifest, wires all modules, runs animation loop |
| `js/scene.js` | THREE renderer, camera, lights, resize handler, loop starter |
| `js/rooms.js` | Procedural lobby + wing room geometry from manifest |
| `js/character.js` | Load GLB, third-person camera, WASD movement, room bounds constraint |
| `js/artwork.js` | Load textures, create frames on walls, proximity detection, fullscreen |
| `js/mobile.js` | Touch device detection, virtual joystick, touch-drag camera |
| `scan.js` | Node.js: scans artwork/ → updates manifest.json |
| `package.json` | `npm run scan` and `npm run dev` (http-server) |
| `manifest.json` | Auto-generated artwork registry (committed to git) |
| `artwork/kid1/` | Drop Kid 1 images here |
| `artwork/kid2/` | Drop Kid 2 images here |
| `assets/character.glb` | Mixamo humanoid (manual download — see Task 7) |

## Scene Dimensions (Three.js units ≈ metres)

- Lobby: 12 wide × 10 deep × 3.5 high, centred at (0, 0, 5)
- Wing rooms: 8 wide × 12 deep × 3.5 high
- Kid 1 wing rooms: centred at X = −10, Z = 14, 26, 38 … (extending +Z)
- Kid 2 wing rooms: centred at X = +10, Z = 14, 26, 38 … (extending +Z)
- Player start: (0, 0, −2) facing +Z
- Artwork slots: Y = 1.5, 3 per side wall, Z offsets = −3.5, 0, +3.5 from room centre
- Artwork frame size: 1.4 wide × 1.8 tall
- Proximity threshold: 2.0 units

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `manifest.json`
- Create: `artwork/kid1/.gitkeep`
- Create: `artwork/kid2/.gitkeep`
- Create: `assets/.gitkeep`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "my-kid-3d-gallery",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "scan": "node scan.js",
    "dev": "npx http-server . -p 3000 -c-1 --cors"
  }
}
```

- [ ] **Step 2: Create .gitignore**

```
node_modules/
.superpowers/
*.DS_Store
Thumbs.db
```

- [ ] **Step 3: Create initial manifest.json**

```json
{
  "kids": [
    {
      "name": "Kid 1",
      "color": "#70d0c0",
      "artworks": []
    },
    {
      "name": "Kid 2",
      "color": "#d070c0",
      "artworks": []
    }
  ]
}
```

- [ ] **Step 4: Create artwork folders and assets placeholder**

```bash
mkdir -p artwork/kid1 artwork/kid2 assets
echo "" > artwork/kid1/.gitkeep
echo "" > artwork/kid2/.gitkeep
echo "" > assets/.gitkeep
```

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore manifest.json artwork/ assets/
git commit -m "chore: project scaffold"
```

---

## Task 2: scan.js — Artwork Scanner

**Files:**
- Create: `scan.js`

- [ ] **Step 1: Create scan.js**

```js
import { readdirSync, readFileSync, writeFileSync } from 'fs'
import { extname } from 'path'

const SUPPORTED = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const MANIFEST_PATH = 'manifest.json'

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'))

const kidDirs = ['artwork/kid1', 'artwork/kid2']

kidDirs.forEach((dir, i) => {
  const existing = new Set(manifest.kids[i].artworks.map(a => a.file))
  let files
  try {
    files = readdirSync(dir)
  } catch {
    return
  }
  files
    .filter(f => SUPPORTED.has(extname(f).toLowerCase()) && f !== '.gitkeep')
    .forEach(f => {
      const file = `${dir}/${f}`
      if (!existing.has(file)) {
        manifest.kids[i].artworks.push({ file, title: '', date: '', age: '' })
        console.log(`+ added: ${file}`)
      }
    })
})

writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2))
console.log('manifest.json updated.')
```

- [ ] **Step 2: Verify scan.js works — drop a test image**

Copy any `.jpg` into `artwork/kid1/`. Then run:

```bash
node scan.js
```

Expected output:
```
+ added: artwork/kid1/test.jpg
manifest.json updated.
```

Open `manifest.json` and confirm a new entry appears under `kids[0].artworks` with blank `title`, `date`, `age`.

- [ ] **Step 3: Run again — verify it doesn't duplicate**

```bash
node scan.js
```

Expected output:
```
manifest.json updated.
```

No `+ added:` line — confirms existing entries are not duplicated.

- [ ] **Step 4: Commit**

```bash
git add scan.js
git commit -m "feat: add artwork scan script"
```

---

## Task 3: Landing Page

**Files:**
- Create: `index.html`
- Create: `css/landing.css`

- [ ] **Step 1: Create css/landing.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  background: #0a0a14;
  color: #e0e8ff;
  font-family: 'Georgia', serif;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero {
  text-align: center;
  max-width: 520px;
  padding: 2rem;
}

.hero h1 {
  font-size: clamp(1.8rem, 5vw, 3rem);
  font-weight: 400;
  letter-spacing: 0.08em;
  color: #c8d8ff;
  margin-bottom: 1rem;
}

.hero p {
  font-size: 1rem;
  color: #7080a0;
  line-height: 1.7;
  margin-bottom: 2.5rem;
}

.enter-btn {
  display: inline-block;
  padding: 0.9rem 2.5rem;
  border: 1px solid #4a6a9a;
  color: #a0c0ff;
  text-decoration: none;
  font-family: 'Georgia', serif;
  font-size: 1rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: background 0.3s, color 0.3s;
  cursor: pointer;
  background: transparent;
}

.enter-btn:hover {
  background: #1a2a4a;
  color: #d0e0ff;
}

.star {
  position: fixed;
  border-radius: 50%;
  background: white;
  animation: twinkle 3s infinite alternate;
}

@keyframes twinkle {
  from { opacity: 0.1; }
  to   { opacity: 0.6; }
}
```

- [ ] **Step 2: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Kid 3D Gallery</title>
  <link rel="stylesheet" href="css/landing.css">
</head>
<body>
  <div class="hero">
    <h1>My Kid 3D Gallery</h1>
    <p>A virtual museum of our children's artwork.<br>Walk through the halls and discover their world.</p>
    <a class="enter-btn" href="gallery.html">Enter Gallery</a>
  </div>

  <script>
    // Scatter 40 tiny stars in the background
    for (let i = 0; i < 40; i++) {
      const s = document.createElement('div')
      s.className = 'star'
      const size = Math.random() * 2 + 1
      s.style.cssText = `
        width:${size}px; height:${size}px;
        top:${Math.random()*100}vh; left:${Math.random()*100}vw;
        animation-delay:${Math.random()*3}s;
        animation-duration:${2+Math.random()*3}s;
      `
      document.body.appendChild(s)
    }
  </script>
</body>
</html>
```

- [ ] **Step 3: Verify landing page**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: dark page with title "My Kid 3D Gallery", subtle twinkling stars, "Enter Gallery" button visible.

- [ ] **Step 4: Commit**

```bash
git add index.html css/landing.css
git commit -m "feat: landing page"
```

---

## Task 4: Three.js Scene Shell

**Files:**
- Create: `gallery.html`
- Create: `js/scene.js`

- [ ] **Step 1: Create gallery.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Kid 3D Gallery</title>
  <script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/"
    }
  }
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; }
    canvas { display: block; }
    #hud {
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      color: rgba(255,255,255,0.4); font-family: monospace; font-size: 12px;
      pointer-events: none; text-align: center; line-height: 1.8;
    }
    #fullscreen-overlay {
      position: fixed; inset: 0; background: #000;
      display: none; align-items: center; justify-content: center;
      flex-direction: column;
    }
    #fullscreen-overlay.active { display: flex; }
    #fullscreen-img {
      max-width: 90vw; max-height: 80vh; object-fit: contain;
      border: 3px solid #c8a940; box-shadow: 0 0 40px rgba(0,0,0,0.9);
    }
    #fullscreen-meta {
      color: #888; font-family: Georgia, serif; font-size: 0.9rem;
      margin-top: 16px; text-align: center;
    }
    #fullscreen-hint {
      position: fixed; bottom: 16px; right: 16px;
      color: rgba(255,255,255,0.3); font-family: monospace; font-size: 11px;
    }
  </style>
</head>
<body>
  <div id="hud">WASD to walk &nbsp;|&nbsp; Mouse drag to look<br>Walk close to artwork to view</div>
  <div id="fullscreen-overlay">
    <img id="fullscreen-img" src="" alt="">
    <div id="fullscreen-meta"></div>
  </div>
  <div id="fullscreen-hint">ESC or back away to exit</div>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create js/scene.js**

```js
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

  // Ambient fill
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
    onUpdate(Math.min(clock.getDelta(), 0.05)) // cap delta at 50ms
    renderer.render(scene, camera)
  }
  tick()
}
```

- [ ] **Step 3: Create js/main.js (minimal stub to verify scene renders)**

```js
import { initScene, startLoop } from './scene.js'

const { scene, camera, renderer } = initScene()

// Temp: add a white cube so we have something visible
import * as THREE from 'three'
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0xffffff })
)
cube.position.set(0, 1, 5)
scene.add(cube)

startLoop(renderer, scene, camera, (delta) => {
  cube.rotation.y += delta
})
```

- [ ] **Step 4: Verify — open gallery.html**

```bash
npm run dev
```

Open `http://localhost:3000/gallery.html`. Expected: dark scene with a slowly rotating white cube visible. No console errors.

- [ ] **Step 5: Commit**

```bash
git add gallery.html js/scene.js js/main.js
git commit -m "feat: three.js scene shell"
```

---

## Task 5: Lobby Geometry

**Files:**
- Create: `js/rooms.js`

- [ ] **Step 1: Create js/rooms.js with lobby builder**

```js
import * as THREE from 'three'

// Dimensions (Three.js units)
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

// Build a flat wall panel with an optional door cutout
function wallPanel(scene, w, h, thick, x, y, z, rotY, hasDoor, doorXOffset = 0) {
  if (!hasDoor) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, thick), MATS.wall)
    m.position.set(x, y, z)
    m.rotation.y = rotY
    m.receiveShadow = true
    scene.add(m)
    return
  }
  const sideW = (w - DOOR_W) / 2
  const topH  = h - DOOR_H
  const offsets = [
    [-(sideW / 2 + DOOR_W / 2 + doorXOffset), h / 2,         sideW, h     ],
    [ (sideW / 2 + DOOR_W / 2 - doorXOffset), h / 2,         sideW, h     ],
    [doorXOffset,                              DOOR_H + topH / 2, DOOR_W, topH],
  ]
  for (const [ox, oy, pw, ph] of offsets) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, thick), MATS.wall)
    m.position.set(x + ox * Math.cos(rotY), oy, z + ox * Math.sin(rotY))
    m.receiveShadow = true
    scene.add(m)
  }
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
  const cx = 0, cz = LOBBY_D / 2  // lobby centre in world space

  // Floor
  const floor = new THREE.Mesh(new THREE.BoxGeometry(LOBBY_W, 0.1, LOBBY_D), MATS.floor)
  floor.position.set(cx, -0.05, cz)
  floor.receiveShadow = true
  scene.add(floor)

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.BoxGeometry(LOBBY_W, 0.1, LOBBY_D), MATS.ceiling)
  ceil.position.set(cx, ROOM_H, cz)
  scene.add(ceil)

  // Ceiling strip light
  const stripLight = new THREE.RectAreaLight !== undefined
    ? null  // fallback handled below
    : null
  const lobbyLight = new THREE.PointLight(0xfff5e0, 1.5, 14)
  lobbyLight.position.set(cx, ROOM_H - 0.3, cz)
  scene.add(lobbyLight)

  // South wall (entry — open, no door)
  wallPanel(scene, LOBBY_W, ROOM_H, 0.15, cx, ROOM_H / 2, 0.075, 0, false)

  // North wall — two doors, one per kid
  // Left door at X = cx - 2.5, right door at X = cx + 2.5
  const northZ = cz + LOBBY_D / 2
  const doorXL = cx - 2.5, doorXR = cx + 2.5
  ;[
    [doorXL, northZ, Math.PI], // left door section
    [doorXR, northZ, Math.PI], // right door section
  ].forEach(([dx, dz], i) => {
    // Simple: two skinny wall panels flanking each door
    const sidePanelW = (LOBBY_W / 2 - DOOR_W - 1)
    const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(sidePanelW, ROOM_H, 0.15), MATS.wall)
    leftPanel.position.set(i === 0 ? cx - LOBBY_W / 2 + sidePanelW / 2 : cx + DOOR_W + 0.5 + sidePanelW / 2, ROOM_H / 2, northZ)
    scene.add(leftPanel)
    const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(sidePanelW, ROOM_H, 0.15), MATS.wall)
    rightPanel.position.set(i === 0 ? cx - DOOR_W - 0.5 - sidePanelW / 2 : cx + LOBBY_W / 2 - sidePanelW / 2, ROOM_H / 2, northZ)
    scene.add(rightPanel)
    const topPanel = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, ROOM_H - DOOR_H, 0.15), MATS.wall)
    topPanel.position.set(dx, DOOR_H + (ROOM_H - DOOR_H) / 2, northZ)
    scene.add(topPanel)

    // Door arch trim
    const arch = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W + 0.2, 0.15, 0.15), MATS.trim)
    arch.position.set(dx, DOOR_H + 0.075, northZ - 0.01)
    scene.add(arch)
  })

  // Left + right walls
  wallPanel(scene, LOBBY_D, ROOM_H, 0.15, cx - LOBBY_W / 2 + 0.075, ROOM_H / 2, cz, Math.PI / 2, false)
  wallPanel(scene, LOBBY_D, ROOM_H, 0.15, cx + LOBBY_W / 2 - 0.075, ROOM_H / 2, cz, Math.PI / 2, false)

  // Wing labels above doors
  kidNames.forEach((name, i) => {
    const dx = i === 0 ? doorXL : doorXR
    // Use canvas texture for text
    const canvas2d = document.createElement('canvas')
    canvas2d.width = 256; canvas2d.height = 64
    const ctx = canvas2d.getContext('2d')
    ctx.fillStyle = kidColors[i]
    ctx.font = 'bold 28px Georgia'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(name + "'s Wing", 128, 32)
    const tex = new THREE.CanvasTexture(canvas2d)
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(1.8, 0.45),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    )
    sign.position.set(dx, DOOR_H + 0.5, northZ - 0.2)
    scene.add(sign)
  })

  return {
    bounds: { xMin: cx - LOBBY_W / 2 + 0.2, xMax: cx + LOBBY_W / 2 - 0.2, zMin: 0.2, zMax: northZ - 0.2 },
    leftDoorX: doorXL, rightDoorX: doorXR, northZ
  }
}
```

- [ ] **Step 2: Update js/main.js to render lobby only**

```js
import { initScene, startLoop } from './scene.js'
import { buildLobby } from './rooms.js'

const { scene, camera, renderer } = initScene()

const manifest = await fetch('manifest.json').then(r => r.json())
const kidNames  = manifest.kids.map(k => k.name)
const kidColors = manifest.kids.map(k => k.color)

buildLobby(scene, kidNames, kidColors)

// Position camera to see lobby
camera.position.set(0, 2, -2)
camera.lookAt(0, 1.5, 5)

startLoop(renderer, scene, camera, () => {})
```

- [ ] **Step 3: Verify lobby**

Open `http://localhost:3000/gallery.html`. Expected:
- Cream-coloured walls, dark floor
- Two door openings in the far wall
- Kid name labels above each door in their colour
- No console errors

- [ ] **Step 4: Commit**

```bash
git add js/rooms.js js/main.js
git commit -m "feat: lobby geometry"
```

---

## Task 6: Wing Room Generation

**Files:**
- Modify: `js/rooms.js` (add `buildWings`)

- [ ] **Step 1: Add buildRoom helper and buildWings to rooms.js**

Append to `js/rooms.js`:

```js
function buildRoom(scene, cx, cz) {
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

  // Left wall (no door)
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, ROOM_H, ROOM_D), MATS.wall)
  leftWall.position.set(cx - ROOM_W / 2, ROOM_H / 2, cz)
  leftWall.receiveShadow = true
  scene.add(leftWall)

  // Right wall (no door)
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.15, ROOM_H, ROOM_D), MATS.wall)
  rightWall.position.set(cx + ROOM_W / 2, ROOM_H / 2, cz)
  rightWall.receiveShadow = true
  scene.add(rightWall)

  // Back wall (south — open back to previous room, just top/side panels)
  const backSouth = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, ROOM_H, 0.15), MATS.wall)
  backSouth.position.set(cx, ROOM_H / 2, cz - ROOM_D / 2)
  scene.add(backSouth)

  // Front wall (north) — door to next room
  const frontZ = cz + ROOM_D / 2
  const sideW = (ROOM_W - DOOR_W) / 2
  ;[
    [cx - DOOR_W / 2 - sideW / 2, ROOM_H / 2, sideW, ROOM_H],
    [cx + DOOR_W / 2 + sideW / 2, ROOM_H / 2, sideW, ROOM_H],
    [cx,                           DOOR_H + (ROOM_H - DOOR_H) / 2, DOOR_W, ROOM_H - DOOR_H],
  ].forEach(([px, py, pw, ph]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.15), MATS.wall)
    m.position.set(px, py, frontZ)
    m.receiveShadow = true
    scene.add(m)
  })

  // Artwork spotlights — one above each slot position
  const slots = []
  for (const dz of ARTWORK_Z_OFFSETS) {
    const lx = cx - ROOM_W / 2 + 0.16  // left wall surface
    const rx = cx + ROOM_W / 2 - 0.16  // right wall surface
    addSpotlight(scene, lx + 0.5, ROOM_H - 0.3, cz + dz, lx, cz + dz)
    addSpotlight(scene, rx - 0.5, ROOM_H - 0.3, cz + dz, rx, cz + dz)
    // Left wall slot: artwork faces +X (normal pointing into room)
    slots.push({ position: new THREE.Vector3(lx, ARTWORK_Y, cz + dz), normalY: 0, normalX: 1, kidIndex: null, artworkIndex: null })
    // Right wall slot: artwork faces -X
    slots.push({ position: new THREE.Vector3(rx, ARTWORK_Y, cz + dz), normalY: 0, normalX: -1, kidIndex: null, artworkIndex: null })
  }

  return {
    slots,
    bounds: {
      xMin: cx - ROOM_W / 2 + 0.2, xMax: cx + ROOM_W / 2 - 0.2,
      zMin: cz - ROOM_D / 2 + 0.2, zMax: cz + ROOM_D / 2 - 0.2
    }
  }
}

// Build both kid wings; returns flat list of all artwork slots with kidIndex + artworkIndex
export function buildWings(scene, manifest) {
  const allSlots = []
  const allBounds = []

  manifest.kids.forEach((kid, kidIdx) => {
    const wingX = kidIdx === 0 ? -10 : 10
    const artworks = kid.artworks
    const roomCount = Math.max(1, Math.ceil(artworks.length / 6))

    for (let r = 0; r < roomCount; r++) {
      const cz = LOBBY_D + ROOM_D / 2 + r * ROOM_D  // rooms extend from just past lobby
      const { slots, bounds } = buildRoom(scene, wingX, cz)

      // Assign artwork indices to slots
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
```

- [ ] **Step 2: Update main.js to render both lobby and wings**

```js
import { initScene, startLoop } from './scene.js'
import { buildLobby, buildWings } from './rooms.js'

const { scene, camera, renderer } = initScene()
const manifest = await fetch('manifest.json').then(r => r.json())
const kidNames  = manifest.kids.map(k => k.name)
const kidColors = manifest.kids.map(k => k.color)

const lobby = buildLobby(scene, kidNames, kidColors)
const { allSlots, allBounds } = buildWings(scene, manifest)

// Position camera inside Kid 1's first room to check
camera.position.set(-10, 2, 15)
camera.lookAt(-10, 1.5, 20)

startLoop(renderer, scene, camera, () => {})
```

- [ ] **Step 3: Add sample artwork to verify slots**

Add 2 placeholder JPGs to `artwork/kid1/`, run `node scan.js`, then check gallery.

Expected: cream-coloured rooms extending from the lobby, spotlight cones above wall positions.

- [ ] **Step 4: Commit**

```bash
git add js/rooms.js js/main.js
git commit -m "feat: wing room generation"
```

---

## Task 7: Download Character Model

This is a manual step — no code. Do this before Task 8.

- [ ] **Step 1: Download character from Mixamo**

  1. Go to [mixamo.com](https://www.mixamo.com) and sign in (free account)
  2. Search characters → select **"Ybot"** (simple, low-poly, clean)
  3. Click **Animations** tab → search **"Walking"** → select **"Walking"** (In Place checked)
  4. Click **Download** → Format: **FBX for Unity (.fbx)**, Skin: **With Skin** → Download
  5. Search animations again → **"Idle"** → select simple idle → Download same way

- [ ] **Step 2: Convert FBX to GLB**

  1. Go to [products.aspose.app/3d/conversion/fbx-to-glb](https://products.aspose.app/3d/conversion/fbx-to-glb) or use Blender (File → Import → FBX, then File → Export → glTF 2.0)
  2. Convert walk FBX → `character-walk.glb`
  3. Convert idle FBX → `character-idle.glb`
  4. Place both files in `assets/`

- [ ] **Step 3: Verify files exist**

```
assets/character-walk.glb
assets/character-idle.glb
```

- [ ] **Step 4: Commit GLB files**

```bash
git add assets/character-walk.glb assets/character-idle.glb
git commit -m "assets: add mixamo character GLBs"
```

---

## Task 8: Character Controller

**Files:**
- Create: `js/character.js`

- [ ] **Step 1: Create js/character.js**

```js
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const SPEED = 4.0          // units per second
const CAM_OFFSET = new THREE.Vector3(0, 2.5, 4)  // behind + above

const loader = new GLTFLoader()

function loadGLB(url) {
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject))
}

export async function loadCharacter(scene) {
  const [walkGLTF, idleGLTF] = await Promise.all([
    loadGLB('assets/character-walk.glb'),
    loadGLB('assets/character-idle.glb'),
  ])

  const mesh = walkGLTF.scene
  mesh.scale.setScalar(0.012)   // Mixamo Ybot scale to ~1.7 units tall
  mesh.position.set(0, 0, 1)
  mesh.castShadow = true
  mesh.traverse(c => { if (c.isMesh) c.castShadow = true })
  scene.add(mesh)

  const mixer = new THREE.AnimationMixer(mesh)
  const walkClip = THREE.AnimationClip.findByName(walkGLTF.animations, walkGLTF.animations[0].name)
  const idleClip = THREE.AnimationClip.findByName(idleGLTF.animations, idleGLTF.animations[0].name)
  const walkAction = mixer.clipAction(walkClip)
  const idleAction = mixer.clipAction(idleClip)
  idleAction.play()

  let isMoving = false

  return {
    mesh,
    mixer,
    walkAction,
    idleAction,
    isMoving,
    position: mesh.position,    // live reference
    rotation: mesh.rotation,    // live reference
    _yaw: 0,                    // camera yaw in radians
  }
}

export function updateCharacter(char, delta, input, allBounds) {
  char.mixer.update(delta)

  const moving = input.forward || input.backward || input.left || input.right
  if (moving !== char.isMoving) {
    char.isMoving = moving
    if (moving) {
      char.idleAction.fadeOut(0.2)
      char.walkAction.reset().fadeIn(0.2).play()
    } else {
      char.walkAction.fadeOut(0.2)
      char.idleAction.reset().fadeIn(0.2).play()
    }
  }

  if (!moving) return

  // Direction based on camera yaw
  const dir = new THREE.Vector3()
  if (input.forward)  dir.z -= 1
  if (input.backward) dir.z += 1
  if (input.left)     dir.x -= 1
  if (input.right)    dir.x += 1
  dir.normalize()

  // Rotate by camera yaw
  dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), char._yaw)

  // Face direction of movement
  if (dir.length() > 0.01) {
    const targetAngle = Math.atan2(dir.x, dir.z)
    char.mesh.rotation.y = targetAngle
  }

  const next = char.mesh.position.clone().addScaledVector(dir, SPEED * delta)

  // Constrain to any room the character is currently in
  const inBounds = allBounds.find(b =>
    next.x >= b.xMin && next.x <= b.xMax &&
    next.z >= b.zMin && next.z <= b.zMax
  )
  if (inBounds || allBounds.length === 0) {
    char.mesh.position.copy(next)
  } else {
    // Try sliding: move only X or only Z
    const nextX = char.mesh.position.clone()
    nextX.x = next.x
    const nextZ = char.mesh.position.clone()
    nextZ.z = next.z
    const inX = allBounds.find(b => nextX.x >= b.xMin && nextX.x <= b.xMax && nextX.z >= b.zMin && nextX.z <= b.zMax)
    const inZ = allBounds.find(b => nextZ.x >= b.xMin && nextZ.x <= b.xMax && nextZ.z >= b.zMin && nextZ.z <= b.zMax)
    if (inX) char.mesh.position.x = next.x
    if (inZ) char.mesh.position.z = next.z
  }
}

export function updateCamera(camera, char, input) {
  // Update yaw from mouse/touch drag (input.dx)
  char._yaw += (input.dx || 0) * 0.005
  input.dx = 0

  // Orbit camera around character at fixed offset, rotated by yaw
  const offset = CAM_OFFSET.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), char._yaw)
  camera.position.copy(char.mesh.position).add(offset)
  camera.lookAt(char.mesh.position.x, char.mesh.position.y + 1.5, char.mesh.position.z)
}
```

- [ ] **Step 2: Add input handler to main.js + wire character**

Replace `js/main.js` content:

```js
import { initScene, startLoop } from './scene.js'
import { buildLobby, buildWings } from './rooms.js'
import { loadCharacter, updateCharacter, updateCamera } from './character.js'

const { scene, camera, renderer } = initScene()
const manifest = await fetch('manifest.json').then(r => r.json())
const kidNames  = manifest.kids.map(k => k.name)
const kidColors = manifest.kids.map(k => k.color)

const lobby = buildLobby(scene, kidNames, kidColors)
const { allSlots, allBounds } = buildWings(scene, manifest)

const char = await loadCharacter(scene)

// Keyboard state
const keys = {}
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true })
window.addEventListener('keyup',   e => { keys[e.key.toLowerCase()] = false })

// Mouse drag for camera
const input = { forward: false, backward: false, left: false, right: false, dx: 0 }
let dragging = false, lastMouseX = 0

window.addEventListener('mousedown', e => { dragging = true; lastMouseX = e.clientX })
window.addEventListener('mouseup',   () => { dragging = false })
window.addEventListener('mousemove', e => {
  if (dragging) { input.dx += e.clientX - lastMouseX; lastMouseX = e.clientX }
})

// All walkable bounds: lobby + every wing room
const allRoomBounds = [lobby.bounds, ...allBounds]

startLoop(renderer, scene, camera, (delta) => {
  input.forward  = !!(keys['w'] || keys['arrowup'])
  input.backward = !!(keys['s'] || keys['arrowdown'])
  input.left     = !!(keys['a'] || keys['arrowleft'])
  input.right    = !!(keys['d'] || keys['arrowright'])

  updateCharacter(char, delta, input, allRoomBounds)
  updateCamera(camera, char, input)
})
```

- [ ] **Step 3: Verify character movement**

Open `http://localhost:3000/gallery.html`.
- Expected: humanoid character visible in lobby
- WASD moves the character; walk and idle animations switch
- Mouse drag rotates the camera around character
- Character stops at walls

- [ ] **Step 4: Commit**

```bash
git add js/character.js js/main.js
git commit -m "feat: third-person character controller"
```

---

## Task 9: Artwork Loading and Wall Placement

**Files:**
- Create: `js/artwork.js`

- [ ] **Step 1: Add test images to artwork/kid1/ and artwork/kid2/**

Add at least 3 `.jpg` files to each folder, then run:

```bash
node scan.js
```

Verify `manifest.json` now has entries under both kids.

- [ ] **Step 2: Create js/artwork.js**

```js
import * as THREE from 'three'

const FRAME_W = 1.4, FRAME_H = 1.8, FRAME_THICK = 0.04, FRAME_BORDER = 0.06
const FRAME_MAT = new THREE.MeshStandardMaterial({ color: 0xb8960a, metalness: 0.4, roughness: 0.5 })
const CANVAS_MAT = new THREE.MeshStandardMaterial({ color: 0xf5f0e8 }) // placeholder until texture loads

const loader = new THREE.TextureLoader()

export async function loadArtworks(manifest, allSlots, scene) {
  const artworks = []

  // Pre-load all textures
  const texturePromises = manifest.kids.flatMap(kid =>
    kid.artworks.map(a =>
      new Promise(resolve => loader.load(a.file, tex => {
        tex.colorSpace = THREE.SRGBColorSpace
        resolve(tex)
      }, undefined, () => resolve(null)))  // null if image fails to load
    )
  )
  const textures = await Promise.all(texturePromises)

  let texIdx = 0
  manifest.kids.forEach((kid, kidIdx) => {
    kid.artworks.forEach((artworkData, artIdx) => {
      const tex = textures[texIdx++]
      const slot = allSlots.find(s => s.kidIndex === kidIdx && s.artworkIndex === artIdx)
      if (!slot) return

      // Outer frame box
      const frameGroup = new THREE.Group()
      const frameMesh = new THREE.Mesh(
        new THREE.BoxGeometry(FRAME_W + FRAME_BORDER * 2, FRAME_H + FRAME_BORDER * 2, FRAME_THICK),
        FRAME_MAT
      )
      frameMesh.castShadow = true
      frameGroup.add(frameMesh)

      // Canvas (image plane)
      const canvasMat = tex
        ? new THREE.MeshStandardMaterial({ map: tex })
        : CANVAS_MAT
      const canvasMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(FRAME_W, FRAME_H),
        canvasMat
      )
      canvasMesh.position.z = FRAME_THICK / 2 + 0.001
      frameGroup.add(canvasMesh)

      // Position on wall: normal tells us which way it faces
      frameGroup.position.copy(slot.position)
      frameGroup.position.x += slot.normalX * (FRAME_THICK / 2 + 0.02)
      // Rotate to face into room
      frameGroup.rotation.y = slot.normalX > 0 ? 0 : Math.PI

      scene.add(frameGroup)

      artworks.push({
        group: frameGroup,
        position: frameGroup.position,
        data: artworkData,
        kidColor: kid.color,
        glowMesh: frameMesh,     // used for proximity highlight
        originalFrameColor: 0xb8960a,
      })
    })
  })

  return artworks
}
```

- [ ] **Step 3: Wire artwork loading in main.js**

Add to `js/main.js` after `buildWings`:

```js
import { loadArtworks } from './artwork.js'
// ... (existing imports)

const artworks = await loadArtworks(manifest, allSlots, scene)
```

- [ ] **Step 4: Verify artwork on walls**

Open gallery, walk into a wing room.
Expected: framed artwork visible on left and right walls, lit by spotlights above.

- [ ] **Step 5: Commit**

```bash
git add js/artwork.js js/main.js
git commit -m "feat: artwork loading and wall placement"
```

---

## Task 10: Proximity Detection and Fullscreen View

**Files:**
- Modify: `js/artwork.js` (add proximity + fullscreen functions)
- Modify: `js/main.js` (call proximity check each frame)

- [ ] **Step 1: Add proximity and fullscreen functions to js/artwork.js**

Append to `js/artwork.js`:

```js
const PROXIMITY_THRESHOLD = 2.0
const HYSTERESIS = 0.5  // must back up this far past threshold to exit

let activeArtwork = null

const overlay   = document.getElementById('fullscreen-overlay')
const fsImg     = document.getElementById('fullscreen-img')
const fsMeta    = document.getElementById('fullscreen-meta')
const fsHint    = document.getElementById('fullscreen-hint')

export function checkProximity(artworks, charPos) {
  if (activeArtwork) {
    // In fullscreen — check if walked away
    const dist = charPos.distanceTo(activeArtwork.position)
    if (dist > PROXIMITY_THRESHOLD + HYSTERESIS) hideFullscreen()
    return
  }

  let nearest = null, nearestDist = Infinity
  for (const aw of artworks) {
    const d = charPos.distanceTo(aw.position)
    if (d < nearestDist) { nearestDist = d; nearest = aw }
  }

  // Reset all highlight colours
  artworks.forEach(aw => {
    aw.glowMesh.material.color.setHex(aw.originalFrameColor)
    aw.glowMesh.material.emissive?.setHex(0x000000)
  })

  if (nearest && nearestDist < PROXIMITY_THRESHOLD) {
    // Glow the nearest frame
    nearest.glowMesh.material.emissive = new THREE.Color(0x4a8a4a)
    nearest.glowMesh.material.emissiveIntensity = 0.6
    if (nearestDist < PROXIMITY_THRESHOLD * 0.6) showFullscreen(nearest)
  }
}

function showFullscreen(artwork) {
  if (activeArtwork) return
  activeArtwork = artwork

  fsImg.src = artwork.data.file
  const parts = []
  if (artwork.data.title) parts.push(artwork.data.title)
  if (artwork.data.date)  parts.push(artwork.data.date)
  if (artwork.data.age)   parts.push(`Age ${artwork.data.age}`)
  fsMeta.textContent = parts.join('  ·  ')

  overlay.classList.add('active')
  fsHint.style.display = 'block'
}

export function hideFullscreen() {
  activeArtwork = null
  overlay.classList.remove('active')
}

export function isFullscreen() {
  return activeArtwork !== null
}
```

- [ ] **Step 2: Wire proximity check and ESC key in main.js**

Add to imports in `js/main.js`:

```js
import { loadArtworks, checkProximity, hideFullscreen, isFullscreen } from './artwork.js'
```

Add ESC handler after keyboard listeners:

```js
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') hideFullscreen()
  keys[e.key.toLowerCase()] = true
})
```

Add proximity call inside `startLoop` callback:

```js
startLoop(renderer, scene, camera, (delta) => {
  input.forward  = !!(keys['w'] || keys['arrowup'])
  input.backward = !!(keys['s'] || keys['arrowdown'])
  input.left     = !!(keys['a'] || keys['arrowleft'])
  input.right    = !!(keys['d'] || keys['arrowright'])

  if (!isFullscreen()) {
    updateCharacter(char, delta, input, allRoomBounds)
    updateCamera(camera, char, input)
  }

  checkProximity(artworks, char.mesh.position)
})
```

- [ ] **Step 3: Verify proximity and fullscreen**

Walk toward an artwork frame.
Expected:
- Frame glows green as you approach
- At very close range, artwork fills the screen (letterboxed, gold border)
- Press ESC → returns to gallery
- Walk backwards past threshold + hysteresis → auto-returns to gallery

- [ ] **Step 4: Commit**

```bash
git add js/artwork.js js/main.js
git commit -m "feat: proximity detection and fullscreen artwork view"
```

---

## Task 11: Mobile Controls

**Files:**
- Create: `js/mobile.js`
- Modify: `js/main.js` (wire mobile input)

- [ ] **Step 1: Create js/mobile.js**

```js
export function isMobile() {
  return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
}

export function createMobileControls() {
  // Joystick container
  const stick = document.createElement('div')
  stick.style.cssText = `
    position:fixed; bottom:32px; left:32px;
    width:100px; height:100px;
    background:rgba(255,255,255,0.1);
    border:2px solid rgba(255,255,255,0.3);
    border-radius:50%; touch-action:none; z-index:100;
  `
  const knob = document.createElement('div')
  knob.style.cssText = `
    position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
    width:40px; height:40px;
    background:rgba(255,255,255,0.5); border-radius:50%;
  `
  stick.appendChild(knob)
  document.body.appendChild(stick)

  const state = { x: 0, y: 0 }     // normalised -1 to 1
  const camInput = { dx: 0 }
  const MAX_DIST = 35

  let stickTouchId = null
  let stickOrigin = { x: 0, y: 0 }

  stick.addEventListener('touchstart', e => {
    e.preventDefault()
    const t = e.changedTouches[0]
    stickTouchId = t.identifier
    const r = stick.getBoundingClientRect()
    stickOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, { passive: false })

  window.addEventListener('touchmove', e => {
    e.preventDefault()
    Array.from(e.changedTouches).forEach(t => {
      if (t.identifier === stickTouchId) {
        const dx = t.clientX - stickOrigin.x
        const dy = t.clientY - stickOrigin.y
        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_DIST)
        const angle = Math.atan2(dy, dx)
        state.x = (dist / MAX_DIST) * Math.cos(angle)
        state.y = (dist / MAX_DIST) * Math.sin(angle)
        knob.style.transform = `translate(calc(-50% + ${state.x * MAX_DIST}px), calc(-50% + ${state.y * MAX_DIST}px))`
      } else {
        // Non-joystick touch = camera drag
        const prev = Array.from(e.touches).find(tt => tt.identifier === t.identifier)
        if (prev) camInput.dx += t.clientX - prev.clientX
      }
    })
  }, { passive: false })

  window.addEventListener('touchend', e => {
    Array.from(e.changedTouches).forEach(t => {
      if (t.identifier === stickTouchId) {
        state.x = 0; state.y = 0
        knob.style.transform = 'translate(-50%, -50%)'
        stickTouchId = null
      }
    })
  })

  return {
    getMovementInput() {
      return {
        forward:  state.y < -0.3,
        backward: state.y >  0.3,
        left:     state.x < -0.3,
        right:    state.x >  0.3,
      }
    },
    getCameraDx() {
      const dx = camInput.dx
      camInput.dx = 0
      return dx
    }
  }
}
```

- [ ] **Step 2: Wire mobile controls in main.js**

Add to imports:

```js
import { isMobile, createMobileControls } from './mobile.js'
```

After the keyboard/mouse listeners, add:

```js
let mobileControls = null
if (isMobile()) {
  mobileControls = createMobileControls()
  document.getElementById('hud').textContent = 'Use joystick to walk · Drag to look'
}
```

Update the input block inside `startLoop`:

```js
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

  if (!isFullscreen()) {
    updateCharacter(char, delta, input, allRoomBounds)
    updateCamera(camera, char, input)
  }

  checkProximity(artworks, char.mesh.position)
})
```

- [ ] **Step 3: Verify on mobile (or browser DevTools mobile emulation)**

Open Chrome DevTools → Toggle device toolbar → select a phone size.
Expected:
- Virtual joystick appears bottom-left
- Drag anywhere else rotates camera
- Movement and artwork view work the same as desktop

- [ ] **Step 4: Commit**

```bash
git add js/mobile.js js/main.js
git commit -m "feat: mobile touch controls"
```

---

## Task 12: Final Integration and Deploy Prep

**Files:**
- Modify: `js/main.js` (final cleanup, remove any stubs)
- Modify: `manifest.json` (update kid names)
- Modify: `scan.js` (already done)

- [ ] **Step 1: Update manifest.json with real kid names**

Edit `manifest.json` — change `"Kid 1"` and `"Kid 2"` to your children's actual names and set wing colours:

```json
{
  "kids": [
    { "name": "YourKid1Name", "color": "#70d0c0", "artworks": [] },
    { "name": "YourKid2Name", "color": "#d070c0", "artworks": [] }
  ]
}
```

Then run `node scan.js` to repopulate artworks from the folders.

- [ ] **Step 2: Full integration walkthrough**

Open `http://localhost:3000`. Verify in order:

1. Landing page loads with dark hero, stars, Enter Gallery button
2. Clicking Enter Gallery → gallery.html loads, no console errors
3. Character appears in lobby facing two doors
4. WASD moves character; walls block movement
5. Walk through left door → Kid 1's wing, artwork on walls
6. Walk close to a painting → frame glows green → auto fullscreen
7. Press ESC → returns to gallery view
8. Walk back through lobby → enter right door → Kid 2's wing
9. On mobile (DevTools): joystick appears, all controls work

- [ ] **Step 3: Add .gitignore for Mixamo source files (keep GLBs, ignore FBX)**

Append to `.gitignore`:

```
*.fbx
*.blend
```

- [ ] **Step 4: Deploy to jdpartners.co**

```bash
# From the My Kid 3D Gallery project root:
Copy-Item -Recurse -Force "." "C:\Users\derek\Documents\Project\jd-partners-website\games\my-kid-3d-gallery"
cd "C:\Users\derek\Documents\Project\jd-partners-website"
git add games/my-kid-3d-gallery
git commit -m "feat: add My Kid 3D Gallery"
git push
```

Expected: live at `https://www.jdpartners.co/games/my-kid-3d-gallery/`

- [ ] **Step 5: Final commit in gallery repo**

```bash
cd "C:\Users\derek\Documents\Project\My Kid 3D Gallery"
git add .
git commit -m "feat: complete My Kid 3D Gallery v1"
```

---

## Adding New Artwork (Ongoing Workflow)

```
1. Scan artwork → save as JPEG/PNG, max 1500px wide
2. Drop file into artwork/kid1/ or artwork/kid2/
3. node scan.js
4. Copy to jd-partners-website/games/my-kid-3d-gallery/ and git push
```
