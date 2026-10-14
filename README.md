# Bala Ji Stock Book

Inventory aur supplier-order manager, Next.js + Supabase par.
Original Claude artifact wala poora feature set same hai: inventory list,
stock/reorder level editing, supplier rate comparison, order cart,
order history.

## 1. Supabase project banao

1. https://supabase.com par free account banao, **New project** click karo.
2. Project ready hone ke baad, left sidebar me **SQL Editor** kholo.
3. `supabase/schema.sql` ka pura content paste karo aur **Run** karo.
   (Ye tables, security rules, aur realtime enable kar dega.)
4. Fir `supabase/seed.sql` ka content paste karo aur **Run** karo.
   (Ye aapke saare 193 items + LOTS Wholesale supplier daal dega.)
5. Left sidebar me **Project Settings > API** par jaao, wahan se copy karo:
   - **Project URL**
   - **anon public** key

## 2. Local par chala ke test karo (optional, par recommended)

```bash
npm install
cp .env.example .env.local
# .env.local khol ke NEXT_PUBLIC_SUPABASE_URL aur
# NEXT_PUBLIC_SUPABASE_ANON_KEY daal do (jo step 1.5 me copy kiya)
npm run dev
```

Browser me http://localhost:3000 kholo — data turant dikhna chahiye.

## 3. GitHub repository banao

```bash
cd balaji-stock-book
git init
git add .
git commit -m "Bala Ji Stock Book"
git branch -M main
git remote add origin https://github.com/<aapka-username>/<repo-name>.git
git push -u origin main
```

(`.env.local` kabhi commit nahi hoga — `.gitignore` me already excluded hai.)

## 4. Vercel par deploy karo

1. https://vercel.com par GitHub se login karo.
2. **Add New > Project**, apni GitHub repo select karo, **Import**.
3. Deploy se pehle **Environment Variables** me ye do daalo:
   - `NEXT_PUBLIC_SUPABASE_URL` = aapka Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = aapka Supabase anon key
4. **Deploy** click karo. 1-2 min me live ho jayega — Vercel ek
   `https://<something>.vercel.app` link dega.

## 5. (Optional) App ko password se protect karo

Koi bhi jisko ye Vercel link mil jaye, wo data dekh/badal sakta hai
(login system nahi hai — poore staff ke liye shared app hai).
Agar aap simple password-gate chahte ho:

- Vercel project ke **Environment Variables** me `BASIC_AUTH_USER` aur
  `BASIC_AUTH_PASS` add kar do (koi bhi username/password chuno).
- Redeploy karo. Ab app kholte hi browser username/password maangega.
- Dono khali chhod do (ya set hi mat karo) agar protection nahi chahiye.

(Vercel ka apna built-in Password Protection sirf paid plans par milta hai —
yeh middleware.ts ek free alternative hai.)

## Project structure

```
app/page.tsx         — poora app UI aur logic (React + Supabase)
app/layout.tsx        — page shell, fonts
app/globals.css       — original design (same colors, same look)
lib/supabase.ts       — Supabase client setup
lib/types.ts          — TypeScript types + category list
middleware.ts         — optional basic-auth gate
supabase/schema.sql   — tables + security rules + realtime (run once)
supabase/seed.sql     — 193 items + LOTS Wholesale supplier (run once)
```

## Notes

- Multiple staff members ek saath app khol sakte hain — Supabase Realtime
  ki wajah se sabko live updates milenge (jaise original artifact me tha).
- Agar aapko aage aur bhi suppliers ya items manually database me
  daalne hain, Supabase ke **Table Editor** se seedha edit kar sakte ho.
- `npm run build` locally chala ke confirm kar sakte ho ki sab theek hai,
  deploy se pehle.
