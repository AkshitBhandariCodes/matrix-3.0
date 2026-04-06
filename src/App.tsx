import { useEffect } from 'react'
import { useGameStore } from './store/gameStore'
import { IntroScreen } from './screens/IntroScreen'
import { HubScreen } from './screens/HubScreen'
import { RealmScreen } from './screens/RealmScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { ProfileScreen } from './screens/ProfileScreen'
import { CertificateScreen } from './screens/CertificateScreen'
import { ZarooratGame } from './screens/ZarooratGame'
import { realm1, realm2, realm3, realm4, realm5 } from './data/realms'
import { preloadCriticalAudio } from './utils/speech'
import { PROTOTYPE_MODE, isRealmEnabled, type RealmScreen as PrototypeRealmScreen } from './config/prototype'

const isRealmScreen = (value: string): value is PrototypeRealmScreen =>
  value === 'realm1' || value === 'realm2' || value === 'realm3' || value === 'realm4' || value === 'realm5'

function App() {
  const { screen, transitioning, transitionColor, setScreen } = useGameStore()

  useEffect(() => {
    void preloadCriticalAudio()
  }, [])

  useEffect(() => {
    if (!PROTOTYPE_MODE) return

    if (screen === 'suraksha' || screen === 'sakhisathi') {
      setScreen('hub')
      return
    }

    if (isRealmScreen(screen) && !isRealmEnabled(screen)) {
      setScreen('hub')
    }
  }, [screen, setScreen])

  const realmMap: Record<string, typeof realm1> = {
    realm1, realm2, realm3, realm4, realm5,
  }
  const realmNumMap: Record<string, 1|2|3|4|5> = {
    realm1: 1, realm2: 2, realm3: 3, realm4: 4, realm5: 5,
  }

  const renderScreen = () => {
    switch (screen) {
      case 'intro': return <IntroScreen />
      case 'hub': return <HubScreen />
      case 'realm1': case 'realm2': case 'realm3': case 'realm4': case 'realm5':
        if (PROTOTYPE_MODE && !isRealmEnabled(screen)) return <HubScreen />
        return <RealmScreen realm={realmMap[screen]} realmNumber={realmNumMap[screen]} />
      case 'results': case 'gameover': return <ResultsScreen />
      case 'profile': return <ProfileScreen />
      case 'certificate': return <CertificateScreen />
      case 'zaroorat': return <ZarooratGame />
      default: return <IntroScreen />
    }
  }

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'var(--bg-deep)',
      position: 'relative', overflow: 'hidden',
    }}>
      {renderScreen()}

      {/* Screen transition overlay */}
      {transitioning && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: transitionColor,
          animation: 'portalWarp 1s ease forwards',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            border: '4px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      )}
    </div>
  )
}

export default App
