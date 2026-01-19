#!/bin/bash

# Clone the repository
git clone https://github.com/yourusername/PayMe.git
cd PayMe

# Install dependencies
npm install

# Create .env file with placeholder values
echo "VITE_SUPABASE_URL=your_supabase_url" > .env
echo "VITE_SUPABASE_ANON_KEY=your_supabase_anon_key" >> .env

echo "Setup complete! Don't forget to replace the placeholder values in .env with your actual Supabase credentials."
echo "To run the development server, use: npm run dev"