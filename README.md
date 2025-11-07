# 🤖 Leyla Parser

**Автоматический парсер вакансий для Vakansiya.az**

Leyla - это автоматизированная система парсинга вакансий с **boss.az** и **ejob.az**, которая публикует их на Vakansiya.az от имени пользователя Leyla.

---

## 🏗️ Архитектура

```
GitHub Actions (cron trigger)
        ↓
Vercel Serverless Functions
        ↓
Boss.az / Ejob.az Parsing
        ↓
Category Mapping + Deduplication
        ↓
Supabase (jobs table)
```

### Основные компоненты:

- **Vercel Functions** - парсинг логика (serverless)
- **GitHub Actions** - cron триггер (каждый час)
- **Supabase** - хранение вакансий в таблице `jobs`
- **Rate Limiting** - защита от блокировки IP

---

## 📦 Установка

### 1. Clone и установка зависимостей

```bash
git clone https://github.com/lenkomade-max/Parseraz.git
cd Parseraz
npm install
```

### 2. Создать пользователя Leyla в Supabase

Выполнить в **Supabase SQL Editor**:

```sql
-- Создать auth пользователя
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'leyla@vakansiya.az',
  crypt('leyla-parser-2025', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Leyla"}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Создать profile
INSERT INTO profiles (id, name, role)
SELECT id, 'Leyla', 'user'
FROM auth.users
WHERE email = 'leyla@vakansiya.az';

-- Получить ID пользователя
SELECT id FROM auth.users WHERE email = 'leyla@vakansiya.az';
```

**Сохраните полученный UUID** - это `LEYLA_USER_ID`!

### 3. Настроить .env

Создать файл `.env.local`:

```bash
# Supabase (из Vakansiya проекта)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Leyla User ID (из шага 2)
LEYLA_USER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Parser Secret (любой случайный токен)
PARSER_SECRET=your-random-secret-token-123
```

### 4. Deploy на Vercel

```bash
# Установить Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Важно!** Добавить все env переменные из `.env.local` в **Vercel Dashboard** → Project Settings → Environment Variables.

### 5. Настроить GitHub Actions

1. Перейти в **GitHub repo → Settings → Secrets and variables → Actions**
2. Добавить секрет:
   - Name: `PARSER_SECRET`
   - Value: (тот же что в .env)
3. Добавить секрет:
   - Name: `VERCEL_DEPLOY_URL`
   - Value: `https://your-project.vercel.app`

Workflow уже настроен в `.github/workflows/parser-cron.yml` и будет запускаться каждый час.

---

## 🚀 Использование

### Ручной запуск

```bash
# Локально (для тестирования)
npm run parse:boss    # Парсинг boss.az
npm run parse:ejob    # Парсинг ejob.az
npm run parse:all     # Парсинг всех источников
```

### Через API (production)

```bash
# Trigger parsing
curl -X POST https://your-project.vercel.app/api/parse \
  -H "Authorization: Bearer YOUR_PARSER_SECRET"
```

### Проверка логов

- **Vercel**: Logs → Runtime Logs
- **GitHub Actions**: Actions → Parser Cron → Logs

---

## 📊 Что парсится

### Boss.az
- **Источник**: https://boss.az/vacancies
- **Тип**: Обычные вакансии (`job_type: 'vakansiya'`)
- **Частота**: Каждый час
- **Лимит**: 20 вакансий за запуск

### Ejob.az
- **Источник 1**: https://ejob.az/vacancies → `job_type: 'vakansiya'`
- **Источник 2**: https://ejob.az/muzdlu-is → `job_type: 'gundelik'`
- **Частота**: Каждый час
- **Лимит**: 20 вакансий за запуск

---

## 🛡️ Защита от блокировки

Leyla использует несколько методов защиты:

1. **Rate Limiting**: 3-5 секунд задержка между запросами
2. **User-Agent Rotation**: 10+ различных user agents
3. **Max Jobs Limit**: Не больше 20 вакансий за раз
4. **Auto-Stop на 403/429**: Если получили блокировку - стоп
5. **Deduplication**: Не парсим дубликаты

---

## 🗂️ Структура проекта

```
leyla-parser/
├── api/
│   ├── parse.ts              # Main API endpoint
│   └── health.ts             # Health check
├── lib/
│   ├── scrapers/
│   │   ├── boss-scraper.ts   # Boss.az парсер
│   │   └── ejob-scraper.ts   # Ejob.az парсер
│   ├── supabase/
│   │   └── client.ts         # Supabase клиент
│   ├── mapping/
│   │   └── categories.ts     # Маппинг категорий
│   └── utils/
│       └── rate-limiter.ts   # Rate limiting утилиты
├── types/
│   └── index.ts              # TypeScript типы
├── .github/
│   └── workflows/
│       └── parser-cron.yml   # GitHub Actions cron
├── package.json
├── tsconfig.json
├── vercel.json
└── README.md
```

---

## 🔧 Разработка

### Local development

```bash
# Start Vercel dev server
npm run dev

# Test parsing locally
npm run parse:boss
```

### TypeScript check

```bash
npm run type-check
```

---

## 📝 TODO

- [x] Базовая структура проекта
- [x] Supabase интеграция
- [x] Rate limiting
- [x] Маппинг категорий
- [ ] Boss.az парсер
- [ ] Ejob.az парсер
- [ ] Дедупликация
- [ ] GitHub Actions workflow
- [ ] Monitoring & alerts

---

## 🐛 Troubleshooting

### "LEYLA_USER_ID not set"
- Проверьте что создали пользователя Leyla в Supabase
- Проверьте что добавили `LEYLA_USER_ID` в Vercel env vars

### "Supabase insert error"
- Проверьте `SUPABASE_SERVICE_ROLE_KEY`
- Проверьте RLS policies на таблице `jobs`

### "IP blocked (403/429)"
- Это нормально - парсер автоматически остановится
- Попробуйте через 1 час (следующий cron)

---

## 📄 License

MIT

---

**Created by**: Vakansiya.az Team
**Powered by**: Vercel + GitHub Actions + Supabase
