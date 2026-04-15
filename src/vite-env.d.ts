/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_BASE_URL?: string
  readonly VITE_GEMINI_API_KEY?: string
  readonly VITE_GEMINI_MODEL?: string
  readonly VITE_GEMINI_TTS_MODEL?: string
  readonly VITE_GEMINI_TTS_VOICE?: string
  readonly VITE_GEMINI_IMAGE_MODEL?: string
  readonly VITE_ALT_TTS_PROVIDER?: string
  readonly VITE_ALT_TTS_BASE_URL?: string
  readonly VITE_ALT_TTS_API_KEY?: string
  readonly VITE_ALT_TTS_MODEL?: string
  readonly VITE_ALT_TTS_VOICE?: string
  readonly VITE_WEB_SPEECH_FALLBACK?: 'always' | 'offline-only' | 'never'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
