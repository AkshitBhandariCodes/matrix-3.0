import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore, t3 } from '../store/gameStore'
import { characterImages } from '../data/realms'
import { speak } from '../utils/speech'
import { VirtualJoystick } from '../components/VirtualJoystick'
import realm5Bg from '../assets/environment/realm5_bg.png'
import {
  ArrowLeft,
  Award,
  BellRing,
  CalendarDays,
  ClipboardCheck,
  HandCoins,
  IndianRupee,
  Landmark,
  Menu,
  ReceiptText,
  UserCircle,
  Users,
  Volume2,
  VolumeX,
  Wallet,
  X,
} from 'lucide-react'

type NpcId = 'leader' | 'treasurer' | 'entrepreneur' | 'sarpanch'

interface ShgNpc {
  id: NpcId
  xPct: number
  yPct: number
  color: string
  image: string
  name_hi: string
  name_en: string
  name_hinglish: string
  role_hi: string
  role_en: string
  role_hinglish: string
  intro_hi: string
  intro_en: string
  intro_hinglish: string
}

const npcs: ShgNpc[] = [
  {
    id: 'leader',
    xPct: 18,
    yPct: 26,
    color: '#22c55e',
    image: characterImages.rekha,
    name_hi: 'रेखा दीदी',
    name_en: 'Rekha Didi',
    name_hinglish: 'Rekha Didi',
    role_hi: 'SHG अध्यक्ष',
    role_en: 'SHG Leader',
    role_hinglish: 'SHG Leader',
    intro_hi: 'आज की बैठक में बचत, उपस्थिति और समूह निर्णय दर्ज करने हैं।',
    intro_en: "In today's meeting we need to update savings, attendance, and group decisions.",
    intro_hinglish: 'Aaj ki meeting mein savings, attendance, aur group decisions update karne hain.',
  },
  {
    id: 'treasurer',
    xPct: 70,
    yPct: 28,
    color: '#f59e0b',
    image: characterImages.saas,
    name_hi: 'कमला जी',
    name_en: 'Kamla Ji',
    name_hinglish: 'Kamla Ji',
    role_hi: 'कोषाध्यक्ष',
    role_en: 'Treasurer',
    role_hinglish: 'Treasurer',
    intro_hi: 'समूह निधि से ऋण मिल सकता है। समय पर किस्त देना जरूरी है।',
    intro_en: 'You can request an SHG loan here. Timely repayment is mandatory.',
    intro_hinglish: 'Yahan group fund se loan mil sakta hai. Time par repayment zaroori hai.',
  },
  {
    id: 'entrepreneur',
    xPct: 26,
    yPct: 72,
    color: '#3b82f6',
    image: characterImages.mother,
    name_hi: 'पूजा बहन',
    name_en: 'Pooja Behen',
    name_hinglish: 'Pooja Behen',
    role_hi: 'उद्यम सखी',
    role_en: 'Enterprise Partner',
    role_hinglish: 'Enterprise Partner',
    intro_hi: 'छोटे-छोटे SHG tasks से आय बढ़ती है और लोन चुकाना आसान होता है।',
    intro_en: 'Small SHG production tasks increase income and strengthen repayment capacity.',
    intro_hinglish: 'Chhote SHG tasks se income badhti hai aur repayment easy hota hai.',
  },
  {
    id: 'sarpanch',
    xPct: 76,
    yPct: 70,
    color: '#a855f7',
    image: characterImages.sarpanch,
    name_hi: 'सरपंच दीदी',
    name_en: 'Sarpanch Didi',
    name_hinglish: 'Sarpanch Didi',
    role_hi: 'योजना मार्गदर्शक',
    role_en: 'Scheme Mentor',
    role_hinglish: 'Scheme Mentor',
    intro_hi: 'सरकारी योजनाएं SHG को टिकाऊ बनाती हैं। सही योजना से ब्याज कम और सुरक्षा ज्यादा।',
    intro_en: 'Government schemes make SHGs sustainable with lower risk and better protection.',
    intro_hinglish: 'Sarkari schemes SHG ko sustainable banati hain. Sahi yojana se risk kam hota hai.',
  },
]

const schemeLinks = [
  { label: 'Aajeevika / DAY-NRLM', url: 'https://aajeevika.gov.in/' },
  { label: 'Lakhpati Didi', url: 'https://lakhpatididi.gov.in/' },
  { label: 'NABARD SHG-BLP Highlights', url: 'https://www.nabard.org/auth/writereaddata/File/highlights-of-the-shg-bank-linkage-programme-2022-23.pdf' },
  { label: 'PM MUDRA', url: 'https://www.mudra.org.in/' },
  { label: 'PM Jan Dhan', url: 'https://pmjdy.gov.in/' },
  { label: 'PMAY-Gramin', url: 'https://pmayg.dord.gov.in/' },
  { label: 'PM Ujjwala', url: 'https://www.pmuy.gov.in/' },
  { label: 'Ayushman Bharat (PM-JAY)', url: 'https://beneficiary.nha.gov.in/' },
]

export const SakhiSathi: React.FC = () => {
  const { language, setScreen, voiceMode, toggleVoiceMode } = useGameStore()
  const tt = useCallback((hi: string, en: string, hg: string) => t3(hi, en, hg, language), [language])

  const [day, setDay] = useState(1)
  const [wallet, setWallet] = useState(3200)
  const [groupFund, setGroupFund] = useState(16000)
  const [trustScore, setTrustScore] = useState(30)
  const [loanOutstanding, setLoanOutstanding] = useState(0)
  const [loanDueDay, setLoanDueDay] = useState<number | null>(null)
  const [leaderTaskDay, setLeaderTaskDay] = useState(0)
  const [businessTaskDay, setBusinessTaskDay] = useState(0)

  const [activeNpcId, setActiveNpcId] = useState<NpcId | null>(null)
  const [activityLog, setActivityLog] = useState<string[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [isMobileView, setIsMobileView] = useState(false)

  const [playerPos, setPlayerPos] = useState({ x: 48, y: 56 })
  const playerRef = useRef(playerPos)
  const keysRef = useRef<Set<string>>(new Set())
  const joystickRef = useRef({ dx: 0, dy: 0 })
  const targetRef = useRef<{ x: number; y: number } | null>(null)
  const worldRef = useRef<HTMLDivElement>(null)

  const activeNpc = useMemo(() => npcs.find((npc) => npc.id === activeNpcId) ?? null, [activeNpcId])

  const nearNpcId = useMemo(() => {
    let closest: NpcId | null = null
    let closestDist = Number.POSITIVE_INFINITY
    for (const npc of npcs) {
      const dist = Math.hypot(playerPos.x - npc.xPct, playerPos.y - npc.yPct)
      if (dist < closestDist) {
        closestDist = dist
        closest = npc.id
      }
    }
    return closestDist < 10 ? closest : null
  }, [playerPos])

  const nearNpc = useMemo(() => npcs.find((npc) => npc.id === nearNpcId) ?? null, [nearNpcId])

  const pushLog = useCallback((line: string) => {
    setActivityLog((prev) => [line, ...prev].slice(0, 6))
  }, [])

  const narrate = useCallback((hi: string, en: string, hg: string) => {
    const line = tt(hi, en, hg)
    pushLog(line)
    if (voiceMode) {
      speak(line, language)
    }
  }, [language, pushLog, tt, voiceMode])

  const requestLoan = useCallback((amount: number) => {
    const normalizedAmount = amount >= 15000 ? 15000 : amount >= 10000 ? 10000 : 5000
    if (loanOutstanding > 0) {
      pushLog(tt('पहले पुराना लोन चुकाएं, फिर नया लें।', 'Repay current loan before requesting a new one.', 'Pehle current loan close karo, phir naya loan lo.'))
      return
    }
    if (groupFund < normalizedAmount) {
      pushLog(tt('समूह निधि अभी कम है। छोटा लोन चुनें।', 'Group fund is low right now. Choose a smaller loan.', 'Group fund abhi kam hai. Chhota loan choose karo.'))
      return
    }
    setGroupFund((f) => f - normalizedAmount)
    setWallet((w) => w + normalizedAmount)
    setLoanOutstanding(normalizedAmount)
    setLoanDueDay(day + 5)
    narrate(
      `₹${normalizedAmount} का SHG loan स्वीकृत। दिन ${day + 5} तक repayment पूरा करें।`,
      `₹${normalizedAmount} SHG loan approved. Complete repayment by day ${day + 5}.`,
      `₹${normalizedAmount} SHG loan approve hua. Day ${day + 5} tak repayment complete karo.`,
    )
  }, [day, groupFund, loanOutstanding, narrate, pushLog, tt])

  const repayLoan = useCallback((amount: number | 'full') => {
    if (!loanOutstanding) {
      pushLog(tt('अभी कोई active loan नहीं है।', 'No active loan to repay right now.', 'Abhi koi active loan nahi hai.'))
      return
    }
    if (wallet <= 0) {
      pushLog(tt('Wallet में balance नहीं है।', 'Wallet is empty.', 'Wallet mein balance nahi hai.'))
      return
    }

    const requested = amount === 'full' ? loanOutstanding : amount
    const payable = Math.min(requested, wallet, loanOutstanding)
    const remaining = loanOutstanding - payable

    setWallet((w) => w - payable)
    setGroupFund((f) => f + payable)
    setLoanOutstanding(remaining)

    if (remaining <= 0) {
      setLoanDueDay(null)
      setTrustScore((s) => Math.min(100, s + 8))
      narrate(
        `शाबाश। पूरा लोन चुक गया। ₹${payable} अंतिम किस्त दर्ज हुई।`,
        `Excellent. Loan fully repaid. Final installment of ₹${payable} recorded.`,
        `Shabaash. Loan poora repay ho gaya. ₹${payable} final installment record hui.`,
      )
      return
    }

    narrate(
      `₹${payable} जमा हुए। अभी ₹${remaining} बाकी है।`,
      `₹${payable} paid. ₹${remaining} is still pending.`,
      `₹${payable} pay hua. Abhi ₹${remaining} pending hai.`,
    )
  }, [loanOutstanding, narrate, pushLog, tt, wallet])

  const advanceDay = useCallback(() => {
    const nextDay = day + 1
    setDay(nextDay)

    if (loanOutstanding > 0 && loanDueDay && nextDay > loanDueDay) {
      const penalty = Math.max(50, Math.round(loanOutstanding * 0.02))
      setLoanOutstanding((v) => v + penalty)
      setTrustScore((s) => Math.max(0, s - 4))
      narrate(
        `किस्त लेट होने पर ₹${penalty} penalty जुड़ी। जल्दी repayment करें।`,
        `Late repayment penalty of ₹${penalty} added. Please repay soon.`,
        `Late repayment par ₹${penalty} penalty add hui. Jaldi payment karo.`,
      )
      return
    }

    pushLog(tt(`दिन ${nextDay} शुरू हुआ।`, `Day ${nextDay} started.`, `Day ${nextDay} start hua.`))
  }, [day, loanDueDay, loanOutstanding, narrate, pushLog, tt])

  const doLeaderTask = useCallback(() => {
    if (leaderTaskDay === day) {
      pushLog(tt('आज की बैठक entry पहले ही हो चुकी है।', "Today's meeting entry is already complete.", 'Aaj ki meeting entry pehle hi ho chuki hai.'))
      return
    }
    if (wallet < 200) {
      pushLog(tt('₹200 monthly saving के लिए wallet कम है।', 'You need at least ₹200 for monthly SHG savings.', '₹200 monthly saving ke liye wallet kam hai.'))
      return
    }
    setWallet((w) => w - 200)
    setGroupFund((f) => f + 200)
    setTrustScore((s) => Math.min(100, s + 5))
    setLeaderTaskDay(day)
    narrate(
      'बहुत बढ़िया। बचत जमा हुई, रजिस्टर अपडेट हुआ, और समूह का भरोसा बढ़ा।',
      'Great. Savings deposited, register updated, and group trust increased.',
      'Bahut badhiya. Savings deposit hui, register update hua, aur trust score badha.',
    )
  }, [day, leaderTaskDay, narrate, pushLog, tt, wallet])

  const doBusinessTask = useCallback(() => {
    if (businessTaskDay === day) {
      pushLog(tt('आज का उद्यम task पूरा हो चुका है।', "Today's enterprise task is already complete.", 'Aaj ka enterprise task pehle hi complete hai.'))
      return
    }
    setWallet((w) => w + 750)
    setTrustScore((s) => Math.min(100, s + 4))
    setBusinessTaskDay(day)
    narrate(
      'आज का SHG business task पूरा हुआ। आय बढ़ी और repayment क्षमता मजबूत हुई।',
      "You completed today's SHG business task. Income and repayment capacity improved.",
      'Aaj ka SHG business task complete hua. Income aur repayment capacity strong hui.',
    )
  }, [businessTaskDay, day, narrate, pushLog, tt])

  const paymentAlert = useMemo(() => {
    if (!loanOutstanding || !loanDueDay) return null
    if (day > loanDueDay) {
      return tt(
        `किस्त लेट है। दिन ${loanDueDay} तक भुगतान होना था।`,
        `Repayment overdue. Installment was due on day ${loanDueDay}.`,
        `Installment late ho gaya. Day ${loanDueDay} tak payment due tha.`,
      )
    }
    if (day === loanDueDay) {
      return tt(
        'आज SHG किस्त जमा करने की अंतिम तारीख है।',
        'Today is the last day to repay your SHG installment.',
        'Aaj SHG installment jama karne ki last date hai.',
      )
    }
    if (day === loanDueDay - 1) {
      return tt(
        'कल SHG किस्त जमा करनी है। फंड तैयार रखें।',
        'Your SHG repayment is due tomorrow. Keep funds ready.',
        'Kal SHG repayment due hai. Fund ready rakho.',
      )
    }
    return null
  }, [day, loanDueDay, loanOutstanding, tt])

  const schemeScript = useMemo(() => {
    if (language === 'hi') {
      return [
        'SHG-Bank Linkage में नियमित बचत, बैठक रजिस्टर और समय पर पुनर्भुगतान से बैंक लोन बढ़ता है।',
        'DAY-NRLM के तहत SHG को प्रशिक्षण, बहीखाता, बाजार और उद्यम सहायता मिलती है।',
        'PM MUDRA छोटे व्यवसाय के लिए collateral-free loan देता है।',
        'PM Jan Dhan खाते से DBT और बैंकिंग पहुंच आसान होती है।',
        'PMAY-Gramin, PM Ujjwala और Ayushman Bharat को SHG योजना से जोड़ें।',
        'हर loan से पहले 3 checks करें: आय बढ़ोतरी, किस्त समय-सारिणी और emergency buffer.',
        'साप्ताहिक cashflow tracking रखें ताकि repayment बिना तनाव के समय पर हो सके।',
        'समूह भरोसा बढ़ने पर अगला loan आसान होता है और ब्याज जोखिम कम रहता है।',
      ]
    }
    if (language === 'en') {
      return [
        'Under SHG-Bank Linkage, larger credit becomes possible when savings and repayment discipline stay strong.',
        'DAY-NRLM links SHGs to federations for training, bookkeeping, and market access.',
        'PM MUDRA supports small enterprises with collateral-free loans.',
        'PM Jan Dhan strengthens financial identity and access to DBT rails.',
        'Combine PMAY-Gramin, PM Ujjwala, and Ayushman Bharat for household resilience.',
        'Before any loan, run 3 checks: income lift, installment feasibility, and emergency buffer.',
        'Track weekly cashflow so repayment remains consistent without distress borrowing.',
        'Trust and repayment history directly improve future SHG credit access.',
      ]
    }
    return [
      'SHG-Bank Linkage mein regular savings aur repayment se bank ka confidence badhta hai.',
      'DAY-NRLM se SHG ko training aur market linkage support milta hai.',
      'PM MUDRA se collateral-free business loan mil sakta hai.',
      'PM Jan Dhan account se financial identity strong hoti hai.',
      'PMAY-Gramin, PM Ujjwala, aur Ayushman Bharat ko SHG plan ke saath combine karo.',
      'Har loan se pehle 3 checks karo: income lift, installment feasibility, aur emergency buffer.',
      'Weekly cashflow track karo taaki repayment smooth rahe aur tension kam ho.',
      'Strong trust score future loan approvals ko fast aur safe banata hai.',
    ]
  }, [language])

  const playSchemeScript = useCallback(() => {
    const message = `${tt('सरकारी योजना गाइड शुरू हो रही है।', 'Starting government scheme guide.', 'Government scheme guide shuru ho rahi hai.')} ${schemeScript.join(' ')}`
    pushLog(tt('योजना गाइड प्ले हुई।', 'Scheme guide played.', 'Scheme guide play hua.'))
    if (voiceMode) speak(message, language)
  }, [language, pushLog, schemeScript, tt, voiceMode])

  const openNpc = useCallback((npc: ShgNpc) => {
    setActiveNpcId(npc.id)
    narrate(npc.intro_hi, npc.intro_en, npc.intro_hinglish)
  }, [narrate])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)')
    const update = () => setIsMobileView(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    playerRef.current = playerPos
  }, [playerPos])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      keysRef.current.add(event.key.toLowerCase())
    }
    const onKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase())
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    let raf = 0
    const speed = 0.7
    const loop = () => {
      const current = playerRef.current
      let nextX = current.x
      let nextY = current.y
      const keys = keysRef.current

      let dx = joystickRef.current.dx
      let dy = joystickRef.current.dy

      if (keys.has('w') || keys.has('arrowup')) dy -= 1
      if (keys.has('s') || keys.has('arrowdown')) dy += 1
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1
      if (keys.has('d') || keys.has('arrowright')) dx += 1

      const mag = Math.hypot(dx, dy)

      if (mag > 0) {
        const ndx = dx / mag
        const ndy = dy / mag
        nextX += ndx * speed
        nextY += ndy * speed
        targetRef.current = null
      } else if (targetRef.current) {
        const dx = targetRef.current.x - nextX
        const dy = targetRef.current.y - nextY
        const dist = Math.hypot(dx, dy)
        if (dist <= speed) {
          nextX = targetRef.current.x
          nextY = targetRef.current.y
          targetRef.current = null
        } else if (dist > 0) {
          nextX += (dx / dist) * speed
          nextY += (dy / dist) * speed
        }
      }

      nextX = Math.max(6, Math.min(94, nextX))
      nextY = Math.max(10, Math.min(92, nextY))

      if (Math.abs(nextX - current.x) > 0.01 || Math.abs(nextY - current.y) > 0.01) {
        playerRef.current = { x: nextX, y: nextY }
        setPlayerPos({ x: nextX, y: nextY })
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (!paymentAlert || !voiceMode) return
    const timer = window.setTimeout(() => speak(paymentAlert, language), 500)
    return () => window.clearTimeout(timer)
  }, [language, paymentAlert, voiceMode])

  const handleWorldPointer = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const targetEl = event.target as HTMLElement | null
    if (targetEl?.closest('[data-virtual-joystick="true"]')) return

    const rect = worldRef.current?.getBoundingClientRect()
    if (!rect) return

    const xPct = ((event.clientX - rect.left) / rect.width) * 100
    const yPct = ((event.clientY - rect.top) / rect.height) * 100

    const clickedNpc = npcs.find((npc) => Math.hypot(xPct - npc.xPct, yPct - npc.yPct) < 8.3)
    if (clickedNpc) {
      openNpc(clickedNpc)
      return
    }

    targetRef.current = {
      x: Math.max(6, Math.min(94, xPct)),
      y: Math.max(10, Math.min(92, yPct)),
    }
  }, [openNpc])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'radial-gradient(ellipse at top, #0b3b31 0%, #050c14 72%)',
      padding: isMobileView ? '12px 10px 10px' : '14px 12px 10px',
      gap: 10,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={() => setScreen('hub')} className="btn-glass" style={{ padding: '8px 12px', fontSize: 12 }}>
          <ArrowLeft size={14} /> {tt('वापस', 'Back', 'Wapas')}
        </button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: '#10b981',
            fontWeight: 900,
            fontSize: 16,
          }}>
            <Users size={18} /> {tt('SHG 3D दुनिया', 'SHG 3D World', 'SHG 3D World')}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600 }}>
            {tt('महिला पात्र, लोन, किस्त और सरकारी योजनाएं', 'Women NPCs, loans, repayment, and schemes', 'Women NPCs, loan, repayment aur schemes')}
          </div>
        </div>

        {isMobileView ? (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}>
            <button onClick={advanceDay} className="btn-glass" style={{ padding: '8px 10px', fontSize: 11 }}>
              <CalendarDays size={14} /> +1
            </button>
            <button onClick={() => setMenuOpen((v) => !v)} className="btn-glass" style={{ padding: '8px 10px' }}>
              {menuOpen ? <X size={14} /> : <Menu size={14} />}
            </button>
            {menuOpen && (
              <div className="glass-strong" style={{
                position: 'absolute',
                top: 42,
                right: 0,
                minWidth: 180,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                zIndex: 60,
              }}>
                <button onClick={() => { setScreen('profile'); setMenuOpen(false) }} className="btn-glass" style={{ justifyContent: 'flex-start', padding: '8px 10px', fontSize: 12 }}>
                  <UserCircle size={14} /> {tt('प्रोफाइल', 'Profile', 'Profile')}
                </button>
                <button onClick={() => { setScreen('certificate'); setMenuOpen(false) }} className="btn-glass" style={{ justifyContent: 'flex-start', padding: '8px 10px', fontSize: 12 }}>
                  <Award size={14} /> Certificate
                </button>
                <button onClick={() => { toggleVoiceMode(); setMenuOpen(false) }} className="btn-glass" style={{ justifyContent: 'flex-start', padding: '8px 10px', fontSize: 12 }}>
                  {voiceMode ? <Volume2 size={14} /> : <VolumeX size={14} />} Voice
                </button>
              </div>
            )}
          </div>
        ) : (
          <button onClick={advanceDay} className="btn-glass" style={{ padding: '8px 12px', fontSize: 12 }}>
            <CalendarDays size={14} /> +1 {tt('दिन', 'Day', 'Day')}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <div className="glass" style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarDays size={13} color="#60a5fa" />
          <span style={{ fontSize: 12, color: '#60a5fa', fontWeight: 800 }}>{tt('दिन', 'Day', 'Day')} {day}</span>
        </div>

        <div className="glass" style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Wallet size={13} color="#fde68a" />
          <span style={{ fontSize: 12, color: '#fde68a', fontWeight: 800 }}>₹{wallet}</span>
        </div>

        <div className="glass" style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={13} color="#10b981" />
          <span style={{ fontSize: 12, color: '#10b981', fontWeight: 800 }}>{tt('समूह निधि', 'Group Fund', 'Group Fund')} ₹{groupFund}</span>
        </div>

        <div className="glass" style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <HandCoins size={13} color={loanOutstanding > 0 ? '#fb7185' : '#9ca3af'} />
          <span style={{ fontSize: 12, color: loanOutstanding > 0 ? '#fb7185' : '#9ca3af', fontWeight: 800 }}>
            {tt('लोन', 'Loan', 'Loan')} ₹{loanOutstanding}
          </span>
        </div>

        <div className="glass" style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ClipboardCheck size={13} color="#a78bfa" />
          <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 800 }}>
            {tt('भरोसा', 'Trust', 'Trust')} {trustScore}
          </span>
        </div>
      </div>

      {paymentAlert && (
        <div style={{
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.45)',
          borderRadius: 12,
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          color: '#fca5a5',
          fontSize: 12,
          fontWeight: 700,
        }}>
          <BellRing size={14} />
          {paymentAlert}
        </div>
      )}

      <div
        ref={worldRef}
        onPointerDown={handleWorldPointer}
        style={{
          position: 'relative',
          flex: 1,
          borderRadius: 18,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'radial-gradient(circle at 25% 20%, rgba(34,197,94,0.22), transparent 42%), radial-gradient(circle at 85% 80%, rgba(59,130,246,0.2), transparent 42%), linear-gradient(155deg, #092e27 0%, #05121a 68%)',
          touchAction: 'none',
          perspective: '860px',
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${realm5Bg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.28,
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(160deg, rgba(5,22,28,0.45), rgba(3,9,17,0.7))',
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          transform: 'rotateX(46deg) translateY(36%) scale(1.2)',
          transformOrigin: 'center bottom',
          opacity: 0.45,
          pointerEvents: 'none',
        }} />

        {npcs.map((npc) => {
          const isNear = nearNpcId === npc.id
          const isActive = activeNpcId === npc.id
          return (
            <button
              key={npc.id}
              onClick={(e) => {
                e.stopPropagation()
                openNpc(npc)
              }}
              style={{
                position: 'absolute',
                left: `${npc.xPct}%`,
                top: `${npc.yPct}%`,
                transform: 'translate(-50%, -50%) translateZ(0) rotateX(4deg)',
                width: 70,
                height: 70,
                borderRadius: '50%',
                border: `2px solid ${isNear || isActive ? '#fff' : `${npc.color}AA`}`,
                background: `radial-gradient(circle at 35% 30%, ${npc.color}88, ${npc.color}32)`,
                boxShadow: isNear || isActive
                  ? `0 0 24px ${npc.color}CC, 0 16px 18px rgba(0,0,0,0.35)`
                  : `0 0 14px ${npc.color}88, 0 12px 14px rgba(0,0,0,0.3)`,
                padding: 0,
                cursor: 'pointer',
                overflow: 'hidden',
                zIndex: 10,
              }}
              title={tt(npc.name_hi, npc.name_en, npc.name_hinglish)}
            >
              <img src={npc.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              <span style={{
                position: 'absolute',
                left: '50%',
                top: '100%',
                transform: 'translate(-50%, 6px)',
                whiteSpace: 'nowrap',
                color: '#fff',
                fontSize: 10,
                fontWeight: 800,
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              }}>
                {tt(npc.name_hi, npc.name_en, npc.name_hinglish)}
              </span>
            </button>
          )
        })}

        <div style={{
          position: 'absolute',
          left: `${playerPos.x}%`,
          top: `${playerPos.y}%`,
          transform: 'translate(-50%, -50%)',
          width: 62,
          height: 62,
          borderRadius: '50%',
          border: '2px solid #a78bfa',
          boxShadow: '0 0 22px rgba(167,139,250,0.8), 0 10px 14px rgba(0,0,0,0.35)',
          overflow: 'hidden',
          background: 'radial-gradient(circle at 35% 25%, #c4b5fd, #6d28d9)',
          zIndex: 12,
        }}>
          <img src={characterImages.sakhi} alt="Player" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        </div>

        {nearNpc && (
          <div style={{
            position: 'absolute',
            left: '50%',
            bottom: isMobileView ? 170 : 150,
            transform: 'translateX(-50%)',
            zIndex: 25,
          }}>
            <button className="btn-primary" onClick={() => openNpc(nearNpc)} style={{ background: nearNpc.color, boxShadow: `0 8px 26px ${nearNpc.color}99`, fontSize: 12, padding: '10px 18px' }}>
              {tt('बात करें', 'Interact', 'Baat karo')} • {tt(nearNpc.name_hi, nearNpc.name_en, nearNpc.name_hinglish)}
            </button>
          </div>
        )}

        <VirtualJoystick
          onMove={(dx, dy) => { joystickRef.current = { dx, dy } }}
          onStop={() => { joystickRef.current = { dx: 0, dy: 0 } }}
          size={isMobileView ? 106 : 114}
          bottom={isMobileView ? 16 : 20}
          left={isMobileView ? 12 : 18}
          zIndex={30}
        />

        <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '6px 9px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.75)', zIndex: 15 }}>
          {isMobileView
            ? tt('Tap NPC या joystick से चलें', 'Tap NPC or use joystick', 'Tap NPC ya joystick se chalo')
            : tt('Tap to move • Joystick/WASD', 'Tap to move • Joystick/WASD', 'Tap se move • Joystick/WASD')}
        </div>
      </div>

      {activityLog.length > 0 && (
        <div className="glass" style={{ padding: '8px 10px', maxHeight: 92, overflowY: 'auto' }}>
          <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4, fontWeight: 700 }}>
            {tt('ताज़ा गतिविधि', 'Recent Activity', 'Recent Activity')}
          </div>
          {activityLog.map((entry, idx) => (
            <div key={`${entry}-${idx}`} style={{ fontSize: 11, color: 'rgba(255,255,255,0.78)', lineHeight: 1.45 }}>
              {entry}
            </div>
          ))}
        </div>
      )}

      {activeNpc && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(2,6,12,0.58)', display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', maxHeight: '80vh', overflowY: 'auto', background: 'linear-gradient(180deg, rgba(6,14,24,0.97), rgba(5,8,14,0.98))', borderTop: `2px solid ${activeNpc.color}`, borderRadius: '18px 18px 0 0', padding: '14px 12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', border: `2px solid ${activeNpc.color}` }}>
                <img src={activeNpc.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: activeNpc.color }}>{tt(activeNpc.name_hi, activeNpc.name_en, activeNpc.name_hinglish)}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{tt(activeNpc.role_hi, activeNpc.role_en, activeNpc.role_hinglish)}</div>
              </div>
              <button onClick={() => setActiveNpcId(null)} className="btn-glass" style={{ padding: '8px 10px' }}><X size={14} /></button>
            </div>

            <div className="glass" style={{ padding: '12px 12px', borderColor: `${activeNpc.color}44` }}>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.82)', fontSize: 12, lineHeight: 1.65 }}>{tt(activeNpc.intro_hi, activeNpc.intro_en, activeNpc.intro_hinglish)}</p>
            </div>

            {activeNpc.id === 'leader' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                <button onClick={doLeaderTask} className="btn-primary" style={{ background: '#16a34a', fontSize: 12 }}>
                  <ReceiptText size={15} /> {tt('आज की बचत और बैठक दर्ज करें (-₹200)', "Record today's savings and meeting (-₹200)", 'Aaj ki savings aur meeting record karo (-₹200)')}
                </button>
              </div>
            )}

            {activeNpc.id === 'entrepreneur' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                <button onClick={doBusinessTask} className="btn-primary" style={{ background: '#2563eb', fontSize: 12 }}>
                  <ClipboardCheck size={15} /> {tt('दैनिक SHG उद्यम task पूरा करें (+₹750)', 'Complete daily enterprise task (+₹750)', 'Daily enterprise task complete karo (+₹750)')}
                </button>
              </div>
            )}

            {activeNpc.id === 'treasurer' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                <div className="glass" style={{ padding: '10px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <IndianRupee size={14} color="#f59e0b" />
                    <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 800 }}>{tt('लोन डेस्क', 'Loan Desk', 'Loan Desk')}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
                    {loanOutstanding > 0
                      ? `Active loan: ₹${loanOutstanding}. Due day: ${loanDueDay ?? '-'}. Wallet: ₹${wallet}.`
                      : tt('अभी कोई active loan नहीं है। नीचे राशि चुनकर loan request करें।', 'No active loan now. Select an amount below to request.', 'Abhi koi active loan nahi hai. Niche amount choose karke loan request karo.')}
                  </div>
                </div>

                {loanOutstanding <= 0 ? (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[5000, 10000, 15000].map((amount) => (
                      <button key={amount} onClick={() => requestLoan(amount)} className="btn-primary" style={{ background: '#f59e0b', fontSize: 12, padding: '10px 14px' }}>
                        <HandCoins size={14} /> {tt('लोन', 'Loan', 'Loan')} ₹{amount}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => repayLoan(1000)} className="btn-primary" style={{ background: '#2563eb', fontSize: 12, padding: '10px 14px' }}>{tt('₹1000 किस्त', 'Pay ₹1000', '₹1000 pay')}</button>
                    <button onClick={() => repayLoan(2500)} className="btn-primary" style={{ background: '#2563eb', fontSize: 12, padding: '10px 14px' }}>{tt('₹2500 किस्त', 'Pay ₹2500', '₹2500 pay')}</button>
                    <button onClick={() => repayLoan('full')} className="btn-primary" style={{ background: '#10b981', fontSize: 12, padding: '10px 14px' }}>{tt('पूरा भुगतान', 'Full Repay', 'Full repay')}</button>
                  </div>
                )}
              </div>
            )}

            {activeNpc.id === 'sarpanch' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                <div className="glass" style={{ padding: '10px 12px', borderColor: 'rgba(168,85,247,0.4)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Landmark size={14} color="#a855f7" />
                    <span style={{ fontSize: 12, color: '#a855f7', fontWeight: 800 }}>{tt('सरकारी योजना मास्टर स्क्रिप्ट', 'Government Scheme Master Script', 'Government Scheme Master Script')}</span>
                  </div>
                  {schemeScript.map((line, idx) => (
                    <p key={idx} style={{ margin: '0 0 8px', color: 'rgba(255,255,255,0.8)', fontSize: 11, lineHeight: 1.65 }}>{line}</p>
                  ))}
                  <button onClick={playSchemeScript} className="btn-primary" style={{ background: '#a855f7', fontSize: 12, marginTop: 4 }}>
                    {tt('आवाज़ में सुनें', 'Play Voice Guide', 'Voice guide suno')}
                  </button>
                </div>

                <div className="glass" style={{ padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, color: '#c4b5fd', fontWeight: 800, marginBottom: 8 }}>{tt('आधिकारिक लिंक', 'Official Links', 'Official Links')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {schemeLinks.map((item) => (
                      <a key={item.url} href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, textDecoration: 'none', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 10px' }}>
                        <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: 11, fontWeight: 700 }}>{item.label}</span>
                        <span style={{ color: '#c4b5fd', fontSize: 10, fontWeight: 700 }}>Open</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
