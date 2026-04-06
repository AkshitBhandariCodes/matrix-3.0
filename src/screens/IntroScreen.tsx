import React, { useState, useRef } from 'react'
import { useGameStore, t3 } from '../store/gameStore'
import { characterImages, realm1, realm2, realm3, realm4, realm5 } from '../data/realms'
import {
  Languages, Wallet, ShieldCheck, Store, TrendingUp, Landmark,
  Gamepad2, Volume2, WifiOff, Users, GraduationCap, ChevronRight,
  Sparkles, Download
} from 'lucide-react'

interface DeferredInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export const IntroScreen: React.FC = () => {
  const { setScreen, setPlayerName, language, cycleLang } = useGameStore()
  const [name, setName] = useState('')
  const [started, setStarted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const tt = (hi: string, en: string, hg: string) => t3(hi, en, hg, language)

  const handleStart = () => {
    const finalName = name.trim() || 'Meera'
    setPlayerName(finalName)
    setStarted(true)
    setTimeout(() => setScreen('hub'), 1200)
  }

  // Handle PWA install
  const [installPrompt, setInstallPrompt] = useState<DeferredInstallPromptEvent | null>(null)
  React.useEffect(() => {
    const handler = (event: Event) => {
      const installEvent = event as DeferredInstallPromptEvent
      installEvent.preventDefault()
      setInstallPrompt(installEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])
  const handleInstall = async () => {
    if (installPrompt) { installPrompt.prompt(); setInstallPrompt(null) }
  }

  if (started) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        height: '100%', background: 'radial-gradient(ellipse at center, #1e1b4b 0%, #050a0e 70%)',
      }}>
        <div style={{ animation: 'portalWarp 1.2s ease forwards', filter: 'drop-shadow(0 0 30px #a78bfa)' }}>
          <Sparkles size={60} color="#a78bfa" />
        </div>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 20, animation: 'fadeInUp 0.5s 0.3s ease both' }}>
          {tt('यात्रा शुरू हो रही है...', 'Your journey begins...', 'Yatra shuru ho rahi hai...')}
        </p>
      </div>
    )
  }

  const features = [
    { icon: <Gamepad2 size={18} />, label: tt('RPG गेमप्ले', 'RPG Gameplay', 'RPG Gameplay'), color: '#a78bfa' },
    { icon: <Volume2 size={18} />, label: tt('हिंदी आवाज़', 'Hindi Voice', 'Hindi Voice'), color: '#ec4899' },
    { icon: <WifiOff size={18} />, label: tt('ऑफलाइन चलता है', 'Works Offline', 'Offline Chalta Hai'), color: '#f59e0b' },
    { icon: <Users size={18} />, label: tt('ग्रामीण केंद्रित', 'Rural-Focused', 'Rural-Focused'), color: '#10b981' },
    { icon: <GraduationCap size={18} />, label: tt('खेल कर सीखो', 'Learn by Playing', 'Khel kar Seekho'), color: '#3b82f6' },
  ]

  const realms = [
    { number: 1, icon: <Wallet size={16} />, label: tt(realm1.title_hi, realm1.title_en, realm1.title_hinglish), color: realm1.color },
    { number: 2, icon: <ShieldCheck size={16} />, label: tt(realm2.title_hi, realm2.title_en, realm2.title_hinglish), color: realm2.color },
    { number: 3, icon: <Store size={16} />, label: tt(realm3.title_hi, realm3.title_en, realm3.title_hinglish), color: realm3.color },
    { number: 4, icon: <TrendingUp size={16} />, label: tt(realm4.title_hi, realm4.title_en, realm4.title_hinglish), color: realm4.color },
    { number: 5, icon: <Landmark size={16} />, label: tt(realm5.title_hi, realm5.title_en, realm5.title_hinglish), color: realm5.color },
  ]

  const activeRealmCount = realms.length

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      height: '100%', padding: '20px 20px 40px', gap: 16,
      background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #050a0e 70%)',
      overflowY: 'auto',
    }}>
      {/* Language toggle */}
      <button onClick={cycleLang} style={{
        position: 'fixed', top: 14, right: 14,
        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 10, color: '#fde68a', fontSize: 12, fontWeight: 800,
        padding: '8px 14px', cursor: 'pointer', fontFamily: 'var(--font-primary)', zIndex: 10,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <Languages size={14} />
        {language === 'hi' ? 'English' : language === 'en' ? 'Hinglish' : 'हिंदी'}
      </button>

      {/* Sakhi portrait with glow */}
      <div style={{ animation: 'fadeInDown 0.6s ease', position: 'relative', marginTop: 20 }}>
        <div style={{
          width: 120, height: 120, borderRadius: '50%', overflow: 'hidden',
          border: '3px solid rgba(167,139,250,0.5)',
          boxShadow: '0 0 40px rgba(167,139,250,0.3), 0 0 80px rgba(167,139,250,0.15)',
          animation: 'float 3s ease-in-out infinite',
        }}>
          <img src={characterImages.sakhi} alt="Sakhi"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        </div>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', animation: 'fadeInUp 0.6s 0.15s ease both' }}>
        <h1 style={{
          fontSize: 34, fontWeight: 900, margin: 0, lineHeight: 1.2,
          background: 'linear-gradient(135deg, #a78bfa, #ec4899, #f59e0b)',
          backgroundSize: '200% 200%',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          animation: 'gradientShift 4s ease infinite',
        }}>
          {tt('सखी की उड़ान', 'Sakhi Ki Udaan', 'Sakhi Ki Udaan')}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 6, letterSpacing: '0.5px' }}>
          {tt('ग्रामीण महिलाओं और बच्चों के लिए वित्तीय साक्षरता RPG',
            'Financial Literacy RPG for Rural Women & Children',
            'Rural Women aur Bachchon ke liye Financial Literacy RPG')}
        </p>
      </div>

      {/* Impact stats */}
      <div style={{
        display: 'flex', gap: 8, width: '100%', maxWidth: 400,
        animation: 'fadeInUp 0.6s 0.25s ease both',
      }}>
        {[
          { val: '100M+', label: tt('SHG महिलाएं', 'SHG Women', 'SHG Women'), color: '#10b981' },
          { val: String(activeRealmCount), label: tt('Realms', 'Realms', 'Realms'), color: '#a78bfa' },
          { val: '25+', label: tt('सवाल', 'Questions', 'Questions'), color: '#f59e0b' },
        ].map((s) => (
          <div key={s.label} className="glass" style={{
            flex: 1, padding: '10px 6px', textAlign: 'center',
            borderColor: `${s.color}22`,
          }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Guide intro */}
      <div className="glass" style={{
        padding: '14px 18px', maxWidth: 400, width: '100%', animation: 'fadeInUp 0.6s 0.3s ease both',
      }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.65, margin: 0, textAlign: 'center' }}>
          {tt(
            'नमस्ते! मैं सखी हूं — आपकी गाइड। इस यात्रा में 5 realms हैं। नीचे सभी realm नंबर और नाम दिए गए हैं।',
            "Hello! I'm Sakhi — your guide. This journey has 5 realms. Realm numbers and names are listed below.",
            'Namaste! Main Sakhi hun — tumhari guide. Is journey mein 5 realms hain. Neeche sabhi realm number aur names diye gaye hain.',
          )}
        </p>
      </div>

      {/* Realm preview pills */}
      <div style={{
        display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center',
        maxWidth: 400, animation: 'fadeInUp 0.6s 0.4s ease both',
      }}>
        {realms.map((r) => (
          <span key={r.number} style={{
            background: `${r.color}15`, border: `1px solid ${r.color}30`,
            borderRadius: 20, padding: '5px 12px', fontSize: 11,
            color: r.color, fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {r.icon} {`${r.number}. ${r.label}`}
          </span>
        ))}
      </div>

      {/* Feature cards row */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto', width: '100%', maxWidth: 400,
        padding: '4px 0', animation: 'fadeInUp 0.6s 0.5s ease both',
      }}>
        {features.map((f) => (
          <div key={f.label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            minWidth: 68, padding: '10px 6px',
            background: `${f.color}08`, border: `1px solid ${f.color}20`,
            borderRadius: 12,
          }}>
            <span style={{ color: f.color }}>{f.icon}</span>
            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontWeight: 700, textAlign: 'center' }}>
              {f.label}
            </span>
          </div>
        ))}
      </div>

      {/* Name input */}
      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeInUp 0.6s 0.55s ease both' }}>
        <label style={{
          display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700,
          marginBottom: 8, textAlign: 'center',
        }}>
          {tt('आपका नाम', 'Your Name', 'Tumhara Naam')}
        </label>
        <input
          ref={inputRef} type="text" value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tt('अपना नाम लिखें...', 'Enter your name...', 'Apna naam likho...')}
          onKeyDown={(e) => e.key === 'Enter' && handleStart()}
          style={{
            width: '100%', padding: '14px 18px',
            background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
            color: '#fff', fontSize: 15, fontFamily: 'var(--font-primary)', fontWeight: 600,
            outline: 'none', textAlign: 'center',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.5)' }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
        />
      </div>

      {/* Start button */}
      <button onClick={handleStart} className="btn-primary" style={{
        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        width: '100%', maxWidth: 400, fontSize: 16, padding: '16px 28px',
        boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
        animation: 'fadeInUp 0.6s 0.65s ease both',
      }}>
        {tt('यात्रा शुरू करें', 'Begin Journey', 'Yatra Shuru Karo')}
        <ChevronRight size={20} />
      </button>

      {/* Install PWA prompt */}
      {installPrompt && (
        <button onClick={handleInstall} className="btn-glass" style={{
          width: '100%', maxWidth: 400, animation: 'fadeInUp 0.4s ease',
        }}>
          <Download size={16} />
          {tt('📱 ऐप इंस्टॉल करें — ऑफलाइन खेलें', '📱 Install App — Play Offline', '📱 App Install Karo — Offline Khelo')}
        </button>
      )}

      {/* Footer */}
      <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 9, textAlign: 'center', maxWidth: 300, lineHeight: 1.5, marginTop: 4 }}>
        {tt('सखी की उड़ान • ग्रामीण महिलाओं के लिए वित्तीय साक्षरता',
          'Sakhi Ki Udaan • Financial Literacy for Rural Women & Children',
          'Sakhi Ki Udaan • Rural Women aur Bachchon ke liye Financial Literacy')}
      </p>
    </div>
  )
}
