const STORAGE_KEY = 'gallery-artwork-overrides'

export function getArtworkOverrides() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function saveOverrides(overrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
}

export function showArtworkSettings(manifest) {
  return new Promise(resolve => {
    const overrides = getArtworkOverrides()

    const overlay = document.createElement('div')
    overlay.id = 'art-settings'
    overlay.innerHTML = `
      <div id="as-header">
        <div id="as-title">Artwork Orientation Settings</div>
        <div id="as-sub">Rotate each painting until it looks correct · Changes save automatically</div>
      </div>
      <div id="as-body"></div>
      <div id="as-footer">
        <button id="as-done">Done</button>
      </div>
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

        // Merge: manifest rotate → localStorage override
        const baseRotate = aw.rotate || 0
        const state = { rotate: overrides[key]?.rotate ?? baseRotate }

        const row = document.createElement('div')
        row.className = 'as-row'

        const thumbWrap = document.createElement('div')
        thumbWrap.className = 'as-thumb-wrap'
        const img = document.createElement('img')
        img.className = 'as-thumb'
        img.src = aw.file
        img.loading = 'lazy'
        thumbWrap.appendChild(img)

        const numLabel = document.createElement('div')
        numLabel.className = 'as-num'
        numLabel.textContent = num

        const btnL = document.createElement('button')
        btnL.className = 'as-rot-btn'
        btnL.textContent = '↺'
        btnL.title = 'Rotate 90° counter-clockwise'

        const orientLabel = document.createElement('div')
        orientLabel.className = 'as-orient'

        const btnR = document.createElement('button')
        btnR.className = 'as-rot-btn'
        btnR.textContent = '↻'
        btnR.title = 'Rotate 90° clockwise'

        row.append(thumbWrap, numLabel, btnL, orientLabel, btnR)
        section.appendChild(row)

        function updateRow() {
          img.style.transform = `rotate(${state.rotate}deg)`
          const swap = state.rotate === 90 || state.rotate === 270
          const nw = img.naturalWidth || 1, nh = img.naturalHeight || 1
          const effW = swap ? nh : nw, effH = swap ? nw : nh
          const isLandscape = aw.landscape || effW > effH * 1.15
          orientLabel.textContent = isLandscape ? '打橫 Landscape' : '打直 Portrait'
          orientLabel.className = 'as-orient ' + (isLandscape ? 'landscape' : 'portrait')
        }

        img.addEventListener('load', updateRow)
        updateRow()

        // Click thumbnail to enlarge / shrink
        let enlarged = false
        thumbWrap.style.cursor = 'zoom-in'
        thumbWrap.addEventListener('click', () => {
          enlarged = !enlarged
          if (enlarged) {
            thumbWrap.style.width = '200px'
            thumbWrap.style.height = '200px'
            img.style.width = '196px'
            img.style.height = '196px'
            thumbWrap.style.cursor = 'zoom-out'
          } else {
            thumbWrap.style.width = '72px'
            thumbWrap.style.height = '72px'
            img.style.width = '68px'
            img.style.height = '68px'
            thumbWrap.style.cursor = 'zoom-in'
          }
        })

        function applyRotate(deg) {
          state.rotate = ((state.rotate + deg) + 360) % 360
          updateRow()
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
