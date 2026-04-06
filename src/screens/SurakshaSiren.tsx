import React from 'react'
import { useGameStore, t3 } from '../store/gameStore'
import { ShieldAlert, Phone, KeyRound, AlertTriangle, X, ExternalLink, Ban } from 'lucide-react'

export const SurakshaSiren: React.FC = () => {
  const { language, setScreen } = useGameStore()
  const tt = (hi: string, en: string, hg: string) => t3(hi, en, hg, language)

  const steps = [
    {
      icon: <Phone size={20} />,
      title: tt('Cybercrime Helpline', 'Cybercrime Helpline', 'Cybercrime Helpline'),
      detail: tt('तुरंत 1930 पर कॉल करें', 'Call 1930 immediately', 'Turant 1930 par call karo'),
      color: '#ef4444',
      link: 'tel:1930',
    },
    {
      icon: <KeyRound size={20} />,
      title: tt('OTP कभी न बताएं', 'NEVER Share OTP', 'OTP KABHI share mat karo'),
      detail: tt('कोई भी Bank OTP नहीं माँगता — ना पति, ना दोस्त, ना Bank वाला', 'No bank asks for OTP — not spouse, not friend, not bank staff', 'Koi bhi Bank OTP nahi maangta — na pati, na dost, na Bank wala'),
      color: '#f59e0b',
    },
    {
      icon: <Ban size={20} />,
      title: tt('UPI ब्लॉक करें', 'Block UPI', 'UPI Block karo'),
      detail: tt('1. Bank को call करो\n2. UPI app मे जाकर "Block" करो\n3. SIM बंद करवाओ अगर phone चोरी हुआ', '1. Call your bank\n2. Go to UPI app → Block\n3. Block SIM if phone stolen', '1. Bank ko call karo\n2. UPI app mein "Block" karo\n3. SIM band karwao agar phone chori hua'),
      color: '#3b82f6',
    },
    {
      icon: <ExternalLink size={20} />,
      title: tt('Online शिकायत करें', 'Report Online', 'Online Complaint karo'),
      detail: 'cybercrime.gov.in',
      color: '#10b981',
      link: 'https://cybercrime.gov.in',
    },
  ]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'radial-gradient(ellipse at top, #1a0000 0%, #050a0e 70%)',
      padding: '20px 16px', overflowY: 'auto', gap: 14,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => setScreen('hub')} style={{
          background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 12,
          color: '#fff', fontSize: 14, fontWeight: 700, padding: '10px 16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <X size={16} /> {tt('बंद करें', 'Close', 'Band karo')}
        </button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            color: '#ef4444', fontWeight: 900, fontSize: 18,
          }}>
            <ShieldAlert size={24} />
            {tt('सुरक्षा सायरन', 'Safety Siren', 'Suraksha Siren')}
          </div>
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Emergency Banner */}
      <div style={{
        background: 'rgba(239,68,68,0.15)', border: '2px solid rgba(239,68,68,0.4)',
        borderRadius: 16, padding: '16px 18px', textAlign: 'center',
        animation: 'heartbeat 2s ease-in-out infinite',
      }}>
        <AlertTriangle size={32} color="#ef4444" style={{ marginBottom: 8 }} />
        <div style={{ color: '#f87171', fontWeight: 900, fontSize: 22, marginBottom: 4 }}>
          1930
        </div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600 }}>
          {tt('Cyber Fraud Helpline — 24×7 उपलब्ध', 'Cyber Fraud Helpline — Available 24×7', 'Cyber Fraud Helpline — 24×7 available')}
        </div>
        <a href="tel:1930" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          marginTop: 10, padding: '10px 24px', borderRadius: 12,
          background: '#ef4444', color: '#fff', fontWeight: 800, fontSize: 14,
          textDecoration: 'none',
        }}>
          <Phone size={16} /> {tt('अभी कॉल करें', 'Call Now', 'Abhi Call Karo')}
        </a>
      </div>

      {/* Steps */}
      {steps.map((step, idx) => (
        <div key={idx} className="glass" style={{
          padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start',
          borderColor: `${step.color}33`, animation: `fadeInUp 0.3s ${idx * 0.1}s ease both`,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: `${step.color}22`, border: `1px solid ${step.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: step.color, flexShrink: 0,
          }}>
            {step.icon}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: step.color, fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
              {step.title}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {step.detail}
            </div>
            {step.link && (
              <a href={step.link} target="_blank" rel="noopener" style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                marginTop: 6, color: step.color, fontSize: 11, fontWeight: 700,
                textDecoration: 'none',
              }}>
                <ExternalLink size={12} /> {tt('खोलें', 'Open', 'Kholein')}
              </a>
            )}
          </div>
        </div>
      ))}

      {/* Govt Scheme Links */}
      <div className="glass" style={{ padding: '14px 16px', borderColor: 'rgba(167,139,250,0.2)' }}>
        <div style={{ color: '#a78bfa', fontWeight: 800, fontSize: 13, marginBottom: 10 }}>
          {tt('ज़रूरी सरकारी हेल्पलाइन', 'Important Helplines', 'Zaroori Helplines')}
        </div>
        {[
          { num: '1930', label: tt('Cyber Crime', 'Cyber Crime', 'Cyber Crime') },
          { num: '181', label: tt('Women Helpline', 'Women Helpline', 'Women Helpline') },
          { num: '112', label: tt('Emergency', 'Emergency', 'Emergency') },
          { num: '14444', label: tt('PM Helpline (Schemes)', 'PM Helpline (Schemes)', 'PM Helpline (Schemes)') },
        ].map((h) => (
          <div key={h.num} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{h.label}</span>
            <a href={`tel:${h.num}`} style={{
              color: '#a78bfa', fontWeight: 800, fontSize: 13, textDecoration: 'none',
            }}>{h.num}</a>
          </div>
        ))}
      </div>
    </div>
  )
}
