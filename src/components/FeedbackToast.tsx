import React, { useEffect } from 'react'
import { useGameStore } from '../store/gameStore'

export const FeedbackToast: React.FC = () => {
  const { lastFeedback, lastFeedbackGood, lastStatDeltas, clearFeedback } = useGameStore()

  useEffect(() => {
    if (lastFeedback) {
      const timer = setTimeout(() => clearFeedback(), 4000)
      return () => clearTimeout(timer)
    }
  }, [lastFeedback, clearFeedback])

  if (!lastFeedback) return null

  const isGood = lastFeedbackGood ?? false
  const accentColor = isGood ? 'var(--good-color)' : 'var(--bad-color)'

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: 420,
        zIndex: 500,
        animation: 'slideUp 0.4s ease forwards',
      }}
    >
      <div
        style={{
          background: isGood
            ? 'rgba(16, 185, 129, 0.12)'
            : 'rgba(239, 68, 68, 0.12)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: `1px solid ${isGood ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderLeft: `4px solid ${accentColor}`,
          borderRadius: 16,
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Icon */}
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: `${accentColor}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>
            {isGood ? '✅' : '⚠️'}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 12, lineHeight: 1.5, margin: 0,
              fontWeight: 500,
            }}>
              {lastFeedback}
            </p>

            {/* Stat deltas */}
            {lastStatDeltas && (
              <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
                {lastStatDeltas.health != null && lastStatDeltas.health !== 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 800,
                    color: lastStatDeltas.health > 0 ? '#4ade80' : '#f87171',
                  }}>
                    ❤️ {lastStatDeltas.health > 0 ? '+' : ''}{lastStatDeltas.health}
                  </span>
                )}
                {lastStatDeltas.wisdom != null && lastStatDeltas.wisdom !== 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 800,
                    color: lastStatDeltas.wisdom > 0 ? '#c084fc' : '#f87171',
                  }}>
                    🌟 {lastStatDeltas.wisdom > 0 ? '+' : ''}{lastStatDeltas.wisdom}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Close */}
          <button
            onClick={clearFeedback}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.3)', fontSize: 18,
              cursor: 'pointer', flexShrink: 0,
              padding: 0, lineHeight: 1,
            }}
          >×</button>
        </div>
      </div>
    </div>
  )
}
