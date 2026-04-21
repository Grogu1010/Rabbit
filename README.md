# Rabbit! 🐇☎️

A web party game prototype: **The Answering Machine** (Rabbit's version of Quiplash).

## What this build includes

- 4 normal rounds where each player appears in **2 matchups per round**.
- Final round between **top 2 players** only.
- 15-second answering window for each matchup.
- Room code + QR code joining.
- 150 generated prompt templates.
- 120+ host lines with dynamic buckets (3-player lobby, streak, comeback, perfect run, and anytime snark).
- Animated placeholder Rabbit logo that slowly cycles colors.

## Local setup

1. Create a Firebase project (Spark/free):
   - Enable **Realtime Database** in test mode.
2. In `index.html` (or via an inline script), define `window.RABBIT_FIREBASE_CONFIG` with your Firebase web config.
3. Run a local web server:

```bash
python -m http.server 5173
```

4. Open `http://localhost:5173` in browser tabs/devices.

## Free Netlify deployment (with multiplayer)

Netlify hosts static files for free. Multiplayer state is handled by Firebase free tier.

1. Push this folder to GitHub.
2. In Netlify: **Add new site → Import from Git**.
3. Build settings:
   - Build command: *(leave empty)*
   - Publish directory: `.`
4. Deploy site.
5. In Firebase console:
   - Add your Netlify domain to **Authentication → Settings → Authorized domains** (if auth later added).
   - In Realtime Database rules, lock down by room path and eventually auth (for production).
6. Add your Firebase config in a `<script>` block in `index.html` before `app.js`, e.g.

```html
<script>
  window.RABBIT_FIREBASE_CONFIG = {
    apiKey: "...",
    authDomain: "...",
    databaseURL: "...",
    projectId: "...",
    appId: "..."
  };
</script>
```

### "Host laptop is the host" behavior

- The player who clicks **Host game** becomes room host/controller.
- Host controls phase transitions using **Advance**.
- All players (including host on laptop) interact via same deployed URL.

## Notes for your next step

- Replace the `R` placeholder logo with your black Rabbit logo asset later.
- You can add text-to-speech by reading `hostLine` each phase transition.

