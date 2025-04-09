#!/bin/bash

# This script helps you set up your Git repository for Railway deployment

# Initialize Git repository if not already initialized
if [ ! -d ".git" ]; then
  echo "Initializing Git repository..."
  git init
else
  echo "Git repository already initialized."
fi

# Create a package.json for Railway with the start script
echo "Creating a package.json for Railway deployment..."
echo '{
  "name": "crown-tracker-bot",
  "version": "1.0.0",
  "description": "Discord bot for tracking Monster Hunter crown achievements",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "engines": {
    "node": "16.x"
  },
  "dependencies": {
    "discord.js": "^14.18.0",
    "dotenv": "^16.4.7",
    "node-fetch": "^2.7.0",
    "sqlite3": "^5.1.7"
  }
}' > package.json.railway

echo "Adding files to Git..."
git add .gitignore Procfile README.md utils/dbAdapter.js .env.example POSTGRESQL_MIGRATION.md package.json.railway

echo "Please enter a commit message for your initial commit:"
read commit_message

git commit -m "$commit_message"

echo "Git repository setup complete!"
echo ""
echo "Next steps:"
echo "1. Create a GitHub repository"
echo "2. Connect this repository to your GitHub repository with:"
echo "   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git"
echo "3. Push your code with:"
echo "   git push -u origin main"
echo "4. Set up your project on Railway.app"
echo ""
echo "Note: When deploying to Railway, rename package.json.railway to package.json to ensure the correct scripts are used."