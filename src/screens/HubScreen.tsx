import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useGameStore, t3 } from '../store/gameStore'
import { realm1, realm2, realm3, realm4, realm5, characterImages } from '../data/realms'
import { VirtualJoystick } from '../components/VirtualJoystick'
import { Heart, Brain, Languages, UserCircle, Users, Award, DoorOpen, Trophy, Volume2, VolumeX, Menu, X } from 'lucide-react'
import hubBgImg from '../assets/environment/hub_bg.png'

const PLAYER_SPEED = 3.5
const GATE_RADIUS = 55

interface Gate {
  x: number; y: number; color: string
  label_hi: string; label_en: string; label_hinglish: string
  screen: 'realm1' | 'realm2' | 'realm3' | 'realm4' | 'realm5'
  completed: boolean
}

function drawGateIcon(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, completed: boolean, tick: number, type: number) {
  const pulse = Math.sin(tick * 0.04) * 10

  const grd = ctx.createRadialGradient(x, y, 0, x, y, GATE_RADIUS + pulse + 25)
  grd.addColorStop(0, color + '55')
  grd.addColorStop(0.4, color + '22')
  grd.addColorStop(1, 'transparent')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.arc(x, y, GATE_RADIUS + pulse + 25, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(tick * 0.015)
  ctx.strokeStyle = color + '66'
  ctx.lineWidth = 2
  ctx.setLineDash([8, 8])
  ctx.beginPath()
  ctx.arc(0, 0, GATE_RADIUS + 5, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  ctx.beginPath()
  ctx.arc(x, y, GATE_RADIUS, 0, Math.PI * 2)
  const ig = ctx.createRadialGradient(x, y, 0, x, y, GATE_RADIUS)
  ig.addColorStop(0, color + '44')
  ig.addColorStop(0.7, color + '18')
  ig.addColorStop(1, color + '08')
  ctx.fillStyle = ig
  ctx.fill()
  ctx.strokeStyle = completed ? '#4ade80cc' : color + 'cc'
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  if (type === 0) {
    // Wallet icon
    ctx.beginPath()
    ctx.roundRect(-16, -10, 32, 22, 4)
    ctx.fill()
    ctx.fillStyle = '#000'
    ctx.globalAlpha = 0.3
    ctx.fillRect(-12, -2, 8, 2.5)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#fff'
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.arc(10, 2, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  } else if (type === 1) {
    // Shield icon
    ctx.beginPath()
    ctx.moveTo(0, -18)
    ctx.lineTo(14, -10)
    ctx.lineTo(14, 4)
    ctx.quadraticCurveTo(14, 16, 0, 20)
    ctx.quadraticCurveTo(-14, 16, -14, 4)
    ctx.lineTo(-14, -10)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.moveTo(-5, 2)
    ctx.lineTo(-1, 6)
    ctx.lineTo(7, -4)
    ctx.stroke()
    ctx.globalAlpha = 1
  } else if (type === 2) {
    // Store icon
    ctx.beginPath()
    ctx.roundRect(-16, -6, 32, 22, 4)
    ctx.fill()
    ctx.fillStyle = color
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2
    ctx.globalAlpha = 0.4
    ctx.beginPath()
    ctx.moveTo(-16, -6)
    ctx.lineTo(-12, -16)
    ctx.lineTo(12, -16)
    ctx.lineTo(16, -6)
    ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#fff'
    ctx.globalAlpha = 0.3
    ctx.beginPath()
    ctx.roundRect(-3, 4, 6, 12, 2)
    ctx.fill()
    ctx.globalAlpha = 1
  } else if (type === 3) {
    // TrendingUp icon
    ctx.strokeStyle = color
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(-14, 10)
    ctx.lineTo(-4, -4)
    ctx.lineTo(4, 4)
    ctx.lineTo(14, -10)
    ctx.stroke()
    // Arrow head
    ctx.beginPath()
    ctx.moveTo(14, -10)
    ctx.lineTo(6, -10)
    ctx.moveTo(14, -10)
    ctx.lineTo(14, -2)
    ctx.stroke()
  } else {
    // Landmark icon
    ctx.beginPath()
    ctx.moveTo(0, -16)
    ctx.lineTo(16, -6)
    ctx.lineTo(-16, -6)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.globalAlpha = 0.3
    for (const cx of [-8, 0, 8]) {
      ctx.fillRect(cx - 2, -4, 4, 16)
    }
    ctx.globalAlpha = 1
    ctx.fillStyle = color
    ctx.fillRect(-16, 12, 32, 4)
  }
  ctx.restore()

  if (completed) {
    ctx.fillStyle = '#000'
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.arc(x + GATE_RADIUS * 0.6, y - GATE_RADIUS * 0.6, 14, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.fillStyle = '#4ade80'
    ctx.beginPath()
    ctx.arc(x + GATE_RADIUS * 0.6, y - GATE_RADIUS * 0.6, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x + GATE_RADIUS * 0.6 - 5, y - GATE_RADIUS * 0.6)
    ctx.lineTo(x + GATE_RADIUS * 0.6 - 1, y - GATE_RADIUS * 0.6 + 4)
    ctx.lineTo(x + GATE_RADIUS * 0.6 + 6, y - GATE_RADIUS * 0.6 - 4)
    ctx.stroke()
  }
}

export const HubScreen: React.FC = () => {
  const {
    playerName, stats, language, cycleLang, voiceMode, toggleVoiceMode,
    realm1Completed, realm2Completed, realm3Completed, realm4Completed, realm5Completed,
    mapPosition, setMapPosition, setScreen, startTransition, endTransition,
  } = useGameStore()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const keysRef = useRef<Set<string>>(new Set())
  const posRef = useRef(mapPosition)
  const animRef = useRef<number>(0)
  const frameRef = useRef(0)
  const nearGateRef = useRef<Gate | null>(null)
  const [nearGate, setNearGate] = useState<Gate | null>(null)
  const joystickRef = useRef({ dx: 0, dy: 0 })
  const bgImageRef = useRef<HTMLImageElement | null>(null)
  const playerImageRef = useRef<HTMLImageElement | null>(null)
  const movingRef = useRef(false)
  const worldDimRef = useRef({ w: 900, h: 600 })
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)

  const tt = useCallback((hi: string, en: string, hinglish: string) => t3(hi, en, hinglish, language), [language])
  const langLabel = language === 'hi' ? '\u0939\u093f' : language === 'en' ? 'EN' : 'HG'

  useEffect(() => {
    posRef.current = mapPosition
  }, [mapPosition])

  useEffect(() => {
    endTransition()
    const bg = new Image(); bg.src = hubBgImg
    bg.onload = () => { bgImageRef.current = bg }
    const pl = new Image(); pl.src = characterImages.sakhi
    pl.onload = () => { playerImageRef.current = pl }
  }, [endTransition])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)')
    const handleChange = () => setIsMobileView(media.matches)
    handleChange()

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  // Dynamic gate positions based on world dimensions
  const getGates = useCallback((ww: number, wh: number): Gate[] => [
    { x: (realm1.mapGateX / 100) * ww, y: (realm1.mapGateY / 100) * wh, color: realm1.color, label_hi: realm1.title_hi, label_en: realm1.title_en, label_hinglish: realm1.title_hinglish, screen: 'realm1', completed: realm1Completed },
    { x: (realm2.mapGateX / 100) * ww, y: (realm2.mapGateY / 100) * wh, color: realm2.color, label_hi: realm2.title_hi, label_en: realm2.title_en, label_hinglish: realm2.title_hinglish, screen: 'realm2', completed: realm2Completed },
    { x: (realm3.mapGateX / 100) * ww, y: (realm3.mapGateY / 100) * wh, color: realm3.color, label_hi: realm3.title_hi, label_en: realm3.title_en, label_hinglish: realm3.title_hinglish, screen: 'realm3', completed: realm3Completed },
    { x: (realm4.mapGateX / 100) * ww, y: (realm4.mapGateY / 100) * wh, color: realm4.color, label_hi: realm4.title_hi, label_en: realm4.title_en, label_hinglish: realm4.title_hinglish, screen: 'realm4', completed: realm4Completed },
    { x: (realm5.mapGateX / 100) * ww, y: (realm5.mapGateY / 100) * wh, color: realm5.color, label_hi: realm5.title_hi, label_en: realm5.title_en, label_hinglish: realm5.title_hinglish, screen: 'realm5', completed: realm5Completed },
  ], [realm1Completed, realm2Completed, realm3Completed, realm4Completed, realm5Completed])

  const enterGate = useCallback((gate: Gate) => {
    setMapPosition({ ...posRef.current })
    startTransition(gate.color)
    setTimeout(() => setScreen(gate.screen), 800)
  }, [setMapPosition, setScreen, startTransition])

  const enterNearGate = useCallback(() => {
    const gate = nearGateRef.current
    if (gate) enterGate(gate)
  }, [enterGate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
      if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') enterNearGate()
    }
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp) }
  }, [enterNearGate])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      const c = containerRef.current
      if (!c) return
      const w = Math.max(c.clientWidth, window.innerWidth)
      const h = Math.max(c.clientHeight, window.innerHeight)
      canvas.width = w
      canvas.height = h
      worldDimRef.current = { w, h }
      posRef.current = {
        x: Number.isFinite(posRef.current.x) ? Math.max(32, Math.min(w - 32, posRef.current.x)) : w / 2,
        y: Number.isFinite(posRef.current.y) ? Math.max(32, Math.min(h - 32, posRef.current.y)) : h / 2,
      }
    }
    resize()
    window.addEventListener('resize', resize)

    const gameLoop = () => {
      frameRef.current++
      const tick = frameRef.current
      const keys = keysRef.current
      const WW = worldDimRef.current.w
      const WH = worldDimRef.current.h
      let dx = 0, dy = 0

      if (!Number.isFinite(posRef.current.x) || !Number.isFinite(posRef.current.y)) {
        posRef.current = { x: WW / 2, y: WH / 2 }
      }

      if (keys.has('w') || keys.has('arrowup'))    dy = -PLAYER_SPEED
      if (keys.has('s') || keys.has('arrowdown'))  dy =  PLAYER_SPEED
      if (keys.has('a') || keys.has('arrowleft'))  dx = -PLAYER_SPEED
      if (keys.has('d') || keys.has('arrowright')) dx =  PLAYER_SPEED
      if (joystickRef.current.dx || joystickRef.current.dy) {
        dx = joystickRef.current.dx * PLAYER_SPEED
        dy = joystickRef.current.dy * PLAYER_SPEED
      }
      if (dx && dy) { dx *= 0.707; dy *= 0.707 }
      movingRef.current = dx !== 0 || dy !== 0

      posRef.current = {
        x: Math.max(32, Math.min(WW - 32, posRef.current.x + dx)),
        y: Math.max(32, Math.min(WH - 32, posRef.current.y + dy)),
      }

      const gates = getGates(WW, WH)
      let closestGate: Gate | null = null
      let minDist = Infinity
      for (const g of gates) {
        const d = Math.hypot(posRef.current.x - g.x, posRef.current.y - g.y)
        if (d < GATE_RADIUS + 40 && d < minDist) { minDist = d; closestGate = g }
      }
      if (closestGate !== nearGateRef.current) { nearGateRef.current = closestGate; setNearGate(closestGate) }

      ctx.clearRect(0, 0, WW, WH)

      // BG — fill entire canvas
      if (bgImageRef.current) {
        ctx.drawImage(bgImageRef.current, 0, 0, WW, WH)
        ctx.fillStyle = 'rgba(5,10,14,0.25)'
        ctx.fillRect(0, 0, WW, WH)
      } else {
        const grad = ctx.createLinearGradient(0, 0, WW, WH)
        grad.addColorStop(0, '#1a3a2a'); grad.addColorStop(1, '#0a1a10')
        ctx.fillStyle = grad; ctx.fillRect(0, 0, WW, WH)
      }

      // Particles
      for (let i = 0; i < 25; i++) {
        const angle = tick * 0.01 + i * 1.2
        const px = (i * 67) % WW
        const py = (i * 53) % WH
        const ox = Math.sin(angle) * 15
        const oy = Math.cos(angle * 0.7) * 10
        ctx.globalAlpha = 0.12 + Math.sin(tick * 0.03 + i) * 0.08
        ctx.fillStyle = '#fde68a'
        ctx.beginPath()
        ctx.arc(px + ox, py + oy, 2.5, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // Gates
      gates.forEach((gate, idx) => {
        drawGateIcon(ctx, gate.x, gate.y, gate.color, gate.completed, tick, idx)
        const label = tt(gate.label_hi, gate.label_en, gate.label_hinglish)
        ctx.font = 'bold 13px Inter, sans-serif'
        ctx.textAlign = 'center'
        const lw = ctx.measureText(label).width + 16
        ctx.fillStyle = 'rgba(0,0,0,0.6)'
        ctx.beginPath()
        ctx.roundRect(gate.x - lw / 2, gate.y + GATE_RADIUS + 8, lw, 22, 11)
        ctx.fill()
        ctx.fillStyle = '#fff'
        ctx.fillText(label, gate.x, gate.y + GATE_RADIUS + 23)
        ctx.textAlign = 'left'
      })

      // Player — BIGGER (64px)
      const px = posRef.current.x
      const py = posRef.current.y
      const bounce = movingRef.current ? Math.sin(tick * 0.3) * 3 : 0
      const pSize = 64

      ctx.globalAlpha = 0.25
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.ellipse(px, py + 30, 22, 10, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      ctx.save()
      ctx.beginPath()
      ctx.arc(px, py - bounce, pSize / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      if (playerImageRef.current) {
        ctx.drawImage(playerImageRef.current, px - pSize / 2, py - bounce - pSize / 2, pSize, pSize)
      }
      ctx.restore()

      ctx.strokeStyle = '#a78bfa'
      ctx.lineWidth = 2.5
      ctx.shadowColor = '#a78bfa'
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.arc(px, py - bounce, pSize / 2, 0, Math.PI * 2)
      ctx.stroke()
      ctx.shadowBlur = 0

      ctx.font = 'bold 13px Inter, sans-serif'
      ctx.textAlign = 'center'
      const nw = ctx.measureText(playerName).width + 14
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.beginPath()
      ctx.roundRect(px - nw / 2, py - bounce - pSize / 2 - 24, nw, 20, 10)
      ctx.fill()
      ctx.fillStyle = '#fde68a'
      ctx.fillText(playerName, px, py - bounce - pSize / 2 - 10)
      ctx.textAlign = 'left'

      // Proximity hint
      if (closestGate) {
        const hint = tt(
          `${closestGate.label_hi} में जाओ`,
          `Enter ${closestGate.label_en}`,
          `${closestGate.label_hinglish} mein jaao`,
        )
        ctx.font = 'bold 13px Inter, sans-serif'
        const hw = ctx.measureText(hint).width + 24
        ctx.fillStyle = closestGate.color
        ctx.shadowColor = closestGate.color; ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.roundRect(closestGate.x - hw / 2, closestGate.y - GATE_RADIUS - 44, hw, 28, 14)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.fillStyle = '#fff'
        ctx.textAlign = 'center'
        ctx.fillText(hint, closestGate.x, closestGate.y - GATE_RADIUS - 26)
        ctx.textAlign = 'left'
      }

      animRef.current = requestAnimationFrame(gameLoop)
    }

    animRef.current = requestAnimationFrame(gameLoop)
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener('resize', resize) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, realm1Completed, realm2Completed, realm3Completed, realm4Completed, realm5Completed])

  const allDone = realm1Completed && realm2Completed && realm3Completed && realm4Completed && realm5Completed

  const handleJoystickMove = useCallback((dx: number, dy: number) => {
    joystickRef.current = { dx, dy }
  }, [])
  const handleJoystickStop = useCallback(() => {
    joystickRef.current = { dx: 0, dy: 0 }
  }, [])

  const handleCanvasPointer = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    setMenuOpen(false)

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    const x = ((event.clientX - rect.left) / rect.width) * worldDimRef.current.w
    const y = ((event.clientY - rect.top) / rect.height) * worldDimRef.current.h

    const gates = getGates(worldDimRef.current.w, worldDimRef.current.h)
    const tappedGate = gates.find((gate) => Math.hypot(x - gate.x, y - gate.y) <= GATE_RADIUS + 18)

    if (tappedGate) {
      nearGateRef.current = tappedGate
      setNearGate(tappedGate)
      enterGate(tappedGate)
      return
    }

    posRef.current = {
      x: Math.max(32, Math.min(worldDimRef.current.w - 32, x)),
      y: Math.max(32, Math.min(worldDimRef.current.h - 32, y)),
    }
  }, [enterGate, getGates])

  return (
    <div ref={containerRef} style={{
      position: 'relative', width: '100%', height: '100%',
      overflow: 'hidden', background: '#050a0e', touchAction: 'none',
    }}>
      <canvas
        ref={canvasRef}
        onPointerDown={handleCanvasPointer}
        style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
      />

      {/* HUD — Top bar with bigger bars + Lucide icons */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', gap: 8, alignItems: 'center', zIndex: 10, pointerEvents: 'none',
        padding: '10px 14px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 100%)',
      }}>
        <div className="glass-strong" style={{
          padding: '8px 14px', display: 'flex', gap: 12, alignItems: 'center', pointerEvents: 'all',
        }}>
          {/* Health */}
          <div className="stat-bar-container">
            <div className="stat-bar-icon" style={{ color: '#ef4444' }}>
              <Heart size={16} fill="#ef4444" />
            </div>
            <div className="stat-bar-track" style={{ background: '#3b0a0a', minWidth: 80 }}>
              <div className="stat-bar-fill" style={{
                width: `${stats.health}%`,
                background: stats.health > 30 ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, #991b1b, #ef4444)',
                boxShadow: stats.health <= 30 ? '0 0 8px rgba(239,68,68,0.5)' : 'none',
              }} />
            </div>
            <span className="stat-bar-label" style={{ color: '#ef4444' }}>{stats.health}</span>
          </div>
          {/* Wisdom */}
          <div className="stat-bar-container">
            <div className="stat-bar-icon" style={{ color: '#a78bfa' }}>
              <Brain size={16} />
            </div>
            <div className="stat-bar-track" style={{ background: '#1e0a3e', minWidth: 80 }}>
              <div className="stat-bar-fill" style={{
                width: `${stats.wisdom}%`,
                background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
              }} />
            </div>
            <span className="stat-bar-label" style={{ color: '#a78bfa' }}>{stats.wisdom}</span>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Action buttons */}
        {isMobileView ? (
          <div style={{ position: 'relative', pointerEvents: 'all' }}>
            <button onClick={() => setMenuOpen((open) => !open)} style={{
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.18)', borderRadius: 10,
              color: '#fff', padding: '7px 9px',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}>
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>

            {menuOpen && (
              <div className="glass-strong" style={{
                position: 'absolute', top: 40, right: 0, minWidth: 180,
                padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
                borderRadius: 12,
              }}>
                <button onClick={() => { setScreen('sakhisathi'); setMenuOpen(false) }} style={{
                  background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.45)',
                  borderRadius: 9, color: '#10b981', fontSize: 12, fontWeight: 800,
                  padding: '8px 10px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Users size={14} /> SHG
                </button>

                <button onClick={() => { setScreen('profile'); setMenuOpen(false) }} style={{
                  background: 'rgba(167,139,250,0.2)', border: '1px solid rgba(167,139,250,0.45)',
                  borderRadius: 9, color: '#a78bfa', fontSize: 12, fontWeight: 800,
                  padding: '8px 10px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <UserCircle size={14} /> {tt('प्रोफाइल', 'Profile', 'Profile')}
                </button>

                <button onClick={() => { setScreen('certificate'); setMenuOpen(false) }} style={{
                  background: 'rgba(253,230,138,0.2)', border: '1px solid rgba(253,230,138,0.45)',
                  borderRadius: 9, color: '#fde68a', fontSize: 12, fontWeight: 800,
                  padding: '8px 10px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Award size={14} /> Certificate
                </button>

                <button onClick={() => { toggleVoiceMode(); setMenuOpen(false) }} style={{
                  background: voiceMode ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 9, color: '#fff', fontSize: 12, fontWeight: 800,
                  padding: '8px 10px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {voiceMode ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  {tt('आवाज़ मोड', 'Voice Mode', 'Voice Mode')}
                </button>

                <button onClick={() => { cycleLang(); setMenuOpen(false) }} style={{
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 9, color: '#fde68a', fontSize: 12, fontWeight: 800,
                  padding: '8px 10px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Languages size={14} /> {tt('भाषा', 'Language', 'Language')} {langLabel}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6, pointerEvents: 'all' }}>
            <button onClick={() => setScreen('sakhisathi')} style={{
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(16,185,129,0.3)', borderRadius: 10,
              color: '#10b981', fontSize: 11, fontWeight: 800, padding: '6px 10px',
              cursor: 'pointer', fontFamily: 'var(--font-primary)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Users size={14} /> SHG
            </button>
            <button onClick={() => setScreen('certificate')} style={{
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(253,230,138,0.3)', borderRadius: 10,
              color: '#fde68a', fontSize: 11, fontWeight: 800, padding: '6px 10px',
              cursor: 'pointer', fontFamily: 'var(--font-primary)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Award size={14} />
            </button>
            <button onClick={toggleVoiceMode} style={{
              background: voiceMode ? 'rgba(167,139,250,0.3)' : 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(12px)',
              border: voiceMode ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10, color: '#fff', padding: '6px 8px',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}>
              {voiceMode ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
            <button onClick={() => setScreen('profile')} style={{
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
              color: '#a78bfa', padding: '6px 8px',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}>
              <UserCircle size={14} />
            </button>
            <button onClick={cycleLang} style={{
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
              color: '#fde68a', fontSize: 11, fontWeight: 800, padding: '6px 10px',
              cursor: 'pointer', fontFamily: 'var(--font-primary)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Languages size={14} /> {langLabel}
            </button>
          </div>
        )}
      </div>

      {nearGate && (
        <div style={{
          position: 'absolute', bottom: isMobileView ? 170 : 160, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
        }}>
          <button onClick={enterNearGate} className="btn-primary" style={{
            background: nearGate.color, fontSize: 14, padding: '12px 24px',
            boxShadow: `0 6px 28px ${nearGate.color}88`,
            animation: isMobileView ? 'none' : 'bounceBtn 0.8s ease-in-out infinite alternate',
          }}>
            <DoorOpen size={18} />
            {tt(nearGate.label_hi, nearGate.label_en, nearGate.label_hinglish)}
            {tt(' → जाओ', ' → Enter', ' → Jaao')}
          </button>
        </div>
      )}

      <VirtualJoystick
        onMove={handleJoystickMove}
        onStop={handleJoystickStop}
        size={isMobileView ? 110 : 120}
        bottom={isMobileView ? 20 : 28}
        left={isMobileView ? 14 : 28}
      />

      <div style={{
        position: 'absolute', bottom: 14, right: 14, zIndex: 10, pointerEvents: 'none',
      }}>
        <div className="glass-strong" style={{
          padding: '5px 10px', fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600,
        }}>
          {isMobileView
            ? tt('Tap portal • Joystick चलो', 'Tap portal • Joystick move', 'Tap portal • Joystick chalo')
            : `WASD ${tt('चलो', 'Move', 'Chalo')} • E ${tt('जाओ', 'Enter', 'Jaao')}`}
        </div>
      </div>

      {allDone && (
        <button onClick={() => setScreen('results')} className="btn-primary" style={{
          position: 'absolute', bottom: 28, right: 28, zIndex: 20,
          background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
          fontSize: 13, padding: '12px 20px',
          boxShadow: '0 6px 24px rgba(124,58,237,0.5)',
        }}>
          <Trophy size={16} /> {tt('Report Card देखो!', 'See Report Card!', 'Report Card dekho!')}
        </button>
      )}
    </div>
  )
}
