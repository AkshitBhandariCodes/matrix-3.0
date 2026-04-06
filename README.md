# Sakhi Ki Udaan

## Prototype Submission Guidelines

### 1. Prototype Brief
- Flowchart points: Intro -> Hub -> 5 Learning Realms -> SHG World -> Profile/Certificate.
- Offline/rural requirement: Installable PWA, local progress persistence, low-bandwidth friendly UI, touch/joystick navigation with voice guidance.


### 3. Demo Video (10 mins)
- Functional walkthrough: Intro, Hub traversal, realm interactions, SHG interactions, loan request/repayment, notifications, scheme learning.
- Rule of three:
- 3 input modes: tap, joystick, and on-demand voice guide.
- 3 SHG actions: group meeting save, loan request, repayment.
- 3 outcomes: trust gain, overdue penalty, full repayment closure.
- Gamification: trust score, wallet, group fund, day progression, mission logs.

### 4. Limitations
- Cloud-quality Hindi/Hinglish narration depends on internet and API quota; when offline or quota is exhausted, browser speech fallback is used.

### 5. Feasibility
- Mass adoption is feasible because the app is lightweight, PWA-installable, multilingual (Hindi/Hinglish), and usable on low-cost Android phones.

---

## Implemented Features

- Improved Hindi/Hinglish voice flow with open-source TTS endpoint support and fallback.
- Voice guidance for narration and scheme learning (voice-command navigation removed).
- SHG interactive world with women NPC interactions and guided tasks.
- Loan lifecycle in SHG world:
- Request loan (`Rs 5000`, `Rs 10000`, `Rs 15000`)
- Repay partial/full installments
- Due reminders + overdue penalties + trust effects
- Government scheme mentor script expanded with official scheme links.
- Mobile fixes:
- Joystick touch conflict fixes
- Tap/click enter world behavior improvements
- Hamburger menu visibility for profile and key actions on mobile

---

## Local Development

```bash
npm install
npm run dev
```

Build check:

```bash
npm run build
```

---

## Voice Setup (Hindi + Hinglish)

Create `.env` in project root:

```bash
VITE_ELEVENLABS_API_KEY=your_api_key_here
VITE_ELEVENLABS_VOICE_ID=trxRCYtDC6qFREKq6Ek2
VITE_ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

Recommended voices to test:
- `trxRCYtDC6qFREKq6Ek2` (Sourabh) for warm Hindi guidance
- `d0grukerEzs069eKIauC` (Ranga) for energetic storytelling
- `Akash` for neutral Indian English/Hinglish style

TTS flow:
- If online + key configured, app uses ElevenLabs API.
- If offline or ElevenLabs fails, app automatically falls back to browser speech synthesis.


Voice controls
- Voice commands are currently disabled.
- Navigation and SHG actions are done via tap + joystick controls.
- Voice remains available as guided narration.

---

## Mobile PWA + Offline Use

1. Deploy on HTTPS host (Vercel recommended).
2. Open once online on mobile and install to home screen.
3. Launch from home screen for app-like behavior.
4. Revisit key pages once so they are cached.

Android install path:
- Chrome -> menu -> `Install app` / `Add to Home screen`

iOS install path:
- Safari -> Share -> `Add to Home Screen`

Offline notes:
- Core app assets and state work offline after first load.
- Game progress persists in local storage.
- ElevenLabs quality requires internet; offline mode uses browser speech fallback.

---

## Government Scheme References (Official)

- NRLM / DAY-NRLM: [https://aajeevika.gov.in/](https://aajeevika.gov.in/)
- Lakhpati Didi: [https://lakhpatididi.gov.in/](https://lakhpatididi.gov.in/)
- NABARD SHG-Bank Linkage Highlights: [https://www.nabard.org/auth/writereaddata/File/highlights-of-the-shg-bank-linkage-programme-2022-23.pdf](https://www.nabard.org/auth/writereaddata/File/highlights-of-the-shg-bank-linkage-programme-2022-23.pdf)
- PM MUDRA Yojana: [https://www.mudra.org.in/](https://www.mudra.org.in/)
- PM Jan Dhan Yojana: [https://pmjdy.gov.in/](https://pmjdy.gov.in/)
- PM Awas Yojana Gramin: [https://pmayg.dord.gov.in/](https://pmayg.dord.gov.in/)
- PM Ujjwala Yojana: [https://www.pmuy.gov.in/](https://www.pmuy.gov.in/)
- Ayushman Bharat PM-JAY: [https://beneficiary.nha.gov.in/](https://beneficiary.nha.gov.in/)
