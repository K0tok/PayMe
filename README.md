# PayMe - Трекер платежей PWA

Прогрессивное веб-приложение для отслеживания квитанций об оплате с использованием Vite и Supabase.

## Особенности

- Анонимная аутентификация с использованием localStorage
- Отслеживание квитанций об оплате с адресом, типом, банком и месяцем
- Загрузка файлов квитанций (PDF/изображения)
- Автосохранение последних используемых значений
- Пользовательские адреса, типы платежей и банки
- Интерфейс, оптимизированный для мобильных устройств
- Работа в автономном режиме (возможности PWA)

## Установочный скрипт

```bash
#!/bin/bash

# Клонировать репозиторий
git clone https://github.com/yourusername/PayMe.git
cd PayMe

# Установить зависимости
npm install

# Создать файл .env с заполнителями значений
echo "VITE_SUPABASE_URL=your_supabase_url" > .env
echo "VITE_SUPABASE_ANON_KEY=your_supabase_anon_key" >> .env

echo "Установка завершена! Не забудьте заменить значения-заполнители в .env на свои действительные учетные данные Supabase."
echo "Чтобы запустить сервер разработки, используйте: npm run dev"
```

## Ручная установка

1. Клонировать репозиторий
2. Установить зависимости: `npm install`
3. Создать файл `.env` с вашими учетными данными Supabase:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Запустить сервер разработки: `npm run dev`
5. Собрать для продакшена: `npm run build`

## Схема Supabase

Создайте эти таблицы в вашей базе данных Supabase:

```sql
-- Таблица платежей
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  address TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  bank TEXT NOT NULL,
  month_year TEXT NOT NULL, -- Формат: YYYY-MM
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Таблица метаданных пользователя
CREATE TABLE user_meta (
  user_id TEXT PRIMARY KEY,
  last_address TEXT,
  last_bank TEXT,
  last_payment_type TEXT,
  custom_addresses TEXT[],
  custom_payment_types TEXT[],
  custom_banks TEXT[]
);
```

## Деплой на GitHub Pages

1. Собрать проект: `npm run build`
2. Результат сборки будет находиться в папке `dist/`
3. Разместите папку `dist/` в ветке GitHub Pages под подкаталогом `/PayMe/`
