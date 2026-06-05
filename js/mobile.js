export function isMobile() {
  return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
}

export function createMobileControls() {
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

  const state = { x: 0, y: 0 }
  const camInput = { dx: 0 }
  const MAX_DIST = 35

  let stickTouchId = null
  let stickOrigin = { x: 0, y: 0 }

  // Track previous touch positions for camera drag delta
  const prevTouchX = {}

  stick.addEventListener('touchstart', e => {
    e.preventDefault()
    const t = e.changedTouches[0]
    stickTouchId = t.identifier
    const r = stick.getBoundingClientRect()
    stickOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, { passive: false })

  window.addEventListener('touchstart', e => {
    Array.from(e.changedTouches).forEach(t => {
      prevTouchX[t.identifier] = t.clientX
    })
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
        const prev = prevTouchX[t.identifier]
        if (prev !== undefined) camInput.dx += t.clientX - prev
      }
      prevTouchX[t.identifier] = t.clientX
    })
  }, { passive: false })

  window.addEventListener('touchend', e => {
    Array.from(e.changedTouches).forEach(t => {
      if (t.identifier === stickTouchId) {
        state.x = 0; state.y = 0
        knob.style.transform = 'translate(-50%, -50%)'
        stickTouchId = null
      }
      delete prevTouchX[t.identifier]
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
