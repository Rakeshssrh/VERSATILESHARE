#!/bin/bash
echo "Installing dependencies..."
npm install

echo "Building application..."
npm run render-build

echo "Checking build output directory..."
ls -la dist/

echo "Checking TypeScript declarations..."
find dist -name "*.d.ts" | grep -q . && echo "Declarations found" || echo "No declarations found"

echo "Build complete!"