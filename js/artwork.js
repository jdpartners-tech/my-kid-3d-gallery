import * as THREE from 'three'

const FRAME_W = 1.4, FRAME_H = 1.8, FRAME_THICK = 0.04, FRAME_BORDER = 0.06
const FRAME_MAT = new THREE.MeshStandardMaterial({ color: 0xb8960a, metalness: 0.4, roughness: 0.5 })
const BLANK_MAT  = new THREE.MeshStandardMaterial({ color: 0xf5f0e8 })

const PROXIMITY_THRESHOLD = 2.0
const HYSTERESIS = 0.5

let activeArtwork = null

const loader = new THREE.TextureLoader()

export function loadArtworks(manifest, allSlots, scene) {
  const artworks = []

  manifest.kids.forEach((kid, kidIdx) => {
    kid.artworks.forEach((artworkData, artIdx) => {
      const slot = allSlots.find(s => s.kidIndex === kidIdx && s.artworkIndex === artIdx)
      if (!slot) return

      const frameGroup = new THREE.Group()

      const frameMesh = new THREE.Mesh(
        new THREE.BoxGeometry(FRAME_W + FRAME_BORDER * 2, FRAME_H + FRAME_BORDER * 2, FRAME_THICK),
        FRAME_MAT.clone()
      )
      frameGroup.add(frameMesh)

      const canvasMat = BLANK_MAT.clone()
      const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(FRAME_W, FRAME_H), canvasMat)
      canvasMesh.position.z = FRAME_THICK / 2 + 0.001
      frameGroup.add(canvasMesh)

      frameGroup.position.copy(slot.position)
      frameGroup.position.x += slot.normalX * (FRAME_THICK / 2 + 0.02)
      frameGroup.rotation.y = -slot.normalX * Math.PI / 2

      scene.add(frameGroup)

      const artwork = {
        group: frameGroup,
        position: frameGroup.position.clone(),
        data: artworkData,
        glowMesh: frameMesh,
      }
      artworks.push(artwork)

      // Load texture in background — frame shows blank until ready
      loader.load(
        artworkData.file,
        tex => {
          tex.colorSpace = THREE.SRGBColorSpace
          canvasMat.map = tex
          canvasMat.color.set(0xffffff)
          canvasMat.needsUpdate = true
        },
        undefined,
        () => {} // stay blank on error
      )
    })
  })

  return artworks
}

export function checkProximity(artworks, charPos) {
  if (activeArtwork) {
    if (charPos.distanceTo(activeArtwork.position) > PROXIMITY_THRESHOLD + HYSTERESIS) {
      hideFullscreen()
    }
    return
  }

  let nearest = null, nearestDist = Infinity
  for (const aw of artworks) {
    const d = charPos.distanceTo(aw.position)
    if (d < nearestDist) { nearestDist = d; nearest = aw }
  }

  artworks.forEach(aw => {
    aw.glowMesh.material.color.setHex(0xb8960a)
    aw.glowMesh.material.emissiveIntensity = 0
  })

  if (nearest && nearestDist < PROXIMITY_THRESHOLD) {
    nearest.glowMesh.material.emissive = new THREE.Color(0x4a8a4a)
    nearest.glowMesh.material.emissiveIntensity = 0.6
    if (nearestDist < PROXIMITY_THRESHOLD * 0.6) {
      showFullscreen(nearest)
    }
  }
}

function showFullscreen(artwork) {
  if (activeArtwork) return
  activeArtwork = artwork

  const fsImg  = document.getElementById('fullscreen-img')
  const fsMeta = document.getElementById('fullscreen-meta')

  fsImg.src = artwork.data.file

  const parts = []
  if (artwork.data.title) parts.push(artwork.data.title)
  if (artwork.data.date)  parts.push(artwork.data.date)
  if (artwork.data.age)   parts.push(`Age ${artwork.data.age}`)
  fsMeta.textContent = parts.join('  ·  ')

  document.getElementById('fullscreen-overlay').classList.add('active')
}

export function hideFullscreen() {
  activeArtwork = null
  document.getElementById('fullscreen-overlay').classList.remove('active')
}

export function isFullscreen() {
  return activeArtwork !== null
}
