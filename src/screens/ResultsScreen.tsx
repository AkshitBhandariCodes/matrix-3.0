import React from 'react'
import { useGameStore, t3 } from '../store/gameStore'
import { realm1, realm2, realm3, realm4, realm5 } from '../data/realms'
import { Trophy, Heart, Brain, RotateCcw, CheckCircle2, Lock, Award } from 'lucide-react'

export const ResultsScreen: React.FC = () => {
  const {
    language, stats, playerName, screen,
    realm1Score, realm2Score, realm3Score, realm4Score, realm5Score,
    realm1Completed, realm2Completed, realm3Completed, realm4Completed, realm5Completed,
    resetGame, setScreen,
  } = useGameStore()

  const tt = (hi: string, en: string, hg: string) => t3(hi, en, hg, language)
  const totalScore = realm1Score + realm2Score + realm3Score + realm4Score + realm5Score
  const maxScore = 15 * 5 * 5 // 15 max per challenge × 5 challenges × 5 realms
  const percentage = Math.round((totalScore / maxScore) * 100)
  const avgStat = Math.round((stats.health + stats.wisdom) / 2)
  const isGameOver = screen === 'gameover'

  const getGrade = () => {
    if (isGameOver) return { label: '💔', color: '#ef4444',
      msg: tt('आपकी Health ख़त्म हो गई! फिर से कोशिश करें।', 'Your Health ran out! Try again.', 'Aapki Health khatam ho gayi! Phir se try karo.') }
    if (percentage >= 80) return { label: 'A+', color: '#4ade80',
      msg: tt('शानदार! आप Financial Expert हैं!', 'Brilliant! You are a Financial Expert!', 'Shandar! Aap Financial Expert hain!') }
    if (percentage >= 60) return { label: 'B+', color: '#fbbf24',
      msg: tt('बहुत अच्छा! थोड़ी और practice करो!', 'Very good! Practice more!', 'Bahut accha! Thodi aur practice karo!') }
    return { label: 'C', color: '#f87171',
      msg: tt('हिम्मत मत हारो! फिर से खेलो!', "Don't give up! Try again!", 'Himmat mat haaro! Phir se khelo!') }
  }
  const grade = getGrade()

  const realmData = [
    { realm: realm1, score: realm1Score, completed: realm1Completed },
    { realm: realm2, score: realm2Score, completed: realm2Completed },
    { realm: realm3, score: realm3Score, completed: realm3Completed },
    { realm: realm4, score: realm4Score, completed: realm4Completed },
    { realm: realm5, score: realm5Score, completed: realm5Completed },
  ]

  const completedCount = realmData.filter(r => r.completed).length

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      height: '100%', padding: '24px 18px', gap: 14,
      background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #050a0e 60%)', overflowY: 'auto',
    }}>
      <div style={{ textAlign: 'center', animation: 'fadeInDown 0.5s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
          <Trophy size={16} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
            {isGameOver ? tt('गेम ओवर', 'Game Over', 'Game Over') : tt('रिपोर्ट कार्ड', 'Report Card', 'Report Card')}
          </span>
        </div>
        <h2 style={{ margin: '4px 0 0', fontWeight: 900, fontSize: 26 }}>
          <span className="text-gradient">{playerName}</span>
        </h2>
      </div>

      <div style={{
        width: 100, height: 100, borderRadius: '50%',
        background: `${grade.color}12`, border: `3px solid ${grade.color}66`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 0 30px ${grade.color}22`, animation: 'bounceIn 0.5s 0.2s ease both',
      }}>
        <span style={{ fontSize: 36, fontWeight: 900, color: grade.color }}>{grade.label}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{percentage}%</span>
      </div>

      <p style={{
        color: `${grade.color}cc`, fontSize: 13, fontWeight: 600,
        textAlign: 'center', maxWidth: 300, animation: 'fadeInUp 0.5s 0.3s ease both',
      }}>{grade.msg}</p>

      <div className="glass" style={{
        width: '100%', maxWidth: 400, padding: '14px 18px',
        display: 'flex', gap: 16, justifyContent: 'center', animation: 'fadeInUp 0.5s 0.35s ease both',
      }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Heart size={12} color="#ef4444" fill="#ef4444" />
            {tt('स्वास्थ्य', 'Health', 'Health')}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#ef4444' }}>{stats.health}</div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Brain size={12} color="#a78bfa" />
            {tt('ज्ञान', 'Wisdom', 'Wisdom')}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#a78bfa' }}>{stats.wisdom}</div>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 4 }}>
            {tt('औसत', 'Average', 'Average')}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#fde68a' }}>{avgStat}</div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {realmData.map(({ realm, score, completed }, idx) => (
          <div key={realm.id} className="glass" style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
            borderColor: completed ? `${realm.color}33` : 'rgba(255,255,255,0.05)',
            opacity: completed ? 1 : 0.4, animation: `fadeInUp 0.4s ${0.5 + idx * 0.1}s ease both`,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%', overflow: 'hidden',
              border: `2px solid ${realm.color}88`, flexShrink: 0,
            }}>
              <img src={realm.protagonist.image} alt="" style={{
                width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top',
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: realm.color, fontWeight: 800, fontSize: 13 }}>
                {tt(realm.title_hi, realm.title_en, realm.title_hinglish)}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600 }}>
                {completed ? `${score} ${tt('अंक', 'pts', 'points')}` : tt('अधूरा', 'Incomplete', 'Adhoora')}
              </div>
            </div>
            <div style={{ fontSize: 18, flexShrink: 0 }}>
              {completed ? <CheckCircle2 size={22} color="#4ade80" /> : <Lock size={18} color="rgba(255,255,255,0.2)" />}
            </div>
          </div>
        ))}
      </div>

      {/* Certificate + Play Again buttons */}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 400 }}>
        {completedCount > 0 && (
          <button onClick={() => setScreen('certificate')} className="btn-glass" style={{ flex: 1 }}>
            <Award size={16} /> {tt('Certificate', 'Certificate', 'Certificate')}
          </button>
        )}
        <button onClick={resetGame} className="btn-primary" style={{
          flex: 1, background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          boxShadow: '0 6px 24px rgba(124,58,237,0.4)',
        }}>
          <RotateCcw size={16} /> {tt('फिर से खेलें', 'Play Again', 'Phir se khelo')}
        </button>
      </div>

      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
        {tt('सखी की उड़ान • ग्रामीण महिलाओं के लिए वित्तीय साक्षरता', 'Sakhi Ki Udaan • Financial Literacy for Rural Women', 'Sakhi Ki Udaan • Rural Women ke liye Financial Literacy')}
      </p>
    </div>
  )
}
