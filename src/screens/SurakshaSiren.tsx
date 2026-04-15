import React, { useState, useEffect } from 'react'
import { useGameStore, t3 } from '../store/gameStore'
import { ShieldAlert, Phone, KeyRound, AlertTriangle, X, ExternalLink, MapPin } from 'lucide-react'

// Simple helper to get battery status if available
async function getBatteryLevel(): Promise<number | null> {
  try {
    if ('getBattery' in navigator) {
      const nav = navigator as any
      const battery = await nav.getBattery()
      return Math.round(battery.level * 100)
    }
  } catch (e) { }
  return null
}

export const SurakshaSiren: React.FC = () => {
  const { language, setScreen, emergencyContact, setEmergencyContact } = useGameStore()
  const tt = (hi: string, en: string, hg: string) => t3(hi, en, hg, language)

  const [contactInput, setContactInput] = useState(emergencyContact)
  const [isLocating, setIsLocating] = useState(false)
  const [sosLink, setSosLink] = useState('')

  // The moment they open it, prepare the Offline SOS payload
  useEffect(() => {
    async function prepareOfflineSos() {
      setIsLocating(true)
      let lat = ''
      let lng = ''
      
      // Get GPS via satellites/cell-towers (works without internet!)
      if ('geolocation' in navigator) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
               enableHighAccuracy: true, timeout: 5000, maximumAge: 0
            })
          })
          lat = pos.coords.latitude.toString()
          lng = pos.coords.longitude.toString()
        } catch (e) {
          console.log("Could not fetch GPS")
        }
      }

      const battery = await getBatteryLevel()

      let message = tt(
        'मदद! मैं खतरे में हूँ।',
        'Emergency! I need help immediately.',
        'Madad! Main khatre mein hoon.'
      )
      
      if (lat && lng) {
        message += `\nLocation: https://maps.google.com/?q=${lat},${lng}`
      } else {
        message += `\n(GPS offline, try calling me)`
      }

      if (battery !== null) {
        message += `\nBattery: ${battery}%`
      }

      const encodedMsg = encodeURIComponent(message)
      const targetNumber = emergencyContact || '112'
      
      // Check device for sms syntax (iOS use & instead of ?)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const separator = isIOS ? '&' : '?'
      
      setSosLink(`sms:${targetNumber}${separator}body=${encodedMsg}`)
      setIsLocating(false)
    }

    prepareOfflineSos()
  }, [emergencyContact, language, tt])

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
      color: '#f59e0b',
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
            {tt('स्मार्ट सुरक्षा सायरन', 'Smart Safety Siren', 'Smart Suraksha Siren')}
          </div>
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Offline SMART SOS Feature */}
      <div className="glass" style={{
        padding: '16px', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#fca5a5' }}>
          <MapPin size={18} />
          <span style={{ fontSize: 13, fontWeight: 700 }}>
             {tt('ऑफ़लाइन SMS SOS', 'Offline SMS SOS', 'Offline SMS SOS')}
          </span>
          <span style={{
            marginLeft: 'auto', fontSize: 10, background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 8
          }}>{tt('No Internet Needed', 'No Internet Needed', 'Bina Internet Ke')}</span>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 6 }}>
            {tt('आपातकालीन नंबर (Emergency Contact)', 'Emergency Contact', 'Emergency Number')}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input 
              type="tel" 
              value={contactInput}
              onChange={(e) => setContactInput(e.target.value)}
              placeholder="e.g. 9876543210"
              style={{
                flex: 1, background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', padding: '10px 14px', borderRadius: 8, fontSize: 16,
              }}
            />
            <button onClick={() => setEmergencyContact(contactInput)} style={{
              background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
              padding: '0 16px', fontWeight: 700, cursor: 'pointer',
            }}>
              {tt('Save', 'Save', 'Save')}
            </button>
          </div>
        </div>

        {/* Big Red Button - Triggers native SMS */}
        <a href={sosLink} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '24px', borderRadius: 16, marginTop: 16,
          background: emergencyContact ? '#ef4444' : 'rgba(239, 68, 68, 0.4)',
          color: '#fff', fontWeight: 900, fontSize: 20, textDecoration: 'none',
          boxShadow: emergencyContact ? '0 0 20px rgba(239, 68, 68, 0.5)' : 'none',
          pointerEvents: emergencyContact ? 'auto' : 'none',
          opacity: emergencyContact ? 1 : 0.5,
        }}>
          <AlertTriangle size={32} />
          {isLocating ? tt('लोकेशन ढूँढ रहे हैं...', 'Finding GPS...', 'Location Dhundh Rahe Hain...') : tt('मदद के लिए SMS भेजें', 'SEND SOS SMS', 'Madad Ke Liye SMS Bhejein')}
          <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.8, marginTop: 4 }}>
            {tt('GPS और बैटरी की जानकारी के साथ', '(Sends exact GPS + Battery Status)', 'GPS Aur Battery Ke Saath')}
          </div>
        </a>
        {!emergencyContact && (
          <div style={{ color: '#fbbf24', fontSize: 12, textAlign: 'center', marginTop: 10 }}>
            {tt('SOS चालू करने के लिए पहले नंबर सेव करें', 'Save a contact above to enable Smart SOS', 'SOS chalane ke liye parivar ka number save karein')}
          </div>
        )}
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
            {step.detail && (
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                {step.detail}
              </div>
            )}
            {step.link && (
              <a href={step.link} target="_blank" rel="noopener" style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                marginTop: 6, color: step.color, fontSize: 11, fontWeight: 700,
                textDecoration: 'none',
              }}>
                <ExternalLink size={12} /> {tt('Call Now', 'Call Now', 'Call Now')}
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
