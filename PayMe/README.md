# PayMe - Payment Tracker PWA

A Progressive Web App for tracking receipt payments using Vite and Supabase.

## Features

- Anonymous authentication using localStorage
- Track payment receipts with address, type, bank, and month
- Upload receipt files (PDF/images)
- Auto-save last used values
- Custom addresses, payment types, and banks
- Mobile-friendly interface
- Works offline (PWA capabilities)

## Setup Instructions

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run the development server: `npm run dev`
5. Build for production: `npm run build`

## Supabase Schema

Create these tables in your Supabase database:

```sql
-- Payments table
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  address TEXT NOT NULL,
  payment_type TEXT NOT NULL,
  bank TEXT NOT NULL,
  month_year TEXT NOT NULL, -- Format: YYYY-MM
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User metadata table
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

## Icons

Add your own icons named `icon-192.png` and `icon-512.png` to the root directory for proper PWA functionality.

## Deployment to GitHub Pages

1. Build the project: `npm run build`
2. The build output will be in the `dist/` folder
3. Deploy the `dist/` folder to your GitHub Pages branch under the `/PayMe/` subdirectory