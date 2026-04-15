# Boli Khata Offline Audio Pack

Use this folder to ship high-quality, no-quota narration that works in rural/offline conditions.

## Why this matters

When cloud TTS quota is exhausted, browser Web Speech can sound poor for Hindi/Hinglish pronunciation.
This audio pack is the preferred offline fallback.

## Folder structure

- `public/audio/boli-khata/hi`
- `public/audio/boli-khata/hinglish`
- `public/audio/boli-khata/en`

## Required file names in each language folder

- `salary.mp3`
- `expense.mp3`
- `savings.mp3`
- `interest.mp3`
- `fd-rd.mp3`
- `voice.mp3`
- `full.mp3`
- `fd-rd-smart.mp3`

## Playback order used by app

1. Cloud TTS (Gemini/OpenAI/ElevenLabs) when available
2. Bundled offline MP3 files from this folder
3. Device voice fallback (if enabled)

## Recommended free workflow

1. Write final guide scripts in natural spoken Hindi/Hinglish.
2. Generate MP3 using a free local TTS engine (for example Piper) on a laptop once.
3. Copy final MP3 files into the folders above.
4. Keep clip loudness consistent (target around `-16 LUFS` for voice content).

This gives effectively unlimited playback at runtime because the app serves static files.

## Voice quality tips

- Keep each clip 6-20 seconds.
- Use short sentences and punctuation for better pacing.
- Avoid long mixed-script text in one sentence.
- If a phrase sounds odd, rewrite the sentence phonetically for your target dialect before regenerating audio.
