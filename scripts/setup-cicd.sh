#!/bin/bash

echo "===== SOP Maker CI/CD Setup ====="
echo "This script will set up CI/CD for your SOP Maker project"
echo "It will:"
echo "1. Set up a GitHub repository"
echo "2. Configure GitHub Actions for CI/CD"
echo "3. Set up Vercel deployment"
echo ""

# Check for necessary commands
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI is not installed. Please install it first:"
    echo "For Mac: brew install gh"
    echo "For Linux: See https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
    exit 1
fi

if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI is not installed. Please install it first:"
    echo "npm install -g vercel"
    exit 1
fi

# Step 1: Set up GitHub repository
echo "===== Setting up GitHub Repository ====="
./scripts/setup-github.sh
if [ $? -ne 0 ]; then
    echo "Failed to set up GitHub repository"
    exit 1
fi

# Step 2: Set up Vercel deployment
echo "===== Setting up Vercel Deployment ====="
./scripts/setup-vercel.sh
if [ $? -ne 0 ]; then
    echo "Failed to set up Vercel deployment"
    exit 1
fi

echo ""
echo "===== CI/CD Setup Complete ====="
echo "Your SOP Maker project is now fully configured with CI/CD!"
echo "GitHub Actions will run tests on every push and PR"
echo "Merges to main will automatically deploy to Vercel"
echo ""
echo "You can view your GitHub repository at:"
REPO_URL=$(gh repo view --json url -q .url)
echo $REPO_URL
echo ""
echo "You can view your Vercel deployment at:"
vercel project ls 