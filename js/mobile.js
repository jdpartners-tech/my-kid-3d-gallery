export const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
  ('ontouchstart' in window)

export function isMobile() {
  return IS_MOBILE
}

export function createMobileControls() {
  const state = { x: 0, y: 0 }
  const camInput = { dx: 0 }
  const MAX_DIST = 60

  let moveTouchId = null
  let moveOrigin = { x: 0, y: 0 }
  const prevTouchX = {}

  const resetMove = () => { moveTouchId = null; state.x = 0; state.y = 0 }

  window.addEventListener('touchstart', e => {
    e.preventDefault()
    Array.from(e.changedTouches).forEach(t => {
      if (moveTouchId === null) {
        moveTouchId = t.identifier
        moveOrigin = { x: t.clientX, y: t.clientY }
      } else {
        prevTouchX[t.identifier] = t.clientX
      }
    })
  }, { passive: false })

  window.addEventListener('touchmove', e => {
    e.preventDefault()
    Array.from(e.changedTouches).forEach(t => {
      if (t.identifier === moveTouchId) {
        const dx = t.clientX - moveOrigin.x
        const dy = t.clientY - moveOrigin.y
        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), MAX_DIST)
        const angle = Math.atan2(dy, dx)
        state.x = (dist / MAX_DIST) * Math.cos(angle)
        state.y = (dist / MAX_DIST) * Math.sin(angle)
      } else if (prevTouchX[t.identifier] !== undefined) {
        camInput.dx += t.clientX - prevTouchX[t.identifier]
        prevTouchX[t.identifier] = t.clientX
      }
    })
  }, { passive: false })

  window.addEventListener('touchend', e => {
    Array.from(e.changedTouches).forEach(t => {
      if (t.identifier === moveTouchId) resetMove()
      else delete prevTouchX[t.identifier]
    })
  })

  window.addEventListener('touchcancel', e => {
    Array.from(e.changedTouches).forEach(t => {
      if (t.identifier === moveTouchId) resetMove()
      else delete prevTouchX[t.identifier]
    })
  })

  return {
    getMovementInput() {
      return {
        forward:  state.y < -0.3,
        backward: state.y >  0.3,
        left:     state.x < -0.55,
        right:    state.x >  0.55,
        xAxis:    state.x,
      }
    },
    getCameraDx() {
      const dx = camInput.dx
      camInput.dx = 0
      return dx
    }
  }
}
