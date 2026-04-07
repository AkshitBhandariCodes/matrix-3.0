import { useCallback, useEffect, useRef } from 'react'

interface Props {
  onMove: (dx: number, dy: number) => void
  onStop: () => void
  size?: number
  bottom?: number
  left?: number
  zIndex?: number
}

interface TouchListLike {
  length: number
  item(index: number): {
    identifier: number
    clientX: number
    clientY: number
  } | null
}

function getTrackedTouch(touches: TouchListLike, identifier: number) {
  for (let i = 0; i < touches.length; i += 1) {
    const touch = touches.item(i)
    if (touch && touch.identifier === identifier) return touch
  }
  return null
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

  const setKnobPosition = useCallback((dx: number, dy: number) => {
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`
    }
  }, [])

  const resetJoystick = useCallback(() => {
    activePointerIdRef.current = null
    activeTouchIdRef.current = null
    setKnobPosition(0, 0)
    onStop()
  }, [onStop, setKnobPosition])

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

    setKnobPosition(dx, dy)

    const nx = dx / radius
    const ny = dy / radius

    if (Math.abs(nx) < 0.06 && Math.abs(ny) < 0.06) {
      onStop()
      return
    }

    onMove(nx, ny)
  }, [onMove, onStop, radius, setKnobPosition])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (activeTouchIdRef.current !== null) return

    event.preventDefault()
    event.stopPropagation()

    if (activePointerIdRef.current !== null && activePointerIdRef.current !== event.pointerId) {
      return
    }

    if (!updateCenter()) return

    activePointerIdRef.current = event.pointerId

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Ignore capture failures on unsupported browsers.
    }

    handleMove(event.clientX, event.clientY)
  }, [handleMove, updateCenter])

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (activeTouchIdRef.current !== null) return
    if (event.pointerId !== activePointerIdRef.current) return

    event.preventDefault()
    event.stopPropagation()
    handleMove(event.clientX, event.clientY)
  }, [handleMove])

  const handlePointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (activeTouchIdRef.current !== null) return
    if (event.pointerId !== activePointerIdRef.current) return

    event.preventDefault()
    event.stopPropagation()
    resetJoystick()
  }, [resetJoystick])

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (activeTouchIdRef.current !== null) return
    if (!updateCenter()) return

    const touch = event.changedTouches.item(0)
    if (!touch) return

    activeTouchIdRef.current = touch.identifier
    activePointerIdRef.current = null
    handleMove(touch.clientX, touch.clientY)
  }, [handleMove, updateCenter])

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const identifier = activeTouchIdRef.current
    if (identifier === null) return

    const touch = getTrackedTouch(event.touches, identifier) ?? getTrackedTouch(event.changedTouches, identifier)
    if (!touch) return

    event.preventDefault()
    event.stopPropagation()
    handleMove(touch.clientX, touch.clientY)
  }, [handleMove])

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const identifier = activeTouchIdRef.current
    if (identifier === null) return

    const touch = getTrackedTouch(event.changedTouches, identifier)
    if (!touch) return

    event.preventDefault()
    event.stopPropagation()
    resetJoystick()
  }, [resetJoystick])

  useEffect(() => {
    const onWindowPointerMove = (event: PointerEvent) => {
      if (activeTouchIdRef.current !== null) return
      if (event.pointerId !== activePointerIdRef.current) return

      event.preventDefault()
      handleMove(event.clientX, event.clientY)
    }

    const onWindowPointerUp = (event: PointerEvent) => {
      if (activeTouchIdRef.current !== null) return
      if (event.pointerId !== activePointerIdRef.current) return

      event.preventDefault()
      resetJoystick()
    }

    const onWindowTouchMove = (event: TouchEvent) => {
      const identifier = activeTouchIdRef.current
      if (identifier === null) return

      const touch = getTrackedTouch(event.touches, identifier)
      if (!touch) return

      event.preventDefault()
      handleMove(touch.clientX, touch.clientY)
    }

    const onWindowTouchEnd = (event: TouchEvent) => {
      const identifier = activeTouchIdRef.current
      if (identifier === null) return

      const touch = getTrackedTouch(event.changedTouches, identifier)
      if (!touch) return

      event.preventDefault()
      resetJoystick()
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
    window.addEventListener('touchend', onWindowTouchEnd, { passive: false })
    window.addEventListener('touchcancel', onWindowTouchEnd, { passive: false })
    window.addEventListener('blur', onWindowBlur)
    window.addEventListener('resize', updateCenter)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove)
      window.removeEventListener('pointerup', onWindowPointerUp)
      window.removeEventListener('pointercancel', onWindowPointerUp)
      window.removeEventListener('touchmove', onWindowTouchMove)
      window.removeEventListener('touchend', onWindowTouchEnd)
      window.removeEventListener('touchcancel', onWindowTouchEnd)
      window.removeEventListener('blur', onWindowBlur)
      window.removeEventListener('resize', updateCenter)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [handleMove, resetJoystick, updateCenter])

  useEffect(() => () => resetJoystick(), [resetJoystick])

  return (
    <div
      data-virtual-joystick="true"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onClick={(event) => { event.preventDefault(); event.stopPropagation() }}
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
        overscrollBehavior: 'contain',
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
          transition: 'transform 0.04s linear',
        }}
      />
    </div>
  )
}
