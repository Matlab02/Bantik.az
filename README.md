# BANTİK Beauty Shop

BANTİK mobil-first premium kosmetika vitrini, kart ödənişsiz sifariş axını və çoxfiliallı stok idarəetmə sistemidir. Müştəri sifarişi saytda yaradır, əməkdaş isə admin paneldən əlaqə, filial, rezerv, hazırlıq və təhvil prosesini idarə edir.

## Texnologiya və arxitektura

- Next.js 16 App Router, React 19, TypeScript və Tailwind CSS
- PostgreSQL, Prisma ORM və migration əsaslı database idarəetməsi
- Auth.js credentials girişi, server-side RBAC və filial məhdudiyyətləri
- Zod input və environment validation
- Modul quruluş: storefront, orders, inventory, transfers, CMS, management və reporting
- Pul dəyərləri database-də Decimal, tətbiq hesablamalarında qəpik əsaslı tam ədəd kimi işlənir

Online kart ödənişi qəsdən daxil edilməyib.

## Lokal quraşdırma

Tələblər: Node.js 22+, npm, PostgreSQL 16/17.

```powershell
Copy-Item .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev:full
```

`dev:full` əvvəl PostgreSQL-i yoxlayır, lazım olduqda layihənin lokal klasterini başladır, sonra Next.js development serverini açır. Sayt: `http://127.0.0.1:3000`.

Əgər fərqli PostgreSQL istifadə edilirsə, `.env`-də `DATABASE_URL` dəyişdirilməli və `scripts/start-bantik-postgres.ps1` əvəzinə database ayrıca başladılmalıdır.

## Environment dəyişənləri

Tam siyahı `.env.example`-dadır. Kritik production dəyərləri:

- `DATABASE_URL`: ayrıca, minimum səlahiyyətli production istifadəçisi
- `AUTH_SECRET`: unikal, uzun random secret
- `AUTH_URL` və `PUBLIC_SITE_URL`: HTTPS public URL
- `APP_TIMEZONE`: default `Asia/Baku`; database tarixləri UTC saxlayır
- `ADMIN_INITIAL_EMAIL` və `ADMIN_INITIAL_PASSWORD`: yalnız ilkin admin bootstrap komandası üçün
- SMTP dəyişənləri: istifadə olunursa hamısı birlikdə verilməlidir

`NEXT_PUBLIC_` prefiksli dəyərlər browser bundle-a daxil ola bilər; secret heç vaxt bu prefikslə yazılmamalıdır.

## Database

Development demo məlumatı:

```powershell
npm run db:seed
```

Production-da demo seed standart olaraq bloklanır. İlkin super admin:

```powershell
$env:ADMIN_INITIAL_EMAIL="owner@example.com"
$env:ADMIN_INITIAL_PASSWORD="a-unique-password-of-12-or-more-characters"
npm run db:bootstrap-admin
```

Production deploy yalnız migration istifadə edir:

```powershell
npm run db:migrate
```

`prisma db push` production proseduruna daxil deyil.

## Backup və restore

```powershell
npm run db:backup
npm run db:retention
```

Backup-lar default `backups/bantik-YYYY-MM-DD-HHmmss.dump` formatında yaranır, repoya düşmür və parol loglanmır. Retention sayı `BACKUP_RETENTION_COUNT` ilə idarə edilir.

Restore destructive əməliyyatdır və explicit guard tələb edir:

```powershell
$env:ALLOW_DATABASE_RESTORE="YES"
npm run db:restore -- backups/bantik-YYYY-MM-DD-HHmmss.dump
Remove-Item Env:ALLOW_DATABASE_RESTORE
```

Production üçün əlavə olaraq yalnız həmin komanda müddətində `ALLOW_PRODUCTION_RESTORE=YES` verilməlidir. Restore-dan əvvəl həmişə yeni backup yaradın və əvvəlcə ayrıca test database-də yoxlayın.

## Yoxlamalar

```powershell
npx prisma validate
npx prisma migrate status
npm run db:check
npm run inventory:check
npm run lint
npm run typecheck
npm test
npm run build
npm audit
```

Hamısını ardıcıl çalışdırmaq üçün `npm run qa` istifadə edilə bilər.

## Production

```powershell
npm ci
npm run db:migrate
npm run build
npm start
```

Canlılıq endpoint-i `/api/health`, migration/database readiness endpoint-i `/api/ready`-dir. Reverse proxy HTTPS, request body limit, access log rotation və process restart siyasətini idarə etməlidir. Ətraflı checklist və bərpa planı `docs/PRODUCTION.md` faylındadır.

## Windows startup

Lokal PostgreSQL üçün `scripts/start-bantik-postgres.ps1` təhlükəsiz şəkildə əvvəl `pg_isready` yoxlaması aparır. Bu kompüterdə Windows Startup qısayolu da mövcuddur. Yeni kompüterdə avtomatik startup əvəzinə PostgreSQL Windows Service və ya Task Scheduler seçilməsi tövsiyə olunur.

## Problemlərin həlli

- Database qoşulmur: PostgreSQL-i başladın, `DATABASE_URL` və `/api/ready` cavabını yoxlayın.
- Migration geridədir: `npx prisma migrate status`, sonra `npm run db:migrate`.
- Production admin daxil olmur: `change-me` production-da qəsdən bloklanır; `db:bootstrap-admin` istifadə edin.
- Restore icazə vermir: guard dəyişənlərini yalnız düzgün target yoxlandıqdan sonra həmin terminal sessiyasında verin.
- Rate limit çox-instance deployment-də paylaşılmır: hazır adapter memory əsaslıdır; production-da Redis adapteri qoşulmalıdır.
