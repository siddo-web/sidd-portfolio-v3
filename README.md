# SIDD / THE PORTFOLIO TAPES — v3

A **VHS-inspired, full-stack interactive personal portfolio**. Original design and code adapted to the interaction patterns of the *31 for 31* reference website (https://www.31-for-31.com/): tape introduction, playback language, scrolling stories, collectible items, and three browsing modes. This is **not** a redistribution of that site's source code, posters, copy, or branding.

The public frontend was rebuilt from scratch for the user's SIDD portfolio. The authenticated admin panel and API are preserved from the previous SIDD full-stack v2 package.

> **Important:** This is a standalone replacement for the prior V2 sample project, not a direct patch to the user's currently deployed `siddo-web` repository (which wasn't accessible through the connected account). Use a new repo or preview branch first. The seed portfolio entries are **illustrative fictional examples**. Replace them with your actual projects and screenshots before publishing.

## What you can do on the public portfolio

- **Insert Tape intro:** an animated launch screen, with skip and a replay button in the footer. The intro displays once per browser tab session.
- **Interactive hero:** an original CSS-drawn 3D tape cassette, lighting, float animation, original retro-futuristic art direction.
- **View projects three ways:** **Scroll** (cinematic project-by-project presentation with collectible tape artwork), **Shelf** (select cassettes and explore a featured case study), **List** (searchable index).
- **Functional playback deck:** Play / pause auto-advance (every 5.6 seconds), previous / next, position display, and track progress. When in Scroll mode, skipping brings that scene into view.
- **Keyboard controls:** Left/Right arrow = previous/next project; Space = play/pause; F = open favorites; Escape = close an open detail dialog. Shortcuts don't override typing in forms.
- **Favorites:** star projects and open **My List**. Saved locally in the visitor's browser with `localStorage` (not a server-side account or shared vote system).
- **Project dialogs:** full descriptions, contribution tags, optional live website and GitHub links.
- **Accessible touch/mobile layout:** mobile menu, focus styles, reduced-motion support, no heavy asset requirement; SVG/CSS illustration fallback when no image is provided.
- **Working contact form:** `/api/contact` validates, stores messages and reports an actual backend result; it does **not** simulate successful delivery.
- **Optional interface click sounds:** generated locally by the Web Audio API after visitor interaction (default OFF); no copyrighted music.
- **Dynamic public content:** fetches the published site document from `/api/public`. If backend is offline the frontend can still show illustrative seed content, but contact/submissions won't persist.

## Backend and CMS (retained from v2)

- `/admin` password-protected console (HTTP-only session cookie).
- Admin project add/edit/delete, publish/draft, ordering, service editing, about/contact/social edits and SEO settings.
- Contact inbox with read/unread/delete and reply via email client.
- Site backup import/export.
- On local machine, project data and inbox persist in ignored JSON files.
- On Vercel, **set up Neon PostgreSQL** for persistent content and inbox. Vercel's filesystem is not durable.
- Optional Resend email notifications.
- Six automated API tests for auth, filtering, publishing, contact validation and messages.

## Start locally

Requirements: Node.js **>= 20.19** (Node 22 recommended).

```bash
npm install
npm run setup
npm run dev
```

Open **http://localhost:5173** for the portfolio and **http://localhost:5173/admin** for the CMS. The setup script writes `.env.local` (git-ignored), generates credentials and displays them in your terminal. The API runs at `http://127.0.0.1:8787` and Vite proxies `/api` automatically.

```bash
npm run test:api   # Backend integration tests
npm run build      # Vite production build
npm run lint       # Oxlint
```

### Keeping the styling and project data editable

- Public app: `src/App.jsx`
- Frontend styles, breakpoints and VHS art: `src/index.css`
- Default seed projects and social links: `data/site.json`
- Admin studio: `src/admin/Admin.jsx` and `src/admin/admin.css`
- Backend request handler: `server/handler.js`
- Local/Neon persistence: `server/store.js` and `db/schema.sql`

The **hero title is editable** in Admin → Site Content (`hero.line1` and `hero.line2`). Project titles, links, images, sections, about copy, contact info and services are editable. The label “THE PORTFOLIO TAPES” and the cassette art are part of the presentational theme and require code changes to rename. Image URLs entered in admin should be HTTPS. The admin currently does not upload files directly to storage.

## Deploy to GitHub + Vercel

1. **Make a safe copy**: push the contents of this directory to a new GitHub repo, or to a development branch of your existing portfolio. Do not overwrite the production branch without reviewing the changes.
2. Run `npm install`, `npm run test:api`, `npm run build` locally. **Commit the generated `package-lock.json`** once npm finishes installing.
3. Import the repository in Vercel. Framework: **Vite**. Build command: `npm run build`. Output folder: `dist`. The root `/api` directory holds Vercel Function handlers.
4. Provision Neon PostgreSQL from Vercel or Neon directly. Configure environment variables in **Vercel Project → Settings → Environment Variables**:

| Name | Required | Meaning |
| --- | --- | --- |
| `DATABASE_URL` | **YES** | Neon connection URI; necessary for persistent production content and contact messages |
| `ADMIN_EMAIL` | **YES** | Your own admin email |
| `ADMIN_PASSWORD` | **YES** | Unique, strong production password |
| `AUTH_SECRET` | **YES** | Random 64+-character secret for session signing |
| `RESEND_API_KEY` | Optional | Email notifications |
| `NOTIFICATION_EMAIL` | Optional | Notification destination |
| `RESEND_FROM_EMAIL` | Optional | Verified Resend sender |

5. Generate a session secret locally:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"
```

6. Deploy (or redeploy after setting variables). Open `https://YOUR_SITE/api/health` and verify it says `"storage": "neon-postgres"`, `"adminConfigured": true`.
7. Visit `/admin`, log in, **replace all example work**, upload screenshots to a public HTTPS host, add your real URLs, then publish. Test contact form delivery into Admin → Inbox.

### Git commands (new repo)

```bash
git init
git add .
git commit -m "Build interactive SIDD portfolio archive"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

**Do not commit any `.env.local`, credentials, or database URLs.**

## Interaction and validation notes

- React 19, Vite 8, Framer Motion 12, Tailwind CSS 3, CSS 3D. The previously installed Three.js deps remain listed for compatibility with the V2 project; the V3 public hero uses CSS 3D and does not require a WebGL context.
- `node --test tests/api.test.js` completed with **6/6 passes** in the build environment. The public JSX file was checked for parse errors using TypeScript's JSX parser.
- Desktop (1440px) and mobile (390px) preview layouts were rendered with headless Chromium and had **no horizontal document overflow**. These static previews represent the page appearance, not a full React runtime test.
- **Full npm production compilation was not verifiable** in this environment because npm packages could not be downloaded. Run `npm install && npm run build` on your own computer (or through GitHub CI/Vercel) and resolve any issues before publishing.
- This learning project is not a complete enterprise security audit. On production add managed rate limiting/CAPTCHA for contact spam, enable MFA for admin if expanding to multiple admins, check browser/device compatibility and ensure Neon/backups are configured.

## Design reference

Reference: https://www.31-for-31.com/ (a VHS-style October horror movie collection with scroll/shelf/list browsing). Our project borrows the **interaction paradigm only**, replacing movies with portfolio case studies, film posters with original CSS-drawn project art, and watched states with local visitor bookmarks. Visual identity, words and illustration are original to the SIDD edition.
