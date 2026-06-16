import { saveOverridesToCloud } from './firebase-sync.js'

const STORAGE_KEY = 'gallery-artwork-overrides'

export function getArtworkOverrides() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}

function saveOverrides(overrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  saveOverridesToCloud(overrides)
}

export function showArtworkSettings(manifest) {
  return new Promise(resolve => {
    const overrides = getArtworkOverrides()
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

      const grid = document.createElement('div')
      grid.className = 'as-grid'

      kid.artworks.forEach((aw, i) => {
        const num = String(i + 1).padStart(3, '0')
        const key = `${kid.name}/${num}`
        const baseRotate = aw.rotate || 0
        const state = { rotate: overrides[key]?.rotate ?? baseRotate }

        const item = document.createElement('div')
        item.className = 'as-item'

        const numLabel = document.createElement('div')
        numLabel.className = 'as-num'
        numLabel.textContent = num

        const thumbWrap = document.createElement('div')
        thumbWrap.className = 'as-thumb-wrap'

        const img = document.createElement('img')
        img.className = 'as-thumb'
        img.src = aw.file
        img.style.transform = `rotate(${state.rotate}deg)`
        thumbWrap.appendChild(img)

        const btns = document.createElement('div')
        btns.className = 'as-btns'

        const btnL = document.createElement('button')
        btnL.className = 'as-rot-btn'; btnL.textContent = '↺'
        btnL.title = 'Rotate 90° counter-clockwise'

        const btnR = document.createElement('button')
        btnR.className = 'as-rot-btn'; btnR.textContent = '↻'
        btnR.title = 'Rotate 90° clockwise'

        btns.append(btnL, btnR)
        item.append(numLabel, thumbWrap, btns)
        grid.appendChild(item)

        function applyRotate(deg) {
          state.rotate = ((state.rotate + deg) + 360) % 360
          img.style.transform = `rotate(${state.rotate}deg)`
          const ovrs = getArtworkOverrides()
          if (state.rotate === 0) delete ovrs[key]
          else ovrs[key] = { rotate: state.rotate }
          saveOverrides(ovrs)
        }

        btnL.addEventListener('click', () => applyRotate(-90))
        btnR.addEventListener('click', () => applyRotate(90))
      })

      section.appendChild(grid)
      body.appendChild(section)
    })

    overlay.querySelector('#as-done').addEventListener('click', () => {
      overlay.style.opacity = '0'
      overlay.style.transition = 'opacity 0.3s'
      setTimeout(() => { overlay.remove(); resolve() }, 300)
    })
  })
}
