import { getLastSpokenProvider, getVoiceEngineDiagnostics, sakhiSpeak, stopSpeaking, type SpeechLang } from './speech'

type BoliKhataGuideId = 'salary' | 'expense' | 'savings' | 'interest' | 'fd-rd' | 'voice' | 'full' | 'fd-rd-smart'

type VoiceSource = 'gemini-tts' | 'alt-cloud-tts' | 'offline-audio' | 'web-speech' | 'none'

interface SpeakBoliKhataGuideOptions {
  id?: BoliKhataGuideId
  text: string
  lang: SpeechLang
  emotion?: 'friendly' | 'calm' | 'excited' | 'urgent'
  speed?: number
}

interface SpeakBoliKhataGuideResult {
  source: VoiceSource
  reason: string
}

const AUDIO_BASE = '/audio/boli-khata'
const PLAY_START_TIMEOUT_MS = 1800

let activeBundledAudio: HTMLAudioElement | null = null
const preloadedAudioKeys = new Set<string>()

function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

function resolveBundledAudioPath(id: BoliKhataGuideId, lang: SpeechLang) {
  return `${AUDIO_BASE}/${lang}/${id}.mp3`
}

function stopBundledAudio() {
  if (!activeBundledAudio) return
  activeBundledAudio.pause()
  activeBundledAudio.currentTime = 0
  activeBundledAudio = null
}

async function tryPlayBundledAudio(path: string, speed = 1): Promise<boolean> {
  stopBundledAudio()
  stopSpeaking()

  const audio = new Audio(path)
  activeBundledAudio = audio
  audio.preload = 'auto'
  audio.setAttribute('playsinline', 'true')
  audio.setAttribute('webkit-playsinline', 'true')
  audio.playbackRate = Math.max(0.8, Math.min(1.2, speed))

  const started = await new Promise<boolean>((resolve) => {
    let settled = false

    const finalize = (ok: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      audio.onplaying = null
      audio.onerror = null
      resolve(ok)
    }

    const timeoutId = window.setTimeout(() => finalize(false), PLAY_START_TIMEOUT_MS)

    audio.onplaying = () => finalize(true)
    audio.onerror = () => finalize(false)

    void audio.play().then(() => finalize(true)).catch(() => finalize(false))
  })

  if (!started) {
    if (activeBundledAudio === audio) {
      activeBundledAudio = null
    }
    audio.pause()
    audio.currentTime = 0
  }

  return started
}

async function speakWithWebSpeechFallback(
  text: string,
  lang: SpeechLang,
  emotion: 'friendly' | 'calm' | 'excited' | 'urgent',
  speed: number,
): Promise<boolean> {
  const result = await sakhiSpeak(text, {
    lang,
    emotion,
    speed,
    interrupt: true,
    cacheable: true,
    forceGeminiOnly: false,
  })

  const diag = getVoiceEngineDiagnostics()
  return Boolean(result) || diag.provider === 'web-speech'
}

export async function speakBoliKhataGuide({
  id,
  text,
  lang,
  emotion = 'friendly',
  speed = 1,
}: SpeakBoliKhataGuideOptions): Promise<SpeakBoliKhataGuideResult> {
  const cleanText = text.trim()
  if (!cleanText) {
    return { source: 'none', reason: 'empty-text' }
  }

  const online = isOnline()

  if (online) {
    const beforeDiag = getVoiceEngineDiagnostics()

    const geminiAudio = await sakhiSpeak(cleanText, {
      lang,
      emotion,
      speed,
      interrupt: true,
      cacheable: true,
      forceGeminiOnly: true,
    })

    if (geminiAudio) {
      const provider = getLastSpokenProvider()
      if (provider === 'alt-cloud-tts') {
        return { source: 'alt-cloud-tts', reason: 'online-alt-cloud' }
      }
      return { source: 'gemini-tts', reason: 'online-gemini' }
    }

    if (id) {
      const bundledPath = resolveBundledAudioPath(id, lang)
      const bundledPlayed = await tryPlayBundledAudio(bundledPath, speed)
      if (bundledPlayed) {
        return { source: 'offline-audio', reason: 'online-gemini-failed-used-bundled' }
      }
    }

    const afterDiag = getVoiceEngineDiagnostics()
    if (!beforeDiag.apiConfigured || !afterDiag.apiConfigured) {
      return { source: 'none', reason: 'online-missing-api-key' }
    }
    if ((beforeDiag.geminiLocked || afterDiag.geminiLocked) && (beforeDiag.altCloudLocked || afterDiag.altCloudLocked)) {
      return { source: 'none', reason: 'online-all-cloud-locked-or-quota' }
    }
    if (beforeDiag.altCloudLocked || afterDiag.altCloudLocked) {
      return { source: 'none', reason: 'online-alt-cloud-locked-or-quota' }
    }
    if (beforeDiag.geminiLocked || afterDiag.geminiLocked) {
      return { source: 'none', reason: 'online-gemini-locked-or-quota' }
    }

    return { source: 'none', reason: 'online-gemini-unavailable' }
  }

  if (id) {
    const bundledPath = resolveBundledAudioPath(id, lang)
    const bundledPlayed = await tryPlayBundledAudio(bundledPath, speed)
    if (bundledPlayed) {
      return { source: 'offline-audio', reason: online ? 'gemini-failed-used-bundled' : 'offline-bundled' }
    }
  }

  const spoke = await speakWithWebSpeechFallback(cleanText, lang, emotion, speed)
  if (spoke) {
    return { source: 'web-speech', reason: online ? 'gemini-and-bundled-unavailable' : 'offline-web-speech' }
  }

  return { source: 'none', reason: online ? 'no-audio-engine-online' : 'no-audio-engine-offline' }
}

export function preloadBoliKhataBundledAudio(lang: SpeechLang) {
  if (typeof window === 'undefined') return

  const ids: BoliKhataGuideId[] = ['salary', 'expense', 'savings', 'interest', 'fd-rd', 'voice', 'full', 'fd-rd-smart']

  for (const id of ids) {
    const key = `${lang}:${id}`
    if (preloadedAudioKeys.has(key)) continue

    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'audio'
    link.href = resolveBundledAudioPath(id, lang)
    document.head.appendChild(link)
    preloadedAudioKeys.add(key)
  }
}
