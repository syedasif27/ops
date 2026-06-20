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

**Many GCP orgs now block downloadable service account keys**
(`iam.disableServiceAccountKeyCreation`) — Google's own recommended
replacement is **Workload Identity Federation**, and Vercel has first-class
support for it via its own OIDC token, with no keys stored anywhere. That's
what these steps set up. (If your org *does* allow key creation and you'd
rather use a simple key, skip to the **Alternative** note at the end of
this section.)

1. **Create the bucket**, if you haven't already:
   ```bash
   gcloud storage buckets create gs://YOUR-BUCKET-NAME --location=us-central1
   ```
2. **Console → IAM & Admin → Workload Identity Federation → Create Pool.**
   - Pool name/ID: `vercel`
3. **Add a provider to the pool:**
   - Type: `OpenID Connect (OIDC)`
   - Name/ID: `vercel`
   - Issuer URL: `https://oidc.vercel.com/[YOUR_VERCEL_TEAM_SLUG]`
     (find your team slug in the Vercel dashboard URL; if you're on a
     personal/hobby account without a team, use `https://oidc.vercel.com`)
   - Leave the JWK file empty
   - Audience: select **Allowed audiences**, add
     `https://vercel.com/[YOUR_VERCEL_TEAM_SLUG]`
   - Attribute mapping: `google.subject` = `assertion.sub`
4. **Create a service account** (`IAM & Admin → Service Accounts`), e.g.
   `vercel`. Grant it:
   - `Storage Object Admin` (on the bucket, or project-wide)
   - `Service Account Token Creator` **on itself** — this is required for
     signed URL generation under Workload Identity Federation; without it
     uploads succeed but viewing images will fail with a permission error.
5. Back on the Workload Identity Pool's details page, copy the **IAM
   Principal** (looks like
   `principal://iam.googleapis.com/projects/.../workloadIdentityPools/vercel/subject/...`).
   On the service account → **Permissions → Grant Access**, paste that
   principal into **Service Account Users role**, replacing
   `SUBJECT_ATTRIBUTE_VALUE` with
   `owner:[VERCEL_TEAM]:project:[PROJECT_NAME]:environment:production`
   (swap in your actual Vercel team slug, project name, and environment —
   add one principal per environment you want to grant, e.g. also
   `environment:preview` if you want previews to work too).
6. Gather these values for your env vars:

   | Value | Where to find it |
   |---|---|
   | `GCP_PROJECT_ID` | IAM & Admin → Settings |
   | `GCP_PROJECT_NUMBER` | IAM & Admin → Settings |
   | `GCP_SERVICE_ACCOUNT_EMAIL` | IAM & Admin → Service Accounts |
   | `GCP_WORKLOAD_IDENTITY_POOL_ID` | the pool ID from step 2 (`vercel`) |
   | `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` | the provider ID from step 3 (`vercel`) |
   | `GCS_BUCKET_NAME` | the bucket name from step 1 |

   These only resolve to real credentials when the app is actually running
   on Vercel (Vercel injects the OIDC token at request time). For local
   dev, either run `vercel env pull` (which also pulls a short-lived OIDC
   token Vercel refreshes for you), or simpler: run
   `gcloud auth application-default login` once on your machine — the app
   falls back to your local `gcloud` credentials automatically if the
   `GCP_*` Workload Identity variables aren't set.

**Alternative (key-based, only if your org allows it):** set
`GCS_SERVICE_ACCOUNT_KEY` to a base64-encoded service account JSON key
(`base64 -i key.json | tr -d '\n'`, or `base64 -w 0 key.json` on Linux). If
this variable is set, the app uses it instead of Workload Identity
Federation — useful for quick local testing even if you set up WIF for
production.

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
| `GCS_BUCKET_NAME`             | The Cloud Storage bucket name from step 3               |
| `GCP_PROJECT_ID` / `GCP_PROJECT_NUMBER` / `GCP_SERVICE_ACCOUNT_EMAIL` / `GCP_WORKLOAD_IDENTITY_POOL_ID` / `GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID` | Workload Identity Federation values from step 3 (keyless) |
| `GCS_SERVICE_ACCOUNT_KEY`     | Only if using the key-based fallback from step 3         |

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
