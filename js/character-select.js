import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { showArtworkSettings } from './artwork-settings.js'
console.log('[char-select v6 loaded]')

export const CHARACTERS = [
  // ── People ──────────────────────────────────────────────────────────────────
  { id: 'Adventurer',        label: 'Adventurer' },
  { id: 'Adventurer2',       label: 'Adventurer II' },
  { id: 'AnimatedBase',      label: 'Animated Base' },
  { id: 'AnimatedHuman',     label: 'Human' },
  { id: 'AnimatedWoman',     label: 'Woman' },
  { id: 'AnimatedWoman2',    label: 'Woman II' },
  { id: 'AnimatedWoman3',    label: 'Woman III' },
  { id: 'Astronaut',         label: 'Astronaut' },
  { id: 'Astronaut2',        label: 'Astronaut II' },
  { id: 'Astronaut3',        label: 'Astronaut III' },
  { id: 'Astronaut4',        label: 'Astronaut IV' },
  { id: 'Astronaut5',        label: 'Astronaut V' },
  { id: 'BeachCharacter',    label: 'Beach Goer' },
  { id: 'BusinessMan',       label: 'Business Man' },
  { id: 'CharacterAnimated', label: 'Fighter' },
  { id: 'CharacterBase',     label: 'Character Base' },
  { id: 'EnemySmall',        label: 'Enemy' },
  { id: 'Farmer',            label: 'Farmer' },
  { id: 'HoodedAdventurer',  label: 'Hooded Adventurer' },
  { id: 'HoodieCharacter',   label: 'Hoodie' },
  { id: 'King',              label: 'King' },
  { id: 'Man',               label: 'Man' },
  { id: 'Man2',              label: 'Man II' },
  { id: 'Ninja',             label: 'Ninja' },
  { id: 'PlatformerCharacter', label: 'Platformer' },
  { id: 'Punk',              label: 'Punk' },
  { id: 'SciFiCharacter',    label: 'Sci-Fi Agent' },
  { id: 'Soldier',           label: 'Soldier' },
  { id: 'Soldier2',          label: 'Soldier II' },
  { id: 'Suit',              label: 'Suit' },
  { id: 'SWAT',              label: 'SWAT' },
  { id: 'Witch',             label: 'Witch' },
  { id: 'Wizard',            label: 'Wizard' },
  { id: 'Worker',            label: 'Worker' },
  { id: 'Worker2',           label: 'Worker II' },
  { id: 'Zombie',            label: 'Zombie' },
  // ── Fantasy & Monsters ──────────────────────────────────────────────────────
  { id: 'Alien',             label: 'Alien' },
  { id: 'Alpaking',          label: 'Alpaking' },
  { id: 'Armabee',           label: 'Armabee' },
  { id: 'Cactoro',           label: 'Cactoro' },
  { id: 'Dino',              label: 'Dino' },
  { id: 'Dragon',            label: 'Dragon' },
  { id: 'DragonEvolved',     label: 'Dragon II' },
  { id: 'Frog',              label: 'Frog' },
  { id: 'Ghost',             label: 'Ghost' },
  { id: 'Glub',              label: 'Glub' },
  { id: 'Monkroose',         label: 'Monkroose' },
  { id: 'Mushnub',           label: 'Mushnub' },
  { id: 'MushroomKing',      label: 'Mushroom King' },
  { id: 'PinkSlime',         label: 'Pink Slime' },
  { id: 'Squidle',           label: 'Squidle' },
  { id: 'Yeti',              label: 'Yeti' },
  // ── Animals ─────────────────────────────────────────────────────────────────
  { id: 'Alpaca',            label: 'Alpaca' },
  { id: 'Birb',              label: 'Birb' },
  { id: 'Bunny',             label: 'Bunny' },
  { id: 'Cat',               label: 'Cat' },
  { id: 'Chicken',           label: 'Chicken' },
  { id: 'Deer',              label: 'Deer' },
  { id: 'Fox',               label: 'Fox' },
  { id: 'Husky',             label: 'Husky' },
  { id: 'Llama',             label: 'Llama' },
  { id: 'Pig',               label: 'Pig' },
  { id: 'Pigeon',            label: 'Pigeon' },
  { id: 'Pug',               label: 'Pug' },
  { id: 'Sheep',             label: 'Sheep' },
  { id: 'ShibaInu',          label: 'Shiba Inu' },
  { id: 'Wolf',              label: 'Wolf' },
  { id: 'Zebra',             label: 'Zebra' },
  // ── Dinosaurs ───────────────────────────────────────────────────────────────
  { id: 'Apatosaurus',       label: 'Apatosaurus',     targetHeight: 1.8 },
  { id: 'Parasaurolophus',   label: 'Parasaurolophus', targetHeight: 1.8 },
  { id: 'Stegosaurus',       label: 'Stegosaurus',     targetHeight: 1.8 },
  { id: 'Triceratops',       label: 'Triceratops',     targetHeight: 1.8 },
  { id: 'TRex',              label: 'T-Rex',            targetHeight: 1.8 },
  { id: 'Velociraptor',      label: 'Velociraptor',     targetHeight: 1.8 },
]

export function findAnim(clips, keyword) {
  const k = keyword.toLowerCase()
  return (
    clips.find(c => c.name.toLowerCase() === k) ||
    clips.find(c => c.name.toLowerCase().endsWith('|' + k)) ||
    clips.find(c => c.name.toLowerCase().endsWith('_' + k)) ||
    clips.find(c => c.name.toLowerCase().includes(k))
  ) || null
}

export function getCharacterPath(id) {
  return `assets/characters/${id}.glb`
}

export function getCharacterTargetHeight(modelPath) {
  const id = modelPath.split('/').pop().replace('.glb', '')
  return CHARACTERS.find(c => c.id === id)?.targetHeight ?? 1.8
}

// ── Preview renderer ──────────────────────────────────────────────────────────
let _previewRenderer = null, _previewScene = null, _previewCamera = null
let _previewMixer = null, _previewMesh = null, _previewRaf = null

function initPreview(canvas) {
  _previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  _previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  _previewRenderer.setClearColor(0x111111, 1)
  // Set explicit size immediately — CSS clientWidth/clientHeight may be 0 before first layout
  const initW = canvas.clientWidth || 260
  const initH = canvas.clientHeight || 320
  _previewRenderer.setSize(initW, initH, false)

  _previewScene = new THREE.Scene()

  const amb = new THREE.AmbientLight(0xffffff, 1.2)
  _previewScene.add(amb)
  const dir = new THREE.DirectionalLight(0xfff8e0, 2.5)
  dir.position.set(2, 4, 3)
  _previewScene.add(dir)
  const fill = new THREE.DirectionalLight(0xd0e8ff, 0.8)
  fill.position.set(-3, 2, -2)
  _previewScene.add(fill)

  // Stage disc
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 0.04, 32),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  )
  disc.position.y = -0.02
  _previewScene.add(disc)

  // Camera looks straight along -Z (default). Character will be placed at z=0, camera at z=4.
  _previewCamera = new THREE.PerspectiveCamera(50, initW / initH, 0.1, 50)
  _previewCamera.position.set(0, 1.1, 4.0)
}

function resizePreview(canvas) {
  const w = canvas.clientWidth, h = canvas.clientHeight
  if (!w || !h) return  // not laid out yet — don't call setSize(0,0)
  // getSize returns CSS-pixel dimensions (what was passed to setSize), not DPR-scaled
  const size = _previewRenderer.getSize(new THREE.Vector2())
  if (size.x !== w || size.y !== h) {
    _previewRenderer.setSize(w, h, false)
    _previewCamera.aspect = w / h
    _previewCamera.updateProjectionMatrix()
  }
}

function stopPreview() {
  if (_previewRaf) { cancelAnimationFrame(_previewRaf); _previewRaf = null }
  if (_previewMesh) { _previewScene.remove(_previewMesh); _previewMesh = null }
  _previewMixer = null
}

function startPreview(canvas, gltf) {
  stopPreview()
  const mesh = gltf.scene
  console.log('[preview] startPreview — animations:', gltf.animations.length, 'children:', mesh.children.length)
  // Reset any embedded transform from the GLTF export before measuring
  mesh.position.set(0, 0, 0)
  mesh.scale.set(1, 1, 1)
  mesh.rotation.set(0, Math.PI * 0.2, 0)
  mesh.traverse(c => {
    c.frustumCulled = false
    if (c.isMesh && c.material) {
      const mats = Array.isArray(c.material) ? c.material : [c.material]
      mats.forEach(m => { m.side = THREE.DoubleSide })
    }
  })
  _previewScene.add(mesh)
  _previewMesh = mesh

  // Auto-scale: fit character to ~2.2 units height
  const box = new THREE.Box3().setFromObject(mesh)
  const h = box.max.y - box.min.y
  if (h > 0.1) mesh.scale.setScalar(2.2 / h)
  // Re-centre vertically; keep x/z at 0
  const box2 = new THREE.Box3().setFromObject(mesh)
  mesh.position.set(0, -box2.min.y, 0)
  console.log('[preview] h=', h.toFixed(3), 'scale=', mesh.scale.x.toFixed(4), 'pos.y=', mesh.position.y.toFixed(3))

  _previewMixer = new THREE.AnimationMixer(mesh)
  const walkClip = findAnim(gltf.animations, 'walk')
  const idleClip = findAnim(gltf.animations, 'idle')
  const previewClip = walkClip || idleClip
  if (previewClip) _previewMixer.clipAction(previewClip).play()

  let last = performance.now(), _frame = 0
  function tick() {
    _previewRaf = requestAnimationFrame(tick)
    const now = performance.now()
    const delta = (now - last) / 1000; last = now
    if (_previewMixer) _previewMixer.update(delta)
    mesh.rotation.y += delta * 0.6
    if (++_frame <= 2) console.log('[preview] tick', _frame, 'scene children:', _previewScene.children.length, 'canvas:', canvas.clientWidth, 'x', canvas.clientHeight)
    resizePreview(canvas)
    _previewRenderer.render(_previewScene, _previewCamera)
  }
  tick()
}

// ── Main export ───────────────────────────────────────────────────────────────
export function showCharacterSelect(manifest) {
  return new Promise(resolve => {
    const saved = localStorage.getItem('gallery-character') || CHARACTERS[0].id
    let selectedId = CHARACTERS.find(c => c.id === saved) ? saved : CHARACTERS[0].id

    // ── Build overlay ────────────────────────────────────────────────────────
    const overlay = document.createElement('div')
    overlay.id = 'char-select'
    overlay.innerHTML = `
      <div id="cs-header">
        <div id="cs-title">Choose Your Character</div>
        <div id="cs-sub">Walk around the gallery as your favourite avatar</div>
      </div>
      <div id="cs-body">
        <div id="cs-grid"></div>
        <div id="cs-preview-wrap">
          <canvas id="cs-canvas"></canvas>
          <div id="cs-name-display"></div>
        </div>
      </div>
      <div id="cs-footer">
        ${manifest ? '<button id="cs-artset">⚙ Artwork Settings</button>' : ''}
        <button id="cs-enter">Enter Gallery</button>
      </div>
    `
    document.body.appendChild(overlay)

    // ── Grid cards ───────────────────────────────────────────────────────────
    const grid = overlay.querySelector('#cs-grid')
    CHARACTERS.forEach(c => {
      const card = document.createElement('div')
      card.className = 'cs-card' + (c.id === selectedId ? ' selected' : '')
      card.dataset.id = c.id
      card.textContent = c.label
      card.addEventListener('click', () => selectChar(c.id))
      grid.appendChild(card)
    })

    // ── Preview setup ────────────────────────────────────────────────────────
    const canvas = overlay.querySelector('#cs-canvas')
    const nameDisplay = overlay.querySelector('#cs-name-display')
    initPreview(canvas)

    const loader = new GLTFLoader()
    let loadingId = null

    function loadPreview(id) {
      if (loadingId === id) return
      loadingId = id
      // Don't stopPreview here — keep old character visible while the new one loads
      nameDisplay.textContent = '…'
      loader.load(getCharacterPath(id), gltf => {
        if (loadingId !== id) return
        try {
          startPreview(canvas, gltf)
          nameDisplay.textContent = CHARACTERS.find(c => c.id === id)?.label || id
        } catch (err) {
          console.error('Preview failed:', err)
          nameDisplay.textContent = '(preview unavailable)'
        }
      }, undefined, () => {
        if (loadingId === id) nameDisplay.textContent = '(preview unavailable)'
      })
    }

    function selectChar(id) {
      selectedId = id
      overlay.querySelectorAll('.cs-card').forEach(el => {
        el.classList.toggle('selected', el.dataset.id === id)
      })
      loadPreview(id)
    }

    // ── Artwork settings button ──────────────────────────────────────────────
    overlay.querySelector('#cs-artset')?.addEventListener('click', () => {
      showArtworkSettings(manifest)
    })

    // ── Enter button ─────────────────────────────────────────────────────────
    overlay.querySelector('#cs-enter').addEventListener('click', () => {
      localStorage.setItem('gallery-character', selectedId)
      stopPreview()
      if (_previewRenderer) { _previewRenderer.dispose(); _previewRenderer = null }
      overlay.style.opacity = '0'
      overlay.style.transition = 'opacity 0.5s'
      setTimeout(() => overlay.remove(), 500)
      resolve({ id: selectedId, path: getCharacterPath(selectedId) })
    })

    // Load initial preview
    loadPreview(selectedId)
  })
}
