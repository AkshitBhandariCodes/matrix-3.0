export type SpeechLang = 'hi' | 'en' | 'hinglish'

type SpeakEmotion = 'friendly' | 'excited' | 'calm' | 'urgent'

interface SpeakOptions {
  interrupt?: boolean
  rate?: number
  pitch?: number
  volume?: number
  emotion?: SpeakEmotion
  speed?: number
  cacheable?: boolean
}

export interface VoiceEngineInfo {
  provider: 'gemini-tts' | 'web-speech' | 'disabled'
  online: boolean
  apiConfigured: boolean
  voiceId: string
  modelId: string
}

const GEMINI_API_BASE_URL = (import.meta.env.VITE_GEMINI_API_BASE_URL as string | undefined)?.trim() || 'https://generativelanguage.googleapis.com/v1beta'
const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() || ''
const GEMINI_TTS_MODEL = (import.meta.env.VITE_GEMINI_TTS_MODEL as string | undefined)?.trim() || 'gemini-2.5-flash-preview-tts'
const GEMINI_TTS_VOICE = (import.meta.env.VITE_GEMINI_TTS_VOICE as string | undefined)?.trim() || 'Achird'

const SAKHI_AUDIO_CACHE = 'sakhi-audio-v3'
const SAKHI_AUDIO_CACHE_LIMIT_BYTES = 8 * 1024 * 1024
const GEMINI_TTS_SAMPLE_RATE = 24000
const GEMINI_TTS_LOCK_KEY = 'sakhi-gemini-tts-lock-until'
const TRANSIENT_TTS_LOCK_MS = 30 * 1000

export const SAKHI_PHRASES = [
  'Namaste Sakhi!',
  'Badhiya kaam!',
  'Dhyaan se suniye',
  'Loan repayment time!',
  'Wisdom plus 10!',
]

let activeAudio: HTMLAudioElement | null = null
let activeUtterance: SpeechSynthesisUtterance | null = null
let hasUserActivatedAudio = false
let speechQueue: Promise<void> = Promise.resolve()
let latestSpeechToken = 0
let activeSpeechAbortController: AbortController | null = null
let geminiTtsLockedUntil = readGeminiTtsLockUntil()
const inflightAudioRequests = new Map<string, Promise<Blob | null>>()
type UserActivationState = {
  hasBeenActive?: boolean
}

const HINDI_SPEECH_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bSHG\b/gi, replacement: 'एस एच जी' },
  { pattern: /\bUPI\b/gi, replacement: 'यू पी आई' },
  { pattern: /\bDBT\b/gi, replacement: 'डी बी टी' },
  { pattern: /\bNRLM\b/gi, replacement: 'एन आर एल एम' },
  { pattern: /\bPM\b/gi, replacement: 'पी एम' },
  { pattern: /\bMUDRA\b/gi, replacement: 'मुद्रा' },
]

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

function hasGeminiTtsConfig() {
  return GEMINI_API_KEY.length > 0
}

function canUseCacheApi() {
  return typeof window !== 'undefined' && 'caches' in window
}

function canUseWebSpeech() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && 'localStorage' in window
}

function readGeminiTtsLockUntil() {
  if (!canUseLocalStorage()) return 0

  const rawValue = window.localStorage.getItem(GEMINI_TTS_LOCK_KEY)
  const lockUntil = rawValue ? Number(rawValue) : 0
  return Number.isFinite(lockUntil) ? lockUntil : 0
}

function setGeminiTtsLockUntil(lockUntil: number) {
  geminiTtsLockedUntil = lockUntil

  if (!canUseLocalStorage()) return

  if (lockUntil > Date.now()) {
    window.localStorage.setItem(GEMINI_TTS_LOCK_KEY, String(lockUntil))
  } else {
    window.localStorage.removeItem(GEMINI_TTS_LOCK_KEY)
  }
}

function getNextLocalMidnightTimestamp() {
  const nextMidnight = new Date()
  nextMidnight.setHours(24, 0, 0, 0)
  return nextMidnight.getTime()
}

function isGeminiTtsLocked() {
  if (geminiTtsLockedUntil <= Date.now()) {
    if (geminiTtsLockedUntil !== 0) {
      setGeminiTtsLockUntil(0)
    }
    return false
  }

  return true
}

function cacheKeyForText(text: string, lang: SpeechLang, emotion: SpeakEmotion) {
  return `${GEMINI_API_BASE_URL}/tts-cache/${GEMINI_TTS_MODEL}/${GEMINI_TTS_VOICE}/${lang}/${emotion}?text=${encodeURIComponent(text)}`
}

async function openAudioCache() {
  if (!canUseCacheApi()) return null
  try {
    return await caches.open(SAKHI_AUDIO_CACHE)
  } catch {
    return null
  }
}

async function getCacheUsageBytes(cache: Cache): Promise<number> {
  const keys = await cache.keys()
  let total = 0

  for (const key of keys) {
    const response = await cache.match(key)
    if (!response) continue
    const blob = await response.clone().blob()
    total += blob.size
  }

  return total
}

async function fitBlobInCache(cache: Cache, incomingBlobSize: number) {
  let usedBytes = await getCacheUsageBytes(cache)
  if (usedBytes + incomingBlobSize <= SAKHI_AUDIO_CACHE_LIMIT_BYTES) return

  const keys = await cache.keys()
  for (const key of keys) {
    if (usedBytes + incomingBlobSize <= SAKHI_AUDIO_CACHE_LIMIT_BYTES) break
    const existing = await cache.match(key)
    if (existing) {
      const blob = await existing.clone().blob()
      usedBytes -= blob.size
    }
    await cache.delete(key)
  }
}

async function getCachedAudio(text: string, lang: SpeechLang, emotion: SpeakEmotion): Promise<Blob | null> {
  const cache = await openAudioCache()
  if (!cache) return null

  const request = new Request(cacheKeyForText(text, lang, emotion))
  const response = await cache.match(request)
  if (!response) return null

  return response.clone().blob()
}

async function cacheAudio(text: string, lang: SpeechLang, emotion: SpeakEmotion, blob: Blob) {
  const cache = await openAudioCache()
  if (!cache) return

  await fitBlobInCache(cache, blob.size)
  const request = new Request(cacheKeyForText(text, lang, emotion))
  const response = new Response(blob, {
    headers: {
      'Content-Type': 'audio/wav',
      'Cache-Control': 'max-age=604800',
    },
  })

  await cache.put(request, response)
}

function stopActiveAudio() {
  if (!activeAudio) return
  activeAudio.pause()
  activeAudio.currentTime = 0
  activeAudio = null
}

function stopActiveUtterance() {
  if (!canUseWebSpeech()) return
  window.speechSynthesis.cancel()
  activeUtterance = null
}

function stopActiveSpeechRequest() {
  if (!activeSpeechAbortController) return
  activeSpeechAbortController.abort()
  activeSpeechAbortController = null
}

function hasUserActivatedOnce() {
  if (hasUserActivatedAudio) return true

  if (typeof navigator !== 'undefined') {
    const userActivation = (navigator as Navigator & { userActivation?: UserActivationState }).userActivation
    if (userActivation?.hasBeenActive) {
      hasUserActivatedAudio = true
      return true
    }
  }

  return false
}

function ensureAudioActivationListeners() {
  if (typeof window === 'undefined' || hasUserActivatedOnce()) return

  const activate = () => {
    hasUserActivatedAudio = true
    window.removeEventListener('pointerdown', activate, true)
    window.removeEventListener('keydown', activate, true)
    window.removeEventListener('touchstart', activate, true)
  }

  window.addEventListener('pointerdown', activate, true)
  window.addEventListener('keydown', activate, true)
  window.addEventListener('touchstart', activate, true)
}

function normalizeSpeechTextForLang(text: string, lang: SpeechLang): string {
  let normalized = text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (lang === 'hi' || lang === 'hinglish') {
    normalized = normalized
      .replace(/₹\s*([\d,]+)/g, '$1 रुपये')
      .replace(/\//g, ' ')
      .replace(/&/g, ' और ')

    for (const entry of HINDI_SPEECH_REPLACEMENTS) {
      normalized = normalized.replace(entry.pattern, entry.replacement)
    }
  }

  return normalized.replace(/\s+/g, ' ').trim()
}

function getVoiceDirection(lang: SpeechLang, emotion: SpeakEmotion) {
  const style = emotion === 'urgent'
    ? 'clear, focused, slightly urgent but still supportive'
    : emotion === 'excited'
      ? 'encouraging, energetic, and celebratory'
      : emotion === 'calm'
        ? 'steady, warm, and reassuring'
        : 'friendly, caring, and easy to understand'

  const accent = lang === 'hi'
    ? 'Natural Indian Hindi with very clear pronunciation.'
    : lang === 'en'
      ? 'Indian English with warm, clear pronunciation.'
      : 'Natural Indian Hinglish with smooth Hindi-English code switching and strong Hindi pronunciation.'

  return { style, accent }
}

function buildGeminiTtsPrompt(text: string, lang: SpeechLang, emotion: SpeakEmotion) {
  const { style, accent } = getVoiceDirection(lang, emotion)

  return [
    '# AUDIO PROFILE: Sakhi Guide',
    '## THE SCENE: A supportive mentor is guiding a learner inside a mobile financial literacy game.',
    '### DIRECTORS NOTES',
    `Style: ${style}`,
    'Pacing: Medium pace, very clear, mobile-friendly, with natural sentence pauses.',
    `Accent: ${accent}`,
    '### TRANSCRIPT',
    text,
  ].join('\n')
}

async function getAvailableBrowserVoices() {
  if (!canUseWebSpeech()) return []

  const synth = window.speechSynthesis
  const loadedVoices = synth.getVoices()
  if (loadedVoices.length > 0) return loadedVoices

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const handleVoicesChanged = () => {
      window.clearTimeout(timeoutId)
      synth.removeEventListener('voiceschanged', handleVoicesChanged)
      resolve(synth.getVoices())
    }

    const timeoutId = window.setTimeout(() => {
      synth.removeEventListener('voiceschanged', handleVoicesChanged)
      resolve(synth.getVoices())
    }, 400)

    synth.addEventListener('voiceschanged', handleVoicesChanged)
  })
}

function scoreBrowserVoice(voice: SpeechSynthesisVoice, lang: SpeechLang) {
  const voiceLang = voice.lang.toLowerCase()
  const voiceName = voice.name.toLowerCase()
  let score = 0

  if (lang === 'hi') {
    if (voiceLang === 'hi-in') score += 100
    if (voiceLang.startsWith('hi')) score += 70
  } else if (lang === 'en') {
    if (voiceLang === 'en-in') score += 100
    if (voiceLang.startsWith('en')) score += 70
  } else {
    if (voiceLang === 'hi-in') score += 100
    if (voiceLang === 'en-in') score += 95
    if (voiceLang.startsWith('hi')) score += 75
    if (voiceLang.startsWith('en')) score += 70
  }

  if (voice.default) score += 8
  if (/google|microsoft|natural|online/i.test(voiceName)) score += 6
  if (/female|woman|india/i.test(voiceName)) score += 3

  return score
}

async function speakWithWebVoice(
  text: string,
  {
    lang,
    speed = 1,
    rate = 1,
    pitch = 1,
    volume = 1,
    interrupt = true,
  }: SpeakOptions & { lang: SpeechLang },
) {
  if (!canUseWebSpeech()) return null

  const synth = window.speechSynthesis
  const voices = await getAvailableBrowserVoices()
  const voice = [...voices].sort((left, right) => scoreBrowserVoice(right, lang) - scoreBrowserVoice(left, lang))[0] ?? null

  if (interrupt !== false) {
    stopActiveUtterance()
  }

  const utterance = new SpeechSynthesisUtterance(text)
  activeUtterance = utterance
  utterance.voice = voice
  utterance.lang = voice?.lang || (lang === 'en' ? 'en-IN' : 'hi-IN')
  utterance.rate = clamp(rate * speed, 0.8, 1.2)
  utterance.pitch = clamp(pitch, 0.85, 1.15)
  utterance.volume = clamp(volume, 0, 1)
  utterance.onend = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null
    }
  }
  utterance.onerror = () => {
    if (activeUtterance === utterance) {
      activeUtterance = null
    }
  }

  try {
    synth.speak(utterance)
  } catch {
    if (activeUtterance === utterance) {
      activeUtterance = null
    }
  }

  return null
}

function base64ToBytes(base64: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

function writeAscii(view: DataView, offset: number, value: string) {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i))
  }
}

function pcmToWavBlob(pcmBytes: Uint8Array, sampleRate = GEMINI_TTS_SAMPLE_RATE, channels = 1, bitsPerSample = 16) {
  const header = new ArrayBuffer(44)
  const view = new DataView(header)
  const byteRate = sampleRate * channels * (bitsPerSample / 8)
  const blockAlign = channels * (bitsPerSample / 8)
  const audioBytes = new Uint8Array(pcmBytes.byteLength)
  audioBytes.set(pcmBytes)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + pcmBytes.length, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, pcmBytes.length, true)

  return new Blob([header, audioBytes.buffer], { type: 'audio/wav' })
}

function extractGeminiAudioBase64(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>
  const candidates = Array.isArray(record.candidates) ? record.candidates : []

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue
    const content = (candidate as Record<string, unknown>).content
    if (!content || typeof content !== 'object') continue
    const parts = Array.isArray((content as Record<string, unknown>).parts)
      ? (content as Record<string, unknown>).parts as Array<Record<string, unknown>>
      : []

    for (const part of parts) {
      const inlineData = part.inlineData
      if (!inlineData || typeof inlineData !== 'object') continue
      const data = (inlineData as Record<string, unknown>).data
      if (typeof data === 'string' && data.trim()) {
        return data
      }
    }
  }

  return null
}

async function requestGeminiAudio(
  text: string,
  {
    lang,
    emotion = 'friendly',
    cacheable = true,
    signal,
  }: {
    lang: SpeechLang
    emotion?: SpeakEmotion
    cacheable?: boolean
    signal?: AbortSignal
  },
): Promise<Blob | null> {
  if (!hasGeminiTtsConfig()) return null
  if (isGeminiTtsLocked()) return null

  const requestKey = cacheKeyForText(text, lang, emotion)

  if (cacheable) {
    const cached = await getCachedAudio(text, lang, emotion)
    if (cached) return cached
  }

  const existingRequest = inflightAudioRequests.get(requestKey)
  if (existingRequest) {
    return existingRequest
  }

  const requestPromise = (async () => {
    let lastError: Error | null = null

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(`${GEMINI_API_BASE_URL}/models/${encodeURIComponent(GEMINI_TTS_MODEL)}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY,
        },
        signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildGeminiTtsPrompt(text, lang, emotion),
                },
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: GEMINI_TTS_VOICE,
                },
              },
            },
          },
        }),
      })

      if (response.ok) {
        const json = await response.json()
        const base64Audio = extractGeminiAudioBase64(json)
        if (!base64Audio) {
          throw new Error('Gemini TTS returned no audio payload')
        }

        const blob = pcmToWavBlob(base64ToBytes(base64Audio))
        if (cacheable) {
          void cacheAudio(text, lang, emotion, blob)
        }
        return blob
      }

      const errorText = await response.text()

      if (response.status === 429) {
        const isDailyQuotaLimit = /GenerateRequestsPerDayPerProjectPerModel-FreeTier|quota exceeded/i.test(errorText)
        setGeminiTtsLockUntil(isDailyQuotaLimit ? getNextLocalMidnightTimestamp() : Date.now() + TRANSIENT_TTS_LOCK_MS)
        throw new Error(isDailyQuotaLimit ? 'Gemini TTS daily quota exhausted' : 'Gemini TTS temporarily rate limited')
      }

      lastError = new Error(errorText || `Gemini TTS failed with status ${response.status}`)
      if (response.status < 500) {
        break
      }

      await new Promise((resolve) => window.setTimeout(resolve, 900 * (attempt + 1)))
    }

    throw lastError ?? new Error('Gemini TTS failed')
  })()

  inflightAudioRequests.set(requestKey, requestPromise)

  try {
    return await requestPromise
  } finally {
    inflightAudioRequests.delete(requestKey)
  }
}

async function playAudioBlob(blob: Blob, speed = 1): Promise<HTMLAudioElement | null> {
  stopActiveAudio()

  const audioUrl = URL.createObjectURL(blob)
  const audio = new Audio(audioUrl)
  activeAudio = audio
  audio.preload = 'auto'
  audio.setAttribute('playsinline', 'true')
  audio.setAttribute('webkit-playsinline', 'true')
  audio.playbackRate = clamp(speed, 0.75, 1.25)

  const cleanup = () => {
    URL.revokeObjectURL(audioUrl)
    if (activeAudio === audio) activeAudio = null
  }

  audio.onended = cleanup
  audio.onerror = cleanup

  try {
    await audio.play()
    return audio
  } catch {
    cleanup()
    return null
  }
}

export function getVoiceEngineInfo(): VoiceEngineInfo {
  const hasGeminiVoice = isOnline() && hasGeminiTtsConfig() && !isGeminiTtsLocked()
  const hasBrowserVoice = canUseWebSpeech()

  return {
    provider: hasGeminiVoice ? 'gemini-tts' : hasBrowserVoice ? 'web-speech' : 'disabled',
    online: isOnline(),
    apiConfigured: hasGeminiTtsConfig(),
    voiceId: GEMINI_TTS_VOICE,
    modelId: GEMINI_TTS_MODEL,
  }
}

export async function sakhiSpeak(
  text: string,
  {
    lang = 'hinglish',
    emotion = 'friendly',
    speed = 1,
    rate = 1,
    pitch = 1,
    volume = 1,
    interrupt = true,
    cacheable = true,
  }: SpeakOptions & { lang?: SpeechLang } = {},
): Promise<HTMLAudioElement | null> {
  const cleanText = text.trim()
  if (!cleanText) return null

  const speechText = normalizeSpeechTextForLang(cleanText, lang)
  if (!speechText) return null

  ensureAudioActivationListeners()

  if (interrupt !== false) {
    latestSpeechToken += 1
    stopSpeaking()
  }

  const canAttemptGemini = isOnline() && hasGeminiTtsConfig() && !isGeminiTtsLocked()
  const canAttemptBrowserVoice = canUseWebSpeech()

  if (!canAttemptGemini && !canAttemptBrowserVoice) {
    return null
  }

  if (!hasUserActivatedOnce()) {
    return null
  }

  let playedAudio: HTMLAudioElement | null = null
  const speechToken = latestSpeechToken
  speechQueue = speechQueue.then(async () => {
    try {
      if (interrupt !== false && speechToken !== latestSpeechToken) return

      if (canAttemptGemini) {
        const abortController = new AbortController()
        activeSpeechAbortController = abortController
        const blob = await requestGeminiAudio(speechText, {
          lang,
          emotion,
          cacheable,
          signal: abortController.signal,
        })
        if (activeSpeechAbortController === abortController) {
          activeSpeechAbortController = null
        }

        if (interrupt !== false && speechToken !== latestSpeechToken) return
        if (blob) {
          playedAudio = await playAudioBlob(blob, speed)
          return
        }
      }

      if (interrupt !== false && speechToken !== latestSpeechToken) return
      if (!canAttemptBrowserVoice) return
      playedAudio = await speakWithWebVoice(speechText, { lang, speed, rate, pitch, volume, interrupt })
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        return
      }

      if (interrupt !== false && speechToken !== latestSpeechToken) return
      if (canAttemptBrowserVoice) {
        playedAudio = await speakWithWebVoice(speechText, { lang, speed, rate, pitch, volume, interrupt })
        return
      }

      if (import.meta.env.DEV) {
        console.warn('Gemini TTS unavailable', error)
      }
    }
  })

  await speechQueue
  return playedAudio
}

export function speak(text: string, lang: SpeechLang, options: SpeakOptions = {}) {
  void sakhiSpeak(text, { ...options, lang })
}

export function speakButton(text: string, lang: SpeechLang) {
  speak(text, lang, { emotion: 'friendly', speed: 1.0, rate: 1.0, volume: 0.95, interrupt: true })
}

export function stopSpeaking() {
  stopActiveSpeechRequest()
  stopActiveAudio()
  stopActiveUtterance()
}

export async function preloadCriticalAudio() {
  // Disabled to avoid spending TTS quota before the user interacts.
}
