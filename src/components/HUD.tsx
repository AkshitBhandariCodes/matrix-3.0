import React, { useState, useEffect } from 'react'
import { useGameStore, t3 } from '../store/gameStore'
import { Heart, Brain, Languages, UserCircle, Volume2, VolumeX, Menu, X } from 'lucide-react'

interface HUDProps {
  showProfile?: boolean
  showLang?: boolean
  showVoice?: boolean
}

export const HUD: React.FC<HUDProps> = ({ showProfile = true, showLang = true, showVoice = false }) => {
  const { stats, language, cycleLang, setScreen, voiceMode, toggleVoiceMode } = useGameStore()
  const tt = (hi: string, en: string, hg: string) => t3(hi, en, hg, language)

  const langLabel = language === 'hi' ? 'हिं' : language === 'en' ? 'EN' : 'Hi-En'

  const [isMobileView, setIsMobileView] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 860px)')
    const handleChange = () => setIsMobileView(media.matches)
    handleChange()

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      display: 'flex', gap: 8, alignItems: 'flex-start',
      padding: '10px 14px', pointerEvents: 'none',
      background: 'linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 100%)',
      zIndex: 20,
    }}>
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
        </div>
      ) : (
        <div className="glass-strong" style={{
          padding: '8px 14px', display: 'flex', gap: 12, alignItems: 'center', pointerEvents: 'all',
        }}>
          {/* Health Bar */}
          <div className="stat-bar-container">
            <div className="stat-bar-icon" style={{ color: '#ef4444' }}>
              <Heart size={16} fill="#ef4444" />
            </div>
            <div className="stat-bar-track" style={{ background: 'var(--health-bg)', minWidth: 80 }}>
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
              <Brain size={16} />
            </div>
            <div className="stat-bar-track" style={{ background: 'var(--wisdom-bg)', minWidth: 80 }}>
              <div className="stat-bar-fill" style={{
                width: `${stats.wisdom}%`,
                background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
              }} />
            </div>
            <span className="stat-bar-label" style={{ color: '#a78bfa' }}>{stats.wisdom}</span>
          </div>
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Action Buttons */}
      {isMobileView ? (
        <div style={{ position: 'relative', pointerEvents: 'all', display: 'flex', alignItems: 'center', gap: 8 }}>
          {showProfile && (
            <button onClick={() => setScreen('profile')} style={{
              background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(167,139,250,0.45)', borderRadius: 11,
              color: '#ede9fe', padding: '8px 8px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 800, fontFamily: 'var(--font-primary)',
            }}>
              <UserCircle size={14} />
            </button>
          )}
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
              position: 'absolute', top: 40, right: 0, minWidth: 160,
              padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
              borderRadius: 12,
            }}>
              {showVoice && (
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
              )}
              {showLang && (
                <button onClick={() => { cycleLang(); setMenuOpen(false) }} style={{
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 9, color: '#fde68a', fontSize: 12, fontWeight: 800,
                  padding: '8px 10px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <Languages size={14} /> {tt('भाषा', 'Language', 'Language')} {langLabel}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 6, pointerEvents: 'all' }}>
          {showProfile && (
            <button onClick={() => setScreen('profile')} style={{
              background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(167,139,250,0.45)', borderRadius: 10,
              color: '#ede9fe', fontSize: 11, fontWeight: 800, padding: '6px 10px',
              cursor: 'pointer', fontFamily: 'var(--font-primary)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <UserCircle size={14} /> {tt('प्रगति', 'Progress', 'Progress')}
            </button>
          )}
          {showVoice && (
            <button onClick={toggleVoiceMode} style={{
              background: voiceMode ? 'rgba(167,139,250,0.3)' : 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(12px)',
              border: voiceMode ? '1px solid rgba(167,139,250,0.5)' : '1px solid rgba(255,255,255,0.12)',
              borderRadius: 10, color: '#fff', padding: '6px 8px',
              cursor: 'pointer', display: 'flex', alignItems: 'center',
            }}>
              {voiceMode ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </button>
          )}
          {showLang && (
            <button onClick={cycleLang} style={{
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10,
              color: '#fde68a', fontSize: 11, fontWeight: 800, padding: '6px 10px',
              cursor: 'pointer', fontFamily: 'var(--font-primary)',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Languages size={14} /> {langLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
