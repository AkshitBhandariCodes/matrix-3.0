import React from 'react'

interface Props {
  active: boolean
  color: string
}

export const PortalTransition: React.FC<Props> = ({ active, color }) => {
  if (!active) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.9)',
        animation: 'fadeIn 0.3s ease forwards',
      }}
    >
      {/* Portal vortex effect */}
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `conic-gradient(from 0deg, ${color}, transparent, ${color}88, transparent, ${color})`,
          animation: 'spin 1s linear infinite',
          filter: `blur(2px) drop-shadow(0 0 40px ${color})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}cc, ${color}44, transparent)`,
          animation: 'pulse 0.5s ease-in-out infinite',
          filter: `blur(4px)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: '#fff',
          filter: `blur(8px)`,
          animation: 'pulse 0.4s ease-in-out infinite alternate',
        }}
      />

      {/* Flying particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 8px ${color}`,
            animation: `confetti ${0.7 + (i % 5) * 0.14}s ease-out ${i * 0.05}s infinite`,
            top: '50%',
            left: '50%',
            transform: `rotate(${i * 30}deg) translateY(-60px)`,
          }}
        />
      ))}
    </div>
  )
}
