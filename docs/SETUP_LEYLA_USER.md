# 🤖 Создание пользователя Leyla в Supabase

## Шаг 1: Запустить SQL миграцию

1. Откройте **Supabase Dashboard**
2. Перейдите в **SQL Editor**
3. Скопируйте и выполните SQL из файла:
   ```
   Vakansiya/supabase/migrations/006_create_leyla_user.sql
   ```

## Шаг 2: Скопировать UUID

После выполнения SQL вы увидите результат:

```
leyla_user_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
email: leyla@vakansiya.az
created_at: 2025-01-08...
```

**СКОПИРУЙТЕ** `leyla_user_id` - это UUID пользователя Leyla!

## Шаг 3: Добавить в .env

### Локально (leyla-parser/.env.local):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Leyla User ID (из шага 2)
LEYLA_USER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Parser Secret (любой случайный токен)
PARSER_SECRET=your-random-secret-123
```

### На Vercel:

1. Перейдите в **Vercel Dashboard**
2. Выберите проект **leyla-parser**
3. Settings → Environment Variables
4. Добавьте:
   - `LEYLA_USER_ID` = (UUID из шага 2)
   - `SUPABASE_SERVICE_ROLE_KEY` = (из Vakansiya проекта)
   - `NEXT_PUBLIC_SUPABASE_URL` = (из Vakansiya проекта)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (из Vakansiya проекта)
   - `PARSER_SECRET` = (случайный токен)

## Шаг 4: Проверить

В Supabase SQL Editor выполните:

```sql
-- Проверить пользователя
SELECT
  u.id,
  u.email,
  p.full_name,
  p.role
FROM auth.users u
JOIN profiles p ON u.id = p.id
WHERE u.email = 'leyla@vakansiya.az';
```

Должно вернуть:
```
id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
email: leyla@vakansiya.az
full_name: Leyla
role: user
```

✅ Готово! Пользователь Leyla создан.

## Шаг 5: Протестировать

```bash
cd leyla-parser
npm run dev
```

Запустите парсер и проверьте что вакансии создаются от имени Leyla:

```sql
-- Проверить вакансии от Leyla
SELECT
  id,
  title,
  company,
  job_type,
  created_at
FROM jobs
WHERE user_id = 'LEYLA_USER_ID'  -- Замените на реальный UUID
ORDER BY created_at DESC
LIMIT 10;
```

## Troubleshooting

### Error: "duplicate key value violates unique constraint"

Пользователь уже существует. Получите UUID:

```sql
SELECT id FROM auth.users WHERE email = 'leyla@vakansiya.az';
```

### Error: "LEYLA_USER_ID not set"

Проверьте что:
1. UUID скопирован правильно
2. `.env.local` файл существует
3. Перезапустили dev server после изменения .env
