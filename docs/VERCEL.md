# BANTİK — Vercel + Neon deploy

Bu repo Vercel-də Next.js tətbiqi, Neon-da isə PostgreSQL bazası kimi işləməyə hazırdır.

## 1. Vercel layihəsi

1. Vercel-də **Add New → Project** seçin.
2. `Matlab02/Bantik.az` GitHub reposunu import edin.
3. Framework `Next.js`, root directory isə repo kökü olaraq qalsın.
4. Deploy-dan əvvəl aşağıdakı environment dəyişənlərini əlavə edin.

## 2. Environment dəyişənləri

Bu dəyişənləri Vercel **Settings → Environment Variables** bölməsində Production, Preview və Development üçün verin:

```text
DATABASE_URL=<Neon pooled connection string>
AUTH_SECRET=<ən azı 32 simvolluq random secret>
AUTH_URL=https://<vercel-domain>
PUBLIC_SITE_URL=https://<vercel-domain>
NEXT_PUBLIC_SITE_URL=https://<vercel-domain>
NEXT_PUBLIC_WHATSAPP_NUMBER=994501234567
APP_TIMEZONE=Asia/Baku
```

`DATABASE_URL` və `AUTH_SECRET` heç vaxt GitHub-a yazılmamalıdır. `AUTH_URL`, `PUBLIC_SITE_URL` və `NEXT_PUBLIC_SITE_URL` deploy olunmuş eyni HTTPS ünvanını göstərməlidir.

Vercel sistem domainini avtomatik tanıyır. Buna görə ilk test deploy-u yalnız `DATABASE_URL` və `AUTH_SECRET` ilə də işləyir; xüsusi domain qoşulduqda üç URL dəyişənini ayrıca yazmaq SEO və Auth ünvanını sabit saxlayır.

Statik build public URL və route analizi üçün yalnız build prosesində istifadə olunan təhlükəsiz fallback-lardan yararlanır. Bu fallback-lar runtime-a keçmir. Database API-ləri və admin girişi canlı mühitdə işləmək üçün `DATABASE_URL` və `AUTH_SECRET` mütləq verilməlidir.

## 3. Database

Migration faylları `prisma/migrations` qovluğunda versiyalanır. Neon bazasına migration deploy-dan ayrıca tətbiq olunur:

```powershell
npm run db:migrate
```

Demo seed yalnız ilkin demo quruluşunda işlədilməlidir. Production build və preview build avtomatik seed etmir.

## 4. Build axını

Vercel `npm ci` işlədərkən `postinstall` Prisma Client-i yaradır, sonra `npm run vercel-build` Next.js production build-i qurur. Database migration və seed build prosesinə daxil deyil.

## 5. Deploy yoxlaması

Deploy tamamlandıqdan sonra bunları yoxlayın:

- `/api/health` → `200`, database `ok`
- `/api/ready` → `200`, status `ready`
- `/products` → məhsul kataloqu
- `/admin/login` → admin giriş səhifəsi

İlk deploy-dan sonra Vercel domain dəyişərsə, üç public URL dəyişənini yeni domain ilə yeniləyib redeploy edin.
