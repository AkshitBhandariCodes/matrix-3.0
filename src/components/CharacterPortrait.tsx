import React from 'react'
import type { Expression } from '../data/realms'

const EXPRESSION_CONFIG: Record<Expression, { ring: string; label_hi: string; label_en: string }> = {
  happy:   { ring: '#4ade80', label_hi: 'खुश', label_en: 'Happy' },
  sad:     { ring: '#60a5fa', label_hi: 'उदास', label_en: 'Sad' },
  angry:   { ring: '#f87171', label_hi: 'नाराज़', label_en: 'Upset' },
  thinking:{ ring: '#fbbf24', label_hi: 'सोच रही हूं', label_en: 'Thinking' },
  neutral: { ring: '#a78bfa', label_hi: 'शांत', label_en: 'Calm' },
}

interface Props {
  image: string
  name: string
  expression?: Expression
  accentColor: string
  size?: number
  showExpression?: boolean
  language?: 'hi' | 'en'
}

export const CharacterPortrait: React.FC<Props> = ({
  image,
  name,
  expression = 'neutral',
  accentColor,
  size = 64,
  showExpression = false,
  language = 'hi',
}) => {
  const expr = EXPRESSION_CONFIG[expression]
  const ringColor = expr.ring

  return (
    <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      {/* Portrait container */}
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          border: `3px solid ${ringColor}`,
          boxShadow: `0 0 16px ${ringColor}44, inset 0 0 12px ${accentColor}22`,
          background: `radial-gradient(circle, ${accentColor}22, ${accentColor}08)`,
          transition: 'border-color 0.5s ease, box-shadow 0.5s ease',
          flexShrink: 0,
        }}
      >
        <img
          src={image}
          alt={name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center top',
          }}
          loading="lazy"
        />
      </div>

      {/* Expression badge */}
      {showExpression && (
        <div
          style={{
            background: `${ringColor}18`,
            border: `1px solid ${ringColor}55`,
            borderRadius: 8,
            padding: '2px 8px',
            fontSize: 10,
            fontWeight: 700,
            color: ringColor,
            whiteSpace: 'nowrap',
          }}
        >
          {language === 'hi' ? expr.label_hi : expr.label_en}
        </div>
      )}
    </div>
  )
}
