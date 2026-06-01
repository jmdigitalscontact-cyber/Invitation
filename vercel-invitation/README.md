# Wedding invitation â€” static client preview

This folder is a **preview-only** copy of the invitation site for showing clients on **Vercel** (or Netlify, GitHub Pages, etc.) **before** you buy a domain or PHP hosting.

## What works

- Intro (`index.html`), home, story, venues, attire, details, FAQ
- Music, navigation, animations, photo lightboxes
- **RSVP page UI** with a **simulated** guest (`rsvp.html?invite=PREVIEW` or open RSVP from the banner)

## What does not work (by design)

- No real database â€” RSVP submit is **not saved**
- No admin dashboard, reception app, or photo uploads (those need PHP + PostgreSQL on your host)

## Deploy to Vercel

1. Create a new Vercel project.
2. Set **Root Directory** to `vercel-invitation` (if the repo root is the parent folder).
3. Framework preset: **Other** (static â€” no build command).
4. Deploy.

Or deploy only this folder as its own repo.

## Local preview

```powershell
cd vercel-invitation
npx --yes serve .
```

Open `http://localhost:3000` (or the port shown).

## Refresh after editing the main site

From the project root:

```powershell
powershell -File scripts/build-vercel-invitation.ps1
```

That recopies HTML, CSS, JS, `photos/`, and `audio/`, and re-injects `static-preview.js`. Custom edits inside `vercel-invitation/` are overwritten except `static-preview.js`, `README.md`, and `vercel.json` if you keep templates in the build script.

## Full production stack

After the client approves, deploy the **parent** project on a host with **PHP 8+** and **PostgreSQL** for live RSVP, admin, and `/reception/`.
