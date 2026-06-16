import { saveOverridesToCloud } from './firebase-sync.js'

const STORAGE_KEY = 'gallery-artwork-overrides'

export function getArtworkOverrides() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function saveOverrides(overrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  saveOverridesToCloud(overrides)
}

function drawThumb(cvs, img, rotateDeg) {
  const S = cvs.width
  const ctx = cvs.getContext('2d')
  ctx.clearRect(0, 0, S, S)
  if (!img.complete || img.naturalWidth === 0) return
  const swap = rotateDeg === 90 || rotateDeg === 270
  const iw = img.naturalWidth, ih = img.naturalHeight
  const srcW = swap ? ih : iw, srcH = swap ? iw : ih
  const scale = Math.min((S - 4) / srcW, (S - 4) / srcH)
  const dw = srcW * scale, dh = srcH * scale
  ctx.save()
  ctx.translate(S / 2, S / 2)
  ctx.rotate(rotateDeg * Math.PI / 180)
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()
}

export function showArtworkSettings(manifest) {
  return new Promise(resolve => {
    const overrides = getArtworkOverrides()

    // Immediately push current localStorage state to cloud (catches offline edits)
    saveOverridesToCloud(overrides)

    const overlay = document.createElement('div')
    overlay.id = 'art-settings'
    overlay.innerHTML = `
      <div id="as-header">
        <div id="as-title">Artwork Orientation</div>
      </div>
      <div id="as-body"></div>
      <div id="as-footer"><button id="as-done">Done</button></div>
    `
    document.body.appendChild(overlay)

    const body = overlay.querySelector('#as-body')

    manifest.kids.forEach(kid => {
      const section = document.createElement('div')
      section.className = 'as-section'

      const heading = document.createElement('div')
      heading.className = 'as-section-title'
      heading.textContent = `${kid.name}'s Gallery`
      heading.style.color = kid.color
      section.appendChild(heading)

      kid.artworks.forEach((aw, i) => {
        const num = String(i + 1).padStart(3, '0')
        const key = `${kid.name}/${num}`
        const baseRotate = aw.rotate || 0
        const state = { rotate: overrides[key]?.rotate ?? baseRotate }

        const row = document.createElement('div')
        row.className = 'as-row'

        const numLabel = document.createElement('div')
        numLabel.className = 'as-num'
        numLabel.textContent = num

        const cvs = document.createElement('canvas')
        cvs.className = 'as-thumb-canvas'
        cvs.width = 56; cvs.height = 56

        const btnL = document.createElement('button')
        btnL.className = 'as-rot-btn'; btnL.textContent = '↺'
        btnL.title = 'Rotate 90° counter-clockwise'

        const btnR = document.createElement('button')
        btnR.className = 'as-rot-btn'; btnR.textContent = '↻'
        btnR.title = 'Rotate 90° clockwise'

        row.append(numLabel, cvs, btnL, btnR)
        section.appendChild(row)

        const img = new Image()
        img.addEventListener('load', () => drawThumb(cvs, img, state.rotate))
        img.src = aw.file
        drawThumb(cvs, img, state.rotate)

        function applyRotate(deg) {
          state.rotate = ((state.rotate + deg) + 360) % 360
          drawThumb(cvs, img, state.rotate)
          const ovrs = getArtworkOverrides()
          if (state.rotate === 0) delete ovrs[key]
          else ovrs[key] = { rotate: state.rotate }
          saveOverrides(ovrs)
        }

        btnL.addEventListener('click', () => applyRotate(-90))
        btnR.addEventListener('click', () => applyRotate(90))
      })

      body.appendChild(section)
    })

    overlay.querySelector('#as-done').addEventListener('click', () => {
      overlay.style.opacity = '0'
      overlay.style.transition = 'opacity 0.3s'
      setTimeout(() => { overlay.remove(); resolve() }, 300)
    })
  })
}
