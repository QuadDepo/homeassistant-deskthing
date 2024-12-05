#!/bin/bash
if [ ! -d "dist" ]; then
    echo "Error: dist directory not found"
    exit 1
fi

# Create output directory if it doesn't exist
if [ ! -d "output" ]; then
    mkdir output
fi

VERSION=$(node -p "require('./public/manifest.json').version_code")

cd dist
zip -r "../output/dist-v${VERSION}.zip" ./*

echo "Created output/dist-v${VERSION}.zip"