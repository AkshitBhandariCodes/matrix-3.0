import React, { useRef } from 'react'
import { useGameStore, t3 } from '../store/gameStore'
// Fixed unused import
import { Award, ArrowLeft, Download, Share2, Star, Heart, Brain } from 'lucide-react'
import { isRealmEnabled, type RealmScreen } from '../config/prototype'

export const CertificateScreen: React.FC = () => {
  const {
    playerName, stats, language, setScreen,
    realm1Completed, realm2Completed, realm3Completed, realm4Completed, realm5Completed,
    realm1Score, realm2Score, realm3Score, realm4Score, realm5Score,
  } = useGameStore()
  const certRef = useRef<HTMLDivElement>(null)
  const tt = (hi: string, en: string, hg: string) => t3(hi, en, hg, language)

  const realmProgress: Record<RealmScreen, { completed: boolean; score: number }> = {
    realm1: { completed: realm1Completed, score: realm1Score },
    realm2: { completed: realm2Completed, score: realm2Score },
    realm3: { completed: realm3Completed, score: realm3Score },
    realm4: { completed: realm4Completed, score: realm4Score },
    realm5: { completed: realm5Completed, score: realm5Score },
  }

  const playableRealms = (Object.keys(realmProgress) as RealmScreen[])
    .filter((realmScreen) => isRealmEnabled(realmScreen))
  const completedCount = playableRealms.filter((realmScreen) => realmProgress[realmScreen].completed).length
  const totalScore = playableRealms.reduce((sum, realmScreen) => sum + realmProgress[realmScreen].score, 0)
  const playableRealmCount = playableRealms.length
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

  const handleDownload = async () => {
    if (!certRef.current) return
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 800
      canvas.height = 560
      const ctx = canvas.getContext('2d')!

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 800, 560)
      grad.addColorStop(0, '#1e1b4b')
      grad.addColorStop(0.5, '#312e81')
      grad.addColorStop(1, '#1e1b4b')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 800, 560)

      // Border
      ctx.strokeStyle = '#a78bfa'
      ctx.lineWidth = 4
      ctx.strokeRect(12, 12, 776, 536)
      ctx.setLineDash([8, 6])
      ctx.strokeStyle = 'rgba(167,139,250,0.3)'
      ctx.lineWidth = 2
      ctx.strokeRect(20, 20, 760, 520)
      ctx.setLineDash([])

      // Star decoration
      ctx.fillStyle = '#fde68a'
      ctx.font = '40px serif'
      ctx.textAlign = 'center'
      ctx.fillText('★', 400, 80)

      // Title
      ctx.fillStyle = '#a78bfa'
      ctx.font = 'bold 14px Inter, sans-serif'
      ctx.letterSpacing = '4px'
      ctx.fillText('CERTIFICATE OF ACHIEVEMENT', 400, 120)

      // Award title
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 28px Inter, sans-serif'
      ctx.fillText('Financial Sakhi Certificate', 400, 165)

      // Subtitle
      ctx.fillStyle = 'rgba(255,255,255,0.6)'
      ctx.font = '14px Inter, sans-serif'
      ctx.fillText('सखी की उड़ान — Women\'s Financial Literacy RPG', 400, 195)

      // Divider
      ctx.strokeStyle = 'rgba(167,139,250,0.4)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(200, 215)
      ctx.lineTo(600, 215)
      ctx.stroke()

      // Name
      ctx.fillStyle = '#fde68a'
      ctx.font = '12px Inter, sans-serif'
      ctx.fillText('This certifies that', 400, 250)
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 36px Inter, sans-serif'
      ctx.fillText(playerName, 400, 295)

      // Achievement text
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.font = '14px Inter, sans-serif'
      ctx.fillText(`has completed ${completedCount}/${playableRealmCount} Financial Literacy Realms`, 400, 330)
      ctx.fillText(`with a score of ${totalScore} points`, 400, 355)

      // Stats
      ctx.fillStyle = '#ef4444'
      ctx.font = 'bold 16px Inter, sans-serif'
      ctx.fillText(`❤ Health: ${stats.health}`, 300, 400)
      ctx.fillStyle = '#a78bfa'
      ctx.fillText(`★ Wisdom: ${stats.wisdom}`, 500, 400)

      // Date
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '12px Inter, sans-serif'
      ctx.fillText(date, 400, 450)

      // Footer
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '10px Inter, sans-serif'
      ctx.fillText('Sakhi Ki Udaan • Financial Literacy for Rural Women & Children', 400, 520)

      const link = document.createElement('a')
      link.download = `SakhiKiUdaan_Certificate_${playerName}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('Certificate download failed', err)
    }
  }

  const handleShare = async () => {
    const text = tt(
      `🏆 मैंने "${playerName}" के रूप में सखी की उड़ान में ${completedCount}/${playableRealmCount} Realms पूरे किए! Score: ${totalScore}. आप भी खेलें!`,
      `🏆 I completed ${completedCount}/${playableRealmCount} Realms in Sakhi Ki Udaan as "${playerName}"! Score: ${totalScore}. Play now!`,
      `🏆 Maine "${playerName}" ke roop mein Sakhi Ki Udaan mein ${completedCount}/${playableRealmCount} Realms complete kiye! Score: ${totalScore}. Tum bhi khelo!`,
    )
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Sakhi Ki Udaan Certificate', text })
      } catch (error) {
        const shareError = error as { name?: string }
        if (shareError?.name !== 'AbortError') {
          console.error('Sharing failed', error)
        }
      }
    } else {
      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
      window.open(waUrl, '_blank')
    }
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      height: '100%', padding: '20px 16px', gap: 16,
      background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #050a0e 70%)',
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center' }}>
        <button onClick={() => setScreen('hub')} style={{
          background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 12,
          color: '#fff', fontSize: 14, fontWeight: 700, padding: '10px 16px',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <ArrowLeft size={16} /> {tt('वापस', 'Back', 'Wapas')}
        </button>
      </div>

      {/* Certificate Card */}
      <div ref={certRef} className="certificate-container" style={{
        width: '100%', maxWidth: 440, animation: 'scaleIn 0.5s ease',
      }}>
        <div style={{ textAlign: 'center' }}>
          <Award size={48} color="#fde68a" style={{ marginBottom: 10 }} />
          <div style={{
            fontSize: 10, fontWeight: 800, letterSpacing: 3, color: '#a78bfa',
            textTransform: 'uppercase', marginBottom: 6,
          }}>
            Certificate of Achievement
          </div>
          <h2 style={{
            fontSize: 22, fontWeight: 900, color: '#fff', margin: '4px 0',
            background: 'linear-gradient(135deg, #a78bfa, #ec4899, #f59e0b)',
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            animation: 'gradientShift 4s ease infinite',
          }}>
            Financial Sakhi
          </h2>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
            {tt('सखी की उड़ान — वित्तीय साक्षरता', 'Sakhi Ki Udaan — Financial Literacy', 'Sakhi Ki Udaan — Financial Literacy')}
          </div>

          <div style={{ width: 60, height: 1, background: 'rgba(167,139,250,0.3)', margin: '0 auto 16px' }} />

          <div style={{ fontSize: 11, color: '#fde68a', marginBottom: 4 }}>
            {tt('यह प्रमाणित करता है कि', 'This certifies that', 'Yeh certify karta hai ki')}
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 8 }}>
            {playerName}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 16 }}>
            {tt(
              `ने ${completedCount}/${playableRealmCount} Financial Literacy Realms पूरे किए`,
              `completed ${completedCount}/${playableRealmCount} Financial Literacy Realms`,
              `ne ${completedCount}/${playableRealmCount} Financial Literacy Realms complete kiye`,
            )}
            <br />
            {tt(`कुल स्कोर: ${totalScore}`, `Total Score: ${totalScore}`, `Total Score: ${totalScore}`)}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Heart size={16} color="#ef4444" fill="#ef4444" />
              <span style={{ color: '#ef4444', fontWeight: 800, fontSize: 16 }}>{stats.health}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Brain size={16} color="#a78bfa" />
              <span style={{ color: '#a78bfa', fontWeight: 800, fontSize: 16 }}>{stats.wisdom}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Star size={16} color="#fde68a" fill="#fde68a" />
              <span style={{ color: '#fde68a', fontWeight: 800, fontSize: 16 }}>{totalScore}</span>
            </div>
          </div>

          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{date}</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 440 }}>
        <button onClick={handleDownload} className="btn-primary" style={{
          flex: 1, background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
          boxShadow: '0 6px 24px rgba(124,58,237,0.4)',
        }}>
          <Download size={18} /> {tt('Download करें', 'Download', 'Download karo')}
        </button>
        <button onClick={handleShare} className="btn-glass" style={{ flex: 1 }}>
          <Share2 size={18} /> WhatsApp
        </button>
      </div>
    </div>
  )
}
