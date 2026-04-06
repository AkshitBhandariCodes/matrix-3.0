# SakhiKiUdaan - Offline Mobile PWA Guide

**SakhiKiUdaan** is designed as a Progressive Web App (PWA). This means you can install it directly on your mobile device—bypassing the app store—and play it completely offline!

Follow these steps to install and run the game offline on mobile devices:

---

## 1. Hosting the Game

For players to download the game, it first needs to be hosted on a web server with HTTPS.
Since it’s a standard Vite React app, you can host it for free on platforms like **Vercel**, **Netlify**, or **GitHub Pages**.

1. Run `npm run build` in your project folder to generate the static files.
2. Upload the `dist` folder to your chosen hosting service.
   *(Make sure your PWA manifest and service worker configs are correctly set up in Vite — `vite-plugin-pwa` handles this automatically for you).*

---

## 2. Installing on Android (Chrome)

1. Open **Google Chrome** on your Android phone.
2. Navigate to the hosted URL of the game (e.g., `https://sakhikiudaan.vercel.app`).
3. Usually, a pop-up will appear at the bottom of the screen saying **"Add Sakhi Ki Udaan to Home screen"**.
4. If the pop-up doesn't appear:
   - Tap the **three-dot menu** (⋮) in the top right corner of Chrome.
   - Tap **"Install app"** or **"Add to Home screen"**.
5. Confirm by tapping **"Add"**. The game will now appear alongside your other mobile apps!

---

## 3. Installing on iOS (Safari)

Apple has stricter rules for PWAs, but it’s still very easy!

1. Open **Safari** on your iPhone or iPad. *(Note: This must be Safari, not Chrome on iOS)*
2. Navigate to the hosted URL of the game.
3. Tap the **Share icon** at the bottom of the screen (the square with an arrow pointing up).
4. Scroll down the list of options and tap **"Add to Home Screen"** (symbolized by a `+` icon).
5. Tap **"Add"** in the top right corner.
6. The game icon is now on your iOS home screen!

---

## 4. Playing Offline

Once installed on the Home Screen (Android or iOS):
1. **First Run**: Open the app while still connected to the internet. This allows the Service Worker to officially download and cache all images, sounds, and game logic (like our massive character portraits and 5 interconnected realms).
2. **Offline Mode**: After the first successful load, you can turn on Airplane Mode or disconnect from the internet.
3. Open the app from your Home Screen. It will load instantly and play identically to the online version! Your progress (health, wisdom, completed realms) is saved securely via `localStorage` (via Zustand).

Enjoy your journey in **SakhiKiUdaan**!
