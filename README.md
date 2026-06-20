# AsifOps Knowledge Base

A personal knowledge management system for Linux/DevOps work: articles,
a command library, full-text search, and a GitHub-authenticated single-user
app. Built with Next.js 15, TypeScript, Tailwind CSS, shadcn/ui-style
components, and Supabase (Postgres).

This is **pass 1**: Articles + Commands + Search + Auth are fully working
end-to-end. Runbooks, Infrastructure Docs, VPN Inventory, and SSL Tracker
have their database tables ready in `supabase/schema.sql` but no UI yet —
they're the natural next pass, following the same pattern as Articles/Commands.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Pick a name, a strong database password (save it somewhere), and a region.
3. Once it's provisioned, open **SQL Editor** in the left sidebar.
4. Paste the contents of [`supabase/schema.sql`](./supabase/schema.sql) and run it.
   This creates all tables (`articles`, `commands`, `runbooks`, `projects`,
   `vpn_inventory`, `ssl_certificates`, `tags`, `favorites`, `users`, plus
   join tables), full-text search triggers, and indexes.
5. Optional but recommended: open
   [`supabase/seed.sql`](./supabase/seed.sql), replace
   `your-github-username` near the top with your real GitHub username, then
   run it. This adds sample articles, commands, and runbooks (Nextcloud+Redis,
   OpenVPN routing, IPsec/strongSwan, BGP/FRR, BackupPC, MariaDB replication)
   so the app isn't empty on first login.
6. Go to **Project Settings → API**. You'll need two values for the next step:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (under "Project API keys", **not** the `anon` key)
     → `SUPABASE_SERVICE_ROLE_KEY`

The service role key bypasses Row Level Security and must **never** be
exposed to the browser. This app only ever uses it from server-side code
(API routes), which is why RLS is enabled on every table with no public
policies — the `anon` key has zero access by design.

---

## 2. Create a GitHub OAuth App

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Fill in:
   - **Application name**: `AsifOps Knowledge Base` (anything you like)
   - **Homepage URL**: `http://localhost:3000` for local dev
     (update to your Vercel URL after deploying)
   - **Authorization callback URL**:
     `http://localhost:3000/api/auth/callback/github`
     (and add a second OAuth App, or update this one, to
     `https://YOUR-VERCEL-DOMAIN/api/auth/callback/github` once deployed)
3. Click **Register application**, then **Generate a new client secret**.
4. Note the **Client ID** and **Client secret**.

---

## 3. Set up GCP Cloud Storage (for article images)

Article images are stored in a private Cloud Storage bucket and served
through a signed-URL redirect (`/api/uploads/:id`), so the bucket itself
never needs to be public.

1. In the [GCP Console](https://console.cloud.google.com), create or pick a project.
2. **Cloud Storage → Buckets → Create**. Any region is fine; uniform
   bucket-level access is fine (we don't rely on per-object ACLs).
3. **IAM & Admin → Service Accounts → Create service account**, e.g.
   `asifops-kb-uploads`. Grant it the **Storage Object Admin** role,
   scoped to that bucket (or project-wide if you don't mind the broader
   grant for a personal project).
4. On that service account, **Keys → Add key → Create new key → JSON**.
   This downloads a `.json` key file.
5. Base64-encode it so it can live in a single env var:
   ```bash
   base64 -i path/to/your-key.json | tr -d '\n'
   ```
   (On Linux, `base64 -w 0 path/to/your-key.json` does the same thing.)
6. Set:
   - `GCS_BUCKET_NAME` → the bucket name from step 2
   - `GCS_SERVICE_ACCOUNT_KEY` → the base64 string from step 5

Treat that key like any other secret — anyone with it can read/write/delete
objects in the bucket per the IAM role you granted.

---

## 4. Configure environment variables

Copy the template and fill it in:

```bash
cp .env.local.example .env.local
```

| Variable                    | Where it comes from                                   |
|------------------------------|--------------------------------------------------------|
| `SUPABASE_URL`               | Supabase → Project Settings → API → Project URL        |
| `SUPABASE_SERVICE_ROLE_KEY`  | Supabase → Project Settings → API → service_role key    |
| `AUTH_SECRET`                | `openssl rand -base64 32`                               |
| `AUTH_GITHUB_ID`             | GitHub OAuth App → Client ID                            |
| `AUTH_GITHUB_SECRET`         | GitHub OAuth App → Client secret                        |
| `ALLOWED_GITHUB_USERNAME`    | Your GitHub username — only this account can sign in    |
| `GCS_BUCKET_NAME`             | The Cloud Storage bucket name from step 3              |
| `GCS_SERVICE_ACCOUNT_KEY`     | Base64-encoded service account JSON key from step 3     |

This app runs in **single-user mode**: any GitHub account can complete the
OAuth flow, but `src/lib/auth.ts` rejects the sign-in unless the GitHub
`login` matches `ALLOWED_GITHUB_USERNAME` exactly (case-insensitive).

---

## 5. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` → you'll be redirected to `/login` →
"Continue with GitHub" → back to the dashboard.

---

## 6. Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo.
3. Add the same environment variables from `.env.local` in
   **Project Settings → Environment Variables**.
4. Deploy.
5. Update your GitHub OAuth App's **Authorization callback URL** to
   `https://YOUR-VERCEL-DOMAIN/api/auth/callback/github` (you can keep both
   the localhost and production OAuth callback registered on two separate
   OAuth Apps, or just swap the URL when you're done with local dev).

---

## What's implemented in this pass

- **Auth**: GitHub OAuth via Auth.js (NextAuth v5), single-user allowlist,
  middleware-protected routes.
- **Articles**: create/edit/delete, Markdown content with a Write/Preview
  tabbed editor (GFM tables, checklists, fenced code blocks with syntax
  highlighting), tags, categories, view counts, favorites.
- **Command Library**: create/edit/delete, copy-to-clipboard, tags,
  categories, example output, favorites.
- **Search**: global Postgres full-text search (`tsvector` + `websearch`
  ranking) across article titles/descriptions/content and command
  names/descriptions/command text, surfaced through a `⌘K` / `Ctrl+K`
  command palette.
- **Markdown import**: drag-and-drop `.md`/`.mdx` files (or pick via file
  browser) at `/articles/import` to bulk-create articles. Optional YAML
  frontmatter (`title`, `description`, `category`, `tags`) is parsed
  automatically; otherwise the title falls back to the first `# Heading`
  in the file, then the filename. You can tweak title/category for each
  staged file before confirming the import.
- **Image attachments**: upload images (PNG/JPEG/GIF/WebP/SVG, up to 10MB)
  to an existing article from the editor's Images tab. Files are stored in
  a private GCP Cloud Storage bucket; the app embeds a stable
  `/api/uploads/:id` link in the markdown that redirects to a freshly
  signed, short-lived URL on every view — the bucket itself stays private.
- **Dashboard**: total articles/commands/runbooks, recently updated,
  most viewed, favorites.
- **Keyboard shortcuts**: `⌘K`/`Ctrl+K` → search, `N` → new article.
- **Dark theme**: zinc-950 background / zinc-900 cards / emerald-500 accent,
  applied by default (no light mode toggle yet — easy to add later via a
  `class="dark"` toggle on `<html>`).

## What's scaffolded but not wired to UI yet

The schema and seed data already include `runbooks`, `projects`
(infrastructure docs), `vpn_inventory`, and `ssl_certificates` tables with
full-text search where relevant. The next pass would add list/detail/form
pages for each, following the exact same pattern as
`src/components/kb/article-form.tsx` + `src/app/(app)/articles/`.
Markdown export/PDF export and CSV/JSON backup were intentionally left out
of this pass to keep the core loop tight — happy to add them next.

## Project structure

```
src/
  app/
    login/                  – sign-in page (public)
    (app)/                  – authenticated shell (sidebar + topbar)
      page.tsx              – dashboard
      articles/             – list, new, [id] detail/edit
      commands/             – list, new, [id] detail/edit
    api/
      articles/, commands/  – CRUD REST endpoints
      uploads/                – GCS attachment upload / signed-redirect / delete
      search/                – full-text search endpoint
      favorites/             – favorite toggle + list
      dashboard/              – stats endpoint
      auth/[...nextauth]/    – Auth.js route handler
  components/
    ui/                     – shadcn-style primitives (button, card, dialog…)
    kb/                     – app-specific components (forms, browsers, palette)
  lib/
    auth.ts                 – Auth.js config + single-user allowlist
    supabase.ts             – server-only Supabase client (service role)
    gcs.ts                  – server-only GCS client (upload / sign / delete)
    db.ts                   – all data-access functions
    types.ts                – shared TypeScript types
supabase/
  schema.sql                – full database schema (10 tables + FTS + RLS)
  seed.sql                  – sample articles/runbooks/commands
```
