# ga — g2r2 Academy

Public GitHub Pages frontend for **g2r2 Academy** (Dart & Flutter).

**Production website (once Pages is enabled):** https://iamg2r2.github.io/ga/

**Backend:** dedicated Supabase project `kgjhlatbrmdowfbyclva`.

## Publish

1. GitHub repository **Settings → Pages → Build and deployment → Deploy from a branch → main → / (root)**.
2. In Supabase Authentication → URL Configuration, set the Site URL and allowed Redirect URLs to `https://iamg2r2.github.io/ga/`.
3. Test email registration, confirmation, login, faculty roles, lesson release, and student permissions before inviting students.

This repository intentionally contains **only public website assets**. Detailed teaching content and lab manuals are stored in the Supabase database behind Row Level Security; never commit private Academy source files, SQL seed, passwords, or service-role keys to this public repository.

**a g2r2 venture**