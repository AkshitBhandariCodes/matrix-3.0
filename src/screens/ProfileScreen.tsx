import React, { useEffect, useState } from 'react'
import { useGameStore, t3 } from '../store/gameStore'
import { realm1, realm2, realm3, realm4, realm5, characterImages } from '../data/realms'
import { ArrowLeft, Heart, Brain, Star, CheckCircle2, Lock, Award, Users, ShieldAlert } from 'lucide-react'
import { isRealmEnabled, type RealmScreen } from '../config/prototype'

export const ProfileScreen: React.FC = () => {
  const {
    playerName, stats, language, setScreen, setPlayerName,
    realm1Completed, realm2Completed, realm3Completed, realm4Completed, realm5Completed,
    realm1Score, realm2Score, realm3Score, realm4Score, realm5Score,
  } = useGameStore()
  const [nameInput, setNameInput] = useState(playerName || '')
  const [nameSaved, setNameSaved] = useState(false)

  const tt = (hi: string, en: string, hg: string) => t3(hi, en, hg, language)

  useEffect(() => {
    setNameInput(playerName || '')
  }, [playerName])

  const handleSaveName = () => {
    const finalName = nameInput.trim() || 'Meera'
    setPlayerName(finalName)
    setNameInput(finalName)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 1500)
  }

  const allRealmsData: Array<{ screen: RealmScreen; realm: typeof realm1; completed: boolean; score: number }> = [
    { screen: 'realm1', realm: realm1, completed: realm1Completed, score: realm1Score },
    { screen: 'realm2', realm: realm2, completed: realm2Completed, score: realm2Score },
    { screen: 'realm3', realm: realm3, completed: realm3Completed, score: realm3Score },
    { screen: 'realm4', realm: realm4, completed: realm4Completed, score: realm4Score },
    { screen: 'realm5', realm: realm5, completed: realm5Completed, score: realm5Score },
  ]

  const realmsData = allRealmsData.filter((item) => isRealmEnabled(item.screen))

  const totalScore = realmsData.reduce((acc, curr) => acc + curr.score, 0)
  const completedCount = realmsData.filter(r => r.completed).length
  const allMaxScore = realmsData.reduce((acc, curr) => acc + curr.realm.challenges.length * 15, 0)
  const percentage = allMaxScore > 0 ? Math.round((totalScore / allMaxScore) * 100) : 0
  const playableRealmCount = realmsData.length
  const completionPercentage = playableRealmCount > 0 ? Math.round((completedCount / playableRealmCount) * 100) : 0

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      height: '100%', padding: '20px 20px', gap: 16,
      background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #050a0e 70%)',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setScreen('hub')} className="btn-glass" style={{ padding: '8px 14px', fontSize: 13 }}>
          <ArrowLeft size={16} /> {tt('वापस', 'Back', 'Wapas')}
        </button>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
          {tt('प्रगति रिपोर्ट', 'Progress Report', 'Progress Report')}
        </span>
        <div style={{ width: 60 }} />
      </div>

      {/* Profile */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, animation: 'fadeInDown 0.5s ease' }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
          border: '3px solid rgba(167,139,250,0.5)',
          boxShadow: '0 0 30px rgba(167,139,250,0.2)',
        }}>
          <img src={characterImages.sakhi} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: '#fff' }}>{playerName || 'Meera'}</h2>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: 4 }}>
            {completedCount} / {playableRealmCount} {tt('पड़ाव पूरे किए', 'Realms Completed', 'Realms Poore Kiye')}
          </div>
        </div>
      </div>

      {/* Edit Name */}
      <div className="glass" style={{
        width: '100%', maxWidth: 440, padding: '12px',
        display: 'flex', gap: 8, alignItems: 'center',
        animation: 'fadeInUp 0.5s 0.15s ease both',
      }}>
        <input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder={tt('नाम बदलें', 'Change name', 'Naam badlo')}
          onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.16)',
            background: 'rgba(255,255,255,0.04)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            outline: 'none',
            fontFamily: 'var(--font-primary)',
          }}
        />
        <button onClick={handleSaveName} className="btn-primary" style={{ padding: '10px 14px', fontSize: 12 }}>
          {tt('सेव', 'Save', 'Save')}
        </button>
      </div>

      {nameSaved && (
        <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 700, marginTop: -8 }}>
          {tt('नाम अपडेट हो गया', 'Name updated', 'Naam update ho gaya')}
        </div>
      )}

      {/* Realm completion progress */}
      <div className="glass" style={{
        width: '100%', maxWidth: 440, padding: '14px 14px 12px',
        animation: 'fadeInUp 0.5s 0.18s ease both',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 800 }}>
            {tt('Realm प्रगति', 'Realm Progress', 'Realm Progress')}
          </span>
          <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 900 }}>{completionPercentage}%</span>
        </div>
        <div style={{
          width: '100%',
          height: 10,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{
            width: `${completionPercentage}%`,
            height: '100%',
            borderRadius: 999,
            background: 'linear-gradient(90deg, #22c55e, #a3e635)',
            transition: 'width 300ms ease',
          }} />
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 8, fontWeight: 700 }}>
          {tt('पूरा किया:', 'Completed:', 'Completed:')} {completedCount}/{playableRealmCount} {tt('Realms', 'Realms', 'Realms')}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 440, animation: 'fadeInUp 0.5s 0.2s ease both' }}>
        <div className="glass" style={{ flex: 1, padding: '14px 10px', textAlign: 'center', borderColor: 'rgba(239,68,68,0.2)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Heart size={12} color="#ef4444" fill="#ef4444" />
            {tt('स्वास्थ्य', 'Health', 'Health')}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#ef4444' }}>{stats.health}</div>
        </div>
        <div className="glass" style={{ flex: 1, padding: '14px 10px', textAlign: 'center', borderColor: 'rgba(167,139,250,0.2)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Brain size={12} color="#a78bfa" />
            {tt('ज्ञान', 'Wisdom', 'Wisdom')}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#a78bfa' }}>{stats.wisdom}</div>
        </div>
        <div className="glass" style={{ flex: 1, padding: '14px 10px', textAlign: 'center', borderColor: 'rgba(253,230,138,0.2)' }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <Star size={12} color="#fde68a" fill="#fde68a" />
            {tt('कुल स्कोर', 'Total', 'Total')}
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#fde68a' }}>{percentage}%</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 440, animation: 'fadeInUp 0.5s 0.25s ease both' }}>
        <button onClick={() => setScreen('sakhisathi')} className="btn-glass" style={{ flex: 1, fontSize: 12 }}>
          <Users size={14} /> {tt('सखी साथी', 'Sakhi Sathi', 'Sakhi Sathi')}
        </button>
        <button onClick={() => setScreen('certificate')} className="btn-glass" style={{ flex: 1, fontSize: 12 }}>
          <Award size={14} /> {tt('Certificate', 'Certificate', 'Certificate')}
        </button>
        <button onClick={() => setScreen('suraksha')} className="btn-glass" style={{ flex: 1, fontSize: 12 }}>
          <ShieldAlert size={14} /> {tt('सुरक्षा', 'Safety', 'Suraksha')}
        </button>
      </div>

      {/* Realm list */}
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {realmsData.map(({ realm, score, completed }, idx) => (
          <div key={realm.id} className="glass" style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px',
            borderColor: completed ? `${realm.color}44` : 'rgba(255,255,255,0.05)',
            opacity: completed ? 1 : 0.5,
            animation: `fadeInUp 0.4s ${0.3 + idx * 0.08}s ease both`,
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
              <div style={{ color: realm.color, fontWeight: 800, fontSize: 13, marginBottom: 2 }}>
                {tt(realm.title_hi, realm.title_en, realm.title_hinglish)}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600 }}>
                {completed ? `${score} ${tt('अंक', 'pts', 'points')}` : tt('अभी बाकी है', 'Pending', 'Abhi baaki hai')}
              </div>
            </div>
            <div style={{ flexShrink: 0 }}>
              {completed ? <CheckCircle2 size={22} color="#4ade80" /> : <Lock size={18} color="rgba(255,255,255,0.2)" />}
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 20 }} />
    </div>
  )
}
