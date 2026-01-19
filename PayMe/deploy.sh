#!/bin/bash

# Deployment script for PayMe PWA to GitHub Pages

# Build the project
npm run build

# Navigate to the dist folder
cd dist

# Create a temporary git repository
git init
git add .
git commit -m "Deploy PayMe PWA to GitHub Pages"

# Push to the gh-pages branch (replace with your repo URL)
# git push -f https://github.com/USERNAME/REPO.git master:gh-pages

echo "Build completed. Files are in the /dist folder."
echo "To deploy to GitHub Pages:"
echo "1. Create a repository on GitHub"
echo "2. Add the remote origin to this repository"
echo "3. Run: git subtree push --prefix dist origin gh-pages"