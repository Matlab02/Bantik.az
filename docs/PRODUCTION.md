# BANTİK Production Runbook

## Deploy checklist

1. Ayrı PostgreSQL database və minimum səlahiyyətli tətbiq istifadəçisi yaradın.
2. `.env.example` əsasında platformanın secret manager-ində environment dəyərlərini verin.
3. `AUTH_SECRET`-i random yaradın; `AUTH_URL` və `PUBLIC_SITE_URL` HTTPS olmalıdır.
4. `npm ci`, `npx prisma validate`, `npm audit` və `npm run qa` çalışdırın.
5. Deploy-dan dərhal əvvəl `npm run db:backup` və backup checksum-u saxlayın.
6. `npm run db:migrate` çalışdırın. Production-da `db push` və demo seed istifadə etməyin.
7. `npm run build`, sonra process manager ilə `npm start` başladın.
8. `/api/health` və `/api/ready` 200 qaytarmalıdır.
9. Public route-ları və admin login redirect-ini smoke test edin.
10. `ADMIN_INITIAL_*` ilə ilk super admini yaradın, sonra bu dəyişənləri runtime mühitindən silin.

## HTTPS və edge qat

- TLS reverse proxy/CDN-də sonlandırılmalı, HTTP HTTPS-ə redirect edilməlidir.
- Proxy real client IP-ni etibarlı `x-forwarded-for` ilə ötürməlidir.
- CSP, HSTS, frame, referrer və permissions header-ları tətbiq tərəfindən verilir.
- Upload yoxdur; CMS şəkil URL-ləri yalnız local path və HTTPS qəbul edir.
- Bir neçə application instance olduqda memory rate limiter əvəzinə Redis-backed `RateLimitStore` qoşulmalıdır.

## Database migration və rollback

Migration əvvəl staging clone-da yoxlanmalıdır. Deploy:

```powershell
npm run db:backup
npm run db:migrate
```

Prisma migration üçün avtomatik down migration yoxdur. Problem zamanı:

1. Application traffic-i dayandırın.
2. Yeni məlumat itkisi ehtimalını qeydə alın.
3. Əvvəlki application build-i qaytarın.
4. Schema geri uyğun deyilsə yalnız təsdiqlənmiş pre-deploy backup-ı ayrıca database-ə restore edin.
5. Ayrı database təsdiqləndikdən sonra production restore qərarı verin.

## Backup siyasəti

- Minimum gündəlik backup, deploy-dan əvvəl əlavə backup.
- Default utility son 14 nüsxəni saxlayır; scheduler gündəlik işə salınmalıdır.
- Həftəlik və aylıq nüsxələr ayrıca object storage-a köçürülməli, encryption və access policy tətbiq edilməlidir.
- Ayda ən azı bir dəfə disposable database-də restore drill aparılmalıdır.

```powershell
npm run db:backup
npm run db:retention
```

## Təhlükəsiz restore

Target database adını və connection string-i iki dəfə yoxlayın. Production database-ə birbaşa ilk sınaq etməyin.

```powershell
$env:DATABASE_URL="postgresql://.../bantik_restore_test"
$env:ALLOW_DATABASE_RESTORE="YES"
npm run db:restore -- backups/<backup>.dump
npm run db:check
```

Production restore əlavə `ALLOW_PRODUCTION_RESTORE=YES` tələb edir. Guard-ları əməliyyatdan dərhal sonra silin.

## Monitorinq

- `/api/health`: application və sadə database query.
- `/api/ready`: database və yarımçıq migration vəziyyəti.
- JSON server log-larında `INFO`, `WARN`, `ERROR` event-ləri toplanmalıdır.
- Alert-lər: 5xx artımı, readiness failure, login/checkout rate-limit artımı, backup failure, disk istifadəsi və PostgreSQL connection saturation.
- Log-larda password, token, session və SMTP secret saxlanmır.

## Timezone və schedule

PostgreSQL timestamp-ları UTC saxlayır. UI və report təqdimatı `APP_TIMEZONE=Asia/Baku` qəbul edir. CMS tarixləri API-yə ISO-8601 olaraq göndərilməli, timezone offset göstərilməlidir. Serverin operating-system timezone-na biznes qaydası bağlanmamalıdır.

## Recovery

1. Incident vaxtını və son uğurlu backup-ı müəyyən edin.
2. Traffic-i maintenance rejiminə keçirin.
3. Backup-ı yeni database-ə restore edin.
4. `npm run db:check` və `npm run inventory:check` çalışdırın.
5. Orders, inventory, CMS, settings və notifications saylarını müqayisə edin.
6. Application-u restored database ilə başladın və smoke test edin.
7. DNS/connection switch edin, monitorinqi sıxlaşdırın və incident report hazırlayın.

## Release acceptance

- Prisma validate və migration status təmizdir.
- Lint, TypeScript, unit/integration test və production build keçir.
- `npm audit` high/critical sıfırdır.
- Backup yaradılıb və son restore drill tarixi məlumdur.
- Default `change-me` credential production-da işləmir.
- Kart ödənişi və kart məlumatı emalı yoxdur.
