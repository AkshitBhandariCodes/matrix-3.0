import React, { useEffect, useRef, useCallback, useState } from 'react'
import { useGameStore, t3 } from '../store/gameStore'
import { characterImages } from '../data/realms'
import type { Realm, Challenge, Choice, Expression } from '../data/realms'
import { VirtualJoystick } from '../components/VirtualJoystick'
import { useResponsiveMode } from '../hooks/useResponsiveMode'
import { speak as speakTTS } from '../utils/speech'
import { formatLearningContent, getAdaptiveLearningContent } from '../utils/learningContent'
import { ArrowLeft, Award, Brain, ChevronRight, Heart, Languages, Menu, ShieldAlert, UserCircle, Users, Volume2, VolumeX, X } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════
const PLAYER_SPEED = 3.2
const CHALLENGE_RADIUS = 50
const GUIDE_FOLLOW_DIST = 70

// ─── SVG icons as inline paths (no emojis!) ────────────────────
function drawChallengeIcon(ctx: CanvasRenderingContext2D, x: number, y: number, done: boolean, color: string, tick: number) {
  const pulse = Math.sin(tick * 0.04) * 6
  const r = done ? 24 : 28 + pulse / 2

  // Outer glow
  if (!done) {
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r + 20)
    grd.addColorStop(0, color + '55')
    grd.addColorStop(1, 'transparent')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(x, y, r + 20, 0, Math.PI * 2)
    ctx.fill()

    // Rotating ring
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(tick * 0.02)
    ctx.strokeStyle = color + '66'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 6])
    ctx.beginPath()
    ctx.arc(0, 0, r + 8, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }

  // Inner circle
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, done ? '#1a1a2e' : color + '44')
  g.addColorStop(1, done ? '#0a0a18' : color + '18')
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = done ? '#4ade8088' : color
  ctx.lineWidth = done ? 2 : 3
  ctx.stroke()

  // Icon inside: star for active, checkmark for done
  if (done) {
    // Checkmark
    ctx.strokeStyle = '#4ade80'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(x - 8, y)
    ctx.lineTo(x - 2, y + 8)
    ctx.lineTo(x + 10, y - 6)
    ctx.stroke()
  } else {
    // Diamond / quest marker
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x, y - 12)
    ctx.lineTo(x + 10, y)
    ctx.lineTo(x, y + 12)
    ctx.lineTo(x - 10, y)
    ctx.closePath()
    ctx.fill()

    // Inner highlight
    ctx.fillStyle = '#fff'
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.moveTo(x, y - 6)
    ctx.lineTo(x + 5, y)
    ctx.lineTo(x, y + 6)
    ctx.lineTo(x - 5, y)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

function drawSpeechBubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, maxW: number, color: string) {
  ctx.font = 'bold 11px Inter, sans-serif'
  // Word wrap
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w
    if (ctx.measureText(test).width > maxW - 20) {
      if (cur) lines.push(cur)
      cur = w
    } else { cur = test }
  }
  if (cur) lines.push(cur)

  const lineH = 15
  const padX = 12, padY = 8
  const bw = maxW
  const bh = lines.length * lineH + padY * 2
  const bx = x - bw / 2
  const by = y - bh - 16

  // Bubble bg
  ctx.fillStyle = 'rgba(10,10,20,0.88)'
  ctx.strokeStyle = color + '66'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.roundRect(bx, by, bw, bh, 10)
  ctx.fill()
  ctx.stroke()

  // Pointer triangle
  ctx.fillStyle = 'rgba(10,10,20,0.88)'
  ctx.beginPath()
  ctx.moveTo(x - 8, by + bh)
  ctx.lineTo(x, by + bh + 10)
  ctx.lineTo(x + 8, by + bh)
  ctx.fill()

  // Text
  ctx.fillStyle = '#eee'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], bx + padX, by + padY + i * lineH)
  }
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

// ─── Expression ring color ─────────────────────────────────────
const EXPR_COLORS: Record<Expression, string> = {
  happy: '#4ade80',
  sad: '#60a5fa',
  angry: '#f87171',
  thinking: '#fbbf24',
  neutral: '#a78bfa',
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════
interface Props {
  realm: Realm
  realmNumber: 1 | 2 | 3 | 4 | 5
}

export const RealmScreen: React.FC<Props> = ({ realm, realmNumber }) => {
  const {
    language, applyStatDelta, completeRealm, setScreen, cycleLang,
    playerName, startTransition, endTransition,
    wrongCount, incrementWrongCount, resetWrongCount, stats, voiceMode, toggleVoiceMode,
  } = useGameStore()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef(0)
  const frameRef = useRef(0)
  const learningRequestRef = useRef(0)

  // Player & guide positions
  const posRef = useRef({ x: 100, y: 350 })
  const guidePos = useRef({ x: 60, y: 350 })
  const worldDimRef = useRef({ w: 1000, h: 700 })
  const keysRef = useRef<Set<string>>(new Set())
  const joystickRef = useRef({ dx: 0, dy: 0 })
  const movingRef = useRef(false)

  // Challenge state
  const [completedChallenges, setCompletedChallenges] = useState<Set<string>>(new Set())
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null)
  const [nearChallenge, setNearChallenge] = useState<Challenge | null>(null)
  const [showDialogue, setShowDialogue] = useState(false)
  const [dialoguePhase, setDialoguePhase] = useState<'intro' | 'scenario' | 'choices' | 'feedback' | 'explanation'>('intro')
  const [lastChoice, setLastChoice] = useState<Choice | null>(null)
  const [guideExpression, setGuideExpression] = useState<Expression>('neutral')
  const [guideBubble, setGuideBubble] = useState('')
  const [score, setScore] = useState(0)
  const [allDone, setAllDone] = useState(false)
  const [showIntro, setShowIntro] = useState(true)
  const [typeIdx, setTypeIdx] = useState(0)
  const [dialogueText, setDialogueText] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [isGeneratingLearning, setIsGeneratingLearning] = useState(false)

  // Images
  const bgImgRef = useRef<HTMLImageElement | null>(null)
  const playerImgRef = useRef<HTMLImageElement | null>(null)
  const guideImgRef = useRef<HTMLImageElement | null>(null)

  const nearRef = useRef<Challenge | null>(null)
  const completedRef = useRef<Set<string>>(new Set())
  const { isCompactView: isMobileView, isTouchInput } = useResponsiveMode()

  const tt = useCallback((hi: string, en: string, hinglish: string) => t3(hi, en, hinglish, language), [language])
  const langLabel = language === 'hi' ? 'हि' : language === 'en' ? 'EN' : 'HG'

  useEffect(() => { endTransition() }, [endTransition])

  // Load images
  useEffect(() => {
    const bg = new Image(); bg.src = realm.bgImage
    bg.onload = () => { bgImgRef.current = bg }
    const pl = new Image(); pl.src = characterImages.sakhi
    pl.onload = () => { playerImgRef.current = pl }
    const gi = new Image(); gi.src = realm.protagonist.image
    gi.onload = () => { guideImgRef.current = gi }
  }, [realm])

  // Show guide greeting on entry
  useEffect(() => {
    if (!showIntro) {
      const greeting = tt(
        realm.protagonist.greeting_hi,
        realm.protagonist.greeting_en,
        realm.protagonist.greeting_hinglish,
      )
      setGuideBubble(greeting)
      setGuideExpression('happy')
      speak(greeting)
      setTimeout(() => {
        setGuideBubble(tt(
          realm.protagonist.moveInstruction_hi,
          realm.protagonist.moveInstruction_en,
          realm.protagonist.moveInstruction_hinglish,
        ))
      }, 4000)
      setTimeout(() => setGuideBubble(''), 8000)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIntro])

  // ─── TTS helper ──────────────────────────────────────────
  const speak = useCallback((text: string) => {
    speakTTS(text, language)
  }, [language])

  const renderRealmMenu = () => (
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
          position: 'absolute', top: 40, right: 0, minWidth: 190,
          padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
          borderRadius: 12, zIndex: 40,
        }}>
          <button onClick={() => { setScreen('profile'); setMenuOpen(false) }} style={{
            background: 'rgba(167,139,250,0.24)', border: '1px solid rgba(167,139,250,0.45)',
            borderRadius: 9, color: '#ede9fe', fontSize: 12, fontWeight: 800,
            padding: '8px 10px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <UserCircle size={14} /> {tt('प्रोफाइल और प्रगति', 'Profile & Progress', 'Profile aur Progress')}
          </button>

          <button onClick={() => { setScreen('sakhisathi'); setMenuOpen(false) }} style={{
            background: 'rgba(34,197,94,0.2)', border: '1px solid rgba(34,197,94,0.45)',
            borderRadius: 9, color: '#86efac', fontSize: 12, fontWeight: 800,
            padding: '8px 10px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <Users size={14} /> {tt('SHG सिमुलेशन', 'SHG Simulation', 'SHG Simulation')}
          </button>

          <button onClick={() => { setScreen('suraksha'); setMenuOpen(false) }} style={{
            background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.45)',
            borderRadius: 9, color: '#fca5a5', fontSize: 12, fontWeight: 800,
            padding: '8px 10px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <ShieldAlert size={14} /> {tt('सुरक्षा सायरन', 'Safety Siren', 'Suraksha Siren')}
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
  )

  // ─── Keyboard ────────────────────────────────────────────
  const handleEnterChallenge = useCallback(() => {
    const ch = nearRef.current
    if (ch && !completedRef.current.has(ch.id) && !showDialogue) {
      setActiveChallenge(ch)
      setShowDialogue(true)
      setDialoguePhase('intro')
      setGuideExpression('thinking')
      const introText = tt(ch.guideIntro_hi, ch.guideIntro_en, ch.guideIntro_hinglish)
      setDialogueText(introText)
      setTypeIdx(0)
      setGuideBubble(introText)
      speak(introText)
    }
  }, [showDialogue, tt, speak])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase())
      if ((e.key === 'e' || e.key === 'E' || e.key === 'Enter') && !showDialogue) handleEnterChallenge()
    }
    const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  }, [handleEnterChallenge, showDialogue])

  // ─── Typewriter for dialogue ─────────────────────────────
  useEffect(() => {
    if (!dialogueText) return
    setTypeIdx(0)
    let i = 0
    const iv = setInterval(() => {
      i++
      setTypeIdx(i)
      if (i >= dialogueText.length) clearInterval(iv)
    }, 22)
    return () => clearInterval(iv)
  }, [dialogueText])

  // ─── Canvas game loop ────────────────────────────────────
  useEffect(() => {
    if (showIntro) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const resize = () => {
      const container = containerRef.current
      if (!container) return
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      worldDimRef.current = { w: container.clientWidth, h: container.clientHeight }
    }
    resize()
    window.addEventListener('resize', resize)

    const challenges = realm.challenges

    const gameLoop = () => {
      frameRef.current++
      const tick = frameRef.current
      const keys = keysRef.current
      const WORLD_W = worldDimRef.current.w
      const WORLD_H = worldDimRef.current.h

      // ── Player movement (disabled during dialogue) ───────
      if (!showDialogue) {
        let dx = 0, dy = 0
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

        posRef.current.x = Math.max(30, Math.min(WORLD_W - 30, posRef.current.x + dx))
        posRef.current.y = Math.max(30, Math.min(WORLD_H - 30, posRef.current.y + dy))

        // Guide follows player
        const gdx = posRef.current.x - GUIDE_FOLLOW_DIST - guidePos.current.x
        const gdy = posRef.current.y - guidePos.current.y
        guidePos.current.x += gdx * 0.06
        guidePos.current.y += gdy * 0.06
      }

      // Proximity detection
      let closest: Challenge | null = null
      let minDist = Infinity
      challenges.forEach((ch) => {
        const cx = (ch.mapX / 100) * WORLD_W
        const cy = (ch.mapY / 100) * WORLD_H
        const d = Math.hypot(posRef.current.x - cx, posRef.current.y - cy)
        if (d < CHALLENGE_RADIUS + 40 && d < minDist) { minDist = d; closest = ch }
      })
      if (closest !== nearRef.current) {
        nearRef.current = closest
        setNearChallenge(closest)
      }

      // ── DRAW ─────────────────────────────────────────────
      ctx.clearRect(0, 0, WORLD_W, WORLD_H)

      // Background
      if (bgImgRef.current) {
        ctx.drawImage(bgImgRef.current, 0, 0, WORLD_W, WORLD_H)
        ctx.fillStyle = 'rgba(5,10,14,0.25)'
        ctx.fillRect(0, 0, WORLD_W, WORLD_H)
      } else {
        ctx.fillStyle = '#0a0a18'
        ctx.fillRect(0, 0, WORLD_W, WORLD_H)
      }

      // Particles
      for (let i = 0; i < 15; i++) {
        const angle = tick * 0.01 + i * 1.5
        const px = (i * 67) % WORLD_W
        const py = (i * 47) % WORLD_H
        const ox = Math.sin(angle) * 12
        const oy = Math.cos(angle * 0.7) * 8
        ctx.globalAlpha = 0.12 + Math.sin(tick * 0.03 + i) * 0.08
        ctx.fillStyle = realm.color
        ctx.beginPath()
        ctx.arc(px + ox, py + oy, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }

      // Challenge markers
      challenges.forEach((ch) => {
        const cx = (ch.mapX / 100) * WORLD_W
        const cy = (ch.mapY / 100) * WORLD_H
        const done = completedRef.current.has(ch.id)
        drawChallengeIcon(ctx, cx, cy, done, realm.color, tick)

        // Label
        const label = tt(ch.title_hi, ch.title_en, ch.title_hinglish)
        ctx.font = 'bold 11px Inter, sans-serif'
        ctx.textAlign = 'center'
        const lw = ctx.measureText(label).width + 14
        ctx.fillStyle = 'rgba(0,0,0,0.65)'
        ctx.beginPath()
        ctx.roundRect(cx - lw / 2, cy + 36, lw, 18, 9)
        ctx.fill()
        ctx.fillStyle = done ? '#4ade80' : '#fff'
        ctx.fillText(label, cx, cy + 48)
        ctx.textAlign = 'left'
      })

      // ── Guide character ──────────────────────────────────
      const gx = guidePos.current.x
      const gy = guidePos.current.y
      const gBounce = Math.sin(tick * 0.06) * 3
      const ringCol = EXPR_COLORS[guideExpression]

      // Shadow
      ctx.globalAlpha = 0.2
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.ellipse(gx, gy + 24, 20, 8, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      // Guide sprite circle
      const gSize = 48
      ctx.save()
      ctx.beginPath()
      ctx.arc(gx, gy - gBounce, gSize / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      if (guideImgRef.current) {
        ctx.drawImage(guideImgRef.current, gx - gSize / 2, gy - gBounce - gSize / 2, gSize, gSize)
      }
      ctx.restore()

      // Ring
      ctx.strokeStyle = ringCol
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(gx, gy - gBounce, gSize / 2, 0, Math.PI * 2)
      ctx.stroke()

      // Name label
      const gName = tt(realm.protagonist.name, realm.protagonist.name_en, realm.protagonist.name_en)
      ctx.font = 'bold 10px Inter, sans-serif'
      ctx.textAlign = 'center'
      const gnw = ctx.measureText(gName).width + 10
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.beginPath()
      ctx.roundRect(gx - gnw / 2, gy - gBounce - gSize / 2 - 18, gnw, 15, 7)
      ctx.fill()
      ctx.fillStyle = ringCol
      ctx.fillText(gName, gx, gy - gBounce - gSize / 2 - 7)
      ctx.textAlign = 'left'

      // Speech bubble
      if (guideBubble) {
        drawSpeechBubble(ctx, gx, gy - gBounce - gSize / 2 - 22, guideBubble, 220, realm.color)
      }

      // ── Player character ─────────────────────────────────
      const px = posRef.current.x
      const py = posRef.current.y
      const pBounce = movingRef.current ? Math.sin(tick * 0.3) * 3 : 0

      // Shadow
      ctx.globalAlpha = 0.2
      ctx.fillStyle = '#000'
      ctx.beginPath()
      ctx.ellipse(px, py + 24, 18, 7, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1

      // Player sprite
      const pSize = 64
      ctx.save()
      ctx.beginPath()
      ctx.arc(px, py - pBounce, pSize / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      if (playerImgRef.current) {
        ctx.drawImage(playerImgRef.current, px - pSize / 2, py - pBounce - pSize / 2, pSize, pSize)
      }
      ctx.restore()

      ctx.strokeStyle = '#a78bfa'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(px, py - pBounce, pSize / 2, 0, Math.PI * 2)
      ctx.stroke()

      // Player name
      ctx.font = 'bold 10px Inter, sans-serif'
      ctx.textAlign = 'center'
      const pnw = ctx.measureText(playerName).width + 10
      ctx.fillStyle = 'rgba(0,0,0,0.6)'
      ctx.beginPath()
      ctx.roundRect(px - pnw / 2, py - pBounce - pSize / 2 - 18, pnw, 15, 7)
      ctx.fill()
      ctx.fillStyle = '#fde68a'
      ctx.fillText(playerName, px, py - pBounce - pSize / 2 - 7)
      ctx.textAlign = 'left'

      // Completion portal
      if (allDone) {
        const portalX = WORLD_W - 80
        const portalY = WORLD_H / 2
        const pp = Math.sin(tick * 0.05) * 8

        const pg = ctx.createRadialGradient(portalX, portalY, 0, portalX, portalY, 45 + pp)
        pg.addColorStop(0, '#a78bfa66')
        pg.addColorStop(1, 'transparent')
        ctx.fillStyle = pg
        ctx.beginPath()
        ctx.arc(portalX, portalY, 45 + pp, 0, Math.PI * 2)
        ctx.fill()

        ctx.save()
        ctx.translate(portalX, portalY)
        ctx.rotate(tick * 0.02)
        ctx.strokeStyle = '#a78bfa88'
        ctx.lineWidth = 3
        ctx.setLineDash([10, 8])
        ctx.beginPath()
        ctx.arc(0, 0, 35, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()

        ctx.font = 'bold 12px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#a78bfa'
        ctx.fillText(tt('वापसी', 'Exit', 'Wapsi'), portalX, portalY + 50)
        ctx.textAlign = 'left'

        // Check if player near exit
        const ed = Math.hypot(px - portalX, py - portalY)
        if (ed < 50) {
          goBack()
        }
      }


      animRef.current = requestAnimationFrame(gameLoop)
    }

    animRef.current = requestAnimationFrame(gameLoop)
    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', resize)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showIntro, showDialogue, guideBubble, guideExpression, allDone, language, playerName, completedChallenges])

  // ─── Dialogue handlers ───────────────────────────────────
  const advanceDialogue = () => {
    if (!activeChallenge || isGeneratingLearning) return
    if (dialoguePhase === 'intro') {
      setDialoguePhase('scenario')
      const scenarioText = tt(activeChallenge.scenario_hi, activeChallenge.scenario_en, activeChallenge.scenario_hinglish)
      setDialogueText(scenarioText)
      setGuideBubble('')
      speak(scenarioText)
    } else if (dialoguePhase === 'scenario') {
      setDialoguePhase('choices')
      setGuideExpression('thinking')
    } else if (dialoguePhase === 'feedback' || dialoguePhase === 'explanation') {
      closeDialogue()
    }
  }

  const handleChoice = async (choice: Choice) => {
    if (!activeChallenge || isGeneratingLearning) return

    setLastChoice(choice)
    const nextWrongCount = choice.isGood ? 0 : wrongCount + 1
    const loadingText = tt('सखी सोच रही है...', 'Sakhi is thinking...', 'Sakhi soch rahi hai...')
    const requestId = learningRequestRef.current + 1
    learningRequestRef.current = requestId

    setGuideExpression(choice.isGood ? 'happy' : nextWrongCount >= 2 ? 'angry' : 'sad')
    setDialoguePhase(choice.isGood ? 'feedback' : 'explanation')
    setDialogueText(loadingText)
    setGuideBubble(loadingText)
    setTypeIdx(0)
    setIsGeneratingLearning(true)

    try {
      const learningContent = await getAdaptiveLearningContent({
        realm,
        challenge: activeChallenge,
        choice,
        language,
        playerName,
      })

      if (learningRequestRef.current !== requestId) return

      applyStatDelta(choice.outcome, learningContent.answer, choice.isGood)
      setScore((s) => s + (choice.isGood ? 15 : 3))

      if (choice.isGood) {
        resetWrongCount()
      } else {
        incrementWrongCount()
      }

      const combinedText = formatLearningContent(learningContent, language)
      setDialogueText(combinedText)
      setGuideBubble(learningContent.answer)
      speak(learningContent.answer)
    } finally {
      if (learningRequestRef.current === requestId) {
        setIsGeneratingLearning(false)
      }
    }
  }

  const closeDialogue = () => {
    learningRequestRef.current += 1
    setIsGeneratingLearning(false)
    if (activeChallenge) {
      const newCompleted = new Set(completedChallenges)
      newCompleted.add(activeChallenge.id)
      setCompletedChallenges(newCompleted)
      completedRef.current = newCompleted

      // Check if all done
      if (newCompleted.size >= realm.challenges.length) {
        setAllDone(true)
        const msg = tt(realm.protagonist.completionMsg_hi, realm.protagonist.completionMsg_en, realm.protagonist.completionMsg_hinglish)
        setGuideBubble(msg)
        setGuideExpression('happy')
        speak(msg)
        completeRealm(realmNumber, score)
        setTimeout(() => setGuideBubble(''), 5000)
      } else {
        const move = tt(
          realm.protagonist.moveInstruction_hi,
          realm.protagonist.moveInstruction_en,
          realm.protagonist.moveInstruction_hinglish,
        )
        setGuideBubble(move)
        setGuideExpression('neutral')
        setTimeout(() => setGuideBubble(''), 4000)
      }
    }
    setActiveChallenge(null)
    setShowDialogue(false)
    setLastChoice(null)
    setDialoguePhase('intro')
    setMenuOpen(false)
  }

  const goBack = useCallback(() => {
    startTransition(realm.color)
    setTimeout(() => setScreen('hub'), 600)
  }, [startTransition, setScreen, realm.color])

  const handleJoystickMove = useCallback((dx: number, dy: number) => {
    joystickRef.current = { dx, dy }
  }, [])
  const handleJoystickStop = useCallback(() => {
    joystickRef.current = { dx: 0, dy: 0 }
  }, [])

  useEffect(() => {
    if (showIntro || showDialogue) return
    const canvas = canvasRef.current
    if (!canvas) return

    const onCanvasTap = (event: PointerEvent) => {
      if (event.pointerType !== 'touch' && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return
      handleEnterChallenge()
    }

    canvas.addEventListener('pointerup', onCanvasTap)
    return () => canvas.removeEventListener('pointerup', onCanvasTap)
  }, [handleEnterChallenge, showDialogue, showIntro])

  // ═══════════════════════════════════════════════════════════
  // RENDER: Intro screen
  // ═══════════════════════════════════════════════════════════
  if (showIntro) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', padding: '24px 20px', gap: 16,
        background: realm.bgGradient, animation: 'fadeIn 0.5s ease', overflow: 'auto',
      }}>
        <div style={{
          width: '100%', maxWidth: 360, display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
        }}>
          <button onClick={goBack} className="btn-glass" style={{ padding: '8px 12px', fontSize: 12 }}>
            <ArrowLeft size={14} /> {tt('वापस', 'Back', 'Wapas')}
          </button>
          {isMobileView ? renderRealmMenu() : <div style={{ width: 36 }} />}
        </div>

        {/* Realm gate visual */}
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          background: `radial-gradient(circle, ${realm.color}44, ${realm.color}08)`,
          border: `3px solid ${realm.color}66`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 40px ${realm.color}33`,
          animation: 'float 3s ease-in-out infinite',
        }}>
          {/* Diamond icon */}
          <svg width="40" height="40" viewBox="0 0 40 40">
            <polygon points="20,2 38,20 20,38 2,20" fill={realm.color} opacity={0.8} />
            <polygon points="20,8 32,20 20,32 8,20" fill="#fff" opacity={0.3} />
          </svg>
        </div>

        <div style={{ textAlign: 'center', animation: 'fadeInUp 0.5s 0.1s ease both' }}>
          <h2 style={{ color: '#fff', fontWeight: 900, fontSize: 26, margin: 0 }}>
            {tt(realm.title_hi, realm.title_en, realm.title_hinglish)}
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '6px 0 0' }}>
            {tt(realm.subtitle_hi, realm.subtitle_en, realm.subtitle_hinglish)}
          </p>
        </div>

        {/* Guide preview */}
        <div className="glass" style={{
          padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14,
          width: '100%', maxWidth: 360, borderColor: `${realm.color}44`,
          animation: 'fadeInUp 0.5s 0.2s ease both',
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', overflow: 'hidden',
            border: `3px solid ${realm.color}88`,
            flexShrink: 0,
          }}>
            <img src={realm.protagonist.image} alt={realm.protagonist.name_en}
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
          </div>
          <div>
            <div style={{ color: realm.color, fontWeight: 900, fontSize: 16 }}>
              {tt(realm.protagonist.name, realm.protagonist.name_en, realm.protagonist.name_en)}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
              {tt(realm.protagonist.role_hi, realm.protagonist.role_en, realm.protagonist.role_hinglish)}
            </div>
          </div>
        </div>

        <div className="glass" style={{
          padding: '14px 18px', maxWidth: 360, width: '100%',
          animation: 'fadeInUp 0.5s 0.3s ease both',
        }}>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, lineHeight: 1.65, margin: 0 }}>
            {tt(realm.intro_hi, realm.intro_en, realm.intro_hinglish)}
          </p>
        </div>

        <div style={{
          display: 'flex', gap: 10, width: '100%', maxWidth: 360,
          animation: 'fadeInUp 0.5s 0.4s ease both',
        }}>
          <button onClick={goBack} className="btn-glass" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ArrowLeft size={16} /> {tt('वापस', 'Back', 'Wapas')}
          </button>
          <button onClick={() => setShowIntro(false)} className="btn-primary"
            style={{ flex: 2, background: realm.color, boxShadow: `0 6px 24px ${realm.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {tt('दुनिया में जाओ', 'Enter World', 'Duniya mein jaao')} <ChevronRight size={18} />
          </button>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: Main walkable world
  // ═══════════════════════════════════════════════════════════
  const challengeCount = realm.challenges.length
  const doneCount = completedChallenges.size

  return (
    <div ref={containerRef} style={{
      position: 'relative', width: '100%', height: '100%',
      overflow: 'hidden', background: '#050a0e',
      touchAction: 'none',
    }}>
      {/* Canvas */}
      <canvas ref={canvasRef} style={{
        display: 'block', position: 'absolute',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      }} />

      {/* ── Top HUD ──────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', gap: 8, alignItems: 'center', zIndex: 10, pointerEvents: 'none',
        padding: '10px 14px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 100%)',
      }}>
        <button onClick={goBack} style={{
          pointerEvents: 'all', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
          color: '#fff', padding: '6px 8px', cursor: 'pointer',
          display: 'flex', alignItems: 'center',
        }}>
          <ArrowLeft size={18} />
        </button>

        {isMobileView ? (
          <div className="glass-strong" style={{
            padding: '6px 8px', display: 'flex', gap: 8, alignItems: 'center', pointerEvents: 'all',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 6px', borderRadius: 999,
              background: 'rgba(239,68,68,0.12)', color: '#ef4444',
              fontSize: 11, fontWeight: 800,
            }}>
              <Heart size={13} fill="#ef4444" />
              <span>{stats.health}</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 6px', borderRadius: 999,
              background: 'rgba(167,139,250,0.14)', color: '#a78bfa',
              fontSize: 11, fontWeight: 800,
            }}>
              <Brain size={13} />
              <span>{stats.wisdom}</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 6px', borderRadius: 999,
              background: `${realm.color}22`, color: realm.color,
              fontSize: 11, fontWeight: 800,
            }}>
              <span>{doneCount}/{challengeCount}</span>
            </div>
          </div>
        ) : (
          <div className="glass-strong" style={{
            padding: '8px 14px', display: 'flex', gap: 12, alignItems: 'center', pointerEvents: 'all',
          }}>
            <div className="stat-bar-container">
              <div className="stat-bar-icon" style={{ color: '#ef4444' }}>
                <Heart size={16} fill="#ef4444" />
              </div>
              <div className="stat-bar-track" style={{ background: '#3b0a0a', minWidth: 60 }}>
                <div className="stat-bar-fill" style={{
                  width: `${stats.health}%`,
                  background: stats.health > 30 ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, #991b1b, #ef4444)',
                  boxShadow: stats.health <= 30 ? '0 0 8px rgba(239,68,68,0.5)' : 'none',
                }} />
              </div>
              <span className="stat-bar-label" style={{ color: '#ef4444' }}>{stats.health}</span>
            </div>
            <div className="stat-bar-container">
              <div className="stat-bar-icon" style={{ color: '#a78bfa' }}>
                <Brain size={16} />
              </div>
              <div className="stat-bar-track" style={{ background: '#1e0a3e', minWidth: 60 }}>
                <div className="stat-bar-fill" style={{
                  width: `${stats.wisdom}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                }} />
              </div>
              <span className="stat-bar-label" style={{ color: '#a78bfa' }}>{stats.wisdom}</span>
            </div>
            <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: 11, color: realm.color, fontWeight: 800 }}>
              {doneCount}/{challengeCount}
            </span>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {isMobileView ? renderRealmMenu() : (
        <div style={{ display: 'flex', gap: 6, pointerEvents: 'all' }}>
          <button onClick={toggleVoiceMode} style={{
            background: voiceMode ? 'rgba(167,139,250,0.3)' : 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(12px)',
            border: voiceMode ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10, color: '#fff', padding: '6px 8px',
            cursor: 'pointer', display: 'flex', alignItems: 'center',
          }}>
            {voiceMode ? <Volume2 size={14} /> : <VolumeX size={14} />}
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

      {/* ── Near challenge action button ─────────────────────── */}
      {nearChallenge && !completedChallenges.has(nearChallenge.id) && !showDialogue && (
        <div style={{
          position: 'absolute', bottom: isTouchInput ? 170 : 160, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
        }}>
          <button onClick={handleEnterChallenge} className="btn-primary" style={{
            background: realm.color, fontSize: 13, padding: '12px 22px',
            boxShadow: `0 6px 28px ${realm.color}88`,
            animation: isTouchInput ? 'none' : 'bounceBtn 0.8s ease-in-out infinite alternate',
          }}>
            {tt(
              `${nearChallenge.title_hi} → चुनौती`,
              `${nearChallenge.title_en} → Challenge`,
              `${nearChallenge.title_hinglish} → Challenge`,
            )}
          </button>
        </div>
      )}

      {/* ── Mobile joystick ──────────────────────────────────── */}
      {!showDialogue && isTouchInput && (
        <VirtualJoystick
          onMove={handleJoystickMove}
          onStop={handleJoystickStop}
          size={isMobileView ? 126 : 132}
          bottom={20}
          left={18}
          zIndex={120}
        />
      )}

      {/* ── WASD hint ────────────────────────────────────────── */}
      {!showDialogue && (
        <div style={{
          position: 'absolute', bottom: 14, right: 14, zIndex: 10, pointerEvents: 'none',
        }}>
          <div className="glass-strong" style={{
            padding: '5px 10px', fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600,
          }}>
            {isTouchInput
              ? tt('Joystick drag करो • छोड़ो तो रुक जाओ', 'Drag joystick • Release to stop', 'Joystick drag karo • Chhodo to ruk jao')
              : `WASD ${tt('चलो', 'Move', 'Chalo')} • E ${tt('खोलो', 'Enter', 'Kholo')}`}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          DIALOGUE BOX (Minecraft-style bottom panel)
          ═══════════════════════════════════════════════════════ */}
      {showDialogue && activeChallenge && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          zIndex: 100, padding: '0 10px 10px',
          animation: 'slideUp 0.3s ease',
        }}>
          <div style={{
            background: 'rgba(8,8,20,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: `1px solid ${realm.color}33`,
            borderTop: `3px solid ${realm.color}`,
            borderRadius: '16px 16px 12px 12px',
            padding: '14px 16px',
            maxHeight: '50vh', overflowY: 'auto',
          }}>
            {/* Narrator badge + guide portrait */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
                border: `2px solid ${EXPR_COLORS[guideExpression]}`,
                flexShrink: 0,
              }}>
                <img src={realm.protagonist.image} alt="" style={{
                  width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top',
                }} />
              </div>
              <div>
                <span style={{
                  background: realm.color, borderRadius: '6px 6px 6px 0',
                  padding: '2px 10px', fontSize: 11, fontWeight: 800, color: '#fff',
                }}>
                  {tt(
                    activeChallenge.narrator_hi ?? realm.protagonist.name,
                    activeChallenge.narrator_en ?? realm.protagonist.name_en,
                    activeChallenge.narrator_hinglish ?? realm.protagonist.name_en,
                  )}
                </span>
                <div style={{
                  fontSize: 9, color: EXPR_COLORS[guideExpression], fontWeight: 700, marginTop: 2,
                }}>
                  {guideExpression === 'happy' ? tt('खुश', 'Happy', 'Khush') :
                   guideExpression === 'sad' ? tt('उदास', 'Sad', 'Udaas') :
                   guideExpression === 'angry' ? tt('नाराज़', 'Upset', 'Naraaz') :
                   guideExpression === 'thinking' ? tt('सोच रही हूं...', 'Thinking...', 'Soch rahi hun...') :
                   tt('शांत', 'Calm', 'Shaant')}
                </div>
              </div>
            </div>

            {/* Dialogue text */}
            {(dialoguePhase === 'intro' || dialoguePhase === 'scenario' || dialoguePhase === 'feedback' || dialoguePhase === 'explanation') && (
              <div onClick={dialoguePhase === 'intro' || dialoguePhase === 'scenario' ? advanceDialogue : undefined} style={{
                cursor: dialoguePhase === 'intro' || dialoguePhase === 'scenario' ? 'pointer' : 'default',
                marginBottom: dialoguePhase === 'feedback' || dialoguePhase === 'explanation' ? 8 : 0,
              }}>
                <p style={{
                  color: dialoguePhase === 'explanation' ? '#fbbf24' : 'rgba(255,255,255,0.88)',
                  fontSize: 13, lineHeight: 1.65, margin: 0, whiteSpace: 'pre-line',
                }}>
                  {dialoguePhase === 'explanation' && (
                    <span style={{ color: '#f87171', fontWeight: 800, marginRight: 6 }}>
                      {tt('समझो:', 'Learn:', 'Samjho:')}
                    </span>
                  )}
                  {dialogueText.slice(0, typeIdx)}
                  {typeIdx < dialogueText.length && (
                    <span style={{ color: realm.color, animation: 'typewriterCursor 0.8s step-end infinite' }}>▋</span>
                  )}
                </p>
                {typeIdx >= dialogueText.length && (dialoguePhase === 'intro' || dialoguePhase === 'scenario') && (
                  <div style={{
                    textAlign: 'right', marginTop: 6,
                    color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 600,
                  }}>
                    {tt('आगे बढ़ें ▶', 'Continue ▶', 'Aage badho ▶')}
                  </div>
                )}
              </div>
            )}

            {/* Choices */}
            {dialoguePhase === 'choices' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <p style={{
                  color: 'rgba(255,255,255,0.35)', fontSize: 11,
                  textAlign: 'center', fontWeight: 700, margin: 0,
                }}>
                  {tt('सोच-समझकर चुनो...', 'Choose wisely...', 'Soch-samajhkar chuno...')}
                </p>
                {activeChallenge.choices.map((choice, idx) => (
                  <button key={choice.id} onClick={() => handleChoice(choice)}
                    style={{
                      padding: '12px 16px', textAlign: 'left', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: 'rgba(255,255,255,0.04)',
                      border: `1px solid ${realm.color}22`,
                      borderRadius: 12, fontFamily: 'var(--font-primary)',
                      transition: 'all 0.2s ease',
                      animation: `fadeInUp 0.3s ${idx * 0.08}s ease both`,
                      color: '#fff', fontWeight: 600, fontSize: 13, lineHeight: 1.4,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = realm.color
                      ;(e.currentTarget as HTMLElement).style.background = `${realm.color}18`
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = `${realm.color}22`
                      ;(e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
                    }}
                  >
                    {/* Choice icon diamond */}
                    <svg width="20" height="20" viewBox="0 0 20 20" style={{ flexShrink: 0 }}>
                      <polygon points="10,1 19,10 10,19 1,10" fill={realm.color} opacity={0.6} />
                      <polygon points="10,5 15,10 10,15 5,10" fill="#fff" opacity={0.3} />
                    </svg>
                    <span>{tt(choice.text_hi, choice.text_en, choice.text_hinglish)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Close button for feedback/explanation */}
            {(dialoguePhase === 'feedback' || dialoguePhase === 'explanation') && !isGeneratingLearning && typeIdx >= dialogueText.length && (
              <button onClick={closeDialogue} className="btn-primary" style={{
                background: lastChoice?.isGood ? '#10b981' : realm.color,
                width: '100%', marginTop: 10, fontSize: 13,
              }}>
                {tt('आगे बढ़ो', 'Continue', 'Aage badho')} →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
