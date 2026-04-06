import React from 'react'
import { useGameStore, t3 } from '../store/gameStore'
import { Heart, Brain, Languages, UserCircle, Volume2, VolumeX } from 'lucide-react'

interface HUDProps {
  showProfile?: boolean
  showLang?: boolean
  showVoice?: boolean
}

export const HUD: React.FC<HUDProps> = ({ showProfile = true, showLang = true, showVoice = false }) => {
  const { stats, language, cycleLang, setScreen, voiceMode, toggleVoiceMode } = useGameStore()
  const tt = (hi: string, en: string, hg: string) => t3(hi, en, hg, language)

  const langLabel = language === 'hi' ? 'हिं' : language === 'en' ? 'EN' : 'Hi-En'

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)',
      zIndex: 20,
    }}>
      {/* Health Bar */}
      <div className="stat-bar-container">
        <div className="stat-bar-icon" style={{ color: '#ef4444' }}>
          <Heart size={18} fill="#ef4444" />
        </div>
        <div className="stat-bar-track" style={{ background: 'var(--health-bg)' }}>
          <div className="stat-bar-fill" style={{
            width: `${stats.health}%`,
            background: stats.health > 30
              ? 'linear-gradient(90deg, #ef4444, #f87171)'
              : 'linear-gradient(90deg, #991b1b, #ef4444)',
            boxShadow: stats.health <= 30 ? '0 0 8px rgba(239,68,68,0.6)' : 'none',
          }} />
        </div>
        <span className="stat-bar-label" style={{ color: '#ef4444' }}>{stats.health}</span>
      </div>

      {/* Wisdom Bar */}
      <div className="stat-bar-container">
        <div className="stat-bar-icon" style={{ color: '#a78bfa' }}>
          <Brain size={18} />
        </div>
        <div className="stat-bar-track" style={{ background: 'var(--wisdom-bg)' }}>
          <div className="stat-bar-fill" style={{
            width: `${stats.wisdom}%`,
            background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
          }} />
        </div>
        <span className="stat-bar-label" style={{ color: '#a78bfa' }}>{stats.wisdom}</span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {showVoice && (
          <button onClick={toggleVoiceMode} style={{
            background: voiceMode ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.1)',
            border: voiceMode ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10, padding: '6px 8px', cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center',
          }} title={tt('आवाज़ मोड', 'Voice Mode', 'Voice Mode')}>
            {voiceMode ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        )}
        {showLang && (
          <button onClick={cycleLang} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10, padding: '6px 10px', cursor: 'pointer',
            color: '#fff', fontSize: 11, fontWeight: 800,
            display: 'flex', alignItems: 'center', gap: 4,
          }} title={tt('भाषा बदलें', 'Change Language', 'Language badlo')}>
            <Languages size={14} />
            {langLabel}
          </button>
        )}
        {showProfile && (
          <button onClick={() => setScreen('profile')} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10, padding: '6px 8px', cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center',
          }}>
            <UserCircle size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
