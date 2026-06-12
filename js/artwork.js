import * as THREE from 'three'
import { IS_MOBILE } from './mobile.js'
import { getArtworkOverrides } from './artwork-settings.js'

const FRAME_W = 1.4, FRAME_H = 1.8, FRAME_THICK = 0.04, FRAME_BORDER = 0.06
const FRAME_MAT = IS_MOBILE
  ? new THREE.MeshLambertMaterial({ color: 0xc8a820, side: THREE.DoubleSide })
  : new THREE.MeshStandardMaterial({ color: 0xc8a820, metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide })
// BasicMaterial: unlit — paintings show at full brightness, no spotlight needed
const BLANK_MAT = new THREE.MeshBasicMaterial({ color: 0xf5f0e8, side: THREE.DoubleSide })
// Brass picture-rail lamp: wall bracket + angled shade pointing down at artwork
const LAMP_BRASS = IS_MOBILE
  ? new THREE.MeshLambertMaterial({ color: 0xb8901a })
  : new THREE.MeshStandardMaterial({ color: 0xc8a820, metalness: 0.85, roughness: 0.15 })
const LAMP_INNER = IS_MOBILE
  ? new THREE.MeshLambertMaterial({ color: 0xffe8a0 })
  : new THREE.MeshStandardMaterial({ color: 0xfff0b0, emissive: new THREE.Color(0xffe050), emissiveIntensity: 0.9, roughness: 1, metalness: 0 })

const PROXIMITY_THRESHOLD = 2.0
const HYSTERESIS = 0.5

let activeArtwork = null
let nearestArtwork = null
let _dismissedNear = false  // suppress auto-reopen after user manually closes

const loader = new THREE.TextureLoader()

export function loadArtworks(manifest, allSlots, scene) {
  const artworks = []
  const overrides = getArtworkOverrides()

  manifest.kids.forEach((kid, kidIdx) => {
    kid.artworks.forEach((artworkData, artIdx) => {
      const slot = allSlots.find(s => s.kidIndex === kidIdx && s.artworkIndex === artIdx)
      if (!slot) return
      const overrideKey = `${kid.name}/${String(artIdx + 1).padStart(3, '0')}`
      const artworkData_ = { ...artworkData, ...(overrides[overrideKey] || {}) }
      artworkData = artworkData_

      const frameGroup = new THREE.Group()

      const frameMesh = new THREE.Mesh(
        new THREE.BoxGeometry(FRAME_W + FRAME_BORDER * 2, FRAME_H + FRAME_BORDER * 2, FRAME_THICK),
        FRAME_MAT.clone()
      )
      frameMesh.userData.isFrame = true
      frameGroup.add(frameMesh)

      const canvasMat = BLANK_MAT.clone()
      const canvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(FRAME_W, FRAME_H), canvasMat)
      canvasMesh.position.z = FRAME_THICK / 2 + 0.001
      canvasMesh.userData.isFrame = true
      frameGroup.add(canvasMesh)

      // Picture-rail lamp: horizontal arm + angled cone shade
      const lampGroup = new THREE.Group()
      lampGroup.userData.notOccludable = true

      // Horizontal arm extending from wall (thin brass rod)
      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.18, 6),
        LAMP_BRASS.clone()
      )
      arm.rotation.z = Math.PI / 2
      arm.position.set(0, 0, -0.09)
      lampGroup.add(arm)

      // Cone shade — wide end faces down-and-outward, narrow end at arm tip
      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.065, 0.13, 10, 1, true),
        LAMP_BRASS.clone()
      )
      shade.rotation.x = Math.PI * 0.55  // tilt forward ~100° so wide end aims at artwork
      shade.position.set(0, -0.06, -0.14)
      lampGroup.add(shade)

      // Glowing lens disk inside the shade opening
      const lens = new THREE.Mesh(
        new THREE.CircleGeometry(0.055, 10),
        LAMP_INNER.clone()
      )
      lens.rotation.x = Math.PI * 0.55 + Math.PI / 2
      lens.position.set(0, -0.11, -0.19)
      lampGroup.add(lens)

      // Wall backplate (small brass disc)
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.015, 8),
        LAMP_BRASS.clone()
      )
      plate.rotation.x = Math.PI / 2
      plate.position.set(0, 0, -0.005)
      lampGroup.add(plate)

      lampGroup.position.set(0, FRAME_H / 2 + FRAME_BORDER + 0.10, 0.04)
      lampGroup.traverse(c => { if (c.isMesh) c.userData.notOccludable = true })
      frameGroup.add(lampGroup)

      frameGroup.position.copy(slot.position)
      frameGroup.position.x += slot.normalX * (FRAME_THICK / 2 + 0.02)
      frameGroup.rotation.y = slot.normalX * Math.PI / 2

      scene.add(frameGroup)

      const artwork = {
        group: frameGroup,
        position: frameGroup.position.clone(),
        data: artworkData,
        glowMesh: frameMesh,
      }
      artworks.push(artwork)

      // Load texture in background — frame shows blank until ready
      const texFile = IS_MOBILE ? artworkData.file.replace('artwork/', 'artwork_mobile/') : artworkData.file
      loader.load(
        texFile,
        tex => {
          tex.colorSpace = THREE.SRGBColorSpace
          if (IS_MOBILE) {
            tex.generateMipmaps = false
            tex.minFilter = THREE.LinearFilter
          }
          let useTex = tex
          let imgW = tex.image.naturalWidth || tex.image.width
          let imgH = tex.image.naturalHeight || tex.image.height
          // Rotate texture if requested (90 / 180 / 270 degrees clockwise)
          if (artworkData.rotate) {
            const deg = artworkData.rotate
            const swap = deg === 90 || deg === 270
            const cvs = document.createElement('canvas')
            cvs.width  = swap ? imgH : imgW
            cvs.height = swap ? imgW : imgH
            const ctx = cvs.getContext('2d')
            ctx.translate(cvs.width / 2, cvs.height / 2)
            ctx.rotate(deg * Math.PI / 180)
            ctx.drawImage(tex.image, -imgW / 2, -imgH / 2)
            tex.dispose()
            useTex = new THREE.CanvasTexture(cvs)
            useTex.colorSpace = THREE.SRGBColorSpace
            if (IS_MOBILE) { useTex.generateMipmaps = false; useTex.minFilter = THREE.LinearFilter }
            if (swap) { const t = imgW; imgW = imgH; imgH = t }
          }
          // Landscape (打橫) artworks: swap frame dimensions
          if (artworkData.landscape || imgW > imgH * 1.15) {
            const fw = FRAME_H, fh = FRAME_W
            frameMesh.geometry.dispose()
            frameMesh.geometry = new THREE.BoxGeometry(fw + FRAME_BORDER*2, fh + FRAME_BORDER*2, FRAME_THICK)
            canvasMesh.geometry.dispose()
            canvasMesh.geometry = new THREE.PlaneGeometry(fw, fh)
            // Refresh occlusion worldBBs — they were computed before texture load changed the geometry
            frameMesh.geometry.computeBoundingBox()
            if (frameMesh.userData.worldBB)
              frameMesh.userData.worldBB = frameMesh.geometry.boundingBox.clone().applyMatrix4(frameMesh.matrixWorld)
            canvasMesh.geometry.computeBoundingBox()
            if (canvasMesh.userData.worldBB)
              canvasMesh.userData.worldBB = canvasMesh.geometry.boundingBox.clone().applyMatrix4(canvasMesh.matrixWorld)
          }
          const mat = canvasMesh.material
          mat.map = useTex
          mat.color.set(0xffffff)
          mat.needsUpdate = true
        },
        undefined,
        () => {} // stay blank on error
      )
    })
  })

  return artworks
}

export function checkProximity(artworks, charPos) {
  const dist2D = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.z - b.z) ** 2)

  if (activeArtwork) {
    if (dist2D(charPos, activeArtwork.position) > PROXIMITY_THRESHOLD + HYSTERESIS) {
      hideFullscreen()
    }
    return
  }

  let nearest = null, nearestDist = Infinity
  for (const aw of artworks) {
    const d = dist2D(charPos, aw.position)
    if (d < nearestDist) { nearestDist = d; nearest = aw }
  }

  artworks.forEach(aw => {
    aw.glowMesh.material.color.setHex(0xb8960a)
    aw.glowMesh.material.emissiveIntensity = 0
  })

  if (nearest && nearestDist < PROXIMITY_THRESHOLD) {
    nearest.glowMesh.material.emissive = new THREE.Color(0x4a8a4a)
    nearest.glowMesh.material.emissiveIntensity = 0.6
    nearestArtwork = nearest
    const btn = document.getElementById('view-btn')
    if (btn) btn.style.display = 'block'
    // Once user moves to the outer ring (1.2–2.0m), reset the dismiss flag
    if (nearestDist >= PROXIMITY_THRESHOLD * 0.6) _dismissedNear = false
    // Auto-open only if user hasn't just dismissed
    if (nearestDist < PROXIMITY_THRESHOLD * 0.6 && !_dismissedNear) showFullscreen(nearest)
  } else {
    nearestArtwork = null
    _dismissedNear = false  // fully outside range — reset
    const btn = document.getElementById('view-btn')
    if (btn) btn.style.display = 'none'
  }
}

export function viewNearestArtwork() {
  if (nearestArtwork && !activeArtwork) showFullscreen(nearestArtwork)
}

function showFullscreen(artwork) {
  if (activeArtwork) return
  activeArtwork = artwork

  const btn = document.getElementById('view-btn')
  if (btn) btn.style.display = 'none'

  const fsImg  = document.getElementById('fullscreen-img')
  const fsMeta = document.getElementById('fullscreen-meta')

  fsImg.src = artwork.data.file
  const rotate = artwork.data.rotate || 0
  if (rotate === 90 || rotate === 270) {
    fsImg.style.transform = `rotate(${rotate}deg)`
    fsImg.style.maxWidth = '80vh'
    fsImg.style.maxHeight = '90vw'
  } else if (rotate === 180) {
    fsImg.style.transform = 'rotate(180deg)'
    fsImg.style.maxWidth = ''
    fsImg.style.maxHeight = ''
  } else {
    fsImg.style.transform = ''
    fsImg.style.maxWidth = ''
    fsImg.style.maxHeight = ''
  }

  const parts = []
  if (artwork.data.title) parts.push(artwork.data.title)
  if (artwork.data.date)  parts.push(artwork.data.date)
  if (artwork.data.age)   parts.push(`Age ${artwork.data.age}`)
  fsMeta.textContent = parts.join('  ·  ')

  document.getElementById('fullscreen-overlay').classList.add('active')
}

export function hideFullscreen() {
  activeArtwork = null
  _dismissedNear = true  // prevent immediate auto-reopen while still close
  document.getElementById('fullscreen-overlay').classList.remove('active')
  const btn = document.getElementById('view-btn')
  if (btn) btn.style.display = nearestArtwork ? 'block' : 'none'
}

export function isFullscreen() {
  return activeArtwork !== null
}
