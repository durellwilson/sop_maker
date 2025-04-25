#!/bin/bash

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Vercel CLI is not installed. Please install it first:"
    echo "npm install -g vercel"
    exit 1
fi

# Check if logged in to Vercel
vercel whoami &> /dev/null
if [ $? -ne 0 ]; then
    echo "You need to login to Vercel first"
    vercel login
fi

# Initialize Vercel project
echo "Setting up Vercel project for SOP Maker..."
vercel link

# Set environment variables from .env.local to Vercel
echo "Setting up environment variables on Vercel..."

# Read from .env.local and create Vercel environment variables
while IFS='=' read -r key value || [[ -n "$key" ]]; do
    # Skip comments and empty lines
    [[ $key == \#* ]] && continue
    [[ -z "$key" ]] && continue
    
    # Remove quotes from value
    value=$(echo $value | sed 's/^"\(.*\)"$/\1/')
    
    # Create environment variable
    echo "Setting $key on Vercel"
    vercel env add $key production
done < .env.local

# Get Vercel project information for GitHub Actions
echo "Getting Vercel tokens for GitHub Actions..."
echo "Please create and copy a Vercel token from https://vercel.com/account/tokens"
read -p "Paste your Vercel token: " VERCEL_TOKEN

# Get Vercel project ID and org ID
VERCEL_PROJECT_INFO=$(vercel project ls --json)
VERCEL_PROJECT_ID=$(echo $VERCEL_PROJECT_INFO | jq -r '.[0].id')
VERCEL_ORG_ID=$(echo $VERCEL_PROJECT_INFO | jq -r '.[0].orgId')

echo "VERCEL_TOKEN=$VERCEL_TOKEN"
echo "VERCEL_PROJECT_ID=$VERCEL_PROJECT_ID"
echo "VERCEL_ORG_ID=$VERCEL_ORG_ID"

echo "Add these as secrets to your GitHub repository:"
echo "gh secret set VERCEL_TOKEN --body \"$VERCEL_TOKEN\""
echo "gh secret set VERCEL_PROJECT_ID --body \"$VERCEL_PROJECT_ID\""
echo "gh secret set VERCEL_ORG_ID --body \"$VERCEL_ORG_ID\""

# Ask if the user wants to add these secrets automatically
read -p "Do you want to add these secrets to GitHub automatically? (y/n): " ADD_SECRETS
if [[ $ADD_SECRETS == "y" || $ADD_SECRETS == "Y" ]]; then
    # Check if gh command exists
    if ! command -v gh &> /dev/null; then
        echo "GitHub CLI is not installed. Please add the secrets manually."
        exit 1
    fi
    
    # Check if repo exists
    gh repo view &> /dev/null
    if [ $? -ne 0 ]; then
        echo "No GitHub repository found. Please add the secrets manually."
        exit 1
    fi
    
    # Add secrets
    echo "$VERCEL_TOKEN" | gh secret set VERCEL_TOKEN
    echo "$VERCEL_PROJECT_ID" | gh secret set VERCEL_PROJECT_ID
    echo "$VERCEL_ORG_ID" | gh secret set VERCEL_ORG_ID
    
    echo "Secrets added successfully!"
fi

echo "Vercel setup complete!" 