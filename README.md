# sopaders

*Şop* means "track" and *ders* means "lesson" in Kurdish.

An installable, offline-first web app (PWA) for tracking study progress for Turkish exams
(KPSS, AGS, …): topics and their statuses, trial-test nets, daily pace and countdown.
All data is stored on the device (IndexedDB). There is no server and no account.

For architecture, conventions and how to extend the app, see [CLAUDE.md](CLAUDE.md).

## Run locally

Requires Node 20+ (`.nvmrc` pins 24).

```bash
npm install
npm run dev            # http://localhost:5173
npm run dev -- --host  # also reachable from your phone on the same Wi-Fi
npm test               # unit tests
npm run build          # production build into dist/
npm run preview        # serve dist/ at http://localhost:4173 (service worker active, test offline here)
npm run icons          # regenerate PWA icons from public/favicon.svg
```

The service worker (offline mode, install) only runs in the **production build** (`build` + `preview`
or a deployment), not in `npm run dev`. On a phone, installing and offline mode also need **HTTPS**,
which the free hosts below provide.

## Deploy for free

The app is static files (`dist/`), so any static host works. Both configs are included:
`vercel.json` and `netlify.toml` (SPA fallback, no caching of `sw.js`, long caching of hashed assets).

> ⚠️ **Choose your URL once.** Browser storage belongs to the exact address (origin). If you later
> move to a different domain, the app there starts empty. Download a backup (Ayarlar → Yedeği indir)
> before switching, and restore it at the new address.

### Option A: Vercel (recommended, auto-deploys on every push)

1. Put the project on GitHub:
   ```bash
   git init && git add -A && git commit -m "sopaders"
   # create an empty repo on github.com, then:
   git remote add origin https://github.com/<you>/sopaders.git
   git push -u origin main
   ```
2. Go to <https://vercel.com>, sign in with GitHub, **Add New… → Project**, and import the repo.
   Vercel detects Vite from `vercel.json`, so keep the defaults and click **Deploy**.
3. You get `https://<project>.vercel.app`. Every `git push` redeploys automatically, and open
   apps show "Yeni sürüm hazır" so you can update.

CLI alternative (no GitHub needed): `npx vercel` (preview) and then `npx vercel --prod`.

### Option B: Netlify

- **With Git:** <https://app.netlify.com> → **Add new site → Import an existing project** → pick the repo.
  Build settings come from `netlify.toml`.
- **Without Git (quickest):** run `npm run build`, open <https://app.netlify.com/drop>, and drag the
  `dist` folder onto the page. Note: drag-and-drop sites don't redeploy automatically, so drop `dist` again after changes.

## Install on Android

1. Open your deployed `https://…` address in **Chrome**.
2. Either:
   - in the app go to **Ayarlar → Uygulamayı yükle**, or
   - Chrome menu **⋮ → Uygulamayı yükle** (or **Ana ekrana ekle**).
3. The app appears on the home screen and in the app drawer, opens full-screen and works without internet.
4. Updates: when a new version is deployed, the app shows **"Yeni sürüm hazır" → Güncelle**.

Also works on desktop Chrome/Edge (install icon in the address bar) and on iPhone
(Safari → Share → **Ana Ekrana Ekle**).

### Keeping your data safe

- Data lives only in that browser on that device. **Clearing Chrome's site data or uninstalling the
  app deletes it.**
- Installed apps usually get *persistent storage* (shown in Ayarlar). Even so, download a backup now and then.
- **Phone ↔ computer:** download a backup on one device (Ayarlar → Yedeği indir), send the file to
  yourself (e.g. email or Google Drive), then on the other device use Ayarlar → Yedekten geri yükle →
  **Birleştir**. The most recently changed version of each record wins.
- **Undo mistakes on the same device** (deleted an exam, edited the wrong thing): restore a backup with
  **Yedeğe geri dön**. Everything in the backup returns to its backed-up state, and things you added
  after the backup are kept.
- **Updating the app never touches your data.** A new version (a `git push` → automatic redeploy) only
  replaces the app's code; the open app shows "Yeni sürüm hazır" and everything stays after **Güncelle**.

## Project status

All six planned phases are done: exams/lessons/topics, dashboard, trial tests, import/backup, PWA.
Planned next: cloud sync with Supabase. Add `src/data/supabase/` implementing the repository
interfaces and switch `src/data/createRepositories.ts`. See CLAUDE.md.
