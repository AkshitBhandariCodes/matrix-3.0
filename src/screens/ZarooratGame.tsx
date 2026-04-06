import React, { useState } from 'react'
import { useGameStore, t3 } from '../store/gameStore'
import { ArrowLeft, CheckCircle2, XCircle, ShoppingCart, Smartphone, Pill, Gem, GraduationCap, Tv, Gamepad2, Coins } from 'lucide-react'

type ItemType = 'need' | 'want'

interface GameItem {
  id: number
  type: ItemType
  icon: React.ReactNode
  title_hi: string
  title_en: string
  title_hg: string
  reason_hi: string
  reason_en: string
  reason_hg: string
}

const items: GameItem[] = [
  { id: 1, type: 'need', icon: <ShoppingCart size={50} color="#10b981" />, title_hi: 'घर का राशन', title_en: 'Groceries', title_hg: 'Ghar ka Ration', reason_hi: 'भोजन जीवन के लिए ज़रूरी है।', reason_en: 'Food is essential for survival.', reason_hg: 'Khana jeene ke liye zaroori hai.' },
  { id: 2, type: 'want', icon: <Smartphone size={50} color="#f59e0b" />, title_hi: 'नया महँगा फोन', title_en: 'Expensive Phone', title_hg: 'Naya Mehenga Phone', reason_hi: 'पुराना फोन काम कर रहा है, यह सिर्फ एक इच्छा है।', reason_en: 'Old phone works, this is just a desire.', reason_hg: 'Purana phone chal raha hai, yeh sirf khwahish hai.' },
  { id: 3, type: 'need', icon: <Pill size={50} color="#10b981" />, title_hi: 'दवाइयाँ', title_en: 'Medicines', title_hg: 'Dawaiyan', reason_hi: 'स्वास्थ्य सबसे बड़ी संपत्ति है।', reason_en: 'Health is the biggest wealth.', reason_hg: 'Health sabse badi daulat hai.' },
  { id: 4, type: 'want', icon: <Gem size={50} color="#f59e0b" />, title_hi: 'सोने का हार', title_en: 'Gold Necklace', title_hg: 'Sone ki Chain', reason_hi: 'दिखावे की चीजें बाद में भी ली जा सकती हैं।', reason_en: 'Jewelry can wait, it is not an immediate need.', reason_hg: 'Dikhawe ki cheezein baad mein le sakte hain.' },
  { id: 5, type: 'need', icon: <GraduationCap size={50} color="#10b981" />, title_hi: 'बच्चों की फीस', title_en: 'School Fees', title_hg: 'Bachchon ki Fees', reason_hi: 'शिक्षा भविष्य का रास्ता है।', reason_en: 'Education is the path to the future.', reason_hg: 'Education future ka raasta hai.' },
  { id: 6, type: 'want', icon: <Tv size={50} color="#f59e0b" />, title_hi: 'बड़ा टीवी', title_en: 'Large TV', title_hg: 'Bada Smart TV', reason_hi: 'मनोरंजन ज़रूरी है पर इसके बिना भी काम चल सकता है।', reason_en: 'Entertainment is nice, but not a necessity.', reason_hg: 'Entertainment theek hai par yeh zaroorat nahi.' },
]

export const ZarooratGame: React.FC = () => {
  const { language, setScreen, applyStatDelta } = useGameStore()
  const tt = (hi: string, en: string, hg: string) => t3(hi, en, hg, language)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [showFeedback, setShowFeedback] = useState<boolean | null>(null)
  const [animating, setAnimating] = useState(false)
  const [gameOver, setGameOver] = useState(false)

  const currentItem = items[currentIndex]

  const handleChoice = (choice: ItemType) => {
    if (animating || gameOver) return

    const isCorrect = choice === currentItem.type
    setShowFeedback(isCorrect)
    setAnimating(true)

    if (isCorrect) {
      setScore(s => s + 10)
      applyStatDelta({ wisdom: 5 }, tt('सही जबाव!', 'Correct!', 'Sahi Jawab!'), true)
    } else {
      applyStatDelta({ health: -5 }, tt('गलत चुनाव!', 'Wrong!', 'Galat Chunav!'), false)
    }

    setTimeout(() => {
      setShowFeedback(null)
      setAnimating(false)
      if (currentIndex < items.length - 1) {
        setCurrentIndex(i => i + 1)
      } else {
        setGameOver(true)
      }
    }, 1500)
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100%', padding: '20px', background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #050a0e 70%)',
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 20, left: 20, right: 20, display: 'flex', justifyContent: 'space-between' }}>
        <button onClick={() => setScreen('profile')} className="btn-glass" style={{ padding: '8px 14px', fontSize: 13 }}>
          <ArrowLeft size={16} /> {tt('वापस', 'Back', 'Wapas')}
        </button>
        <div className="glass" style={{ padding: '8px 14px', fontSize: 14, fontWeight: 800, color: '#fde68a', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Coins size={16} /> Score: {score}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 30, marginTop: 40 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Gamepad2 size={28} color="#a78bfa" />
          {tt('ज़रूरत vs ख्वाहिश', 'Needs vs Wants', 'Zaroorat vs Khwahish')}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 8 }}>
          {tt('सही फैसला लें, अपने पैसे बचाएं!', 'Make the right choice, save your money!', 'Sahi faisla lein, paise bachayein!')}
        </p>
      </div>

      {gameOver ? (
        <div className="glass" style={{ padding: '30px', textAlign: 'center', maxWidth: 400, width: '100%', animation: 'fadeInUp 0.5s ease' }}>
          <CheckCircle2 size={60} color="#4ade80" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: 24, color: '#fff', marginBottom: 10 }}>{tt('गेम पूरा हुआ!', 'Game Complete!', 'Game Poora Hua!')}</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 20 }}>
            {tt(`आपका स्कोर: ${score}`, `Your Score: ${score}`, `Aapka score: ${score}`)}
          </p>
          <button onClick={() => setScreen('profile')} className="btn-primary" style={{ width: '100%', background: '#7c3aed' }}>
            {tt('प्रोफाइल पर जाएं', 'Back to Profile', 'Profile par jayein')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 400 }}>
          
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 10 }}>
            {tt('कार्ड', 'Card', 'Card')} {currentIndex + 1} / {items.length}
          </div>

          {/* Game Card */}
          <div className="glass" style={{
            padding: '40px 20px', width: '100%', textAlign: 'center', position: 'relative',
            background: showFeedback === true ? 'rgba(16, 185, 129, 0.15)' : showFeedback === false ? 'rgba(239, 68, 68, 0.15)' : 'var(--bg-glass)',
            borderColor: showFeedback === true ? '#4ade80' : showFeedback === false ? '#ef4444' : 'rgba(255,255,255,0.1)',
            transform: showFeedback === true ? 'scale(1.05)' : showFeedback === false ? 'translateX(10px)' : 'none',
            transition: 'all 0.3s ease',
            height: 250, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}>
            {showFeedback === null ? (
              <div style={{ animation: 'bounceIn 0.5s ease' }}>
                <div style={{ marginBottom: 20 }}>{currentItem.icon}</div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff' }}>
                  {tt(currentItem.title_hi, currentItem.title_en, currentItem.title_hg)}
                </h2>
              </div>
            ) : (
              <div style={{ animation: 'fadeIn 0.3s ease' }}>
                {showFeedback ? <CheckCircle2 size={50} color="#4ade80" /> : <XCircle size={50} color="#ef4444" />}
                <h3 style={{ fontSize: 20, color: showFeedback ? '#4ade80' : '#ef4444', marginTop: 16 }}>
                  {showFeedback ? tt('बिल्कुल सही!', 'Absolutely Right!', 'Bilkul Sahi!') : tt('यह गलत था!', 'That was wrong!', 'Yeh galat tha!')}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 10, padding: '0 10px' }}>
                  {tt(currentItem.reason_hi, currentItem.reason_en, currentItem.reason_hg)}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 16, width: '100%', marginTop: 30, opacity: animating ? 0.5 : 1, pointerEvents: animating ? 'none' : 'all' }}>
            <button 
              onClick={() => handleChoice('need')} 
              style={{
                flex: 1, padding: '16px', borderRadius: 16, border: '2px solid #10b981',
                background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: 16, fontWeight: 800,
                cursor: 'pointer', transition: 'all 0.2s ease', 
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.2)'
              }}
            >
              {tt('ज़रूरत (Need)', 'Need', 'Zaroorat (Need)')}
            </button>
            <button 
              onClick={() => handleChoice('want')} 
              style={{
                flex: 1, padding: '16px', borderRadius: 16, border: '2px solid #f59e0b',
                background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: 16, fontWeight: 800,
                cursor: 'pointer', transition: 'all 0.2s ease',
                boxShadow: '0 4px 15px rgba(245, 158, 11, 0.2)'
              }}
            >
              {tt('ख्वाहिश (Want)', 'Want', 'Khwahish (Want)')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
