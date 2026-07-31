# SiteForge — setup steps

## 1. Run the database setup
- Open your Supabase project → SQL Editor → New query
- Paste everything from `supabase/schema.sql` → click Run

## 2. Get your keys
- Supabase: Settings → API → copy "Project URL" and "anon public" key
- Anthropic: console.anthropic.com → API Keys → create a key

## 3. Upload this project to GitHub
- Go to your `siteforge` repo on GitHub → "uploading an existing file"
- Drag in every file/folder from this project (keep the folder structure)

## 4. Connect it to Vercel
- Vercel dashboard → "Add New" → Project → import your `siteforge` GitHub repo
- Before deploying, add these environment variables in Vercel's project settings:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `ANTHROPIC_API_KEY`
- Click Deploy

## 5. Set the redirect URL in Supabase
- Supabase → Authentication → URL Configuration
- Set Site URL to your new Vercel URL (looks like `https://siteforge-yourname.vercel.app`)

That's it — visit your Vercel URL, log in with your email (you'll get a magic link), and you're in the real dashboard.
