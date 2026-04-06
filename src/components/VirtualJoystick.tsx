import { useCallback, useEffect, useRef } from 'react'

interface Props {
  onMove: (dx: number, dy: number) => void
  onStop: () => void
  size?: number
  bottom?: number
  left?: number
  zIndex?: number
}

export function VirtualJoystick({
  onMove,
  onStop,
  size = 120,
  bottom = 22,
  left = 22,
  zIndex = 50,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const activePointerIdRef = useRef<number | null>(null)
  const activeTouchIdRef = useRef<number | null>(null)
  const centerRef = useRef({ x: 0, y: 0 })

  const radius = Math.max(36, Math.floor(size * 0.38))
  const knobSize = Math.max(40, Math.floor(size * 0.36))

  const resetJoystick = useCallback(() => {
    activePointerIdRef.current = null
    activeTouchIdRef.current = null
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(0px, 0px)'
    }
    onStop()
  }, [onStop])

  const updateCenter = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return false

    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }

    return true
  }, [])

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (activePointerIdRef.current === null && activeTouchIdRef.current === null) return

    const cx = centerRef.current.x
    const cy = centerRef.current.y

    let dx = clientX - cx
    let dy = clientY - cy
    const dist = Math.hypot(dx, dy)

    if (dist > radius) {
      dx = (dx / dist) * radius
      dy = (dy / dist) * radius
    }

    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`
    }

    const nx = dx / radius
    const ny = dy / radius

    if (Math.abs(nx) < 0.1 && Math.abs(ny) < 0.1) {
      onStop()
      return
    }

    onMove(nx, ny)
  }, [onMove, onStop, radius])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (activePointerIdRef.current !== null && activePointerIdRef.current !== event.pointerId) {
      resetJoystick()
    }

    if (!updateCenter()) return

    activeTouchIdRef.current = null
    activePointerIdRef.current = event.pointerId

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Ignore capture failures on unsupported browsers.
    }

    handleMove(event.clientX, event.clientY)
  }, [handleMove, resetJoystick, updateCenter])

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    event.stopPropagation()

    const firstTouch = event.changedTouches[0]
    if (!firstTouch) return

    if (!updateCenter()) return

    if (activePointerIdRef.current !== null || (activeTouchIdRef.current !== null && activeTouchIdRef.current !== firstTouch.identifier)) {
      resetJoystick()
    }

    activePointerIdRef.current = null
    activeTouchIdRef.current = firstTouch.identifier
    handleMove(firstTouch.clientX, firstTouch.clientY)
  }, [handleMove, resetJoystick, updateCenter])

  useEffect(() => {
    const onWindowPointerMove = (event: PointerEvent) => {
      if (event.pointerId !== activePointerIdRef.current) return
      event.preventDefault()
      handleMove(event.clientX, event.clientY)
    }

    const onWindowPointerUp = (event: PointerEvent) => {
      if (activePointerIdRef.current === null) return
      if (event.pointerId !== activePointerIdRef.current) return
      resetJoystick()
    }

    const onWindowTouchMove = (event: TouchEvent) => {
      const activeTouchId = activeTouchIdRef.current
      if (activeTouchId === null) return

      const movingTouch = Array.from(event.touches).find((touch) => touch.identifier === activeTouchId)
      if (!movingTouch) return

      event.preventDefault()
      handleMove(movingTouch.clientX, movingTouch.clientY)
    }

    const onWindowTouchEnd = (event: TouchEvent) => {
      const activeTouchId = activeTouchIdRef.current
      if (activeTouchId === null) return

      const ended = Array.from(event.changedTouches).some((touch) => touch.identifier === activeTouchId)
      if (ended) {
        resetJoystick()
      }
    }

    const onVisibilityChange = () => {
      if (document.hidden) resetJoystick()
    }

    const onWindowBlur = () => {
      resetJoystick()
    }

    window.addEventListener('pointermove', onWindowPointerMove, { passive: false })
    window.addEventListener('pointerup', onWindowPointerUp)
    window.addEventListener('pointercancel', onWindowPointerUp)
    window.addEventListener('touchmove', onWindowTouchMove, { passive: false })
    window.addEventListener('touchend', onWindowTouchEnd)
    window.addEventListener('touchcancel', onWindowTouchEnd)
    window.addEventListener('blur', onWindowBlur)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', onWindowPointerUp)
      window.removeEventListener('pointercancel', onWindowPointerUp)
      window.removeEventListener('touchmove', onWindowTouchMove)
      window.removeEventListener('touchend', onWindowTouchEnd)
      window.removeEventListener('touchcancel', onWindowTouchEnd)
      window.removeEventListener('blur', onWindowBlur)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [handleMove, resetJoystick])

  useEffect(() => () => resetJoystick(), [resetJoystick])

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onTouchStart={handleTouchStart}
      onPointerUp={(event) => event.stopPropagation()}
      onPointerCancel={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
      onTouchCancel={(event) => event.stopPropagation()}
      onLostPointerCapture={() => resetJoystick()}
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
      style={{
        position: 'absolute',
        bottom,
        left,
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        border: '2px solid rgba(255,255,255,0.15)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex,
        pointerEvents: 'auto',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <span style={{ position: 'absolute', top: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>W</span>
      <span style={{ position: 'absolute', bottom: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>S</span>
      <span style={{ position: 'absolute', left: 9, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>A</span>
      <span style={{ position: 'absolute', right: 9, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 800 }}>D</span>

      <div
        ref={knobRef}
        style={{
          width: knobSize,
          height: knobSize,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35), rgba(255,255,255,0.12))',
          border: '2px solid rgba(255,255,255,0.35)',
          boxShadow: '0 0 14px rgba(255,255,255,0.2)',
          transition: 'transform 0.06s ease-out',
        }}
      />
    </div>
  )
}
