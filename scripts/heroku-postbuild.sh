#!/bin/sh
set -e

echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

echo "Syncing build to /static..."
rm -rf static
mkdir -p static
cp -R frontend/build/* static/
