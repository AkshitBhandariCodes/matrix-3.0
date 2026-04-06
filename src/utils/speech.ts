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
  provider: 'elevenlabs' | 'browser-fallback'
  online: boolean
  apiConfigured: boolean
  voiceId: string
  modelId: string
}

const ELEVENLABS_API_KEY = (import.meta.env.VITE_ELEVENLABS_API_KEY as string | undefined)?.trim() ?? ''
const ELEVENLABS_VOICE_ID = (import.meta.env.VITE_ELEVENLABS_VOICE_ID as string | undefined)?.trim() || 'trxRCYtDC6qFREKq6Ek2'
const ELEVENLABS_MODEL_ID = (import.meta.env.VITE_ELEVENLABS_MODEL_ID as string | undefined)?.trim() || 'eleven_multilingual_v2'
const ELEVENLABS_BASE_URL = (import.meta.env.VITE_ELEVENLABS_BASE_URL as string | undefined)?.trim() || 'https://api.elevenlabs.io'

const SAKHI_AUDIO_CACHE = 'sakhi-audio-v1'
const SAKHI_AUDIO_CACHE_LIMIT_BYTES = 5 * 1024 * 1024

export const SAKHI_PHRASES = [
  'Namaste Sakhi!',
  'Badhiya kaam!',
  'Dhyaan se suniye',
  'Loan repayment time!',
  'Wisdom plus 10!',
]

const DEVA_RX = /[\u0900-\u097F]/
const LATIN_RX = /[A-Za-z]/

let activeAudio: HTMLAudioElement | null = null
let cachedHindiVoice: SpeechSynthesisVoice | null = null
let cachedEnglishVoice: SpeechSynthesisVoice | null = null

const STYLE_BY_EMOTION: Record<SpeakEmotion, number> = {
  friendly: 0.2,
  excited: 0.45,
  calm: 0.1,
  urgent: 0.32,
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}

function hasWebSpeech() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function hasElevenLabsConfig() {
  return ELEVENLABS_API_KEY.length > 0
}

function canUseCacheApi() {
  return typeof window !== 'undefined' && 'caches' in window
}

function cacheKeyForText(text: string) {
  return `${ELEVENLABS_BASE_URL}/v1/text-to-speech-cache/${ELEVENLABS_VOICE_ID}?text=${encodeURIComponent(text)}`
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

async function getCachedAudio(text: string): Promise<Blob | null> {
  const cache = await openAudioCache()
  if (!cache) return null

  const request = new Request(cacheKeyForText(text))
  const response = await cache.match(request)
  if (!response) return null

  return response.clone().blob()
}

async function cacheAudio(text: string, blob: Blob) {
  const cache = await openAudioCache()
  if (!cache) return

  await fitBlobInCache(cache, blob.size)
  const request = new Request(cacheKeyForText(text))
  const response = new Response(blob, {
    headers: {
      'Content-Type': 'audio/mpeg',
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

function loadVoices(): SpeechSynthesisVoice[] {
  if (!hasWebSpeech()) return []
  return window.speechSynthesis.getVoices()
}

function scoreHindiVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase()
  let score = 0

  if (lang === 'hi-in') score += 100
  if (lang.startsWith('hi')) score += 70
  if (lang.includes('in')) score += 15
  if (name.includes('google') || name.includes('microsoft')) score += 15
  if (name.includes('neural') || name.includes('natural')) score += 14
  if (voice.default) score += 10

  return score
}

function scoreEnglishVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase()
  const lang = voice.lang.toLowerCase()
  let score = 0

  if (lang === 'en-in') score += 100
  if (lang.startsWith('en')) score += 60
  if (lang.includes('in')) score += 20
  if (name.includes('google') || name.includes('microsoft')) score += 15
  if (name.includes('neural') || name.includes('natural')) score += 12
  if (voice.default) score += 10

  return score
}

function findBestVoice(lang: 'hi' | 'en'): SpeechSynthesisVoice | null {
  const voices = loadVoices()
  if (!voices.length) return null

  if (lang === 'hi' && cachedHindiVoice) return cachedHindiVoice
  if (lang === 'en' && cachedEnglishVoice) return cachedEnglishVoice

  const scored = voices
    .map((voice) => ({
      voice,
      score: lang === 'hi' ? scoreHindiVoice(voice) : scoreEnglishVoice(voice),
    }))
    .sort((a, b) => b.score - a.score)

  const bestVoice = scored[0]?.voice ?? null
  if (lang === 'hi') cachedHindiVoice = bestVoice
  if (lang === 'en') cachedEnglishVoice = bestVoice
  return bestVoice
}

function normalizeTokenLang(token: string, previous: 'hi' | 'en'): 'hi' | 'en' {
  if (DEVA_RX.test(token)) return 'hi'
  if (LATIN_RX.test(token)) return 'en'
  return previous
}

function splitHinglishSegments(text: string): Array<{ text: string; lang: 'hi' | 'en' }> {
  const chunks = text
    .split(/([,.;!?\n])/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean)

  if (!chunks.length) {
    return [{ text, lang: 'hi' }]
  }

  const segments: Array<{ text: string; lang: 'hi' | 'en' }> = []
  let previousLang: 'hi' | 'en' = 'hi'

  for (const chunk of chunks) {
    const lang = normalizeTokenLang(chunk, previousLang)
    const previous = segments[segments.length - 1]

    if (previous && previous.lang === lang) {
      previous.text = `${previous.text} ${chunk}`.trim()
    } else {
      segments.push({ text: chunk, lang })
    }

    previousLang = lang
  }

  return segments
}

const HINDI_SPEECH_REPLACEMENTS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bSHG\b/gi, replacement: 'एस एच जी' },
  { pattern: /\bUPI\b/gi, replacement: 'यू पी आई' },
  { pattern: /\bDBT\b/gi, replacement: 'डी बी टी' },
  { pattern: /\bNRLM\b/gi, replacement: 'एन आर एल एम' },
  { pattern: /\bPM\b/gi, replacement: 'पी एम' },
  { pattern: /\bMUDRA\b/gi, replacement: 'मुद्रा' },
]

function normalizeSpeechTextForLang(text: string, lang: SpeechLang): string {
  let normalized = text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (lang !== 'hi') return normalized

  normalized = normalized
    .replace(/₹\s*([\d,]+)/g, '$1 रुपये')
    .replace(/\//g, ' ')
    .replace(/&/g, ' और ')

  for (const entry of HINDI_SPEECH_REPLACEMENTS) {
    normalized = normalized.replace(entry.pattern, entry.replacement)
  }

  return normalized.replace(/\s+/g, ' ').trim()
}

function getFallbackRate(lang: 'hi' | 'en', options: SpeakOptions) {
  if (typeof options.rate === 'number') return options.rate
  return lang === 'en' ? 0.98 : 0.93
}

function speakSegment(text: string, lang: 'hi' | 'en', options: SpeakOptions, onEnd?: () => void) {
  if (!hasWebSpeech()) return

  const utterance = new SpeechSynthesisUtterance(text)
  const selectedVoice = findBestVoice(lang)

  if (selectedVoice) {
    utterance.voice = selectedVoice
    utterance.lang = selectedVoice.lang
  } else {
    utterance.lang = lang === 'en' ? 'en-IN' : 'hi-IN'
  }

  utterance.rate = getFallbackRate(lang, options)
  utterance.pitch = options.pitch ?? 1.0
  utterance.volume = options.volume ?? 1.0
  if (onEnd) utterance.onend = onEnd

  window.speechSynthesis.speak(utterance)
}

export function speakFallback(text: string, lang: SpeechLang, options: SpeakOptions = {}) {
  if (!text.trim() || !hasWebSpeech()) return null

  if (options.interrupt !== false) {
    window.speechSynthesis.cancel()
  }

  if (lang !== 'hinglish') {
    speakSegment(text, lang === 'en' ? 'en' : 'hi', options)
    return null
  }

  const segments = splitHinglishSegments(text)
  let index = 0

  const playNext = () => {
    const next = segments[index]
    index += 1
    if (!next) return

    speakSegment(next.text, next.lang, { ...options, interrupt: false }, playNext)
  }

  playNext()
  return null
}

async function requestElevenLabsAudio(
  text: string,
  {
    emotion = 'friendly',
    cacheable = true,
  }: {
    emotion?: SpeakEmotion
    cacheable?: boolean
  } = {},
): Promise<Blob | null> {
  if (!hasElevenLabsConfig()) return null

  if (cacheable) {
    const cached = await getCachedAudio(text)
    if (cached) return cached
  }

  const response = await fetch(`${ELEVENLABS_BASE_URL}/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text,
      model_id: ELEVENLABS_MODEL_ID,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: STYLE_BY_EMOTION[emotion] ?? STYLE_BY_EMOTION.friendly,
        use_speaker_boost: true,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`ElevenLabs TTS failed with status ${response.status}`)
  }

  const blob = await response.blob()
  if (!blob.size) {
    throw new Error('ElevenLabs returned empty audio')
  }

  if (cacheable) {
    void cacheAudio(text, blob)
  }

  return blob
}

async function playAudioBlob(blob: Blob, speed = 1): Promise<HTMLAudioElement | null> {
  stopActiveAudio()

  const audioUrl = URL.createObjectURL(blob)
  const audio = new Audio(audioUrl)
  activeAudio = audio
  audio.preload = 'auto'
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
  return {
    provider: isOnline() && hasElevenLabsConfig() ? 'elevenlabs' : 'browser-fallback',
    online: isOnline(),
    apiConfigured: hasElevenLabsConfig(),
    voiceId: ELEVENLABS_VOICE_ID,
    modelId: ELEVENLABS_MODEL_ID,
  }
}

export async function sakhiSpeak(
  text: string,
  {
    lang = 'hinglish',
    emotion = 'friendly',
    speed = 1,
    interrupt = true,
    cacheable = true,
    ...fallbackOptions
  }: SpeakOptions & { lang?: SpeechLang } = {},
): Promise<HTMLAudioElement | null> {
  const cleanText = text.trim()
  if (!cleanText) return null

  const speechText = normalizeSpeechTextForLang(cleanText, lang)
  if (!speechText) return null

  if (interrupt !== false) {
    stopSpeaking()
  }

  if (!isOnline() || !hasElevenLabsConfig()) {
    return speakFallback(speechText, lang, { ...fallbackOptions, interrupt: false })
  }

  try {
    const blob = await requestElevenLabsAudio(speechText, { emotion, cacheable })
    if (blob) {
      const audio = await playAudioBlob(blob, speed)
      if (audio) return audio
    }
  } catch {
    if (import.meta.env.DEV) {
      console.warn('ElevenLabs failed, using fallback Web Speech')
    }
  }

  return speakFallback(speechText, lang, { ...fallbackOptions, interrupt: false })
}

export function speak(text: string, lang: SpeechLang, options: SpeakOptions = {}) {
  void sakhiSpeak(text, { ...options, lang })
}

export function speakButton(text: string, lang: SpeechLang) {
  speak(text, lang, { emotion: 'friendly', speed: 1.0, rate: 1.0, volume: 0.95, interrupt: true })
}

export function stopSpeaking() {
  stopActiveAudio()
  if (hasWebSpeech()) {
    window.speechSynthesis.cancel()
  }
}

export async function preloadCriticalAudio() {
  if (!isOnline() || !hasElevenLabsConfig()) return

  for (const phrase of SAKHI_PHRASES) {
    try {
      await requestElevenLabsAudio(phrase, { emotion: 'friendly', cacheable: true })
    } catch {
      // Ignore preload failures; fallback handles runtime.
    }
  }
}

if (hasWebSpeech()) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedHindiVoice = null
    cachedEnglishVoice = null
    loadVoices()
  }
  loadVoices()
}
